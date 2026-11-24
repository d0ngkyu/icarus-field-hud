'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), zlib = require('node:zlib');
const { snapshot, fromSave, MAX_AGE } = require('../experimental/map-share/protocol.cjs');
const { createReader } = require('../experimental/map-share/snapshot.cjs');
const { ShareClient, loopbackTransport } = require('../experimental/map-share/client.cjs');
const { createRelay } = require('../experimental/map-share/relay.cjs');
const time = 1800000000000, world = 'Terrain_019';
const data = (savedAt = time - 5000) => ({ v: 1, world, savedAt, veins: [['Iron', 10, 20, 30]], plants: [[40, 50, 60]] });
const ctx = (grant, scope = 'world-A') => ({ consent: true, scope, world: grant.world, role: grant.role, grant });
const save = () => ({ ...data(), scope: 'world-A', name: 'PRIVATE SAVE', accountId: 'PRIVATE ACCOUNT' });

test('map share: projection removes private save fields, canonicalizes rows and rejects invalid/stale data', () => {
  const d = fromSave(save(), { scope: 'world-A', world }, time);
  assert.deepEqual(d, data()); assert.ok(!JSON.stringify(d).includes('PRIVATE'));
  assert.throws(() => fromSave(save(), { scope: 'other', world }, time), /wrong-world/);
  for (const bad of [{ savedAt: time - MAX_AGE - 1 }, { savedAt: time + 120001 }, { world: 'unknown' },
    { veins: [['Iron', NaN, 0, 0]] }, { plants: Array(10001).fill([1, 2, 3]) }, { veins: [['Bad Name', 0, 0, 0]] }])
    assert.throws(() => snapshot({ ...data(), ...bad }, time));
  assert.equal(snapshot({ ...data(), veins: [...data().veins, ...data().veins] }, time).veins.length, 1);
});

test('map share: real loopback host publishes, two guests receive, another world room stays empty', async t => {
  const relay = createRelay({ now: () => time }); const endpoint = await relay.listen(); t.after(() => relay.close());
  const wire = loopbackTransport(endpoint), received = [[], [], []]; let uploads = 0, clears = 0;
  const host = new ShareClient({ now: () => time, readSave: async () => save(), transport: (...args) => { uploads++; return wire(...args); } });
  host.setContext(ctx(relay.issue('world-A', world, 'host')));
  const guests = received.map((out, i) => {
    const c = new ShareClient({ now: () => time, transport: wire, onSnapshot: x => out.push(x), onClear: () => clears++ });
    c.setContext(ctx(relay.issue(i === 2 ? 'world-B' : 'world-A', world, 'guest'), i === 2 ? 'world-B' : 'world-A')); return c;
  });
  assert.equal(await host.tick(), true);
  for (const c of guests) await c.tick();
  assert.deepEqual(received, [[data()], [data()], []]); assert.equal(guests[2].status, 'waiting-for-host');
  await host.tick(); assert.equal(uploads, 1, 'cadence suppresses redundant work');
  assert.equal(clears, 3); host.close(); guests.forEach(c => c.close());
});

test('map share: relay enforces guest read-only, revocation, monotonic saves and room isolation', async t => {
  const relay = createRelay({ now: () => time }), wire = loopbackTransport(await relay.listen()); t.after(() => relay.close());
  const h = relay.issue('A', world, 'host'), g = relay.issue('A', world, 'guest');
  await assert.rejects(wire('PUT', g.token, data()), /403/);
  await wire('PUT', h.token, data());
  await assert.rejects(wire('PUT', h.token, data(time - 6000)), /409/);
  await assert.rejects(wire('PUT', h.token, { ...data(), plants: [] }), /409/);
  await assert.rejects(wire('PUT', h.token, { ...data(), world: 'Terrain_016' }), /403/);
  relay.revoke(g.token); await assert.rejects(wire('GET', g.token), /401/);
  relay.issue('A', world, 'host'); await assert.rejects(wire('PUT', h.token, data()), /401/);
  await assert.rejects(wire('GET', 'a'.repeat(64)), /401/);
});

test('map share: old response is discarded after switching servers and shared display is cleared', async () => {
  let release, clears = 0; const received = [];
  const grant = { token: 'a'.repeat(64), role: 'guest', scope: 'world-A', world, expiresAt: time + 60000 };
  const c = new ShareClient({ now: () => time, transport: () => new Promise(r => { release = r; }), onSnapshot: x => received.push(x), onClear: () => clears++ });
  c.setContext(ctx(grant)); const running = c.tick(); c.setContext(ctx({ ...grant, scope: 'world-B', token: 'b'.repeat(64) }, 'world-B'));
  release(data()); await running; assert.equal(received.length, 0); assert.equal(clears, 2); assert.equal(c.status, 'waiting');
});

test('map share: switch while save is read prevents uploading to former room', async () => {
  let release, uploads = 0;
  const grant = { token: 'a'.repeat(64), role: 'host', scope: 'world-A', world, expiresAt: time + 60000 };
  const c = new ShareClient({ now: () => time, readSave: () => new Promise(r => { release = r; }), transport: async () => uploads++ });
  c.setContext(ctx(grant)); const p = c.tick(); c.close(); release(save()); await p;
  assert.equal(uploads, 0); assert.equal(c.status, 'disabled');
});

