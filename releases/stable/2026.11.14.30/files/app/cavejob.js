// Build PC only (dev.txt): copies what is needed to list every cave on every map, out of the game's pak files.
// Pass A: the small headers (.umap) of each map's generated sublevels, plus the size of each matching .uexp.
// Pass B: when cavejob.json (written by the update builder) lists byte ranges, only those compressed blocks.
const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { openPak, rawEntry, rawRange } = require('./extract.js');
const { pakDir, outDir, jobFile } = workerData;
fs.mkdirSync(outDir, { recursive: true });
const logF = path.join(outDir, 'log.txt');
const log = t => { try { fs.appendFileSync(logF, new Date().toISOString() + ' ' + t + '\n'); } catch (e) {} };
const flat = s => s.replace(/[\\/:]+/g, '_');
const isSub = (d, f) => /^Maps\/(Terrain|Outpost)_[^/]+\/Sublevels\/Generated\/?$/i.test(d.replace(/\/$/, '') + '/') || /Maps\/(Terrain|Outpost)_[^/]+\/Sublevels\/Generated\//i.test(d);
try {
  const paks = fs.readdirSync(pakDir).filter(n => /\.pak$/i.test(n)).map(n => path.join(pakDir, n));
  // v2 markers: v1 ignored the pak mount point, so maps in paks mounted below Content/ were missed.
  // main.js only knows doneA.txt/doneB.txt; any job file wakes this worker, which keeps its own markers.
  let job = null;
  try { job = JSON.parse(fs.readFileSync(jobFile, 'utf8')); } catch (e) {}
  const jid = String(job && job.id || '1').replace(/[^\w-]/g, '');
  const doneA = path.join(outDir, 'doneA2.txt'), doneB = path.join(outDir, 'doneB_' + jid + '.txt');
  const wantA = !fs.existsSync(doneA), wantB = job && !fs.existsSync(doneB);
  log('start A=' + wantA + ' B=' + !!wantB);
  const man = [], sizes = [], ranges = [], odd = new Set(), copied = [];
  const copyRx = wantB && job.copy ? new RegExp(job.copy, 'i') : null;
  const need = new Map();
  for (const r of (wantB ? job.ranges : [])) { if (!need.has(r.file)) need.set(r.file, []); need.get(r.file).push(r); }
  for (const p of paks) {
    let pak;
    try { pak = openPak(p); } catch (e) { log(path.basename(p) + ': ' + e.message); continue; }
    try {
      const mount = String(pak.mount || '').replace(/\\/g, '/').replace(/^.*?\/Content\//i, '').replace(/^(\.\.\/)+.*$/, '');
      for (const f of pak.files) {
        const dir = mount + f.dir, full = dir + f.name;
        if (wantA && odd.size < 40 && /Generated|Terrain_0/i.test(dir) && !isSub(dir, f.name)) odd.add(path.basename(p).replace(/-WindowsNoEditor\.pak$/i, '') + ' ' + (pak.mount || '') + ' | ' + dir.replace(/[^/]+\/?$/, ''));
        if (wantA && isSub(dir, f.name) && /\.(umap|uexp)$/i.test(f.name)) {
          try {
            if (/\.umap$/i.test(f.name)) {
              const r = rawEntry(pak, f.eo);
              fs.writeFileSync(path.join(outDir, flat(full)), r.data);
              man.push([flat(full), r.method, r.us, r.sizes.join(',')].join('|'));
            } else {
              const r = rawRange(pak, f.eo, 0, 1);
              sizes.push([full, r.us, r.blockSize].join('|'));
            }
          } catch (e) { log(full + ': ' + e.message); }
        }
        if (copyRx && copyRx.test(full)) {   // whole small files (e.g. cave prefabs from DLC paks)
          try { const r = rawEntry(pak, f.eo); const out = flat(full) + '.' + jid + '.c'; fs.writeFileSync(path.join(outDir, out), r.data); copied.push([out, r.method, r.us, r.sizes.join(',')].join('|')); }
          catch (e) { log(full + ' copy: ' + e.message); }
        }
        for (const want of need.get(full) || []) {
          try {
            const r = rawRange(pak, f.eo, want.start, want.len);
            const out = flat(full) + '.' + jid + '.part' + r.first;
            fs.writeFileSync(path.join(outDir, out), r.data);
            ranges.push([out, r.method, r.us, r.blockSize, r.first, r.sizes.join(',')].join('|'));
          } catch (e) { log(full + ' range: ' + e.message); }
        }
      }
    } finally { fs.closeSync(pak.fd); }
  }
  if (wantA) {
    log('other map dirs: ' + [...odd].join(' ; '));
    fs.writeFileSync(path.join(outDir, 'manifestA2.txt'), man.join('\n'));
    fs.writeFileSync(path.join(outDir, 'uexp_sizes2.txt'), sizes.join('\n'));
    fs.writeFileSync(doneA, String(man.length));
  }
  if (wantB) {
    fs.writeFileSync(path.join(outDir, 'manifestB_' + jid + '.txt'), ranges.join('\n'));
    if (copied.length) fs.writeFileSync(path.join(outDir, 'manifestC_' + jid + '.txt'), copied.join('\n')); fs.writeFileSync(doneB, String(ranges.length));
  }
  // bundle: pack listed outDir files into one file so the builder can fetch them in one go
  if (job && job.bundle && !fs.existsSync(path.join(outDir, 'bundle_' + jid + '.txt'))) {
    const rx = new RegExp(job.bundle), list = fs.readdirSync(outDir).filter(n => rx.test(n)).sort(), idx = [];
    // split into parts of ~300 MB so each can be fetched on its own
    let part = 0, off = 0, fd = fs.openSync(path.join(outDir, 'bundle_' + jid + '_0.bin'), 'w');
    for (const n of list) {
      const b = fs.readFileSync(path.join(outDir, n));
      if (off > 0 && off + b.length > 300 * 1048576) { fs.closeSync(fd); part++; off = 0; fd = fs.openSync(path.join(outDir, 'bundle_' + jid + '_' + part + '.bin'), 'w'); }
      fs.writeSync(fd, b); idx.push(n + '|' + part + '|' + off + '|' + b.length); off += b.length;
    }
    fs.closeSync(fd); fs.writeFileSync(path.join(outDir, 'bundle_' + jid + '.txt'), idx.join('\n'));
    log('bundle ' + jid + ' ' + list.length + ' files ' + off);
  }
  log('done A=' + man.length + ' B=' + ranges.length);
} catch (e) { log('error ' + (e && e.stack || e)); }
parentPort && parentPort.postMessage('done');
