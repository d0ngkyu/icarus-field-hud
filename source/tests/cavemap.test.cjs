// Whole-map cave list (from the game's map files): every cave has exactly one level 1-4, and the map caves draw.
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../mod/hud/index.html'), 'utf8').replace(/\r\n/g,'\n');
const CAVEMAP = JSON.parse(html.match(/const CAVEMAP=(\{.*?\});\n/)[1]);
test('every main map has its caves, one level each', () => {
  for (const m of ['Terrain_016', 'Terrain_017', 'Terrain_019', 'Terrain_021', 'Terrain_022']) {
    assert.ok(CAVEMAP[m].length > 100, m);
    for (const r of CAVEMAP[m]) { assert.ok([1, 2, 3, 4].includes(r[2]), m + ' level'); assert.ok(Number.isFinite(r[0]) && Number.isFinite(r[1])); }
  }
});
test('water caves and through caves are marked', () => {
  const all = Object.values(CAVEMAP).flat();
  assert.ok(all.some(r => r[6] === 1)); assert.ok(all.some(r => r[7] > 1));
});
test('cave hover text uses this cave\'s own creature numbers', () => {
  assert.match(html, /function gHaz\(r\)/); assert.match(html, /key\.startsWith\('g:'\)/);
});
