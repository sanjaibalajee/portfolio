import { PartyError } from '../../lib/party/engine';
import { PartyService, roomCode, hashToken, type Peer } from '../../lib/party/service';
import type { Room } from '../../lib/party/types';
interface Env {
  ROOMS: DurableObjectNamespace;
  QUOTA: DurableObjectNamespace;
  ALLOWED_ORIGINS: string;
  GROQ_API_KEY?: string;
  AI_DAILY_LIMIT?: string;
}
const originAllowed = (req: Request, env: Env) =>
  !!req.headers.get('Origin') &&
  env.ALLOWED_ORIGINS.split(',').includes(req.headers.get('Origin')!);
async function smallBody(req: Request): Promise<string | undefined> {
  if (Number(req.headers.get('Content-Length') || 0) > 2048) return;
  const reader = req.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let text = '',
    size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > 2048) {
      await reader.cancel();
      return;
    }
    text += decoder.decode(value, { stream: true });
  }
}
const worker = {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const cors = {
      'Access-Control-Allow-Origin': req.headers.get('Origin') || '',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
      'Cache-Control': 'no-store',
    };
    if (!originAllowed(req, env)) return new Response('Forbidden', { status: 403 });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const route = url.pathname.match(/^\/rooms(?:\/([A-Z2-9]{6})\/(join|ws))?$/);
    if (!route) return new Response('Not found', { status: 404 });
    const ip = await hashToken(req.headers.get('CF-Connecting-IP') || 'unknown');
    const quota = env.QUOTA.get(env.QUOTA.idFromName('party-quota'));
    const limit = await quota.fetch(
      new Request('https://quota/consume', {
        method: 'POST',
        body: JSON.stringify({
          key: `${route[2] === 'ws' ? 'socket' : 'join'}:${ip}`,
          max: route[2] === 'ws' ? 120 : 30,
          window: 60000,
        }),
      }),
    );
    if (!limit.ok)
      return Response.json(
        { error: 'Too many requests. Try again in a minute.' },
        { status: 429, headers: cors },
      );
    const code = route[1] || roomCode();
    const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
    url.pathname = `/${code}/${route[2] || 'create'}`;
    const response = await stub.fetch(new Request(url, req));
    if (response.status === 101) return response;
    const headers = new Headers(response.headers);
    Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
    return new Response(response.body, { status: response.status, headers });
  },
};
export default worker;
type Attachment = {
  id: string;
  client?: string;
  playerId?: string;
  authed: boolean;
  watch?: boolean;
  adult?: boolean;
  count?: number;
  end?: number;
};
// Batch reads are limited to 128 keys.
async function getChunks(storage: DurableObjectStorage, count: number) {
  const chunks: string[] = [];
  for (let start = 0; start < count; start += 128) {
    const keys = Array.from({ length: Math.min(128, count - start) }, (_, i) => `room:${start + i}`);
    const values = await storage.get<string>(keys);
    for (const key of keys) chunks.push(values.get(key) || '');
  }
  return chunks;
}
// Put the round first, and its drawings first within it, so that small lobby
// and presence changes only alter the trailing chunks.
function serialize(room: Room) {
  const { round, ...rest } = room;
  if (!round) return JSON.stringify(rest);
  const { chains, ...details } = round;
  return JSON.stringify({ round: { chains, ...details }, ...rest });
}
async function dailyQuota(env: Env, key: string, max: number) {
  const quota = env.QUOTA.get(env.QUOTA.idFromName('party-quota'));
  const response = await quota.fetch(
    new Request('https://quota/consume', {
      method: 'POST',
      body: JSON.stringify({ key: `${key}:${new Date().toISOString().slice(0, 10)}`, max, window: 86400000 }),
    }),
  );
  return response.ok;
}
export class PartyRoom {
  service: PartyService;
  // Last committed chunks, so a save only rewrites what changed.
  saved: string[] = [];
  constructor(
    readonly ctx: DurableObjectState,
    readonly env: Env,
  ) {
    this.service = new PartyService(
      {
        load: async () => {
          const count = await ctx.storage.get<number>('chunks');
          this.saved = [];
          if (count === undefined) return;
          const chunks = await getChunks(ctx.storage, count);
          this.saved = chunks;
          return JSON.parse(chunks.join('')) as Room;
        },
        // A relay can exceed the per-value limit. Chunk the snapshot atomically;
        // the metadata and every drawing always commit in the same transaction.
        save: async (room) => {
          const chunks = serialize(room).match(/[\s\S]{1,24000}/g) || [];
          await ctx.storage.transaction(async (tx) => {
            const previous = (await tx.get<number>('chunks')) || 0;
            for (let i = 0; i < chunks.length; i++)
              if (i >= previous || chunks[i] !== this.saved[i]) await tx.put(`room:${i}`, chunks[i]);
            for (let i = chunks.length; i < previous; i++) await tx.delete(`room:${i}`);
            if (chunks.length !== previous) await tx.put('chunks', chunks.length);
          });
          this.saved = chunks;
        },
        alarm: async (time) => {
          await ctx.storage.setAlarm(time);
        },
      },
      env.GROQ_API_KEY,
      // One client cannot spend the whole day's budget.
      async (client) =>
        (await dailyQuota(env, `ai-client:${client || 'unknown'}`, 6)) &&
        (await dailyQuota(env, 'ai', Number(env.AI_DAILY_LIMIT || 40))),
    );
    ctx.blockConcurrencyWhile(async () => {
      const peers: Peer[] = [];
      for (const ws of ctx.getWebSockets()) {
        const a = ws.deserializeAttachment() as Attachment;
        if (a?.authed) peers.push(this.peer(ws, a));
      }
      await this.service.restoreConnections(peers);
    });
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  peer(ws: WebSocket, a: Attachment): Peer {
    return {
      id: a.id,
      playerId: a.playerId,
      adult: a.adult,
      client: a.client,
      send: (message) => {
        try {
          ws.send(JSON.stringify(message));
        } catch {}
      },
      close: (code, reason) => ws.close(code, reason),
    };
  }
  async fetch(req: Request) {
    const [, code, action] = new URL(req.url).pathname.split('/');
    if (action === 'ws' && req.headers.get('Upgrade') === 'websocket') {
      if (this.ctx.getWebSockets().length >= 40) return new Response('Room full', { status: 429 });
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({
        id: crypto.randomUUID(),
        client: await hashToken(req.headers.get('CF-Connecting-IP') || 'unknown'),
        authed: false,
      } satisfies Attachment);
      // Short-lived authentication timeout; idle authenticated rooms use hibernation.
      setTimeout(() => {
        if (!(server.deserializeAttachment() as Attachment)?.authed)
          server.close(4003, 'Authentication required');
      }, 10_000);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (req.method !== 'POST' || !['create', 'join'].includes(action))
      return new Response('Not found', { status: 404 });
    try {
      const text = await smallBody(req);
      if (text === undefined) return Response.json({ error: 'Request too large' }, { status: 413 });
      const seat = await this.service.join(code, JSON.parse(text), action === 'create');
      return Response.json(seat, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error && error.name === 'PartyError'
              ? error.message
              : 'Could not join. Check the name and room code.',
        },
        { status: 400 },
      );
    }
  }
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const a = ws.deserializeAttachment() as Attachment;
    if (typeof message !== 'string' || message.length > 128 * 1024) {
      ws.close(4008, 'Message too large');
      return;
    }
    if (!a.end || a.end < Date.now()) {
      a.count = 0;
      a.end = Date.now() + 10000;
    }
    a.count = (a.count || 0) + 1;
    ws.serializeAttachment(a);
    if (a.count > 45) {
      ws.close(4008, 'Slow down');
      return;
    }
    try {
      const data = JSON.parse(message);
      if (!a.authed) {
        if (data.type !== 'auth') throw new PartyError('Join first');
        const peer = this.peer(ws, a);
        await this.service.connect(peer, data);
        a.authed = true;
        a.playerId = peer.playerId;
        a.watch = !peer.playerId;
        a.adult = peer.adult;
        ws.serializeAttachment(a);
      } else {
        this.ctx.waitUntil(this.service.message(a.id, data));
      }
    } catch (error) {
      // Only a rejected credential or room is final; storage hiccups are retried.
      const known = error instanceof PartyError;
      try {
        ws.send(
          JSON.stringify({
            type: 'error',
            error: known ? error.message : 'Could not reach the room. Retrying…',
          }),
        );
        if (!a.authed) ws.close(known ? error.close : 4011, 'Join again');
      } catch {}
    }
  }
  async webSocketClose(ws: WebSocket) {
    const a = ws.deserializeAttachment() as Attachment;
    // Also when the socket closed while its authentication was still running:
    // the serial queue runs this after that connect installed the peer.
    if (a) await this.service.disconnect(a.id);
  }
  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }
  async alarm() {
    await this.service.alarm();
    if (this.service.room && this.service.room.expiresAt <= Date.now())
      await this.ctx.storage.deleteAll();
  }
}
export class PartyQuota {
  constructor(readonly ctx: DurableObjectState) {}
  async fetch(req: Request) {
    const { key, max, window } = (await req.json()) as { key: string; max: number; window: number };
    const now = Date.now();
    const ok = await this.ctx.storage.transaction(async (tx) => {
      let slot = await tx.get<{ count: number; end: number }>(key);
      if (!slot || slot.end < now) slot = { count: 0, end: now + window };
      slot.count++;
      await tx.put(key, slot);
      return slot.count <= max;
    });
    if ((await this.ctx.storage.getAlarm()) === null)
      await this.ctx.storage.setAlarm(now + 86400000);
    return new Response(null, { status: ok ? 204 : 429 });
  }
  async alarm() {
    const now = Date.now();
    const rows = await this.ctx.storage.list<{ end: number }>();
    for (const [key, value] of rows) if (value.end < now) await this.ctx.storage.delete(key);
    if ((await this.ctx.storage.list({ limit: 1 })).size)
      await this.ctx.storage.setAlarm(now + 86400000);
  }
}
