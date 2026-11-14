// Icarus Field HUD - desktop shell around the HUD page in the mod folder
const { net, app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

if (!app.requestSingleInstanceLock()) { app.quit(); }
// leave the graphics card to the game: this window is simple enough to draw on the CPU
app.disableHardwareAcceleration();

const cfgFile = () => path.join(app.getPath('userData'), 'settings.json');
let cfg = { top: false, compact: false, closeWithGame: true, full: { width: 1400, height: 900 }, small: { width: 460, height: 760 }, hud: null };
try { cfg = Object.assign(cfg, JSON.parse(fs.readFileSync(cfgFile(), 'utf8'))); } catch (e) {}
const saveCfg = () => { try { fs.mkdirSync(path.dirname(cfgFile()), { recursive: true }); fs.writeFileSync(cfgFile(), JSON.stringify(cfg, null, 1)); } catch (e) {} };

const UPD = require('./updater.js');
const PKG = (() => { try { return require('./package.json'); } catch (e) { return {}; } })();
const UPDATE_URL = process.env.HUD_UPDATE_URL || PKG.updateUrl || '';
function installedVersion(){try{return fs.readFileSync(path.join(UPD.modDir(gameDir),'version.txt'),'utf8').trim()||PKG.contentVersion||'';}catch(e){return PKG.contentVersion||'';}}
let gameDir = null, lastUpd = null, lastLiveAt = 0, doctor = null;
let lastNoteAt = 0;
const sendDiag = n => { lastNoteAt = Date.now(); ulog('diag: ' + n.text); if (win && !win.isDestroyed()) win.webContents.send('diag', n); };
const hudFile = () => gameDir && path.join(UPD.modDir(gameDir), 'hud', 'index.html');
const logFile = () => path.join(app.getPath('userData'), 'update.log');
const ulog = t => { try { fs.appendFileSync(logFile(), new Date().toISOString() + ' ' + t + '\n'); } catch (e) {} };

const onScreen = b => b && b.x !== undefined && screen.getAllDisplays().some(d => {
  const a = d.workArea; return b.x < a.x + a.width - 60 && b.x + b.width > a.x + 60 && b.y >= a.y - 10 && b.y < a.y + a.height - 60;
});

// Usage rank: reuse the existing game watcher; never scan the game for this badge.
let activityTracker = null;
let usageSample = null, usageActive = false, usageSavedAt = 0, usageSession = 0;
const usageTitles = [[1,'갓 내린 신입'],[2,'돌멩이 수집가'],[3,'모닥불 지박령'],[5,'동굴 전세입자'],[7,'나무꾼 출신'],[10,'폭풍 단골손님'],[13,'광맥 감별사'],[16,'제작대 집주인'],[20,'이카루스 현지인'],[25,'보급품 감별사'],[30,'귀환 연기 전문가'],[35,'산소통 단골'],[40,'행성 생활 만렙각'],[50,'동굴 건물주'],[60,'폭풍도 구독 중'],[70,'귀환선 환불러'],[80,'행성 명예주민'],[90,'개척자 원로'],[95,'지구는 잠시 로그아웃'],[100,'이 행성 건물주']];
const usageNumber = n => Number.isFinite(n) && n > 0 ? n : 0;
function usageInfo() {
  const seconds = usageNumber(cfg.hudUseSeconds), level = Math.min(100, 1 + Math.floor(seconds / 3600));
  if(!Array.isArray(cfg.hudEarnedTitles)){cfg.hudEarnedTitles=usageTitles.filter(([lv])=>seconds>=(lv-1)*3600).map(([lv])=>'rank-'+lv);for(const [id,value,goal]of [['secret-session',cfg.hudMaxSession,7200],['secret-night',cfg.hudNightSeconds,3600],['secret-thirty',seconds,108000],['secret-return',seconds,180000]])if(usageNumber(value)>=goal)cfg.hudEarnedTitles.push(id);}
  const earned=new Set(cfg.hudEarnedTitles);
  const titles = usageTitles.map(([lv,title])=>({id:'rank-'+lv,title,level:lv,goal:(lv-1)*4500,value:seconds,unlocked:earned.has('rank-'+lv)||seconds>=(lv-1)*4500,hidden:false,description:'누적 '+((lv-1)*1.25)+'시간 함께 사용'}));
  const secrets = [
    {id:'secret-session',title:'잠깐만 한다며',goal:10800,value:usageNumber(cfg.hudMaxSession),description:'한 번에 3시간 함께 사용',hint:'짧게 하기로 했던 약속'},
    {id:'secret-night',title:'내일의 나야 미안',goal:5400,value:usageNumber(cfg.hudNightSeconds),description:'자정부터 새벽 5시 사이 누적 1.5시간 사용',hint:'모두 잠든 시간의 개척자'},
    {id:'secret-thirty',title:'처음엔 재미없다 했잖아',goal:162000,value:seconds,description:'누적 45시간 함께 사용',hint:'첫인상은 오래가지 않죠'},
    {id:'secret-return',title:'귀환 버튼 어디 갔지',goal:270000,value:seconds,description:'누적 75시간 함께 사용',hint:'지구행 표를 어디 뒀더라'}
  ].map(x=>({...x,hidden:true,unlocked:earned.has(x.id)||x.value>=x.goal}));
  const achievements=[...titles,...secrets,...(activityTracker?activityTracker.info().achievements:[])], automatic=titles.filter(t=>t.unlocked).pop();
  cfg.hudEarnedTitles=[...new Set([...earned,...titles.concat(secrets).filter(t=>t.unlocked).map(t=>t.id)])];
  const selected=achievements.find(t=>t.id===cfg.hudTitleId&&t.unlocked)||automatic;
  const next=titles.find(t=>!t.unlocked);
  return {activity:activityTracker?activityTracker.info():null,seconds,level,title:selected.title,selectedId:selected.id,automatic:!achievements.some(t=>t.id===cfg.hudTitleId&&t.unlocked),achievements:achievements.map(t=>t.hidden&&!t.unlocked?{id:t.id,hidden:true,unlocked:false,title:'???',hint:t.hint}:t),nextTitle:next?.title||null,nextTitleSeconds:next?Math.max(0,next.goal-seconds):0,nextLevelSeconds:level<100?Math.max(0,level*3600-seconds):0};
}
function sampleUsage(up, now = Date.now()) {
  const elapsed = usageSample === null ? 0 : now - usageSample;
  const valid = up === true && usageActive && elapsed > 0 && elapsed <= 10000;
  if (valid) {
    cfg.hudUseSeconds = usageNumber(cfg.hudUseSeconds) + elapsed/1000;
    usageSession += elapsed/1000;
    cfg.hudMaxSession = Math.max(usageNumber(cfg.hudMaxSession),usageSession);
    if(new Date(now).getHours()<5)cfg.hudNightSeconds=usageNumber(cfg.hudNightSeconds)+elapsed/1000;
  } else usageSession=0;
  const wasActive = usageActive;
  usageSample = now; usageActive = up === true;
  if ((usageActive && now - usageSavedAt >= 60000) || (wasActive && !usageActive)) { saveCfg(); usageSavedAt = now; }
}
// End usage rank

let win = null, tray = null, quitting = false;
const iconPath = path.join(__dirname, 'icon.png');

function state() { return { top: win && !win.isDestroyed() && typeof win.isAlwaysOnTop === 'function' ? win.isAlwaysOnTop() : cfg.top, compact: cfg.compact }; }

function createWindow(hud) {
  const b = cfg.compact ? cfg.small : cfg.full;
  win = new BrowserWindow({
    width: b.width, height: b.height, ...(onScreen(b) ? { x: b.x, y: b.y } : {}),
    minWidth: 380, minHeight: 300, frame: false, backgroundColor: '#080b0e', title: 'Icarus Field HUD',
    icon: iconPath, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: true, spellcheck: false },
  });
  win.setAlwaysOnTop(cfg.top, cfg.top ? 'screen-saver' : 'normal');
  win.loadFile(hud);
  // push game updates to the page: only a cheap file check here, no page polling
  const live = path.join(path.dirname(hud), 'live.js');
  const liveWindow = win;
  const { Script } = require('vm');
  let lastSig = '', busy = false, loadGeneration = 0;
  const tick = () => {
    if (busy || liveWindow.isDestroyed()) return;
    busy = true;
    const generation = loadGeneration;
    fs.stat(live, (err, st) => {
      if (err) { busy = false; return; }
      const sig = st.mtimeMs + ':' + st.size;
      if (sig === lastSig) { busy = false; return; }
      fs.readFile(live, 'utf8', (e2, txt) => {
        if (e2 || !txt || !txt.trim()) { busy = false; return; }
        // Lua overwrites this file in place. Do not consume a partial script.
        try { new Script(txt); } catch (e) { busy = false; return; }
        fs.stat(live, (e3, after) => {
          busy = false;
          if (e3 || generation !== loadGeneration || liveWindow.isDestroyed()) return;
          if (sig !== after.mtimeMs + ':' + after.size) return;
          try { liveWindow.webContents.send('live', txt); } catch (e) { return; }
          // Parse the existing JSON envelope, never execute it for achievements.
          if(activityTracker){try{const match=txt.trim().match(/^window\.__icarusLive&&window\.__icarusLive\((\{[\s\S]*\})\);?$/);if(match)activityTracker.position(JSON.parse(match[1]),usageActive);}catch{}}
          lastSig = sig;
          // Preserve the existing update trigger, but only after a successful read.
          if (lastLiveAt && Date.now() - lastLiveAt > 120000) runUpdate(false);
          lastLiveAt = Date.now();
        });
      });
    });
  };
  const timer = setInterval(tick, 200);
  liveWindow.webContents.on('did-finish-load', () => {
    loadGeneration++;
    lastSig = '';
    tick();
  });
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
  liveWindow.once('ready-to-show', () => {if(!liveWindow.isDestroyed())liveWindow.show()});
  let t = null;
  const remember = () => { clearTimeout(t); t = setTimeout(() => {
    if (liveWindow.isDestroyed() || liveWindow.isMinimized() || liveWindow.isMaximized()) return;
    const nb = liveWindow.getBounds(); if (cfg.compact) cfg.small = nb; else cfg.full = nb; saveCfg();
  }, 400); };
  liveWindow.on('closed', () => { clearTimeout(t); if(win===liveWindow)win=null; });
  win.on('move', remember); win.on('resize', remember);
  win.on('close', e => { if (!quitting) { e.preventDefault(); win.hide(); } });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

function toggleTop() {
  if (!win || win.isDestroyed()) throw new Error('HUD 창이 없습니다.');
  const want = !state().top;
  win.setAlwaysOnTop(want, want ? 'screen-saver' : 'normal');
  if (want && typeof win.moveTop === 'function') win.moveTop();
  cfg.top = typeof win.isAlwaysOnTop === 'function' ? win.isAlwaysOnTop() : want;
  saveCfg(); buildTray();
  const next = state(); win.webContents.send('state', next); return next;
}
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
function showWin() { if (!win || win.isDestroyed()) return; if (win.isMinimized()) win.restore(); win.show(); win.focus(); }

function buildTray() {
  if (!tray) {
    tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
    tray.setToolTip('Icarus Field HUD');
    tray.on('click', () => (win && !win.isDestroyed() && win.isVisible() ? win.hide() : showWin()));
  }
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'HUD 열기', click: showWin },
    { label: '항상 위에 표시', type: 'checkbox', checked: cfg.top, click: () => { toggleTop(); win.webContents.send('state', state()); } },
    { label: '작게 보기', type: 'checkbox', checked: cfg.compact, click: () => { toggleCompact(); win.webContents.send('state', state()); } },
    { label: '게임 끄면 같이 끄기', type: 'checkbox', checked: cfg.closeWithGame !== false, click: m => { cfg.closeWithGame = m.checked; saveCfg(); } },
    { label: '업데이트 확인', click: () => runUpdate(true) },
    { type: 'separator' },
    { label: '종료', click: () => { quitting = true; app.quit(); } },
  ]));
}

