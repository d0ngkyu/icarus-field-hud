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
  const caves = [];
  const want = (d, f) => {
    if (/\.umap$/i.test(f) && /Maps\//i.test(d) && seen.length < 400) seen.push(d + f);
    // cave levels (CAVE_CF_MED_005 ...): their placed creature spawners tell how many worms/bees a cave usually has
    // (the .uasset holds the names: which creature spawners the cave places)
    if (/^CAVE_[A-Z]{2}_[A-Z]+_\d+[A-Za-z0-9_]*\.(umap|uexp|uasset)$/i.test(f)) { if (/\.(umap|uasset)$/i.test(f) && caves.length < 2000) caves.push(d + f); return true; }
    return false;
  };
  const n = extractRaw(pakDir, outDir, want, log);
  try { fs.writeFileSync(path.join(outDir, 'levels.txt'), seen.join('\n')); } catch (e) {}
  try { fs.writeFileSync(path.join(outDir, 'caves.txt'), caves.join('\n')); } catch (e) {}
  fs.writeFileSync(path.join(outDir, 'done.txt'), String(n));
  log('done ' + n);
} catch (e) { log('error ' + (e && e.stack || e)); }
parentPort && parentPort.postMessage('done');
