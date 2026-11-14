// Finds the game, installs the mod into it, and keeps everything up to date from the shared update site.
// Every file is listed in manifest.json with its SHA-1; only files that differ are downloaded.
const { app, net, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const sha1 = buf => crypto.createHash('sha1').update(buf).digest('hex');
const exists = p => { try { return fs.existsSync(p); } catch (e) { return false; } };
const isGame = d => {
  if (typeof d !== 'string' || !d.trim()) return false;
  try { return fs.statSync(path.join(d, 'Icarus', 'Binaries', 'Win64', 'Icarus-Win64-Shipping.exe')).isFile(); }
  catch (e) { return false; }
};

// ---------- finding the game ----------
function steamLibraries() {
  const roots = new Set(['C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam']);
  for (const key of ['HKCU\\Software\\Valve\\Steam', 'HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam']) {
    try {
      const out = execFileSync('reg', ['query', key], { encoding: 'utf8', windowsHide: true, timeout: 4000 });
      const m = out.match(/(?:SteamPath|InstallPath)\s+REG_SZ\s+(.+)/i);
      if (m) roots.add(m[1].trim().replace(/\//g, '\\'));
    } catch (e) {}
  }
  const libs = new Set();
  for (const r of roots) {
    libs.add(r);
    try {
      const vdf = fs.readFileSync(path.join(r, 'steamapps', 'libraryfolders.vdf'), 'utf8');
      for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) libs.add(m[1].replace(/\\\\/g, '\\'));
    } catch (e) {}
  }
  return [...libs];
}

function findGame(cfg) {
  if (isGame(process.env.HUD_GAME_DIR)) return process.env.HUD_GAME_DIR;
  if (cfg && isGame(cfg.game)) return cfg.game;
  // the program may sit inside the game's mod folder (the original install)
  const up = path.resolve(path.dirname(process.execPath), '..', '..', '..', '..', '..', '..', '..');
  if (isGame(up)) return up;
  for (const lib of steamLibraries()) {
    const d = path.join(lib, 'steamapps', 'common', 'Icarus');
    if (isGame(d)) return d;
  }
  return null;
}

function askGame(win) {
  const pick = dialog.showOpenDialogSync(win, {
    title: 'Icarus 게임 폴더를 골라 주세요 (steamapps\\common\\Icarus)',
    properties: ['openDirectory'],
  });
  if (!pick || !pick[0]) return null;
  let d = pick[0];
  for (let i = 0; i < 4 && !isGame(d); i++) d = path.dirname(d);
  return isGame(d) ? d : null;
}

// ---------- where each file goes ----------
// manifest paths: "game/..." = inside the Icarus folder, "app/..." = next to this program's code
function target(gameDir, p) {
  if (typeof p !== 'string') throw new Error('업데이트 파일 경로가 올바르지 않습니다.');
  const root = p.startsWith('game/') ? gameDir : p.startsWith('app/') ? __dirname : null;
  if (!root) return null;
  const parts = p.slice(p.indexOf('/') + 1).split('/');
  // Apply Windows filename rules on build/test hosts too (including ADS and devices).
  if (parts.some(s => !s || s === '.' || s === '..' || /[\\:<>"|?*\x00-\x1f]/.test(s) || /[. ]$/.test(s) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s))) {
    throw new Error('허용되지 않는 업데이트 파일 경로입니다.');
  }
  const dst = path.resolve(root, ...parts);
  const rel = path.relative(path.resolve(root), dst);
  if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
    throw new Error('업데이트 파일이 설치 폴더를 벗어납니다.');
  }
  return dst;
}

async function getJson(url) {
  const r = await net.fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function getBuf(url) {
  const r = await net.fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  return Buffer.from(await r.arrayBuffer());
}

function writeSafe(dst, buf) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const tmp = dst + '.new';
  fs.writeFileSync(tmp, buf);
  try { fs.renameSync(tmp, dst); }
  catch (e) {
    // a file the game keeps open (the loader DLLs) cannot be replaced until the game is closed
    try { fs.unlinkSync(tmp); } catch (e2) {}
    throw e;
  }
}

// Installs or updates. Returns { changed:[...], skipped:[...], appChanged, version, notes }.
async function update(gameDir, baseUrl, log, canInstall = async () => true) {
  const man = await getJson(baseUrl + '/manifest.json');
  if (!man || !Array.isArray(man.files) || !man.version) throw new Error('올바르지 않은 업데이트 목록');
  const res = { changed: [], skipped: [], appChanged: false, version: man.version, notes: man.notes || '', config: man.config || {} };
  const staged = [];
  // a cached, older manifest must never put back files that a newer update already installed
  const verFile = path.join(modDir(gameDir), 'version.txt');
  let have = '';
  try { have = fs.readFileSync(verFile, 'utf8').trim(); } catch (e) {}
  if (have && verCmp(man.version, have) < 0) { res.stale = have; log && log('update skipped: site shows ' + man.version + ', installed ' + have); return res; }
  for (const f of man.files) {
    // one bad entry must not stop the rest of the update
    let dst = null;
    try { dst = target(gameDir, f.p); } catch (e) { res.skipped.push(String(f.p) + ' (' + e.message + ')'); continue; }
    if (!dst) continue;
    let cur = null;
    try { cur = fs.readFileSync(dst); } catch (e) {
      if(e.code!=='ENOENT'){res.skipped.push(f.p+' (cannot read installed file: '+e.message+')');continue;}
    }
    // loader files are only put in place when missing, so an existing UE4SS setup is left alone
    if (cur && f.once) continue;
    if (cur && cur.length === f.n && sha1(cur) === f.h) continue;
    try {
      const buf = await getBuf(baseUrl + '/files/' + f.p);
      if (buf.length !== f.n || sha1(buf) !== f.h) throw new Error('size/checksum mismatch');
      staged.push({f,dst,buf,previous:cur});
    } catch (e) {
      res.skipped.push(f.p + ' (' + e.message + ')');
      log && log('update skipped ' + f.p + ': ' + e.message);
    }
  }
  // Validate every download before replacing any installed file. A failed
  // download must not leave new Lua paired with an old companion module.
  if (res.skipped.length) return res;
  if (staged.length && !(await canInstall())) { res.deferred = true; return res; }
  const applied=[];
  for (const item of staged) {
    const {f,dst,buf}=item;
    try { writeSafe(dst,buf);applied.push(item);res.changed.push(f.p);if(f.p.startsWith('app/'))res.appChanged=true; }
    catch(e){
      res.skipped.push(f.p+' ('+e.message+')');
      for(const prior of applied.reverse()){
        try{if(prior.previous!==null)writeSafe(prior.dst,prior.previous);else fs.unlinkSync(prior.dst);}
        catch(rollback){res.skipped.push(prior.f.p+' (rollback failed: '+rollback.message+')');}
      }
      res.changed=[];res.appChanged=false;break;
    }
  }
  if (!res.skipped.length && man.version) { try { fs.writeFileSync(verFile, String(man.version) + '\r\n'); } catch (e) {} }
  return res;
}
function verCmp(a, b) {
  const x = String(a || '').split('.').map(Number), y = String(b || '').split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}

// a path the game's script can always open, even with Korean folder names (8.3 short form)
function shortPath(p) {
  // cmd expands percent variables even inside quotes. Fall back without invoking
  // a shell for paths containing command syntax; do not interpolate those paths.
  if (typeof p !== 'string' || /[%!^"&|<>\r\n\x00]/.test(p)) return p;
  try {
    const out = execFileSync('cmd', ['/d', '/c', 'for %I in ("' + p + '") do @echo %~sI'], { encoding: 'utf8', windowsHide: true, timeout: 4000 });
    const s = out.trim().split(/\r?\n/).pop();
    if (s && exists(s)) return s;
  } catch (e) {}
  return p;
}

function modDir(gameDir) { return path.join(gameDir, 'Icarus', 'Binaries', 'Win64', 'ue4ss', 'Mods', 'IcarusHUD'); }

// tell the mod where this program lives, so the game can start it
function registerApp(gameDir) {
  const md = modDir(gameDir);
  if (!exists(md)) return;
  // Lua's fallback launches this exact file, not every executable under md.
  const inside = path.resolve(process.execPath).toLowerCase() === path.resolve(md, 'app', 'IcarusHUD.exe').toLowerCase();
  const f = path.join(md, 'app_path.txt');
  try {
    if (inside) { if (exists(f)) fs.unlinkSync(f); return; }
    const want = shortPath(process.execPath);
    let cur = '';
    try { cur = fs.readFileSync(f, 'utf8').trim(); } catch (e) {}
    if (cur !== want) fs.writeFileSync(f, want + '\r\n');
  } catch (e) {}
}

function setMacros(gameDir, on) {
  const f = path.join(modDir(gameDir), 'macros_on.txt');
  if (on) fs.writeFileSync(f, 'on\r\n'); else if (exists(f)) fs.unlinkSync(f);
  return exists(f);
}
const macrosOn = gameDir => exists(path.join(modDir(gameDir), 'macros_on.txt'));

module.exports = { findGame, askGame, update, registerApp, setMacros, macrosOn, modDir, isGame };
