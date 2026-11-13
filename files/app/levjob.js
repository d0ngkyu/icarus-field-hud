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
  const n = extractRaw(pakDir, outDir, (d, f) => /Content\/Maps\/[A-Za-z0-9_]+\/$/.test(d) && /^(Terrain|Outpost)_\d+\.(umap|uexp)$/i.test(f), log);
  fs.writeFileSync(path.join(outDir, 'done.txt'), String(n));
  log('done ' + n);
} catch (e) { log('error ' + (e && e.stack || e)); }
parentPort && parentPort.postMessage('done');
