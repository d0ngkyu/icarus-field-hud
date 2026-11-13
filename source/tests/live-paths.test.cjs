// Run with: node --test source/tests/live-paths.test.cjs (no Electron install needed).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const crypto = require('node:crypto');
const appDir = path.resolve(__dirname, '../app');

function load(name, mocks = {}, extra = '') {
  const module = { exports: {} };
  const context = {
    module, exports: module.exports, __dirname: appDir, Buffer, console,
    process: { env: {}, execPath: process.execPath },
    require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    ...mocks.globals,
  };
  vm.runInNewContext(fs.readFileSync(path.join(appDir, name), 'utf8') + '\n' + extra, context);
  return context;
}

test('preload buffers the latest initial message once, preserving all public APIs', () => {
  const listeners = {};
  let api;
  load('preload.js', { electron: {
    ipcRenderer: { on: (n, fn) => { listeners[n] = fn; }, invoke: () => Promise.resolve() },
    contextBridge: { exposeInMainWorld: (n, value) => { assert.equal(n, 'hudApp'); api = value; } },
  } });
  const received = [];
  listeners.live(null, 'old'); listeners.live(null, 'latest');
  api.onLive(value => received.push(value));
  listeners.live(null, 'next');
  api.onLive(value => received.push(value));
  assert.deepEqual(received, ['latest', 'next']);
  assert.throws(() => api.onLive(null));
  assert.deepEqual(Object.keys(api).sort(), [
    'state', 'toggleTop', 'toggleCompact', 'minimize', 'hide', 'info', 'setMacros',
    'checkUpdate', 'diagStatus', 'diagReport', 'setSafe', 'setModOn', 'onState',
    'onLive', 'onUpd', 'onDiag',
  ].sort());
  const diag = []; listeners.diag(null, 'notice'); api.onDiag(v => diag.push(v));
  assert.deepEqual(diag, ['notice']);
});

function liveHarness(mode) {
  let tick, reads = 0, stats = 0, attempts = 0, destroyed = false, pending;
  const events = {}, sent = [];
  const txt = 'window.__icarusLive&&window.__icarusLive({"t":1});';
  const win = {
    setAlwaysOnTop() {}, loadFile() {}, on() {}, once() {}, isDestroyed: () => destroyed,
    webContents: { on: (n, f) => { events[n] = f; }, setWindowOpenHandler() {}, send(n, value) {
      attempts++;
      if (mode === 'send-error' && attempts === 1) throw Error('unavailable');
      assert.equal(n, 'live'); sent.push(value);
    } },
  };
  const fakeFs = {
    readFileSync() { throw Error('no settings'); }, statSync() { throw Error('not needed'); },
    stat(p, cb) {
      stats++;
      cb(mode === 'stat-error' && stats === 1 ? Error('busy') : null,
        { mtimeMs: mode === 'changed-during-read' && stats === 2 ? 2 : 1, size: 50 });
    },
    readFile(p, encoding, cb) {
      reads++;
      if (mode === 'defer' && reads === 1) { pending = () => cb(null, txt); return; }
      const value = reads === 1 && mode === 'empty' ? '' : reads === 1 && mode === 'partial' ? 'window.__icarusLive({' : txt;
      cb(mode === 'read-error' && reads === 1 ? Error('busy') : null, value);
    },
  };
  load('main.js', { electron: {
    app: { requestSingleInstanceLock: () => true, disableHardwareAcceleration() {}, getPath: () => '', on() {}, whenReady: () => ({ then() {} }) },
    BrowserWindow: function () { return win; }, ipcMain: { handle() {} }, screen: { getAllDisplays: () => [] },
  }, fs: fakeFs, './updater.js': {}, './package.json': {}, globals: {
    setInterval: (f, ms) => { if (ms === 200) tick = f; }, setTimeout() {}, clearTimeout() {}, clearInterval() {},
  } }, "createWindow('fixture/index.html');");
  return { tick: () => tick(), reload: () => events['did-finish-load'](), release: () => pending(),
    destroy: () => { destroyed = true; }, sent, reads: () => reads };
}
for (const mode of ['read-error', 'stat-error', 'empty', 'partial', 'send-error', 'changed-during-read']) {
  test('live retries ' + mode + ' and replays unchanged state after reload', () => {
    const h = liveHarness(mode); h.tick(); assert.equal(h.sent.length, 0);
    h.tick(); assert.equal(h.sent.length, 1);
    const reads = h.reads(); h.tick(); assert.equal(h.reads(), reads);
    h.reload(); assert.equal(h.sent.length, 2);
  });
}
test('reload during an asynchronous read does not acknowledge the old generation', () => {
  const h = liveHarness('defer'); h.tick(); h.reload(); h.release();
  assert.equal(h.sent.length, 0); h.tick(); assert.equal(h.sent.length, 1);
});
test('a window closed during a read receives no IPC', () => {
  const h = liveHarness('defer'); h.tick(); h.destroy(); h.release();
  assert.equal(h.sent.length, 0);
});

