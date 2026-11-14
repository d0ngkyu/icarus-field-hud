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

test('partial crash reports are retried and quarantined after the XML finishes', t => {
  const {d,crash}=fixture(t);crash('partial');
  const dir=path.join(d.p.crashDirs[0],'partial'),xml=path.join(dir,'CrashContext.runtime-xml');
  fs.writeFileSync(xml,'<ErrorMessage>ACCESS_VIOLATION</ErrorMessage><CallStack>');
  assert.equal(d.check('v1'),null);assert.equal(d.st.seen[dir],undefined);
  fs.writeFileSync(xml,'<ErrorMessage>ACCESS_VIOLATION</ErrorMessage><CallStack>UE4SS</CallStack>');
  assert.equal(d.check('v1').level,1);assert.equal(d.st.crashes.length,1);
});

test('unknown Windows process state cannot rename the game loader',async t=>{
  const {d}=fixture(t);d.isGameRunning=async()=>null;
  await assert.rejects(d.setModOn(false),/확인하지 못해/);
});

test('ore crash can disable the actual ore scanner',t=>{
  const {d,crash}=fixture(t);crash('ore');
  const marker=fs.readFileSync(d.p.step,'utf8').replace('fog|','ores|');fs.writeFileSync(d.p.step,marker);
  assert.equal(d.check('v1').level,1);assert.deepEqual(d.featuresOff(),['ores']);
});

test('loaded UE4SS module alone is not crash-stack evidence and keeps quarantine',t=>{
 const {d,crash}=fixture(t);crash('exit');d.setSafeMode(true);
 const dir=path.join(d.p.crashDirs[0],'exit');fs.writeFileSync(path.join(dir,'CrashContext.runtime-xml'),'<ErrorMessage>ACCESS_VIOLATION</ErrorMessage><CallStack>Icarus!UGameEngine::PreExit</CallStack><Modules>UE4SS.dll dwmapi.dll</Modules>');
 const info=d.readCrash(dir);assert.equal(info.mod,false);assert.equal(info.loaderPresent,true);assert.equal(info.phase,'exit');assert.equal(d.check('v31').level,0);assert.equal(d.safeMode(),true);assert.deepEqual(d.featuresOff(),[]);
});
test('portable stack is examined when normal stack is empty',t=>{
 const {d,crash}=fixture(t);crash('portable');const dir=path.join(d.p.crashDirs[0],'portable');fs.writeFileSync(path.join(dir,'CrashContext.runtime-xml'),'<ErrorMessage>ACCESS_VIOLATION</ErrorMessage><CallStack></CallStack><PortableCallStack>UE4SS 0x001</PortableCallStack>');
 assert.equal(d.readCrash(dir).mod,true);
});
