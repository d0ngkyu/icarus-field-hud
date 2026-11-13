// Icarus Field HUD - desktop shell around the HUD page in the mod folder
const { net, app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

if (!app.requestSingleInstanceLock()) { app.quit(); }
// leave the graphics card to the game: this window is simple enough to draw on the CPU
app.disableHardwareAcceleration();

const cfgFile = () => path.join(app.getPath('userData'), 'settings.json');
let cfg = { top: false, compact: false, full: { width: 1400, height: 900 }, small: { width: 460, height: 760 }, hud: null };
try { cfg = Object.assign(cfg, JSON.parse(fs.readFileSync(cfgFile(), 'utf8'))); } catch (e) {}
const saveCfg = () => { try { fs.mkdirSync(path.dirname(cfgFile()), { recursive: true }); fs.writeFileSync(cfgFile(), JSON.stringify(cfg, null, 1)); } catch (e) {} };

const UPD = require('./updater.js');
const PKG = (() => { try { return require('./package.json'); } catch (e) { return {}; } })();
const UPDATE_URL = process.env.HUD_UPDATE_URL || PKG.updateUrl || '';
let gameDir = null, lastUpd = null, lastLiveAt = 0;
const hudFile = () => gameDir && path.join(UPD.modDir(gameDir), 'hud', 'index.html');
const logFile = () => path.join(app.getPath('userData'), 'update.log');
const ulog = t => { try { fs.appendFileSync(logFile(), new Date().toISOString() + ' ' + t + '\n'); } catch (e) {} };

const onScreen = b => b && b.x !== undefined && screen.getAllDisplays().some(d => {
  const a = d.workArea; return b.x < a.x + a.width - 60 && b.x + b.width > a.x + 60 && b.y >= a.y - 10 && b.y < a.y + a.height - 60;
});

let win = null, tray = null, quitting = false;
const iconPath = path.join(__dirname, 'icon.png');

function state() { return { top: cfg.top, compact: cfg.compact }; }

function createWindow(hud) {
  const b = cfg.compact ? cfg.small : cfg.full;
  win = new BrowserWindow({
    width: b.width, height: b.height, ...(onScreen(b) ? { x: b.x, y: b.y } : {}),
    minWidth: 380, minHeight: 300, frame: false, backgroundColor: '#080b0e', title: 'Icarus Field HUD',
    icon: iconPath, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: true, spellcheck: false },
  });
  win.setAlwaysOnTop(cfg.top, 'floating');
  win.loadFile(hud);
  // push game updates to the page: only a cheap file check here, no page polling
  const live = path.join(path.dirname(hud), 'live.js');
  let lastSig = '', busy = false;
  const tick = () => {
    if (busy || !win || win.isDestroyed()) return;
    busy = true;
    fs.stat(live, (err, st) => {
      if (err) { busy = false; return; }
      const sig = st.mtimeMs + ':' + st.size;
      if (sig === lastSig) { busy = false; return; }
      lastSig = sig;
      // the game was just started again (no news for 2 minutes): look for updates now
      if (lastLiveAt && Date.now() - lastLiveAt > 120000) runUpdate(false);
      lastLiveAt = Date.now();
      fs.readFile(live, 'utf8', (e2, txt) => { busy = false; if (!e2 && txt && win && !win.isDestroyed()) win.webContents.send('live', txt); });
    });
  };
  const timer = setInterval(tick, 200);
  // when an update replaced the page file, show the new page by itself
  let pageSig = '';
  try { const st = fs.statSync(hud); pageSig = st.mtimeMs + ':' + st.size; } catch (e) {}
  const pageTimer = setInterval(() => {
    fs.stat(hud, (err, st) => {
      if (err || !win || win.isDestroyed()) return;
      const sig = st.mtimeMs + ':' + st.size;
      if (sig !== pageSig) { pageSig = sig; setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.reloadIgnoringCache(); }, 1500); }
    });
  }, 3000);
  win.on('closed', () => clearInterval(pageTimer));
  win.on('closed', () => clearInterval(timer));
  win.once('ready-to-show', () => win.show());
  let t = null;
  const remember = () => { clearTimeout(t); t = setTimeout(() => {
    if (!win || win.isMinimized() || win.isMaximized()) return;
    const nb = win.getBounds(); if (cfg.compact) cfg.small = nb; else cfg.full = nb; saveCfg();
  }, 400); };
  win.on('move', remember); win.on('resize', remember);
  win.on('close', e => { if (!quitting) { e.preventDefault(); win.hide(); } });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

function toggleTop() { cfg.top = !cfg.top; win.setAlwaysOnTop(cfg.top, 'floating'); saveCfg(); buildTray(); return state(); }
function toggleCompact() {
  const nb = win.getBounds();
  if (cfg.compact) { cfg.small = nb; cfg.compact = false; win.setBounds(onScreen(cfg.full) ? cfg.full : { ...nb, width: cfg.full.width, height: cfg.full.height }); }
  else {
    cfg.full = nb; cfg.compact = true;
    const s = onScreen(cfg.small) ? cfg.small : { x: nb.x + nb.width - cfg.small.width, y: nb.y, width: cfg.small.width, height: cfg.small.height };
    win.setBounds(s);
  }
  saveCfg(); buildTray(); return state();
}
function showWin() { if (!win) return; if (win.isMinimized()) win.restore(); win.show(); win.focus(); }

