// One-time copy of the game's own world-map pictures out of the game's pak files.
// Reads only the small index and the few map files, never loads a whole pak into memory.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MAGIC = 0x5A6F12E1;

function readAt(fd, pos, len) {
  const b = Buffer.alloc(len);
  let got = 0;
  while (got < len) {
    const n = fs.readSync(fd, b, got, len - got, pos + got);
    if (!n) break;
    got += n;
  }
  return b;
}

function fstr(buf, o) {
  const n = buf.readInt32LE(o); o += 4;
  let s;
  if (n < 0) { s = buf.slice(o, o - 2 * n).toString('utf16le'); o += -2 * n; }
  else { s = buf.slice(o, o + n).toString('utf8'); o += n; }
  return [s.replace(/\0+$/, ''), o];
}

const u64 = (b, o) => Number(b.readBigUInt64LE(o));

// list all files in a pak: returns { mount, files: [{dir, name, eo}], enc, fd }
function openPak(file) {
  const fd = fs.openSync(file, 'r');
  const size = fs.fstatSync(fd).size;
  const tailLen = Math.min(size, 4096);
  const tail = readAt(fd, size - tailLen, tailLen);
  let i = -1;
  for (let k = tailLen - 4; k >= 0; k--) if (tail.readUInt32LE(k) === MAGIC) { i = k; break; }
  if (i < 0) throw new Error('no pak footer');
  if (tail[i - 1] === 1) throw new Error('encrypted index');
  const ioff = u64(tail, i + 8), isz = u64(tail, i + 16);
  const methods = [];
  for (let k = 0; k < 5 && i + 40 + 32 * (k + 1) <= tailLen; k++) {
    const nm = tail.slice(i + 40 + 32 * k, i + 72 + 32 * k).toString('latin1').replace(/\0.*$/s, '').replace(/[^\x20-\x7e]/g, '');
    if (nm) methods.push(nm);
  }
  const idx = readAt(fd, ioff, isz);
  let pos = 0, mount;
  [mount, pos] = fstr(idx, pos);
  pos += 4 + 8; // file count, path hash seed
  if (idx.readUInt32LE(pos)) { pos += 4 + 36; } else pos += 4;
  if (!idx.readUInt32LE(pos)) throw new Error('no directory index');
  pos += 4;
  const fo = u64(idx, pos), fsz = u64(idx, pos + 8); pos += 16 + 20;
  const es = idx.readUInt32LE(pos); pos += 4;
  const enc = idx.slice(pos, pos + es);
  const dirIdx = readAt(fd, fo, fsz);
  const files = [];
  let o = 0;
  const nd = dirIdx.readUInt32LE(o); o += 4;
  for (let d = 0; d < nd; d++) {
    let dn; [dn, o] = fstr(dirIdx, o);
    const nf = dirIdx.readUInt32LE(o); o += 4;
    for (let f = 0; f < nf; f++) {
      let fn; [fn, o] = fstr(dirIdx, o);
      const eo = dirIdx.readInt32LE(o); o += 4;
      files.push({ dir: dn, name: fn, eo });
    }
  }
  return { fd, mount, files, enc, methods };
}

function readEntry(pak, eo) {
  const enc = pak.enc;
  let o = eo;
  const f = enc.readUInt32LE(o); o += 4;
  if ((f & 0x3f) === 0x3f) o += 4;
  const bc = (f >>> 6) & 0xffff, encr = (f >>> 22) & 1, m = (f >>> 23) & 0x3f;
  const rd = bit => { let v; if (f & (1 << bit)) { v = enc.readUInt32LE(o); o += 4; } else { v = u64(enc, o); o += 8; } return v; };
  const off = rd(31), us = rd(30), cs = m ? rd(29) : us;
  if (encr) throw new Error('encrypted file');
  const hdr = 8 + 8 + 8 + 4 + 20 + 1 + 4 + (m ? 4 + 16 * bc : 0);
  if (!m) return readAt(pak.fd, off + hdr, us);
  const sizes = bc === 1 ? [cs] : Array.from({ length: bc }, (_, k) => enc.readUInt32LE(o + 4 * k));
  const raw = readAt(pak.fd, off + hdr, sizes.reduce((a, b) => a + b, 0));
  const parts = [];
  let q = 0;
  const meth = (pak.methods[m - 1] || '').toLowerCase();
  if (meth && !meth.includes('zlib')) throw new Error('compression ' + meth);
  for (const z of sizes) { parts.push(zlib.inflateSync(raw.slice(q, q + z))); q += z; }
  return Buffer.concat(parts).slice(0, us);
}

// pakDir: game Content/Paks folder; outDir: where to put the files; test: (dir, name) => bool
function extract(pakDir, outDir, test, log) {
  const paks = fs.readdirSync(pakDir).filter(n => /\.pak$/i.test(n)).map(n => path.join(pakDir, n));
  let count = 0;
  for (const p of paks) {
    let pak;
    try { pak = openPak(p); } catch (e) { log(path.basename(p) + ': ' + e.message); continue; }
    try {
      for (const f of pak.files) {
        if (!test(f.dir, f.name)) continue;
        const rel = path.normalize(path.join(f.dir, f.name)).replace(/^([\\/]|\.\.[\\/])+/, '');
        const t = path.join(outDir, rel);
        if (!t.startsWith(path.resolve(outDir))) continue;
        try {
          fs.mkdirSync(path.dirname(t), { recursive: true });
          fs.writeFileSync(t, readEntry(pak, f.eo));
          count++;
        } catch (e) { log(rel + ': ' + e.message); }
      }
      log(path.basename(p) + ': ' + pak.files.length + ' files checked [' + pak.methods.join(',') + ']');
    } finally { fs.closeSync(pak.fd); }
  }
  return count;
}

