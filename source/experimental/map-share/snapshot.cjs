'use strict';
const fs = require('node:fs/promises');
const parser = require('../../app/prospect-save.js');
const { validScope, WORLDS, MAX_AGE } = require('./protocol.cjs');
const LIMIT = 120 * 1024 * 1024;
// Experimental reader; does not alter production latest(). Never chooses a world by filename.
function createReader({ list = parser.prospectFiles, io = fs, parse = parser.parseAsync, now = Date.now } = {}) {
  let busy = false, cache = null;
  return async function read(localAppData, context, signal) {
    if (busy || !validScope(context?.scope) || !WORLDS.has(context.world)) return null;
    busy = true;
    try {
      const files = list(localAppData).filter(f => now() - f.mtime <= MAX_AGE && now() - f.mtime >= 2000).slice(0, 8);
      for (const f of files) {
        if (signal?.aborted) return null;
        let handle;
        try {
          handle = await io.open(f.p, 'r');
          const before = await handle.stat();
          if (!before.isFile() || before.size >= LIMIT || now() - before.mtimeMs < 2000 || now() - before.mtimeMs > MAX_AGE) continue;
          const key = [f.p, before.size, before.mtimeMs, before.ctimeMs, context.scope, context.world].join('|');
          if (cache?.key === key) return cache.value;
          const buf = await handle.readFile();
          if (buf.length >= LIMIT) continue;
          // Check identity before the expensive actor decompression, with the parser's own format.
          const id = JSON.parse(parser.decodeText(buf))?.ProspectInfo?.ProspectID;
          if (id !== context.scope) continue;
          const result = await parse(buf);
          const after = await handle.stat(), current = await io.stat(f.p);
          const same = s => s.size === before.size && s.mtimeMs === before.mtimeMs && s.ctimeMs === before.ctimeMs && s.ino === before.ino;
          if (signal?.aborted || !same(after) || !same(current)) continue;
          if (result?.scope !== context.scope || result.world !== context.world) continue;
          const value = { ...result, savedAt: Math.trunc(before.mtimeMs) };
          cache = { key, value }; return value;
        } catch { /* partial write / removed file: try again next interval */ }
        finally { await handle?.close().catch(() => {}); }
      }
      return null;
    } finally { busy = false; }
  };
}
module.exports = { createReader };