function buildTray() {
  if (!tray) {
    tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
    tray.setToolTip('Icarus Field HUD');
    tray.on('click', () => (win && win.isVisible() ? win.hide() : showWin()));
  }
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'HUD 열기', click: showWin },
    { label: '항상 위에 표시', type: 'checkbox', checked: cfg.top, click: () => { toggleTop(); win.webContents.send('state', state()); } },
    { label: '작게 보기', type: 'checkbox', checked: cfg.compact, click: () => { toggleCompact(); win.webContents.send('state', state()); } },
    { label: '업데이트 확인', click: () => runUpdate(true) },
    { type: 'separator' },
    { label: '종료', click: () => { quitting = true; app.quit(); } },
  ]));
}

ipcMain.handle('state', () => state());
ipcMain.handle('toggleTop', () => toggleTop());
ipcMain.handle('toggleCompact', () => toggleCompact());
ipcMain.handle('minimize', () => win.minimize());
ipcMain.handle('hide', () => win.hide());
ipcMain.handle('info', () => ({ version: (lastUpd && lastUpd.version) || PKG.contentVersion || '', app: app.getVersion(), game: gameDir, macros: gameDir ? UPD.macrosOn(gameDir) : false, presence: !!presenceUrl() && cfg.presence !== false, presenceAvail: !!presenceUrl(), last: lastUpd && { at: lastUpd.at, changed: lastUpd.changed.length } }));
ipcMain.handle('online', () => onlineN);
ipcMain.handle('setPresence', (_e, on) => { cfg.presence = !!on; saveCfg(); if (on) presenceTick(); else { presenceLeave(); onlineN = null; } return cfg.presence; });
ipcMain.handle('setMacros', (_e, on) => (gameDir ? UPD.setMacros(gameDir, !!on) : false));
ipcMain.handle('checkUpdate', () => runUpdate(true).then(r => !!r));

app.on('second-instance', showWin);
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => {});
// ---------- start: find the game, install on first run, then keep up to date ----------
async function runUpdate(manual) {
  if (!UPDATE_URL || !gameDir) return null;
  try {
    const r = await UPD.update(gameDir, UPDATE_URL, ulog);
    lastUpd = { ...r, at: Date.now() };
    // settings the update site hands out (for now: where the online counter lives)
    if (r.config && typeof r.config.presenceUrl === 'string' && r.config.presenceUrl !== (cfg.presenceUrl || '')) { cfg.presenceUrl = r.config.presenceUrl; saveCfg(); setTimeout(presenceTick, 1000); }
    ulog('update ' + r.version + ': ' + r.changed.length + ' changed, ' + r.skipped.length + ' skipped');
    UPD.registerApp(gameDir);
    if (win && !win.isDestroyed()) win.webContents.send('upd', { version: r.version, changed: r.changed, skipped: r.skipped, notes: r.notes, manual: !!manual });
    if (r.appChanged) {
      ulog('program files changed, restarting');
      setTimeout(() => { quitting = true; app.relaunch(); app.exit(0); }, 2500);
    }
    return r;
  } catch (e) {
    ulog('update failed: ' + e.message);
    if (manual && win && !win.isDestroyed()) win.webContents.send('upd', { error: e.message, manual: true });
    return null;
  }
}