// copy entries as stored (still compressed) plus a list of block sizes, for files packed with Oodle
function rawEntry(pak, eo) {
  const enc = pak.enc;
  let o = eo;
  const f = enc.readUInt32LE(o); o += 4;
  if ((f & 0x3f) === 0x3f) o += 4;
  const bc = (f >>> 6) & 0xffff, m = (f >>> 23) & 0x3f;
  const rd = bit => { let v; if (f & (1 << bit)) { v = enc.readUInt32LE(o); o += 4; } else { v = u64(enc, o); o += 8; } return v; };
  const off = rd(31), us = rd(30), cs = m ? rd(29) : us;
  const hdr = 8 + 8 + 8 + 4 + 20 + 1 + 4 + (m ? 4 + 16 * bc : 0);
  const sizes = !m ? [us] : bc === 1 ? [cs] : Array.from({ length: bc }, (_, k) => enc.readUInt32LE(o + 4 * k));
  const data = readAt(pak.fd, off + hdr, sizes.reduce((a, b) => a + b, 0));
  return { data, us, sizes, method: m ? (pak.methods[m - 1] || '?') : 'none' };
}
function extractRaw(pakDir, outDir, test, log) {
  const paks = fs.readdirSync(pakDir).filter(n => /\.pak$/i.test(n)).map(n => path.join(pakDir, n));
  const man = [];
  fs.mkdirSync(outDir, { recursive: true });
  for (const p of paks) {
    let pak;
    try { pak = openPak(p); } catch (e) { log(path.basename(p) + ': ' + e.message); continue; }
    try {
      for (const f of pak.files) {
        if (!test(f.dir, f.name)) continue;
        try {
          const r = rawEntry(pak, f.eo);
          const name = f.dir.replace(/[\\/:]+/g, '_') + f.name;
          fs.writeFileSync(path.join(outDir, name), r.data);
          man.push([name, r.method, r.us, r.sizes.join(',')].join('|'));
        } catch (e) { log(f.dir + f.name + ': ' + e.message); }
      }
    } finally { fs.closeSync(pak.fd); }
  }
  fs.writeFileSync(path.join(outDir, 'manifest.txt'), man.join('\n'));
  return man.length;
}

module.exports = { extract, extractRaw, openPak, readEntry };

// ---- reading one object out of a big level file without copying the whole file ----
// Package header (.umap/.uasset, UE4.27 cooked): names, imports, exports.
function pkgSummary(b) {
  let o = 0;
  const i32 = () => { const v = b.readInt32LE(o); o += 4; return v; };
  const i64 = () => { const v = Number(b.readBigInt64LE(o)); o += 8; return v; };
  const str = () => { let s; [s, o] = fstr(b, o); return s; };
  if (b.readUInt32LE(0) !== 0x9E2A83C1) throw new Error('not a package');
  o = 4; i32(); i32(); i32(); i32();
  const nc = i32(); o += nc * 20;
  const total = i32(); str(); i32();
  const nn = i32(), no = i32();
  i32(); i32();
  const ec = i32(), eo = i32(), ic = i32(), io = i32();
  const names = []; o = no;
  for (let k = 0; k < nn; k++) { names.push(str()); o += 4; }
  const imports = []; o = io;
  for (let k = 0; k < ic; k++) { i64(); const cn = i64(); i32(); const on = i64(); imports.push({ cls: names[cn % 4294967296], name: names[on % 4294967296] }); }
  const exports = []; o = eo;
  for (let k = 0; k < ec; k++) {
    const start = o; const cls = i32(); i32(); i32(); i32(); const on = i64(); i32();
    const size = i64(), off = i64();
    exports.push({ cls: cls < 0 ? imports[-cls - 1].name : cls > 0 ? 'export' + cls : '', name: names[on % 4294967296], size, off });
    o = start + 104;
  }
  return { total, names, imports, exports };
}
// Copies only the compressed blocks of an entry that cover [start, start+len) of its uncompressed data.
function rawRange(pak, eo, start, len) {
  const enc = pak.enc;
  let o = eo;
  const f = enc.readUInt32LE(o); o += 4;
  let blockSize = (f & 0x3f) << 11;
  if ((f & 0x3f) === 0x3f) { blockSize = enc.readUInt32LE(o); o += 4; }
  const bc = (f >>> 6) & 0xffff, m = (f >>> 23) & 0x3f;
  const rd = bit => { let v; if (f & (1 << bit)) { v = enc.readUInt32LE(o); o += 4; } else { v = u64(enc, o); o += 8; } return v; };
  const off = rd(31), us = rd(30), cs = m ? rd(29) : us;
  const hdr = 8 + 8 + 8 + 4 + 20 + 1 + 4 + (m ? 4 + 16 * bc : 0);
  if (!m) return { method: 'none', us, blockSize: us, first: 0, sizes: [len], data: readAt(pak.fd, off + hdr + start, len) };
  const sizes = bc === 1 ? [cs] : Array.from({ length: bc }, (_, k) => enc.readUInt32LE(o + 4 * k));
  if (bc === 1) blockSize = us;
  const first = Math.floor(start / blockSize), last = Math.min(bc - 1, Math.floor((start + len - 1) / blockSize));
  let pos = 0; for (let k = 0; k < first; k++) pos += sizes[k];
  const take = sizes.slice(first, last + 1);
  return { method: pak.methods[m - 1] || '?', us, blockSize, first, sizes: take, data: readAt(pak.fd, off + hdr + pos, take.reduce((a, c) => a + c, 0)) };
}
module.exports.pkgSummary = pkgSummary;
module.exports.rawRange = rawRange;
module.exports.rawEntry = rawEntry;
module.exports.readEntry = readEntry;
