import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { WebSocketServer, WebSocket } from 'ws';
import { PartyError } from '../../lib/party/engine';
import { PartyService, roomCode, type Peer } from '../../lib/party/service';
import type { Room } from '../../lib/party/types';

loadEnvConfig(process.cwd());
const port = Number(process.env.PARTY_PORT || 8787);
const dir = process.env.PARTY_DATA_DIR || join(process.cwd(), '.party-data');
const allowed = new Set(
  (
    process.env.PARTY_ALLOWED_ORIGINS ||
    'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001'
  )
    .split(',')
    .map((s) => s.trim()),
);
const rooms = new Map<string, PartyService>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const limits = new Map<string, { count: number; end: number }>();
let aiDay = '',
  aiCount = 0;
function rate(key: string, max: number, window = 60_000) {
  const now = Date.now();
  let slot = limits.get(key);
  if (!slot || slot.end < now) {
    slot = { count: 0, end: now + window };
    limits.set(key, slot);
  }
  if (limits.size > 10000) for (const [k, v] of limits) if (v.end < now) limits.delete(k);
  return ++slot.count <= max;
}
async function service(code: string) {
  if (rooms.has(code)) return rooms.get(code)!;
  if (rooms.size > 500) throw new Error('Room capacity reached.');
  const file = join(dir, code + '.json');
  const s = new PartyService(
    {
      async load() {
        try {
          const room = JSON.parse(await readFile(file, 'utf8')) as Room;
          if (room.expiresAt < Date.now()) {
            await unlink(file);
            return;
          }
          room.players.forEach((p) => {
            p.connected = false;
            p.lastSeen = Date.now();
          });
          return room;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
          throw error;
        }
      },
      async save(room) {
        await mkdir(dir, { recursive: true, mode: 0o700 });
        const temp = file + '.tmp';
        await writeFile(temp, JSON.stringify(room), { mode: 0o600 });
        await rename(temp, file);
      },
      async alarm(time) {
        clearTimeout(timers.get(code));
        timers.set(
          code,
          setTimeout(
            () => {
              void s
                .alarm()
                .then(async () => {
                  if (s.room && s.room.expiresAt <= Date.now()) {
                    rooms.delete(code);
                    timers.delete(code);
                    await unlink(file).catch(() => undefined);
                  }
                })
                .catch(() => console.error('Party room alarm failed'));
            },
            Math.max(10, time - Date.now()),
          ),
        );
      },
    },
    process.env.GROQ_API_KEY,
    async (client) => {
      if (!rate('ai:' + client, 6, 86_400_000)) return false;
      const day = new Date().toISOString().slice(0, 10);
      if (day !== aiDay) {
        aiDay = day;
        aiCount = 0;
      }
      return ++aiCount <= Number(process.env.PARTY_AI_DAILY_LIMIT || 40);
    },
  );
  rooms.set(code, s);
  await s.load();
  if (s.room) await s.storage.alarm(Date.now() + 100);
  return s;
}
const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !allowed.has(origin)) {
    res.writeHead(403).end();
    return;
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
  }
  const reply = (status: number, body: unknown) =>
    res.writeHead(status, headers).end(JSON.stringify(body));
  if (req.method === 'OPTIONS') {
    reply(204, null);
    return;
  }
  if (req.url === '/health') {
    reply(200, {
      ok: true,
      transport: 'websocket',
      storage: 'local-file',
      ai: !!process.env.GROQ_API_KEY,
    });
    return;
  }
  const match = req.url?.match(/^\/rooms(?:\/([A-Z2-9]{6})\/join)?$/);
  if (!match || req.method !== 'POST') {
    reply(404, { error: 'Not found' });
    return;
  }
  if (!rate('join:' + req.socket.remoteAddress, 30)) {
    reply(429, { error: 'Too many joins. Wait a minute.' });
    return;
  }
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 2048) {
        reply(413, { error: 'Request too large' });
        return;
      }
    }
    const creating = !match[1];
    const code = match[1] || roomCode();
    if (creating && !rate('create:' + req.socket.remoteAddress, 8)) {
      reply(429, { error: 'Too many rooms. Wait a minute.' });
      return;
    }
    const s = await service(code);
    const seat = await s.join(code, JSON.parse(body), creating);
    reply(200, seat);
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'PartyError'
        ? error.message
        : 'Could not join. Check the name and code, then try again.';
    reply(400, { error: message });
  }
});
const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 128 * 1024,
  perMessageDeflate: false,
});
server.on('upgrade', (req, socket, head) => {
  const match = req.url?.match(/^\/rooms\/([A-Z2-9]{6})\/ws$/);
  if (
    !match ||
    !req.headers.origin ||
    !allowed.has(req.headers.origin) ||
    !rate('socket:' + req.socket.remoteAddress, 120)
  ) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    void attach(match[1], ws, req.socket.remoteAddress).catch(() =>
      ws.close(1011, 'Connection failed'),
    );
  });
});
async function attach(code: string, ws: WebSocket, client?: string) {
  // Attach listeners before reading durable state: the first auth frame can
  // arrive while disk I/O is still in flight after a process restart.
  const ready = service(code);
  void ready.catch(() => ws.close(1011, 'Room unavailable'));
  let authorised = false;
  let processing = false;
  let count = 0;
  let windowEnd = Date.now() + 10_000;
  const peer: Peer = {
    id: crypto.randomUUID(),
    client,
    send(message) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
    },
    close(status, reason) {
      ws.close(status, reason);
    },
  };
  const timeout = setTimeout(() => {
    if (!authorised) ws.close(4003, 'Authentication required');
  }, 10_000);
  ws.on('error', () => undefined);
  ws.on('message', async (data, isBinary) => {
    if (data.toString() === 'ping') {
      ws.send('pong');
      return;
    }
    if (Date.now() > windowEnd) {
      count = 0;
      windowEnd = Date.now() + 10_000;
    }
    if (++count > 45 || isBinary) {
      ws.close(4008, 'Slow down');
      return;
    }
    try {
      const message = JSON.parse(data.toString());
      const s = await ready;
      if (!authorised) {
        if (processing) return;
        processing = true;
        if (message.type !== 'auth') throw new PartyError('Join first');
        await s.connect(peer, message);
        authorised = true;
        clearTimeout(timeout);
        if (ws.readyState !== WebSocket.OPEN) await s.disconnect(peer.id);
      } else await s.message(peer.id, message);
    } catch (error) {
      // Only a rejected credential or room is final; anything else is retried.
      const known = error instanceof PartyError;
      peer.send({
        type: 'error',
        error: known ? error.message : 'Could not read this message.',
      });
      if (!authorised) ws.close(known ? error.close : 4011, 'Join the room again');
    }
  });
  ws.on('close', () => {
    clearTimeout(timeout);
    void ready.then((s) => s.disconnect(peer.id)).catch(() => undefined);
  });
}
server.listen(port, process.env.PARTY_HOST || '127.0.0.1', () =>
  console.log(
    `Party WebSocket server ready on port ${port}; durable local storage; AI ${process.env.GROQ_API_KEY ? 'enabled' : 'off'}.`,
  ),
);
