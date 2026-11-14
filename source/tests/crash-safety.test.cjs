const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { Doctor } = require('../app/diag.js');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hud-doctor-'));
  const mod = path.join(root, 'mod');
  const user = path.join(root, 'user');
  fs.mkdirSync(mod); fs.mkdirSync(user);
  // Bypass first-install discovery of real machine crash folders.
  fs.writeFileSync(path.join(user, 'diag.json'), JSON.stringify({ init: 1 }));
  const d = new Doctor(root, mod, user);
  const crashes = path.join(root, 'crashes'); fs.mkdirSync(crashes);
  d.p.crashDirs = [crashes];
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  function crash(name, markerAge = 1000) {
    const dir = path.join(crashes, name); fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'CrashContext.runtime-xml'),
      '<ErrorMessage>EXCEPTION_ACCESS_VIOLATION</ErrorMessage><CallStack>UE4SS</CallStack>');
    const at = fs.statSync(dir).mtimeMs;
    fs.writeFileSync(d.p.step, `fog|${(at - markerAge) / 1000}`);
  }
  return { d, crash };
}

test('fresh fog crash disables fog and an update preserves quarantine after restart', t => {
  const { d, crash } = fixture(t);
  crash('first');
  assert.equal(d.check('v1').level, 1);
  assert.deepEqual(d.featuresOff(), ['fog']);
  d.setSafeMode(true);
  assert.equal(d.onNewVersion('v2'), false);
  const restarted = new Doctor('unused', d.p.mod, path.dirname(d.p.state));
  assert.deepEqual(restarted.featuresOff(), ['fog']);
  assert.equal(restarted.safeMode(), true);
  assert.equal(restarted.st.offVersion, 'v1');
});

for (const age of [600000, -10000]) {
  test(`marker ${age}ms from crash cannot falsely identify fog`, t => {
    const { d, crash } = fixture(t);
    crash('unmatched', age);
    assert.equal(d.check('v1').level, 2);
    assert.equal(d.st.crashes[0].step, null);
    assert.deepEqual(d.featuresOff(), []);
    assert.equal(d.safeMode(), true);
  });
}

test('new release does not erase repeated crash escalation', t => {
  const { d, crash } = fixture(t);
  d.st.crashes.push(...[1, 2].map(n => ({ at: Date.now() - n * 10000, mod: true, version: 'old' })));
  d.setSafeMode(true);
  crash('third');
  assert.equal(d.check('new').level, 3);
  assert.equal(d.safeMode(), true);
});