function updater(mocks = {}) {
  return load('updater.js', { electron: {}, ...mocks }, 'globalThis.targetForTest = target; globalThis.shortForTest = shortPath;');
}
for (const flavor of ['win32', 'posix']) {
  test('update paths: ' + flavor + ' blocks traversal and Windows special names', () => {
    const platformPath = path[flavor], root = flavor === 'win32' ? 'C:\\Games\\Icarus' : '/games/Icarus';
    const u = updater({ path: platformPath });
    assert.equal(u.targetForTest(root, 'game/Icarus/hud/index.html'), platformPath.resolve(root, 'Icarus/hud/index.html'));
    assert.equal(u.targetForTest(root, 'app/main.js'), platformPath.resolve(appDir, 'main.js'));
    assert.equal(u.targetForTest(root, 'unknown/file'), null);
    for (const p of ['game/../outside', 'app/../../outside', 'game/..\\outside', 'game//host/share',
      'game/C:/outside', 'game/file:stream', 'game/a./x', 'game/a /x', 'game/CON.txt', 'game/NUL',
      'game/COM1.log', 'game/LPT9', 'game/', 'game/./file', 'game/a\u0000b', 'game/a?b', null, 42]) {
      assert.throws(() => u.targetForTest(root, p), String(p));
    }
  });
}
test('all current release manifest paths remain accepted', () => {
  const u = updater();
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../manifest.json')));
  for (const f of manifest.files) assert.ok(u.targetForTest(appDir, f.p), f.p);
});
test('game discovery tolerates malformed saved configuration and rejects a directory named exe', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hud-path-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const exe = path.join(dir, 'Icarus/Binaries/Win64/Icarus-Win64-Shipping.exe'); fs.mkdirSync(path.dirname(exe), { recursive: true });
  const u = updater({ child_process: { execFileSync() { throw Error('registry unavailable'); } } });
  for (const d of [null, undefined, {}, 5, '']) assert.equal(u.module.exports.isGame(d), false);
  fs.mkdirSync(exe); assert.equal(u.module.exports.isGame(dir), false); fs.rmdirSync(exe);
  fs.writeFileSync(exe, 'fixture'); assert.equal(u.module.exports.isGame(dir), true);
  u.process.env.HUD_GAME_DIR = dir; assert.equal(u.module.exports.findGame(null), dir);
  delete u.process.env.HUD_GAME_DIR; assert.equal(u.module.exports.findGame({ game: dir }), dir);
});
test('registerApp preserves an external executable in a sibling with the same prefix', () => {
  const writes = [], deleted = [], p = path.win32, game = 'C:\\Games\\Icarus';
  const u = updater({ path: p, fs: {
    existsSync: () => true, readFileSync: () => '', writeFileSync: (f, text) => writes.push([f, text]), unlinkSync: f => deleted.push(f),
  }, child_process: { execFileSync() { throw Error('no short path'); } } });
  const md = u.module.exports.modDir(game);
  u.process.execPath = md + '-other\\IcarusHUD.exe'; u.module.exports.registerApp(game);
  assert.equal(writes.length, 1); assert.equal(deleted.length, 0); assert.ok(writes[0][1].startsWith(u.process.execPath));
  u.process.execPath = p.join(md, 'custom', 'IcarusHUD.exe'); u.module.exports.registerApp(game); assert.equal(writes.length, 2);
  u.process.execPath = p.join(md, 'app', 'IcarusHUD.exe'); u.module.exports.registerApp(game); assert.equal(deleted.length, 1);
});
test('shortPath never sends command syntax to cmd', () => {
  let calls = 0;
  const u = updater({ child_process: { execFileSync() { calls++; return 'C:\\SHORT\\HUD.exe'; } }, fs: { existsSync: () => true } });
  for (const p of ['C:\\a%PATH%\\HUD.exe', 'C:\\a&b\\HUD.exe', 'C:\\a!b\\HUD.exe', 'C:\\a"b\\HUD.exe', 'C:\\a\nb\\HUD.exe']) assert.equal(u.shortForTest(p), p);
  assert.equal(calls, 0); assert.equal(u.shortForTest('C:\\한글 폴더\\HUD.exe'), 'C:\\SHORT\\HUD.exe'); assert.equal(calls, 1);
});
test('update writes a valid payload, skips unchanged/once files, rejects a bad checksum and traversal', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hud-update-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const payload = Buffer.from('fixture'), hash = crypto.createHash('sha1').update(payload).digest('hex');
  let downloads = 0;
  const manifest = { version: 'test', files: [{ p: 'game/data.txt', n: payload.length, h: hash }] };
  const u = updater({ electron: { net: { fetch: async url => String(url).includes('manifest.json')
    ? { ok: true, json: async () => manifest }
    : { ok: true, arrayBuffer: async () => { downloads++; return payload; } } } } }).module.exports;
  let r = await u.update(dir, 'https://mock.invalid'); assert.equal(r.changed.length, 1);
  r = await u.update(dir, 'https://mock.invalid'); assert.equal(r.changed.length, 0); assert.equal(downloads, 1);
  manifest.files[0].once = 1; fs.writeFileSync(path.join(dir, 'data.txt'), 'keep');
  await u.update(dir, 'https://mock.invalid'); assert.equal(fs.readFileSync(path.join(dir, 'data.txt'), 'utf8'), 'keep');
  manifest.files = [{ p: 'game/bad.txt', n: 1, h: 'bad' }]; r = await u.update(dir, 'https://mock.invalid');
  assert.equal(r.skipped.length, 1); assert.equal(fs.existsSync(path.join(dir, 'bad.txt')), false);
  manifest.files = [{ p: 'game/../escaped.txt' }]; const before = downloads;
  await assert.rejects(u.update(dir, 'https://mock.invalid')); assert.equal(downloads, before);
});
