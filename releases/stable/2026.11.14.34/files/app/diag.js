// Self-check: notices when the game crashed, guesses why, steps around it, and writes a report.
// Steps, from mild to strong: switch off the one feature that was running -> safe mode -> offer to turn the mod off.
// Updates preserve crash quarantine; a version change is not evidence of a fix.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const FEAT_KO = {
  animals: '동물 상세 정보 읽기', game_control: '수동 월드 저장·종료',
  fog: '탐험 기록(안개) 읽기', bosses: '월드 보스 읽기', worldmarks: '맵 전체 동굴·광맥 읽기', landmarks: '주변 동굴·간헐천 찾기',
  progress: '레벨·해금 읽기(성장 코치)', macros: '반자동 기능(F3~F6)', tick: '기본 상태 읽기', key_show: 'F8 제작대 읽기', key_add: 'F9 목록 추가',
  key_inv: 'F10 다시 읽기', macro: '반자동 기능(F3~F6)', idle: '(쉬는 중)', hazards: '동굴 위험 생물 찾기', ores: '주변 광석·동물 찾기',
};
const featOf = stepName => (stepName === 'macro' ? 'macros' : stepName);
const SWITCHABLE = new Set(['fog', 'bosses', 'worldmarks', 'landmarks', 'progress', 'macros', 'hazards', 'animals', 'ores', 'game_control']);

function paths(gameDir, modDir, userData) {
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return {
    mod: modDir,
    ue4ssLog: path.join(gameDir, 'Icarus', 'Binaries', 'Win64', 'ue4ss', 'UE4SS.log'),
    crashDirs: [path.join(local, 'Icarus', 'Saved', 'Crashes'), path.join(gameDir, 'Icarus', 'Saved', 'Crashes')],
    step: path.join(modDir, 'diag_step.txt'),
    featOff: path.join(modDir, 'features_off.txt'),
    safe: path.join(modDir, 'safe_mode.txt'),
    loader: path.join(gameDir, 'Icarus', 'Binaries', 'Win64', 'dwmapi.dll'),
    loaderOff: path.join(gameDir, 'Icarus', 'Binaries', 'Win64', 'dwmapi.dll.off'),
    gameExe: path.join(gameDir, 'Icarus', 'Binaries', 'Win64', 'Icarus-Win64-Shipping.exe'),
    logCopy: path.join(userData, 'ue4ss_last.log'),
    state: path.join(userData, 'diag.json'),
  };
}

const readText = (p, max) => {
  try {
    const st = fs.statSync(p);
    const fd = fs.openSync(p, 'r');
    const n = Math.min(st.size, max || 4e6);
    const b = Buffer.alloc(n);
    fs.readSync(fd, b, 0, n, st.size - n);
    fs.closeSync(fd);
    let t = b.toString('utf8');
    if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
    if (/\u0000/.test(t.slice(0, 200))) t = b.toString('utf16le');
    return t;
  } catch (e) { return ''; }
};

// take out anything personal before it goes into a report
function scrub(t) {
  const home = os.homedir();
  t = t.split(home).join('%USERPROFILE%');
  return t.replace(/(LoginId|EpicAccountId|UserName|MachineId|SteamID|UserId)\s*[:=][^\r\n<]*/gi, '$1: (지움)')
    .replace(/<(LoginId|EpicAccountId|UserName|MachineId|UserActivityHint|EpicAccountId)>[^<]*</gi, '<$1>(지움)<');
}

class Doctor {
  constructor(gameDir, modDir, userData, log) {
    this.p = paths(gameDir, modDir, userData);
    this.log = log || (() => {});
    this.st = { seen: {}, crashes: [], offVersion: '', lastLogSig: '' };
    try { Object.assign(this.st, JSON.parse(fs.readFileSync(this.p.state, 'utf8'))); } catch (e) {}
    if (!this.st.seen || typeof this.st.seen !== 'object' || Array.isArray(this.st.seen)) this.st.seen = {};
    if (!Array.isArray(this.st.crashes)) this.st.crashes = [];
    this.st.crashes = this.st.crashes.filter(x => x && Number.isFinite(x.at));
    // first run: crashes from before the HUD was installed are not ours to act on
    if (!this.st.init) { for (const c of this.newCrashes()) if(Date.now()-c.at>120000)this.st.seen[c.dir] = c.at; this.st.init = 1; this.save(); }
  }
  save() { try { fs.writeFileSync(this.p.state, JSON.stringify(this.st, null, 1)); } catch (e) {} }

  // keep a copy of the mod log while the game runs: the game starts a fresh one next time
  keepLog() {
    try {
      const st = fs.statSync(this.p.ue4ssLog);
      const sig = st.mtimeMs + ':' + st.size;
      if (sig === this.st.lastLogSig) return;
      this.st.lastLogSig = sig;
      fs.copyFileSync(this.p.ue4ssLog, this.p.logCopy);
    } catch (e) {}
  }

