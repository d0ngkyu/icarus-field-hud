'use strict';
const { snapshot, fromSave, digest, validScope, WORLDS, MAX_BYTES } = require('./protocol.cjs');
// Local integration harness only. No public endpoint or production membership issuer exists yet.
function loopbackTransport(endpoint) {
  const base = new URL(endpoint);
  if (base.protocol !== 'http:' || base.hostname !== '127.0.0.1' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw Error('loopback-only');
  return async (method, token, data, signal) => {
    const response = await fetch(new URL('/snapshot', base), { method, redirect: 'error', signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(method === 'PUT' ? { body: JSON.stringify(data) } : {}) });
    if (!response.ok) throw Error(`relay-${response.status}`);
    if (response.status === 204) return null;
    const reader = response.body.getReader(); let size = 0; const chunks = [];
    try {
      for (;;) { const { done, value } = await reader.read(); if (done) break;
        size += value.length; if (size > MAX_BYTES) throw Error('response-too-large'); chunks.push(Buffer.from(value)); }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  };
}
class ShareClient {
  constructor({ transport, readSave, onSnapshot = () => {}, onClear = () => {}, now = Date.now, interval = 30000, timeout = 5000 }) {
    Object.assign(this, { transport, readSave, onSnapshot, onClear, now, interval: Math.max(30000, interval), timeout });
    this.context = null; this.generation = 0; this.busy = false; this.nextAt = 0; this.failures = 0; this.lastHash = ''; this.lastSavedAt = 0; this.status = 'disabled';
  }
  setContext(context) {
    this.generation++; this.controller?.abort(); this.context = null; this.lastHash = ''; this.lastSavedAt = 0;
    this.nextAt = 0; this.failures = 0; this.status = 'disabled'; this.onClear();
    // Grant must be issued by a trusted membership provider, NOT constructed from a prospect ID.
    if (!context?.consent || !validScope(context.scope) || !WORLDS.has(context.world) ||
        !['host', 'guest'].includes(context.role) || context.grant?.role !== context.role ||
        context.grant?.world !== context.world || context.grant?.scope !== context.scope || !/^[a-f0-9]{64}$/.test(context.grant?.token || '') ||
        !Number.isFinite(context.grant.expiresAt) || context.grant.expiresAt <= this.now()) return;
    this.context = { ...context, grant: { ...context.grant } }; this.status = 'waiting';
  }
  close() { this.setContext(null); }
  async tick() {
    const ctx = this.context;
    if (!ctx || this.busy || this.now() < this.nextAt) return false;
    if (ctx.grant.expiresAt <= this.now()) { this.close(); return false; }
    this.busy = true; const generation = this.generation;
    const controller = new AbortController(); this.controller = controller;
    const timer = setTimeout(() => controller.abort(), this.timeout);
    const current = () => generation === this.generation && !controller.signal.aborted && ctx.grant.expiresAt > this.now();
    this.nextAt = this.now() + this.interval;
    try {
      if (ctx.role === 'host') {
        const save = await this.readSave(ctx, controller.signal);
        if (!current()) return false;
        if (!save) { this.status = 'waiting-for-save'; return false; }
        const payload = fromSave(save, ctx, this.now()), hash = digest(payload);
        if (hash !== this.lastHash) {
          await this.transport('PUT', ctx.grant.token, payload, controller.signal);
          if (!current()) return false;
          this.lastHash = hash; this.lastSavedAt = payload.savedAt;
        }
        this.status = 'published';
      } else {
        const data = await this.transport('GET', ctx.grant.token, null, controller.signal);
        if (!current()) return false;
        if (!data) { this.status = 'waiting-for-host'; return false; }
        const payload = snapshot(data, this.now());
        if (payload.world !== ctx.world || payload.savedAt < this.lastSavedAt) throw Error('wrong-or-older-snapshot');
        const hash = digest(payload);
        if (hash !== this.lastHash) { this.onSnapshot(payload); this.lastHash = hash; this.lastSavedAt = payload.savedAt; }
        this.status = 'received';
      }
      this.failures = 0; return true;
    } catch {
      if (generation === this.generation) { this.failures++; this.status = 'unavailable';
        this.nextAt = this.now() + Math.min(300000, this.interval * 2 ** Math.min(this.failures, 4)); }
      return false;
    } finally { clearTimeout(timer); this.busy = false; if (this.controller === controller) this.controller = null; }
  }
}
module.exports = { ShareClient, loopbackTransport };
