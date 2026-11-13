// background thread: copies each map's main level file out of the game's pak files (only on the update-building PC)
const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { extractRaw } = require('./extract.js');
const { pakDir, outDir } = workerData;
const logF = path.join(outDir, 'log.txt');
fs.mkdirSync(outDir, { recursive: true });
const log = t => { try { fs.appendFileSync(logF, new Date().toISOString() + ' ' + t + '\n'); } catch (e) {} };
try {
  log('start');
  // write down where the map level files sit, so the pattern can be checked later
  const seen = [];
  const want = (d, f) => {
    if (/\.umap$/i.test(f) && /Maps\//i.test(d) && seen.length < 400) seen.push(d + f);
    return /Maps\//i.test(d) && /^(Terrain|Outpost)_\d+(_[A-Za-z0-9]+)?\.(umap|uexp)$/i.test(f);
  };
  const n = extractRaw(pakDir, outDir, want, log);
  try { fs.writeFileSync(path.join(outDir, 'levels.txt'), seen.join('\n')); } catch (e) {}
  fs.writeFileSync(path.join(outDir, 'done.txt'), String(n));
  log('done ' + n);
} catch (e) { log('error ' + (e && e.stack || e)); }
parentPort && parentPort.postMessage('done');