let gameControlAction=null;
ipcMain.handle('gameControl',async (_e,action)=>{
 if(updateTask||restartPending)return {message:'HUD 업데이트가 끝난 뒤 다시 눌러 주세요.'};
 if(action==='exit'){const answer=await dialog.showMessageBox(win,{type:'warning',message:'호스트 게임을 종료할까요?',detail:'접속한 친구들도 연결이 끊깁니다. 게임에서 Esc 메뉴를 연 상태에서 저장 처리 확인 후 종료를 요청합니다.',buttons:['취소','저장 후 종료'],defaultId:0,cancelId:0});if(answer.response!==1)return {message:'종료 요청을 취소했습니다.'};}
 if(!gameControlAction)gameControlAction=require('./game-control.js').createControl({modDir:()=>gameDir&&UPD.modDir(gameDir),gameUp,openExternal:url=>shell.openExternal(url),saveRoot:process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,"Icarus","Saved","PlayerData"):null,progress:p=>{if(win&&!win.isDestroyed())win.webContents.send("game-progress",p)}});
 try{return await gameControlAction(action);}catch(error){return {status:'error',message:error.message||'요청을 처리하지 못했습니다. 게임 상태를 확인해 주세요.'};}
});
ipcMain.handle('setActivityEnabled', (_e,on) => {if(activityTracker)activityTracker.enable(on===true);return usageInfo();});
ipcMain.handle('setTitle', (_e,id) => { if(id==='auto'||usageInfo().achievements.some(t=>t.id===id&&t.unlocked)){cfg.hudTitleId=id==='auto'?null:id;saveCfg();}return usageInfo(); });
ipcMain.handle('state', () => state());
ipcMain.handle('toggleTop', () => toggleTop());
ipcMain.handle('toggleCompact', () => toggleCompact());
ipcMain.handle('minimize', () => win.minimize());
ipcMain.handle('hide', () => win.hide());
ipcMain.handle('info', () => ({ usage: usageInfo(), version: installedVersion(), app: app.getVersion(), game: gameDir, last: lastUpd && { at: lastUpd.at, changed: lastUpd.changed.length } }));
// ---------- problem check ----------
ipcMain.handle('diagStatus', () => (doctor ? doctor.status() : null));
ipcMain.handle('setSafe', (_e, on) => { if (doctor) doctor.setSafeMode(!!on); return doctor ? doctor.status() : null; });
ipcMain.handle('setModOn', async (_e, on) => { if (!doctor) return null; await doctor.setModOn(!!on); return doctor.status(); });
ipcMain.handle('diagReport', () => {
  if (!doctor) return null;
  const txt = doctor.report({ '데이터 버전': (lastUpd && lastUpd.version) || PKG.contentVersion || '-', '프로그램 버전': app.getVersion(), 'Windows': require('os').release() });
  const f = path.join(app.getPath('desktop'), 'IcarusHUD_보고서_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.txt');
  fs.writeFileSync(f, '\ufeff' + txt.replace(/\n/g, '\r\n'));
  shell.showItemInFolder(f);
  return f;
});
ipcMain.handle('checkUpdate', () => runUpdate(true).then(r => !!r));

