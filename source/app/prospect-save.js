'use strict';
// Read-only reader for the local prospect save (%LOCALAPPDATA%\Icarus\Saved\PlayerData\<id>\Prospects\*.json).
// The save holds a compressed actor blob for the whole map, so it knows every deep ore vein's
// ore type and every red exotic plant that has spawned, however far away. Only the worlds this PC
// hosts (solo / own session) are saved here; a server you join keeps its save elsewhere.
// Never writes, renames or locks the save.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const LIMIT = 120 * 1024 * 1024;
const MAP_MAX = 403200 * 1.05;
const WORLDS = ['Terrain_016', 'Terrain_017', 'Terrain_019', 'Terrain_021'];

function decodeText(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  if (buf[0] === 0xfe && buf[1] === 0xff) { const b = Buffer.from(buf.subarray(2)); b.swap16(); return b.toString('utf16le'); }
  return buf.toString('utf8');
}

function rawBlob(text) {
  const m = /"BinaryBlob"\s*:\s*"([^"]*)"/.exec(text);
  return m ? Buffer.from(m[1].replace(/\\[rnt]|\s/g, ''), 'base64') : null;
}
function blobOf(text) {
  const raw = rawBlob(text); if (!raw) return null;
  for (const f of [zlib.inflateSync, zlib.unzipSync, zlib.inflateRawSync]) { try { return f(raw, { maxOutputLength: LIMIT }); } catch {} }
  return null;
}
// off the main thread: zlib runs in libuv's pool, so the HUD window never freezes on a big save
const { promisify } = require('util');
const ASYNC = [promisify(zlib.inflate), promisify(zlib.unzip), promisify(zlib.inflateRaw)];
async function blobOfAsync(text) {
  const raw = rawBlob(text); if (!raw) return null;
  for (const f of ASYNC) { try { return await f(raw, { maxOutputLength: LIMIT }); } catch {} }
  return null;
}

const B = s => Buffer.from(s, 'latin1');
const NAMEP = B('NameProperty'), VEC = B('Vector'), TRANS = B('Translation');
const okPos = (x, y) => Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) < MAP_MAX && Math.abs(y) < MAP_MAX && (x || y);

// ResourceDeposit: ... NameProperty ... <len><ore name>\0 ... Vector <guid pad> <x y z float32>
function veinsOf(d) {
  const out = [], tag = B('Script/Icarus.ResourceDeposit');
  for (let i = d.indexOf(tag); i >= 0; i = d.indexOf(tag, i + tag.length)) {
    try {
      let o = d.indexOf(NAMEP, i + tag.length); if (o < 0 || o - i > 4096) continue;
      o += 22; const n = d.readUInt32LE(o); if (n < 2 || n > 64) continue; o += 4;
      const name = d.toString('latin1', o, o + n - 1); if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) continue;
      let v = d.indexOf(VEC, o); if (v < 0 || v - o > 4096) continue; v += 24;
      const x = d.readFloatLE(v), y = d.readFloatLE(v + 4), z = d.readFloatLE(v + 8);
      if (okPos(x, y)) out.push([name, Math.round(x), Math.round(y), Math.round(z)]);
    } catch {}
  }
  return out;
}

// Spawned wild red exotic plants: the transform sits just before the actor path.
function plantsOf(d) {
  const out = [], tag = B('PersistentLevel.BP_Exotic_Plant_C');
  for (let i = d.indexOf(tag); i >= 0; i = d.indexOf(tag, i + tag.length)) {
    try {
      const t = d.lastIndexOf(TRANS, i); if (t < 0 || i - t > 4096) continue;
      let v = d.indexOf(VEC, t); if (v < 0 || v > i) continue; v += 24;
      const x = d.readFloatLE(v), y = d.readFloatLE(v + 4), z = d.readFloatLE(v + 8);
      if (okPos(x, y)) out.push([Math.round(x), Math.round(y), Math.round(z)]);
    } catch {}
  }
  return out;
}

function scan(data) {
  let world = null, at = Infinity;
  for (const w of WORLDS) { const i = data.indexOf(B(w)); if (i >= 0 && i < at) { at = i; world = w; } }
  return { world, veins: veinsOf(data), plants: plantsOf(data) };
}
function identity(text) {
  try { const id = JSON.parse(text)?.ProspectInfo?.ProspectID; return typeof id === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(id) ? id : null; } catch { return null; }
}
function parse(buf) { if(buf.length>LIMIT)return null;const text=decodeText(buf),data=blobOf(text);return data?{...scan(data),scope:identity(text)}:null; }
async function parseAsync(buf) { if(buf.length>LIMIT)return null;const text=decodeText(buf),data=await blobOfAsync(text);return data?{...scan(data),scope:identity(text)}:null; }

function prospectFiles(localAppData) {
  const root = path.join(localAppData || '', 'Icarus', 'Saved', 'PlayerData'), out = [];
  let ids = []; try { ids = fs.readdirSync(root); } catch { return out; }
  for (const id of ids) {
    const dir = path.join(root, id, 'Prospects');
    let names = []; try { names = fs.readdirSync(dir); } catch { continue; }
    for (const n of names) if (/\.json$/i.test(n)) { try { const p = path.join(dir, n), st = fs.statSync(p); if (st.isFile() && st.size < LIMIT) out.push({ p, name: n.replace(/\.json$/i, ''), mtime: st.mtimeMs, size: st.size }); } catch {} }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

// Latest saved prospect, parsed once per file version; one read at a time.
let cache = null, flight = null;
async function latest(localAppData, now = Date.now(), maxAgeMs = 45 * 60 * 1000) {
  const f = prospectFiles(localAppData)[0];
  if (!f || now - f.mtime > maxAgeMs) return null;
  if (cache && cache.p === f.p && cache.mtime === f.mtime && cache.size === f.size) return cache.value;
  if (flight) return flight;
  flight = (async () => {
    let value = null;
    try { const r = await parseAsync(await fs.promises.readFile(f.p)); if (r) value = { ...r, name: f.name, savedAt: f.mtime }; } catch {}
    cache = { p: f.p, mtime: f.mtime, size: f.size, value };
    return value;
  })().finally(() => { flight = null; });
  return flight;
}

module.exports = { parse, parseAsync, prospectFiles, latest, decodeText };
