import { timingSafeEqual } from 'node:crypto';
export function constantEqual(a, b) {
  return typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export function parseJson(text) {
  return JSON.parse(text, (key, value) => {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw Error('unsafeJson');
    return value;
  });
}
export function sameOrigin(req) {
  const value = req.headers.origin || req.headers.referer;
  if (!value) return true;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && url.host === req.headers.host; }
  catch { return false; }
}
export function rateLimit(max, windowMs) {
  const entries = new Map();
  return (req, res, next) => {
    const now = Date.now(), key = req.socket.remoteAddress;
    for (const [ip, item] of entries) if (item.until <= now) entries.delete(ip);
    if (!entries.has(key) && entries.size >= 10000) return res.status(429).json({ error: 'rateLimit' });
    const item = entries.get(key) || { count: 0, until: now + windowMs };
    entries.set(key, item);
    if (++item.count > max) { res.setHeader('Retry-After', Math.ceil((item.until - now) / 1000)); return res.status(429).json({ error: 'rateLimit' }); }
    next();
  };
}
export function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"
  });
  next();
}
