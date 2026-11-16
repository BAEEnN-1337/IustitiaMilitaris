import { installClassroom } from './classroom.js';
import os from 'node:os';
import { installAccounts } from './accounts.js';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '32kb' }));
await installAccounts(
  app,
  process.env.DATA_DIR || path.join(__dirname, 'data')
);
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

const rooms = installClassroom(server, path.join(__dirname, '..', 'stsenarii'));

// Serve frontend build from dist
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms.size,
    zeroPii: true,
    timestamp: Date.now()
  });
});

function lanUrls() {
  return Object.entries(os.networkInterfaces())
    .sort(
      ([a], [b]) =>
        /docker|veth|vmnet|virbr|tun/i.test(a) -
        /docker|veth|vmnet|virbr|tun/i.test(b)
    )
    .flatMap(([, addresses]) => addresses || [])
    .filter((a) => a.family === 'IPv4' && !a.internal)
    .map((a) => `http://${a.address}:${PORT}`);
}
app.get('/api/server-info', (req, res) => {
  const urls = lanUrls();
  const host = req.headers.host || '';
  const origin = `${req.protocol}://${host}`;
  res.json({
    lanUrls: urls,
    preferredOrigin: /^(localhost|127\.0\.0\.1|\[::1\])(?::|$)/.test(host)
      ? urls[0] || origin
      : origin
  });
});
app.use('/api', (req, res) => res.status(404).json({ error: 'notFound' }));
app.get('*', (req, res) => {
  if (req.path.startsWith('/ws') || path.extname(req.path))
    return res.sendStatus(404);
  res.sendFile(path.join(distPath, 'index.html'));
});
app.use((error, req, res, next) =>
  res.status(error.status === 400 ? 400 : 500).json({ error: 'serverError' })
);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Local: http://localhost:${PORT}`);
  for (const url of lanUrls()) console.log(`Network (LAN): ${url}`);
});
