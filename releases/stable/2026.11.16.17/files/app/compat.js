'use strict';
// Weekly game patch compatibility: which game build is installed, and which HUD readers
// logged a failure in the current UE4SS.log. Read-only file access, no game control.
const fs = require('fs');
const path = require('path');

const APP_ID = '1149460';
// "<what> failed:" lines written by Scripts/main.lua -> feature key shown in the HUD
const FAILS = [
  [/inventory scan failed/i, 'inv'],
  [/progress read failed/i, 'prog'],
  [/landmark scan failed|world marks failed/i, 'lm'],
  [/ore scan failed/i, 'ore'],
  [/map fog read failed/i, 'fog'],
  [/animal reader disabled/i, 'animal'],
  [/held item read failed/i, 'held'],
];

function readText(p, max) {
  try {
    const st = fs.statSync(p), fd = fs.openSync(p, 'r');
    try { const n = Math.min(st.size, max), b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, st.size - n); return b.toString('utf8'); }
    finally { fs.closeSync(fd); }
  } catch { return ''; }
}

// gameDir = ...\steamapps\common\Icarus ; the manifest sits in ...\steamapps
function gameBuild(gameDir) {
  if (!gameDir) return null;
  const acf = path.join(gameDir, '..', '..', 'appmanifest_' + APP_ID + '.acf');
  const t = readText(acf, 200000);
  const id = /"buildid"\s+"(\d+)"/.exec(t), up = /"LastUpdated"\s+"(\d+)"/.exec(t);
  return id ? { id: id[1], updatedAt: up ? Number(up[1]) * 1000 : null } : null;
}

function logFailures(text) {
  const out = new Set();
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!/IcarusHUD/i.test(line) && !/failed|disabled/i.test(line)) continue;
    for (const [re, key] of FAILS) if (re.test(line)) out.add(key);
  }
  return [...out].sort();
}

function report(gameDir) {
  if (!gameDir) return null;
  const log = path.join(gameDir, 'Icarus', 'Binaries', 'Win64', 'ue4ss', 'UE4SS.log');
  return { build: gameBuild(gameDir), failures: logFailures(readText(log, 600000)) };
}

module.exports = { gameBuild, logFailures, report };