const TESTYES = !!process.env.HUD_TEST_YES; // automated checks only: answer the setup questions with yes
const ask = o => (TESTYES ? 0 : dialog.showMessageBoxSync(o));
async function start() {
  gameDir = UPD.findGame(cfg);
  if (!gameDir) {
    dialog.showMessageBoxSync({ type: 'info', title: 'Icarus HUD', message: 'Icarus 게임 폴더를 찾지 못했습니다.', detail: 'Steam 라이브러리의 steamapps\\common\\Icarus 폴더를 골라 주세요.', buttons: ['폴더 고르기'] });
    gameDir = UPD.askGame(null);
    if (!gameDir) { dialog.showErrorBox('Icarus HUD', 'Icarus 폴더가 아니어서 종료합니다. 다시 실행해서 골라 주세요.'); app.quit(); return; }
  }
  cfg.game = gameDir; saveCfg();
  if (!fs.existsSync(hudFile())) {
    if (!UPDATE_URL) { dialog.showErrorBox('Icarus HUD', '설치 파일 주소가 비어 있습니다.'); app.quit(); return; }
    const ok = ask({ type: 'question', title: 'Icarus HUD 설치', message: 'Icarus에 HUD 모드를 설치할까요?',
      detail: '설치 위치: ' + gameDir + '\n\n게임 파일은 바꾸지 않고, 모드 폴더(Binaries\\Win64\\ue4ss)만 추가합니다.\n이미 UE4SS를 쓰고 있다면 그대로 두고 HUD만 추가합니다.',
      buttons: ['설치', '취소'], defaultId: 0, cancelId: 1 });
    if (ok !== 0) { app.quit(); return; }
    const r = await runUpdate(true);
    if (!r || !fs.existsSync(hudFile())) {
      dialog.showErrorBox('Icarus HUD', '설치하지 못했습니다. 인터넷 연결을 확인하거나, 게임을 끄고 다시 실행해 주세요.' + (r && r.skipped.length ? '\n\n' + r.skipped.slice(0, 5).join('\n') : ''));
      app.quit(); return;
    }
    ask({ type: 'info', title: 'Icarus HUD', message: '설치를 마쳤습니다.', detail: '이제 게임을 켜면 HUD가 자동으로 같이 켜집니다.\n(버전 ' + r.version + ')', buttons: ['확인'] });
    if (r.appChanged) return;
  } else {
    UPD.registerApp(gameDir);
    setTimeout(() => runUpdate(false), 5000);
  }
  createWindow(hudFile()); buildTray();
  // on the PC that builds updates only: copy map level files out of the game, outside the game process
  try {
    const md = UPD.modDir(gameDir), out = path.join(md, 'levelraw');
    if (fs.existsSync(path.join(md, 'dev.txt')) && !fs.existsSync(path.join(out, 'done.txt'))) {
      const { Worker } = require('worker_threads');
      setTimeout(() => { try { new Worker(path.join(__dirname, 'levjob.js'), { workerData: { pakDir: path.join(gameDir, 'Icarus', 'Content', 'Paks'), outDir: out } }).on('error', e => ulog('level copy failed: ' + e.message)); } catch (e) { ulog('level copy failed: ' + e.message); } }, 20000);
    }
  } catch (e) {}
  setInterval(() => runUpdate(false), 30 * 60 * 1000);
}
// ---------- how many people have the HUD open right now (anonymous: a random id and a time) ----------
const presenceUrl = () => (process.env.HUD_PRESENCE_URL || cfg.presenceUrl || PKG.presenceUrl || '').replace(/\/+$/, '');
let onlineN = null;
async function presenceTick() {
  if (!presenceUrl() || cfg.presence === false) return;
  try {
    if (!cfg.pid) { cfg.pid = require('crypto').randomBytes(9).toString('hex'); saveCfg(); }
    const now = Date.now();
    await net.fetch(presenceUrl() + '/presence/' + cfg.pid + '.json', { method: 'PUT', body: JSON.stringify({ t: now }), headers: { 'Content-Type': 'application/json' } });
    const r = await net.fetch(presenceUrl() + '/presence.json?orderBy=%22t%22&startAt=' + (now - 4 * 60 * 1000), { cache: 'no-store' });
    if (r.ok) { const d = await r.json(); onlineN = d ? Object.keys(d).length : 0; }
  } catch (e) { onlineN = null; }
  if (win && !win.isDestroyed()) win.webContents.send('online', onlineN);
}
async function presenceLeave() {
  if (!presenceUrl() || !cfg.pid) return;
  try { await net.fetch(presenceUrl() + '/presence/' + cfg.pid + '.json', { method: 'DELETE' }); } catch (e) {}
}
app.on('before-quit', e => {
  if (presenceLeave.done || !presenceUrl() || !cfg.pid) return;
  e.preventDefault(); presenceLeave.done = true;
  Promise.race([presenceLeave(), new Promise(r => setTimeout(r, 1500))]).then(() => app.quit());
});
app.whenReady().then(start).then(() => { setTimeout(presenceTick, 3000); setInterval(presenceTick, 60 * 1000); });


// development check: HUD_SHOT=<png> captures the window and quits
if (process.env.HUD_SHOT) app.whenReady().then(() => setTimeout(async () => {
  try {
    await win.webContents.executeJavaScript("document.getElementById('tbcmp').click();1");
    await new Promise(r => setTimeout(r, 800));
    fs.writeFileSync(process.env.HUD_SHOT, (await win.webContents.capturePage()).toPNG());
    console.log('SHOT', JSON.stringify(win.getBounds()), JSON.stringify(state()));
  } catch (e) { console.log('SHOT ERR', e.message); }
  quitting = true; app.quit();
}, 3000));

// development check: HUD_PERF=1 prints CPU/memory after 12 s of activity
if (process.env.HUD_PERF) app.whenReady().then(() => setTimeout(() => app.getAppMetrics(), 4000)).then(() => setTimeout(async () => {
  const m = app.getAppMetrics().map(x => `${x.type}:${x.cpu.percentCPUUsage.toFixed(1)}%/${Math.round((x.memory.workingSetSize||0)/1024)}MB`);
  const txt = await win.webContents.executeJavaScript("document.getElementById('live').textContent+' | '+document.getElementById('tbst').textContent");
  console.log('PERF', m.join(' '), '|', txt);
  quitting = true; app.quit();
}, 12000));
