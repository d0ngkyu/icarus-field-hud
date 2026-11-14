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
  const doneA = path.join(outDir, 'doneA.txt'), doneB = path.join(outDir, 'doneB.txt');
  let job = null;
  try { job = JSON.parse(fs.readFileSync(jobFile, 'utf8')); } catch (e) {}
  const wantA = !fs.existsSync(doneA), wantB = job && !fs.existsSync(doneB);
  log('start A=' + wantA + ' B=' + !!wantB);
  const man = [], sizes = [], ranges = [];
  const need = new Map((wantB ? job.ranges : []).map(r => [r.file, r]));
  for (const p of paks) {
    let pak;
    try { pak = openPak(p); } catch (e) { log(path.basename(p) + ': ' + e.message); continue; }
    try {
      for (const f of pak.files) {
        const full = f.dir + f.name;
        if (wantA && isSub(f.dir, f.name) && /\.(umap|uexp)$/i.test(f.name)) {
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
        const want = need.get(full);
        if (want) {
          try {
            const r = rawRange(pak, f.eo, want.start, want.len);
            const out = flat(full) + '.part' + r.first;
            fs.writeFileSync(path.join(outDir, out), r.data);
            ranges.push([out, r.method, r.us, r.blockSize, r.first, r.sizes.join(',')].join('|'));
          } catch (e) { log(full + ' range: ' + e.message); }
        }
      }
    } finally { fs.closeSync(pak.fd); }
  }
  if (wantA) {
    fs.writeFileSync(path.join(outDir, 'manifestA.txt'), man.join('\n'));
    fs.writeFileSync(path.join(outDir, 'uexp_sizes.txt'), sizes.join('\n'));
    fs.writeFileSync(doneA, String(man.length));
  }
  if (wantB) { fs.writeFileSync(path.join(outDir, 'manifestB.txt'), ranges.join('\n')); fs.writeFileSync(doneB, String(ranges.length)); }
  log('done A=' + man.length + ' B=' + ranges.length);
} catch (e) { log('error ' + (e && e.stack || e)); }
parentPort && parentPort.postMessage('done');
