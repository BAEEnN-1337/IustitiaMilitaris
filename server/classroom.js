import { randomBytes, randomInt } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { WebSocketServer } from 'ws';
export function installClassroom(server, directory) {
  const scenarios = new Map(
    readdirSync(directory)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const s = JSON.parse(readFileSync(`${directory}/${f}`, 'utf8'));
        return [s.id, s];
      })
  );
  const rooms = new Map();
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8192 });
  const send = (ws, data) => {
    if (ws.readyState === 1) ws.send(JSON.stringify(data));
  };
  const publicRoom = (room, role) => ({
    code: room.code,
    scenarioId: room.scenarioId,
    currentNodeId: room.currentNodeId,
    phase: room.phase,
    selectedVariantId: room.selectedVariantId,
    votes:
      room.phase === 'voting' && role === 'student' && !room.showLive
        ? {}
        : room.votes,
    showLive: room.showLive,
    totalVotes: Object.values(room.votes).reduce((a, b) => a + b, 0),
    participantsCount: new Set(
      [...room.clients].filter((c) => c.role === 'student').map((c) => c.token)
    ).size,
    history: room.history,
    discussionIndex: room.index
  });
  const broadcast = (room) => {
    for (const ws of room.clients)
      send(ws, {
        type: 'ROOM_UPDATE',
        room: publicRoom(room, ws.role),
        hasVoted: room.voters.has(ws.token)
      });
  };
  const close = (room) => {
    for (const ws of room.clients) send(ws, { type: 'SESSION_CLOSED' });
    room.clients.clear();
    rooms.delete(room.code);
  };
  const timer = setInterval(() => {
    for (const room of rooms.values())
      if (Date.now() - room.updated > 3 * 3600000) close(room);
  }, 60000);
  timer.unref();
  server.on('close', () => clearInterval(timer));
  wss.on('connection', (ws, request) => {
    if (request.headers.origin) {
      try {
        if (new URL(request.headers.origin).host !== request.headers.host) {
          ws.close(1008);
          return;
        }
      } catch {
        ws.close(1008);
        return;
      }
    }
    let joined;
    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw);
        if (data.type === 'CREATE_ROOM') {
          if (joined || !scenarios.has(data.scenarioId) || rooms.size >= 100)
            return;
          let code;
          do {
            code = String(randomInt(100000, 1000000));
          } while (rooms.has(code));
          const room = {
            code,
            scenarioId: data.scenarioId,
            currentNodeId: scenarios.get(data.scenarioId).pochatkovyi_vuzol,
            phase: 'briefing',
            showLive: true,
            hostSecret: randomBytes(32).toString('hex'),
            clients: new Set([ws]),
            voters: new Set(),
            votes: {},
            history: [],
            index: 0,
            updated: Date.now()
          };
          rooms.set(code, room);
          joined = room;
          ws.role = 'host';
          send(ws, {
            type: 'ROOM_CREATED',
            hostSecret: room.hostSecret,
            room: publicRoom(room)
          });
          return;
        }
        if (data.type === 'JOIN_ROOM') {
          const room = rooms.get(String(data.roomCode));
          if (!room) {
            send(ws, { type: 'ERROR', error: 'roomMissing' });
            return;
          }
          if (data.hostSecret && data.hostSecret !== room.hostSecret) {
            send(ws, { type: 'ERROR', error: 'forbidden' });
            return;
          }
          if (
            !data.hostSecret &&
            !/^[a-zA-Z0-9-]{20,100}$/.test(data.clientVoteToken || '')
          )
            return;
          if (joined) joined.clients.delete(ws);
          joined = room;
          ws.role = data.hostSecret ? 'host' : 'student';
          ws.token = data.clientVoteToken;
          room.clients.add(ws);
          room.updated = Date.now();
          broadcast(room);
          return;
        }
        if (!joined || !rooms.has(joined.code)) return;
        const room = joined;
        room.updated = Date.now();
        const node = scenarios
          .get(room.scenarioId)
          .vuzly.find((n) => n.id === room.currentNodeId);
        if (data.type === 'SUBMIT_VOTE') {
          if (
            ws.role !== 'student' ||
            room.phase !== 'voting' ||
            room.voters.has(ws.token) ||
            !node.varianty.some((v) => v.id === data.variantId)
          )
            return;
          room.voters.add(ws.token);
          room.votes[data.variantId] = (room.votes[data.variantId] || 0) + 1;
          const total = Object.values(room.votes).reduce((a, b) => a + b, 0),
            counts = Object.values(room.votes),
            k = counts.length;
          room.index =
            k < 2
              ? 0
              : Math.round(
                  ((1 - counts.reduce((a, c) => a + (c / total) ** 2, 0)) /
                    (1 - 1 / k)) *
                    100
                ) / 100;
          broadcast(room);
          return;
        }
        if (ws.role !== 'host') {
          send(ws, { type: 'ERROR', error: 'forbidden' });
          return;
        }
        if (data.type === 'SET_LIVE') {
          room.showLive = Boolean(data.showLive);
          broadcast(room);
          return;
        }
        if (data.type === 'OPEN_VOTING' && room.phase === 'briefing')
          room.phase = 'voting';
        else if (data.type === 'SHOW_RESULTS' && room.phase === 'voting')
          room.phase = 'results';
        else if (
          data.type === 'DISCUSS' &&
          ['results', 'feedback'].includes(room.phase) &&
          node.varianty.some((v) => v.id === data.variantId)
        ) {
          room.selectedVariantId = data.variantId;
          room.phase = 'feedback';
        } else if (data.type === 'NEXT_STAGE' && room.phase === 'feedback') {
          const variant = node.varianty.find(
            (v) => v.id === room.selectedVariantId
          );
          room.history.push({
            nodeId: node.id,
            selectedVariantId: variant.id,
            votes: { ...room.votes },
            discussionIndex: room.index
          });
          if (!variant.nastupnyi_vuzol) room.phase = 'finished';
          else {
            room.currentNodeId = variant.nastupnyi_vuzol;
            room.phase = 'voting';
            room.votes = {};
            room.voters.clear();
            room.index = 0;
            room.selectedVariantId = null;
          }
        } else if (data.type === 'CLOSE_SESSION') {
          close(room);
          return;
        } else return;
        broadcast(room);
      } catch {
        send(ws, { type: 'ERROR', error: 'invalidMessage' });
      }
    });
    ws.on('close', () => {
      if (joined) {
        joined.clients.delete(ws);
        broadcast(joined);
      }
    });
  });
  return rooms;
}
