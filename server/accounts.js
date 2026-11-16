import { readdirSync, readFileSync } from 'node:fs';
const scenarioNodes = new Map(
  readdirSync(new URL('../stsenarii/', import.meta.url))
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const s = JSON.parse(
        readFileSync(new URL('../stsenarii/' + f, import.meta.url), 'utf8')
      );
      return [s.id, s.vuzly];
    })
);
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac
} from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

export async function installAccounts(app, directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, 'store.json');
  let store;
  try {
    store = JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    store = { users: [], sessions: {}, progress: {} };
  }
  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    const secretFile = path.join(directory, '.secret');
    try {
      secret = await readFile(secretFile, 'utf8');
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      secret = randomBytes(48).toString('hex');
      await writeFile(secretFile, secret, { mode: 0o600, flag: 'wx' });
    }
  }
  let queue = Promise.resolve();
  const update = (fn) => {
    const task = queue.then(async () => {
      const draft = structuredClone(store);
      const result = fn(draft);
      const tmp = file + '.tmp';
      await writeFile(tmp, JSON.stringify(draft), { mode: 0o600 });
      await rename(tmp, file);
      store = draft;
      return result;
    });
    queue = task.catch(() => {});
    return task;
  };
  const sign = (token) =>
    createHmac('sha256', secret).update(token).digest('hex');
  const equal = (a, b) =>
    typeof a === 'string' &&
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b));
  const tokenOf = (req) => {
    const value = req.headers.cookie
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith('eds_session='))
      ?.slice(12);
    if (!value) return null;
    const [token, signature] = value.split('.');
    return signature && equal(sign(token), signature) ? token : null;
  };
  const identity = (req) => {
    const session = store.sessions[tokenOf(req)];
    return session && session.expires > Date.now() ? session.userId : null;
  };
  const cookie = (res, req, value, age) =>
    res.setHeader(
      'Set-Cookie',
      `eds_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${req.secure ? '; Secure' : ''}`
    );
  const wrap = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res)).catch(next);
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (
      req.method !== 'GET' &&
      req.headers.origin &&
      req.headers.origin !== `${req.protocol}://${req.headers.host}`
    )
      return res.status(403).json({ error: 'forbidden' });
    next();
  });
  const attempts = new Map();
  app.use('/api/auth', (req, res, next) => {
    if (req.method !== 'POST') return next();
    const key = String(req.body?.login || '').toLowerCase();
    const now = Date.now();
    for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
    if (attempts.size > 1000)
      return res.status(429).json({ error: 'rateLimit' });
    const item = attempts.get(key) || { count: 0, until: now + 60000 };
    attempts.set(key, item);
    if (++item.count > 12) return res.status(429).json({ error: 'rateLimit' });
    next();
  });
  for (const action of ['register', 'login'])
    app.post(
      `/api/auth/${action}`,
      wrap(async (req, res) => {
        const { login, password } = req.body || {};
        if (
          typeof login !== 'string' ||
          !/^[a-zA-Z0-9_-]{3,32}$/.test(login) ||
          typeof password !== 'string' ||
          password.length < 6 ||
          password.length > 128
        )
          return res.status(400).json({ error: 'credentialsFormat' });
        const normalized = login.toLowerCase();
        const token = randomBytes(32).toString('hex');
        const outcome = await update((draft) => {
          let user = draft.users.find(
            (u) => u.login.toLowerCase() === normalized
          );
          if (action === 'register') {
            if (user) return { error: 'loginTaken' };
            const salt = randomBytes(16).toString('hex');
            user = {
              id: randomBytes(16).toString('hex'),
              login,
              salt,
              hash: scryptSync(password, salt, 64).toString('hex')
            };
            draft.users.push(user);
          } else {
            const computed = scryptSync(
              password,
              user?.salt || 'missing-user',
              64
            ).toString('hex');
            if (!user || !equal(computed, user.hash))
              return { error: 'invalidCredentials' };
          }
          for (const [key, s] of Object.entries(draft.sessions))
            if (s.expires < Date.now()) delete draft.sessions[key];
          draft.sessions[token] = {
            userId: user.id,
            expires: Date.now() + 7 * 86400000
          };
          return { login: user.login };
        });
        if (outcome.error)
          return res.status(action === 'register' ? 409 : 401).json(outcome);
        cookie(res, req, `${token}.${sign(token)}`, 604800);
        res.json(outcome);
      })
    );
  app.get('/api/auth/me', (req, res) => {
    const user = store.users.find((u) => u.id === identity(req));
    res.json({ user: user ? { login: user.login } : null });
  });
  app.post(
    '/api/auth/logout',
    wrap(async (req, res) => {
      const token = tokenOf(req);
      await update((d) => {
        if (token) delete d.sessions[token];
      });
      cookie(res, req, '', 0);
      res.json({ ok: true });
    })
  );
  app.get('/api/progress', (req, res) => {
    const id = identity(req);
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    res.json(store.progress[id] || {});
  });
  app.post(
    '/api/progress',
    wrap(async (req, res) => {
      const id = identity(req);
      if (!id) return res.status(401).json({ error: 'unauthorized' });
      const { scenarioId, pathway, notes } = req.body || {};
      if (
        !/^S\d{2}$/.test(scenarioId || '') ||
        !Array.isArray(pathway) ||
        pathway.length > 100 ||
        (notes !== undefined &&
          (typeof notes !== 'string' || notes.length > 4000)) ||
        pathway.some(
          (p) =>
            !p ||
            typeof p !== 'object' ||
            !/^V\d+$/.test(p.nodeId || '') ||
            !/^[A-Z][0-9]?$/.test(p.variantId || '')
        )
      )
        return res.status(400).json({ error: 'invalidProgress' });
      await update((d) => {
        d.progress[id] ||= {};
        const previous = d.progress[id][scenarioId];
        const changed =
          JSON.stringify(previous?.pathway) !== JSON.stringify(pathway);
        const last = pathway[pathway.length - 1];
        const complete =
          last &&
          scenarioNodes
            .get(scenarioId)
            ?.find((n) => n.id === last.nodeId)
            ?.varianty.find((v) => v.id === last.variantId)?.nastupnyi_vuzol ===
            null;
        const now = new Date().toISOString();
        d.progress[id][scenarioId] = {
          pathway: pathway.map((p) => ({
            nodeId: p.nodeId,
            variantId: p.variantId
          })),
          notes: notes ?? previous?.notes ?? '',
          updatedAt: changed ? now : previous?.updatedAt || now,
          ...(complete
            ? { completedAt: (!changed && previous?.completedAt) || now }
            : {})
        };
      });
      res.json({ ok: true });
    })
  );
}