app.on('second-instance', showWin);
app.on('before-quit', () => { if(activityTracker)activityTracker.stop();saveCfg(); quitting = true; });
app.on('window-all-closed', () => {});
// ---------- start: find the game, install on first run, then keep up to date ----------
let updateTask = null, restartPending = false;
function runUpdate(manual) {
  if (updateTask) return updateTask;
  if (restartPending) return Promise.resolve(lastUpd);
  updateTask = performUpdate(manual).finally(() => { updateTask = null; });
  return updateTask;
}
async function performUpdate(manual) {
  if (!UPDATE_URL || !gameDir) return null;
  try {
    if (process.platform === 'win32' && await gameUp() !== false) {
      ulog('update deferred: game is running or its state is unknown');
      if(manual && win && !win.isDestroyed())win.webContents.send('upd',{error:'게임 종료 후 업데이트를 적용합니다.',manual:true});
      return null;
    }
    const r = await UPD.update(gameDir, UPDATE_URL, ulog, async () => process.platform !== 'win32' || await gameUp() === false);
    if(r.deferred){ulog('update deferred: game started during download');return null;}
    lastUpd = { ...r, at: Date.now() };
    // Keep crash-disabled features and safe mode across updates. A changed Lua file
    // does not establish that the native crash has been fixed.
    ulog('update ' + r.version + ': ' + r.changed.length + ' changed, ' + r.skipped.length + ' skipped');
    UPD.registerApp(gameDir);
    if (win && !win.isDestroyed()) win.webContents.send('upd', { version: r.version, changed: r.changed, skipped: r.skipped, notes: r.notes, manual: !!manual });
    if (r.appChanged) {
      restartPending = true;
      ulog('program files changed, restarting');
      setTimeout(() => { quitting = true; if(activityTracker)activityTracker.stop();app.relaunch(); app.exit(0); }, 2500);
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
  ulog('startup: ' + __dirname + ' / closeWithGame=' + (cfg.closeWithGame !== false));
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
  activityTracker=require('./activity.js').create({state:cfg,save:saveCfg});activityTracker.boot();
  createWindow(hudFile()); buildTray();
  // keep an eye out for crashes: look every 30 s (cheap: a few folder listings)
  try {
    const { Doctor } = require('./diag.js');
    doctor = new Doctor(gameDir, UPD.modDir(gameDir), app.getPath('userData'), ulog);
    const look = () => { try { doctor.keepLog(); const n = doctor.check(installedVersion()); if (n) sendDiag(n); } catch (e) { ulog('diag failed: ' + e.message); } };
    setTimeout(look, 4000); setInterval(look, 30000);
  } catch (e) { ulog('diag not started: ' + e.message); }
  // on the PC that builds updates only: copy map level files out of the game, outside the game process
  try {
    const md = UPD.modDir(gameDir), out = path.join(md, 'caveraw');
    if (fs.existsSync(path.join(md, 'dev.txt')) && !fs.existsSync(path.join(out, 'done.txt'))) {
      const { Worker } = require('worker_threads');
      setTimeout(() => { try { new Worker(path.join(__dirname, 'levjob.js'), { workerData: { pakDir: path.join(gameDir, 'Icarus', 'Content', 'Paks'), outDir: out } }).on('error', e => ulog('level copy failed: ' + e.message)); } catch (e) { ulog('level copy failed: ' + e.message); } }, 20000);
    }
  } catch (e) {}
  // build PC only: whole-map cave list (cavejob.js). Checks every minute, so a new cavejob.json runs without a restart.
  try {
    const md = UPD.modDir(gameDir), out = path.join(md, 'mapcaves'), jobFile = path.join(md, 'cavejob.json');
    let running = false;
    const runCaves = () => {
      if (running || !fs.existsSync(path.join(md, 'dev.txt'))) return;
      // cavejob.js keeps one marker per job id, so a new cavejob.json (new id) runs without deleting anything
      let jid = null; try { jid = String(JSON.parse(fs.readFileSync(jobFile, 'utf8')).id || '1').replace(/[^\w-]/g, ''); } catch (e) {}
      const needA = !fs.existsSync(path.join(out, 'doneA2.txt')), needB = jid && !fs.existsSync(path.join(out, 'doneB_' + jid + '.txt'));
      if (!needA && !needB) return;
      running = true;
      const { Worker } = require('worker_threads');
      try {
        new Worker(path.join(__dirname, 'cavejob.js'), { workerData: { pakDir: path.join(gameDir, 'Icarus', 'Content', 'Paks'), outDir: out, jobFile } })
          .on('exit', () => { running = false; }).on('error', e => { running = false; ulog('cave copy failed: ' + e.message); });
      } catch (e) { running = false; ulog('cave copy failed: ' + e.message); }
    };
    setTimeout(runCaves, 25000); setInterval(runCaves, 60000);
  } catch (e) {}
  setInterval(() => runUpdate(false), 30 * 60 * 1000);
  watchGame();
}

// Steam tracks the game's child processes, including the HUD. Persist crash
// diagnostics and exit too, instead of keeping Steam in the "running" state.
function gameUp() {
  return new Promise(res => require('child_process').execFile('tasklist', ['/FI', 'IMAGENAME eq Icarus-Win64-Shipping.exe', '/NH'],
    { windowsHide: true, timeout: 5000 }, (e, out) => res(e ? null : /Icarus-Win64-Shipping/i.test(out || ''))));
}
function watchGame() {
  if (process.platform !== 'win32') return;
  let seen = (process.argv || []).includes('--icarus-auto'), gone = 0, busy = false;
  setInterval(async () => {
    if (busy || quitting || updateTask || restartPending) return;
    busy = true;
    try {
      const up = await gameUp();
      if (updateTask || restartPending || quitting) return;
      sampleUsage(up);
      if (up === null) { gone = 0; return; } // unknown is not a confirmed absence
      if (up) { seen = true; gone = 0; return; }
      if (!seen || cfg.closeWithGame === false || ++gone < 2) return;
      let note = null;
      try { if (doctor) note = doctor.check(installedVersion()); }
      catch (e) { ulog('exit diagnosis failed; original game crash files remain: ' + e.message); }
      if (note) ulog('exit diagnosis: ' + note.text);
      try { if (doctor) fs.writeFileSync(path.join(app.getPath('userData'), 'last-exit-report.txt'), doctor.report({reason:'game closed'})); }
      catch (e) { ulog('exit report failed: ' + e.message); }
      ulog('game closed: closing the HUD too');
      // Install only after the server session ended. A network failure is
      // logged by runUpdate and must not keep the HUD alive indefinitely.
      await runUpdate(false);
      if (restartPending) return;
      quitting = true; app.quit();
    } finally { busy = false; }
  }, 3000);
}
app.whenReady().then(start);


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