  featuresOff() {
    try { return fs.readFileSync(this.p.featOff, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean); } catch (e) { return []; }
  }
  setFeaturesOff(list) {
    const u = [...new Set(list)];
    if (u.length) fs.writeFileSync(this.p.featOff, u.join('\r\n') + '\r\n'); else if (fs.existsSync(this.p.featOff)) fs.unlinkSync(this.p.featOff);
  }
  safeMode() { return fs.existsSync(this.p.safe); }
  setSafeMode(on) { if (on) fs.writeFileSync(this.p.safe, 'on\r\n'); else if (fs.existsSync(this.p.safe)) fs.unlinkSync(this.p.safe); }
  modOn() { return fs.existsSync(this.p.loader); }
  lastStep() {
    const t = readText(this.p.step, 200).trim();
    const [name, at] = t.split('|');
    return name ? { name, at: Number(at) * 1000 || 0 } : null;
  }

  // newest crash folders the game wrote, newer than the last one we looked at
  newCrashes() {
    const out = [];
    for (const d of this.p.crashDirs) {
      let list = [];
      try { list = fs.readdirSync(d); } catch (e) { continue; }
      for (const n of list) {
        const full = path.join(d, n);
        let st;
        try { st = fs.statSync(full); } catch (e) { continue; }
        if (!st.isDirectory() || this.st.seen[full]) continue;
        out.push({ dir: full, at: st.mtimeMs });
      }
    }
    return out.sort((a, b) => a.at - b.at);
  }

  readCrash(dir) {
    let ctx = '';
    try {
      for (const f of fs.readdirSync(dir)) {
        if (/CrashContext\.runtime-xml$/i.test(f)) ctx = readText(path.join(dir, f), 2e6);
        else if (!ctx && /\.log$/i.test(f)) ctx = readText(path.join(dir, f), 2e5);
      }
    } catch (e) {}
    const msg = (ctx.match(/<ErrorMessage>([\s\S]*?)<\/ErrorMessage>/) || [])[1] || (ctx.match(/Unhandled Exception:[^\r\n]*/) || [])[0] || '';
    const stack = [...ctx.matchAll(/<(?:CallStack|PortableCallStack)>([\s\S]*?)<\/(?:CallStack|PortableCallStack)>/g)].map(m=>m[1].trim()).filter(Boolean).join('\n');
    const complete = /<\/(?:CallStack|PortableCallStack)>/.test(ctx) || /Unhandled Exception:[^\r\n]+/.test(ctx);
    const all = msg + '\n' + stack + '\n' + ctx.slice(-20000);
    return { complete, msg: msg.replace(/&apos;/g, "'").replace(/&quot;/g, '"').trim().slice(0, 300), mod: /UE4SS|dwmapi/i.test(stack), loaderPresent: /UE4SS|dwmapi/i.test(all), phase: /UGameEngine::PreExit|FEngineLoop::Exit/.test(stack) ? 'exit' : 'unknown', stack: stack.slice(0, 4000), raw: ctx };
  }

  // look at what happened since last time and step around it; returns a short note for the user or null
  check(version) {
    const found = this.newCrashes();
    if (!found.length) return null;
    let note = null;
    for (const c of found) {
      const info = this.readCrash(c.dir);
      // The game creates the directory before finishing the XML. Retry next
      // time instead of permanently acknowledging an empty/partial report.
      if (!info.complete) continue;
      this.st.seen[c.dir] = c.at;
      const stepNow = this.lastStep();
      // The live marker may belong to an older run, or to a run after the crash.
      // Only a preceding, nearby marker is evidence of what was running.
      const matchedStep = stepNow && stepNow.at > 0 && c.at >= stepNow.at && c.at - stepNow.at <= 120000;
      const rec = { at: c.at, mod: info.mod, loaderPresent: info.loaderPresent, phase: info.phase, msg: info.msg, step: matchedStep ? stepNow.name : null, version };
      this.st.crashes.push(rec);
      this.log('crash found: ' + JSON.stringify(rec));
      if (!info.mod) { note = { level: 0, text: (info.phase==='exit'?'게임 종료 처리 중 충돌했습니다. ':'')+'호출 스택에 UE4SS 프레임이 없습니다. 모드 로드 여부만으로 원인을 판단하지 않으며, 기존 안전 설정은 유지합니다.' }; continue; }
      const recent = this.st.crashes.filter(x => x.mod && Date.now() - x.at < 3 * 86400e3).length;
      const f = featOf(rec.step || '');
      const off = this.featuresOff();
      if (recent <= 1 && SWITCHABLE.has(f) && !off.includes(f)) {
        this.setFeaturesOff(off.concat(f));
        note = { level: 1, text: `게임이 튕길 때 HUD 모드가 "${FEAT_KO[f] || f}"을(를) 하고 있었습니다. 이 기능만 꺼 두었습니다. 게임을 다시 켜면 적용됩니다.` };
      } else if (!this.safeMode() && recent <= 2) {
        this.setSafeMode(true);
        note = { level: 2, text: 'UE4SS가 포함된 충돌 기록을 확인해 안전 모드로 바꿨습니다. 추가 검색 기능을 줄입니다. 원인 함수는 미확정이며 게임을 다시 켜면 적용됩니다.' };
      } else {
        note = { level: 3, text: '안전 모드에서도 게임이 튕겼습니다. 설정 탭의 "모드 끄고 게임하기"를 누르면 모드 없이 게임할 수 있습니다. 보고서를 만들어 보내 주세요.' };
      }
      this.st.offVersion = version;
    }
    this.save();
    return note;
  }

