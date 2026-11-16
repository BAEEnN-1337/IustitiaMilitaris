import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

/**
 * Ephemeral In-Memory Room Store
 * STRICT PRIVACY & ANTI-PROFILING GUARANTEE:
 * - NO user identifiers, emails, names, or military ranks.
 * - NO IP addresses or user-agents stored.
 * - Only anonymous aggregated vote counts (e.g. { "A": 12, "B": 8 }).
 * - Auto-cleaned from RAM after session ends or timeout.
 */
const rooms = new Map();
// Map of roomCode -> Set of WebSocket clients
const roomClients = new Map();

function calculateDiscussionIndex(votes, total) {
  if (total <= 1) return 0;
  const counts = Object.values(votes).filter(c => c > 0);
  const k = counts.length;
  if (k <= 1) return 0;

  // Normalized Simpson diversity index D = (1 - sum(p_i^2)) / (1 - 1/k)
  const sumSqProportions = counts.reduce((acc, c) => acc + Math.pow(c / total, 2), 0);
  const maxPossible = 1 - (1 / k);
  if (maxPossible <= 0) return 0;
  const index = (1 - sumSqProportions) / maxPossible;
  return Math.round(index * 100) / 100;
}

function broadcastRoomState(roomCode) {
  const room = rooms.get(roomCode);
  const clients = roomClients.get(roomCode);
  if (!room || !clients) return;

  const payload = JSON.stringify({
    type: 'ROOM_UPDATE',
    room: {
      code: room.code,
      scenarioId: room.scenarioId,
      currentNodeId: room.currentNodeId,
      votingActive: room.votingActive,
      votes: room.votes,
      totalVotes: room.totalVotes,
      participantsCount: clients.size,
      discussionIndex: room.discussionIndex,
      history: room.history
    }
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Clean up stale rooms older than 3 hours
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivity > 3 * 60 * 60 * 1000) {
      rooms.delete(code);
      const clients = roomClients.get(code);
      if (clients) {
        for (const c of clients) {
          c.close();
        }
        roomClients.delete(code);
      }
      console.log(`[Memory Clean] Purged expired room ${code}`);
    }
  }
}, 15 * 60 * 1000);

wss.on('connection', (ws) => {
  let joinedRoomCode = null;

  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw);
      const { type, roomCode, scenarioId, startNodeId, variantId, nextNodeId } = data;

      if (type === 'CREATE_ROOM') {
        // Generate unique 6-digit room code
        let code = '';
        do {
          code = Math.floor(100000 + Math.random() * 900000).toString();
        } while (rooms.has(code));

        const newRoom = {
          code,
          scenarioId: scenarioId || 'S06',
          currentNodeId: startNodeId || 'V1',
          votingActive: true,
          votes: {},
          totalVotes: 0,
          history: [],
          discussionIndex: 0,
          createdAt: Date.now(),
          lastActivity: Date.now()
        };

        rooms.set(code, newRoom);
        roomClients.set(code, new Set([ws]));
        joinedRoomCode = code;

        ws.send(JSON.stringify({ type: 'ROOM_CREATED', room: newRoom }));
        broadcastRoomState(code);
        console.log(`[Classroom] Room created: ${code} for scenario ${scenarioId}`);
      }

      else if (type === 'JOIN_ROOM') {
        const code = String(roomCode).trim();
        const room = rooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Кімнату не знайдено або термін її дії закінчився' }));
          return;
        }

        joinedRoomCode = code;
        let clients = roomClients.get(code);
        if (!clients) {
          clients = new Set();
          roomClients.set(code, clients);
        }
        clients.add(ws);
        room.lastActivity = Date.now();

        ws.send(JSON.stringify({
          type: 'JOINED_SUCCESS',
          room: {
            code: room.code,
            scenarioId: room.scenarioId,
            currentNodeId: room.currentNodeId,
            votingActive: room.votingActive,
            votes: room.votes,
            totalVotes: room.totalVotes,
            participantsCount: clients.size,
            discussionIndex: room.discussionIndex
          }
        }));
        broadcastRoomState(code);
      }

      else if (type === 'SUBMIT_VOTE') {
        if (!joinedRoomCode || !rooms.has(joinedRoomCode)) return;
        const room = rooms.get(joinedRoomCode);
        if (!room.votingActive) return;

        // Anonymous tally increment
        const opt = String(variantId);
        room.votes[opt] = (room.votes[opt] || 0) + 1;
        room.totalVotes += 1;
        room.discussionIndex = calculateDiscussionIndex(room.votes, room.totalVotes);
        room.lastActivity = Date.now();

        ws.send(JSON.stringify({ type: 'VOTE_ACCEPTED', variantId: opt }));
        broadcastRoomState(joinedRoomCode);
      }

      else if (type === 'TOGGLE_VOTING') {
        if (!joinedRoomCode || !rooms.has(joinedRoomCode)) return;
        const room = rooms.get(joinedRoomCode);
        room.votingActive = !room.votingActive;
        room.lastActivity = Date.now();
        broadcastRoomState(joinedRoomCode);
      }

      else if (type === 'NEXT_STAGE') {
        if (!joinedRoomCode || !rooms.has(joinedRoomCode)) return;
        const room = rooms.get(joinedRoomCode);

        // Save stage to history
        room.history.push({
          nodeId: room.currentNodeId,
          selectedVariantId: variantId,
          votes: { ...room.votes },
          totalVotes: room.totalVotes,
          discussionIndex: room.discussionIndex
        });

        // Advance
        if (nextNodeId) {
          room.currentNodeId = nextNodeId;
        }
        room.votes = {};
        room.totalVotes = 0;
        room.discussionIndex = 0;
        room.votingActive = true;
        room.lastActivity = Date.now();

        broadcastRoomState(joinedRoomCode);
      }

      else if (type === 'CLOSE_SESSION') {
        if (!joinedRoomCode || !rooms.has(joinedRoomCode)) return;
        const code = joinedRoomCode;
        rooms.delete(code);
        const clients = roomClients.get(code);
        if (clients) {
          const payload = JSON.stringify({ type: 'SESSION_CLOSED' });
          for (const c of clients) {
            if (c.readyState === WebSocket.OPEN) {
              c.send(payload);
            }
          }
          roomClients.delete(code);
        }
        console.log(`[Classroom] Room closed and erased from memory: ${code}`);
      }
    } catch (e) {
      console.error('[WebSocket Error]', e);
    }
  });

  ws.on('close', () => {
    if (joinedRoomCode) {
      const clients = roomClients.get(joinedRoomCode);
      if (clients) {
        clients.delete(ws);
        broadcastRoomState(joinedRoomCode);
      }
    }
  });
});

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

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  Ethical Dilemmas Simulator Server (IV Hackathon)`);
  console.log(`  Local: http://localhost:${PORT}`);
  console.log(`  Network / Classroom: http://0.0.0.0:${PORT}`);
  console.log(`  Zero PII Policy: Ephemeral memory rooms only`);
  console.log(`=======================================================`);
});
