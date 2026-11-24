'use strict';
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { snapshot, digest, WORLDS, MAX_BYTES, MAX_AGE } = require('./protocol.cjs');
// Test harness, NOT a deployable public relay. Only the local controller can issue grants.
function createRelay({ now = Date.now } = {}) {
  const grants = new Map(), rooms = new Map();
  function prune() {
    for (const [k, v] of grants) if (v.expiresAt <= now()) grants.delete(k);
    for (const [k, v] of rooms) if (v.expiresAt <= now()) rooms.delete(k);
  }
  function issue(scope, world, role, ttl = 3600000) {
    prune();
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(scope) || !WORLDS.has(world) || !['host', 'guest'].includes(role) ||
        !Number.isFinite(ttl) || ttl <= 0 || ttl > 3600000 || grants.size >= 256) throw Error('invalid-grant');
    const room = digest({ scope, world });
    if (!rooms.has(room) && rooms.size >= 32) throw Error('room-limit');
    const existing = rooms.get(room);
    if (existing && existing.world !== world) throw Error('wrong-room-world');
    // A new issuer-authorized host replaces the old host, never two active writers.
    if (role === 'host') for (const [key, g] of grants) if (g.room === room && g.role === 'host') grants.delete(key);
    const expiresAt = now() + ttl;
    if (!existing) rooms.set(room, { world, expiresAt, value: null });
    else existing.expiresAt = Math.max(existing.expiresAt, expiresAt);
    const token = randomBytes(32).toString('hex');
    grants.set(token, { room, world, role, expiresAt });
    return { token, scope, world, role, expiresAt };
  }
  const server = http.createServer(async (req, res) => {
    const reply = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(value ? JSON.stringify(value) : undefined); };
    prune();
    if (req.url !== '/snapshot' || !['GET', 'PUT'].includes(req.method)) return reply(404);
    const grant = grants.get((req.headers.authorization || '').replace(/^Bearer /, ''));
    if (!grant) return reply(401);
    const room = rooms.get(grant.room);
    if (!room || room.world !== grant.world) return reply(403);
    if (req.method === 'GET') {
      if (!room.value || now() - room.value.savedAt > MAX_AGE) return reply(204);
      return reply(200, room.value);
    }
    if (grant.role !== 'host') return reply(403);
    let size = 0; const chunks = [];
    try {
      for await (const chunk of req) { size += chunk.length; if (size > MAX_BYTES) { reply(413); req.destroy(); return; } chunks.push(chunk); }
      // Recheck expiry/revocation after body upload.
      if (grants.get((req.headers.authorization || '').replace(/^Bearer /, '')) !== grant || grant.expiresAt <= now()) return reply(401);
      const value = snapshot(JSON.parse(Buffer.concat(chunks).toString('utf8')), now());
      if (value.world !== grant.world) return reply(403);
      if (room.value && (value.savedAt < room.value.savedAt || (value.savedAt === room.value.savedAt && digest(value) !== digest(room.value)))) return reply(409);
      room.value = value; reply(204);
    } catch { if (!res.headersSent) reply(400); }
  });
  server.requestTimeout = 5000; server.headersTimeout = 5000; server.maxConnections = 16;
  return { issue, revoke: token => grants.delete(token),
    listen: () => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}/`)); }),
    close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); grants.clear(); rooms.clear(); }) };
}
module.exports = { createRelay };