test('map share: consent and valid grants required; wrong-world save never transmitted', async () => {
  let calls = 0;
  const grant = { token: 'a'.repeat(64), role: 'host', scope: 'world-A', world, expiresAt: time + 60000 };
  const c = new ShareClient({ now: () => time, readSave: async () => ({ ...save(), scope: 'wrong' }), transport: async () => calls++ });
  c.setContext({ ...ctx(grant), consent: false }); await c.tick(); assert.equal(c.status, 'disabled');
  c.setContext(ctx({ ...grant, expiresAt: time })); await c.tick(); assert.equal(c.status, 'disabled');
  c.setContext({ ...ctx(grant), scope: 'world-B' }); await c.tick(); assert.equal(c.status, 'disabled', 'old grant cannot follow the user into another world');
  c.setContext({ ...ctx(grant), role: 'guest' }); await c.tick(); assert.equal(c.status, 'disabled', 'role must match issued permission');
  c.setContext(ctx(grant)); await c.tick(); assert.equal(c.status, 'unavailable'); assert.equal(calls, 0);
  assert.throws(() => loopbackTransport('https://example.com/'), /loopback-only/);
  assert.throws(() => loopbackTransport('http://127.0.0.1:1234/?token=abc'), /loopback-only/);
});

test('map share: retries back off, simultaneous ticks do not overlap and unchanged saves do not upload again', async () => {
  let now = time, calls = 0, release;
  const grant = { token: 'a'.repeat(64), role: 'host', scope: 'world-A', world, expiresAt: time + 3600000 };
  const c = new ShareClient({ now: () => now, readSave: async () => save(), transport: async () => { calls++; if (calls === 1) throw Error('offline'); } });
  c.setContext(ctx(grant)); await c.tick(); assert.equal(c.nextAt, time + 60000);
  now += 30000; await c.tick(); assert.equal(calls, 1);
  now += 30000; await c.tick(); assert.equal(calls, 2); assert.equal(c.status, 'published');
  now += 30000; await c.tick(); assert.equal(calls, 2);
  c.readSave = () => new Promise(r => { release = r; }); now += 30000;
  const p = c.tick(); assert.equal(await c.tick(), false); release(save()); await p; assert.equal(calls, 2);
});

test('map share: transport timeout recovers without permanently locking the client', async () => {
  const grant = { token: 'a'.repeat(64), role: 'guest', scope: 'world-A', world, expiresAt: time + 60000 };
  const c = new ShareClient({ now: () => time, timeout: 10, transport: (_m, _t, _d, signal) => new Promise((_r, reject) => signal.addEventListener('abort', () => reject(Error('timeout')), { once: true })) });
  c.setContext(ctx(grant)); assert.equal(await c.tick(), false); assert.equal(c.busy, false); assert.equal(c.status, 'unavailable');
});

test('map share: expired room data is not returned as current', async t => {
  let now = time; const relay = createRelay({ now: () => now }); const wire = loopbackTransport(await relay.listen()); t.after(() => relay.close());
  const h = relay.issue('A', world, 'host'), g = relay.issue('A', world, 'guest');
  await wire('PUT', h.token, data()); now += MAX_AGE; assert.equal(await wire('GET', g.token), null);
  now += 3600000; await assert.rejects(wire('GET', g.token), /401/);
});

function localFile(scope) { return JSON.stringify({ ProspectInfo: { ProspectID: scope }, BinaryBlob: zlib.deflateSync(Buffer.from('/Game/Maps/Terrain_019')).toString('base64') }); }
test('map share: reader selects matching world rather than newest unrelated save, and never writes saves', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'map-share-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, 'Icarus', 'Saved', 'PlayerData', 'test', 'Prospects'); fs.mkdirSync(dir, { recursive: true });
  for (const [name, scope, age] of [['A', 'world-A', 10000], ['B', 'world-B', 5000]]) {
    const file = path.join(dir, name + '.json'); fs.writeFileSync(file, localFile(scope)); fs.utimesSync(file, (time - age) / 1000, (time - age) / 1000);
  }
  const file = path.join(dir, 'A.json'), before = fs.readFileSync(file), read = createReader({ now: () => time });
  const result = await read(root, { scope: 'world-A', world }); assert.equal(result.scope, 'world-A');
  assert.deepEqual(fs.readFileSync(file), before); assert.equal(await read(root, { scope: 'absent', world }), null);
  fs.writeFileSync(file, '{partial'); fs.utimesSync(file, time / 1000, time / 1000);
  assert.equal(await read(root, { scope: 'world-A', world }), null, 'recent/incomplete write not reused from cache');
});

test('map share: reader detects modification during parsing and cancellation', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'map-share-race-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'save.json'); fs.writeFileSync(file, localFile('world-A')); fs.utimesSync(file, (time - 5000) / 1000, (time - 5000) / 1000);
  const read = createReader({ now: () => time, list: () => [{ p: file, mtime: time - 5000 }], parse: async () => { fs.appendFileSync(file, 'changed'); return save(); } });
  assert.equal(await read(root, { scope: 'world-A', world }), null);
  const ac = new AbortController(); ac.abort(); assert.equal(await read(root, { scope: 'world-A', world }, ac.signal), null);
});