  // Compatibility entry point: never lift quarantine merely because an update arrived.
  onNewVersion(version) {
    return false;
  }

  status() {
    const last = this.st.crashes[this.st.crashes.length - 1];
    return {
      safe: this.safeMode(), off: this.featuresOff().map(f => FEAT_KO[f] || f), modOn: this.modOn(),
      lastCrash: last ? { at: last.at, mod: last.mod, step: last.step ? (FEAT_KO[featOf(last.step)] || last.step) : '' } : null,
      crashes: this.st.crashes.length,
    };
  }

  isGameRunning() {
    return new Promise(res => execFile('tasklist', ['/FI', 'IMAGENAME eq Icarus-Win64-Shipping.exe', '/NH'], { windowsHide: true, timeout: 5000 }, (e, out) => res(e ? null : /Icarus-Win64-Shipping/i.test(out || ''))));
  }
  async setModOn(on) {
    const running = await this.isGameRunning();
    if (running !== false) throw new Error(running ? '게임을 먼저 꺼 주세요' : '게임 실행 상태를 확인하지 못해 모드 변경을 보류했습니다.');
    if (on && fs.existsSync(this.p.loaderOff) && !fs.existsSync(this.p.loader)) fs.renameSync(this.p.loaderOff, this.p.loader);
    if (!on && fs.existsSync(this.p.loader)) { if (fs.existsSync(this.p.loaderOff)) fs.unlinkSync(this.p.loaderOff); fs.renameSync(this.p.loader, this.p.loaderOff); }
    return this.modOn();
  }

  report(extra) {
    const s = this.status();
    const lines = [];
    lines.push('Icarus Field HUD 문제 보고서', '만든 때: ' + new Date().toLocaleString(), '');
    for (const k in extra) lines.push(k + ': ' + extra[k]);
    let exeTime = '';
    try { exeTime = new Date(fs.statSync(this.p.gameExe).mtimeMs).toLocaleString(); } catch (e) {}
    lines.push('게임 실행 파일 날짜: ' + exeTime, '모드 켜짐: ' + s.modOn, '안전 모드: ' + s.safe, '꺼 둔 기능: ' + (s.off.join(', ') || '없음'));
    const st = this.lastStep();
    lines.push('모드의 마지막 작업: ' + (st ? st.name + ' (' + new Date(st.at).toLocaleString() + ')' : '없음'), '');
    lines.push('== 최근 튕김 ==');
    for (const c of this.st.crashes.slice(-5)) lines.push(new Date(c.at).toLocaleString() + ' | 모드 관련: ' + c.mod + ' | 작업: ' + (c.step || '-') + ' | 버전: ' + c.version + ' | ' + c.msg);
    const lastDir = Object.keys(this.st.seen).sort((a, b) => this.st.seen[a] - this.st.seen[b]).pop();
    if (lastDir) { const ci = this.readCrash(lastDir); lines.push('', '== 마지막 튕김의 호출 순서 ==', ci.stack.replace(/<[^>]+>/g, '').trim().slice(0, 3000)); }
    const logNow = readText(this.p.ue4ssLog, 6e5), logOld = readText(this.p.logCopy, 6e5);
    const pick = t => t.split(/\r?\n/).filter(l => /IcarusHUD|error|Error|fatal|Fatal|exception|Exception|failed/i.test(l)).slice(-120).join('\n');
    lines.push('', '== 모드 기록 (지난 실행) ==', pick(logOld) || '(없음)', '', '== 모드 기록 (지금 실행) ==', pick(logNow) || '(없음)');
    return scrub(lines.join('\n'));
  }
}

module.exports = { Doctor, FEAT_KO };
