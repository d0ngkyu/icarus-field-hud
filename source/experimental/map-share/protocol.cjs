'use strict';
const { createHash } = require('node:crypto');
const MAX_BYTES = 1024 * 1024, MAX_ROWS = 10000, MAX_AGE = 45 * 60000;
const WORLDS = new Set(['Terrain_016', 'Terrain_017', 'Terrain_019', 'Terrain_021']);
const validScope = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(s);
function snapshot(input, now = Date.now()) {
  if (!input || input.v !== 1 || !WORLDS.has(input.world) || !Number.isSafeInteger(input.savedAt) ||
      input.savedAt > now + 120000 || input.savedAt < now - MAX_AGE) throw Error('invalid-or-stale-snapshot');
  let count = 0;
  const rows = (arr, ore) => {
    if (!Array.isArray(arr) || (count += arr.length) > MAX_ROWS) throw Error('too-many-rows');
    const unique = new Map();
    for (const row of arr) {
      if (!Array.isArray(row) || row.length !== (ore ? 4 : 3)) throw Error('invalid-row');
      if (ore && (typeof row[0] !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(row[0]))) throw Error('invalid-ore');
      const coords = row.slice(ore ? 1 : 0);
      if (coords.some(n => !Number.isSafeInteger(n) || Math.abs(n) > 500000)) throw Error('invalid-position');
      unique.set(JSON.stringify(row), [...row]);
    }
    return [...unique.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, r]) => r);
  };
  // Explicit allowlist. Never forward filenames, prospect/account IDs or arbitrary save fields.
  const out = { v: 1, world: input.world, savedAt: input.savedAt, veins: rows(input.veins, true), plants: rows(input.plants, false) };
  if (Buffer.byteLength(JSON.stringify(out)) > MAX_BYTES) throw Error('snapshot-too-large');
  return out;
}
function fromSave(save, context, now) {
  if (!save || !validScope(context?.scope) || save.scope !== context.scope || save.world !== context.world) throw Error('wrong-world');
  return snapshot({ v: 1, world: save.world, savedAt: Math.trunc(save.savedAt), veins: save.veins, plants: save.plants }, now);
}
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
module.exports = { snapshot, fromSave, digest, validScope, WORLDS, MAX_BYTES, MAX_AGE };
