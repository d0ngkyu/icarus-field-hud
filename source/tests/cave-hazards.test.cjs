// Run with: node --test source/tests/cave-hazards.test.cjs
// Creatures seen near a cave are counted for the nearest cave; a visit keeps the most seen of each kind.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.resolve(__dirname, '../mod/hud/index.html'), 'utf8');
const a = html.indexOf('const HAZ='), b = html.indexOf('// ---------- recording ----------');
const ctx = {}; vm.runInNewContext(html.slice(a, b) + ';globalThis.noteHazards=noteHazards;globalThis.hazText=hazText;', ctx);

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
