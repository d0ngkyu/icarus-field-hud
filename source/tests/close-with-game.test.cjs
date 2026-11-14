// Run with: node --test source/tests/close-with-game.test.cjs (no Electron install needed).
// Checks game exit, auto-launch, diagnosis failures and update coordination.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const appDir = path.resolve(__dirname, '../app');

function harness({ cfgClose = true, note = null, recentNote = false, auto = false } = {}) {
  let tick, running = true, quit = 0, shown = 0, tasklistFails = false;
  const ctx = {
    module: { exports: {} }, __dirname: appDir, Buffer, console,
    process: { env: {}, execPath: process.execPath, platform: 'win32', argv: auto ? ['--icarus-auto'] : [] },
    setInterval: (f, ms) => { if (ms === 3000) tick = f; }, setTimeout() {}, clearTimeout() {}, clearInterval() {},
    require: n => ({
      electron: {
        app: { requestSingleInstanceLock: () => true, disableHardwareAcceleration() {}, getPath: () => '', on() {},
          whenReady: () => ({ then() {} }), quit: () => { quit++; } },
        ipcMain: { handle() {} }, screen: { getAllDisplays: () => [] },
      },
      fs: { readFileSync() { throw Error('none'); }, appendFileSync() {}, writeFileSync() {}, mkdirSync() {} },
      './updater.js': {}, './package.json': { updateUrl: 'https://example.invalid' },
      child_process: { execFile: (c, a, o, cb) => cb(tasklistFails ? Error('no') : null, running ? 'Icarus-Win64-Shipping.exe 123' : 'INFO: No tasks') },
    }[n] ?? require(n)),
  };
  ctx.exports = ctx.module.exports;
  const extra = `cfg.closeWithGame = ${cfgClose}; win = { isMinimized: () => false, show() {}, focus() {}, isDestroyed: () => false, webContents: { send() {} } };
    showWin = () => { globalThis.__shown = (globalThis.__shown || 0) + 1; };
    doctor = { check: () => (${JSON.stringify(note)}) }; ${recentNote ? 'lastNoteAt = Date.now();' : ''} watchGame();`;
  vm.runInNewContext(fs.readFileSync(path.join(appDir, 'main.js'), 'utf8').replace(/^function showWin/m, 'var showWin = function') + '\n' + extra, ctx);
  const step = async () => { await tick(); await new Promise(r => setImmediate(r)); };
  return { step, run: code => vm.runInContext(code, ctx), set running(v) { running = v; }, set fail(v) { tasklistFails = v; }, quit: () => quit, shown: () => ctx.__shown || 0 };
}

test('quits after the game it saw has been gone for two checks', async () => {
  const h = harness();
  await h.step(); assert.equal(h.quit(), 0);
  h.running = false;
  await h.step(); assert.equal(h.quit(), 0);
  await h.step(); assert.equal(h.quit(), 1);
});

test('never quits if the game was not seen (HUD opened by itself)', async () => {
  const h = harness(); h.running = false;
  for (let i = 0; i < 5; i++) await h.step();
  assert.equal(h.quit(), 0);
});

test('auto-launched HUD exits even if the game closed before its first check', async () => {
  const h = harness({ auto: true }); h.running = false;
  await h.step(); assert.equal(h.quit(), 0);
  await h.step(); assert.equal(h.quit(), 1);
});

test('stays open when the setting is off, or when Windows cannot be asked', async () => {
  const off = harness({ cfgClose: false });
  await off.step(); off.running = false; await off.step(); await off.step(); await off.step();
  assert.equal(off.quit(), 0);
  const h = harness(); await h.step(); h.fail = true; h.running = false;
  await h.step(); await h.step(); await h.step();
  assert.equal(h.quit(), 0);
});

test('crash notices do not keep Steam running after the game has exited', async () => {
  const h = harness({ note: { level: 1, text: '튕김' } });
  await h.step(); h.running = false; await h.step(); await h.step();
  assert.equal(h.quit(), 1); assert.equal(h.shown(), 0);
  const r = harness({ recentNote: true });
  await r.step(); r.running = false; await r.step(); await r.step();
  assert.equal(r.quit(), 1); assert.equal(r.shown(), 0);
});

test('an unknown process check breaks consecutive absence', async () => {
  const h = harness(); await h.step(); h.running = false; await h.step();
  h.fail = true; await h.step(); h.fail = false;
  await h.step(); assert.equal(h.quit(), 0);
  await h.step(); assert.equal(h.quit(), 1);
});

test('failed crash diagnosis logs the failure without leaving a Steam child alive', async () => {
  const h = harness(); await h.step(); h.running = false; await h.step();
  h.run('doctor.check = () => { throw new Error("crash directory unavailable"); }');
  await h.step(); assert.equal(h.quit(), 1);
});

test('game exit waits for a pending update and duplicate requests share that update', async () => {
  const h = harness(); await h.step(); h.running = false;
  h.run(`gameDir = 'test'; UPD.update = () => { globalThis.updateCalls = (globalThis.updateCalls || 0) + 1; return new Promise(r => { globalThis.finishUpdate = r; }); }; UPD.registerApp = () => {};`);
  h.run(`globalThis.pending = runUpdate(false); globalThis.duplicate = runUpdate(true);`);
  await new Promise(r => setImmediate(r));
  assert.equal(h.run('updateCalls'), 1);
  await h.step(); await h.step(); assert.equal(h.quit(), 0);
  h.run(`finishUpdate({ version: 'test', changed: [], skipped: [], appChanged: false });`);
  await h.run('Promise.all([pending, duplicate])');
  h.run(`UPD.update = async () => ({version:'test',changed:[],skipped:[],appChanged:false});`);
  await h.step(); await h.step(); assert.equal(h.quit(), 1);
});

test('running game and failed process query defer updates before any write',async()=>{
  const h=harness();h.run(`gameDir='test';UPD.update=()=>{throw Error('must not update');};`);
  assert.equal(await h.run('runUpdate(false)'),null);
  h.running=false;h.fail=true;assert.equal(await h.run('runUpdate(false)'),null);
});
