// Run with: node --test source/tests/cave-hazards.test.cjs
// Creatures seen near a cave are counted for the nearest cave; a visit keeps the most seen of each kind.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.resolve(__dirname, '../mod/hud/index.html'), 'utf8');
const a = html.indexOf('const HAZ='), b = html.indexOf('// ---------- recording ----------');
const c1 = html.indexOf('const CAVEB='), c2 = html.indexOf('// NCO-style rank badge');
const ctx = {}; vm.runInNewContext(html.slice(c1, c2) + html.slice(a, b) + ';globalThis.noteHazards=noteHazards;globalThis.hazText=hazText;', ctx);

test('counts cave creatures for the nearest cave within 150 m', () => {
  const mp = { lm: { 'c@1,1': ['c:CF_MED_005', 500, 500, 0], 'c@100,100': ['c:Cave', 50000, 50000, 0] } };
  const now = Date.now();
  ctx.noteHazards(mp, [
    ['a:BP_CRE_CaveWorm_C', 1500, 900, 0], ['a:BP_CRE_CaveWorm_C', 2000, 0, 0],
    ['a:BP_NPC_Bee_Character_C', 600, 700, 0], ['a:BP_CRE_Teenage_Caveworm_Friendly_C', 600, 600, 0],
    ['a:BP_NPC_Wolf_Character_C', 700, 700, 0], ['a:BP_NPC_Spider_Character_C', 30000, 30000, 0],
    ['v:Iron', 600, 600, 0],
  ], now);
  assert.deepEqual(JSON.parse(JSON.stringify(mp.haz)), { 'c@1,1': { at: now, n: { '동굴웜': 2, '벌': 1 } } });
  ctx.noteHazards(mp, [['a:BP_CRE_CaveWorm_C', 1500, 900, 0]], now + 60000);
  assert.equal(mp.haz['c@1,1'].n['동굴웜'], 2, 'a visit keeps the most seen');
  ctx.noteHazards(mp, [['a:BP_CRE_CaveWorm_C', 1500, 900, 0]], now + 40 * 60000);
  assert.equal(mp.haz['c@1,1'].n['동굴웜'], 1, 'a new visit starts over');
  assert.match(ctx.hazText(mp, 'c@100,100'), /아직 모름/);
});

test('an unvisited cave shows the usual range from visited caves of the same level', () => {
  const mp = { lm: {
    'c@1,1': ['c:CF_MED_005', 0, 0, 0], 'c@9,9': ['c:AC_MED_002', 90000, 90000, 0],
    'c@5,5': ['c:CF_MED_001', 50000, 0, 0], 'c@7,7': ['c:CF_SML_003', 0, 70000, 0] },
    haz: { 'c@1,1': { at: Date.now(), n: { '동굴웜': 2 } }, 'c@9,9': { at: Date.now(), n: { '동굴웜': 4, '벌': 1 } } } };
  assert.equal(ctx.hazText(mp, 'c@5,5'), '보통 동굴웜 2~4, 벌 0~1 (가 본 Lv.2 동굴 2곳 기준)');
  assert.match(ctx.hazText(mp, 'c@7,7'), /아직 모름/);
});
