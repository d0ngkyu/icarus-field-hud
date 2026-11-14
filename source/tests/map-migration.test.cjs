const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../mod/hud/index.html'), 'utf8');
const context = vm.createContext({});
vm.runInContext(html.slice(html.indexOf('const keyOf='), html.indexOf('// ---------- recording ----------')), context);
const tidy = m => { context.mp = m; vm.runInContext('tidyDeposits(mp)', context); };

for (const kind of ['c', 'd']) {
  for (const reverse of [false, true]) {
    test(`${kind}: migration preserves winning marker and note in either insertion order (${reverse})`, () => {
      const best = [kind === 'c' ? 'c:CF_MED_005' : 'd:Iron', 1000, 2000, 0, 200];
      const stale = [kind === 'c' ? 'c:Cave' : 'd:Copper', 1000, 2000, 0, 100];
      const entries = [['legacy@2,4', best], [`${kind}@2,4`, stale]];
      const mp = { lm: Object.fromEntries(reverse ? entries.reverse() : entries), notes: { 'legacy@2,4': '입구 메모' } };
      tidy(mp);
      assert.deepEqual(Object.keys(mp.lm), [`${kind}@2,4`]);
      assert.deepEqual(mp.lm[`${kind}@2,4`], best);
      assert.equal(mp.notes[`${kind}@2,4`], '입구 메모');
      const once = JSON.stringify(mp); tidy(mp); assert.equal(JSON.stringify(mp), once);
    });
  }
}
