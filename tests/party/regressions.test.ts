import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, addPlayer, createRoom, project, tick, type PartyError } from '../../lib/party/engine';
import { drawingSchema, joinSchema } from '../../lib/party/protocol';
import { PartyService, type Peer } from '../../lib/party/service';
import type { Game, Room, ServerMessage } from '../../lib/party/types';

function setup(game: Game) {
  const room = createRoom('ABC234');
  room.settings.game = game;
  for (const name of ['Host', 'Friend One', 'Friend Two']) {
    const p = addPlayer(room, name, name);
    p.ready = p.connected = true;
  }
  action(room, room.host, 'start');
  return room;
}
function action(room: Room, player: string, type: string, extra: Record<string, unknown> = {}) {
  return act(room, player, {
    id: crypto.randomUUID(), type,
    roundId: room.round?.id, phase: room.round?.phase, step: room.round?.step,
    ...extra,
  });
}

test('a delayed drawing cannot answer a later drawing step in the same round', () => {
  const room = setup('draw');
  const round = room.round!;
  const oldStep = round.step;
  action(room, room.host, 'advance');
  action(room, room.host, 'advance');
  assert.equal(round.step, 2);
  assert.throws(() => action(room, room.host, 'answer', {
    step: oldStep, text: '', drawing: [{ color: 'ink', points: [[0, 0], [1, 1]] }],
  }), /step changed/i);
  assert.equal(round.answers[room.host], undefined);
});

test('a delayed host advance cannot skip the next phase', () => {
  const room = setup('imposter');
  const round = room.round!;
  for (const id of round.participants) action(room, id, 'answer', { text: 'clue' });
  const oldPhase = round.phase;
  action(room, room.host, 'advance');
  assert.equal(round.phase, 'vote');
  assert.throws(() => action(room, room.host, 'advance', { phase: oldPhase }), /phase changed/i);
  assert.equal(round.phase, 'vote');
});

test('Bluff rewards matching the truth even when no alternative options exist', () => {
  const room = setup('bluff');
  const round = room.round!;
  for (const id of round.participants) action(room, id, 'answer', { text: round.card.secret });
  assert.equal(round.phase, 'reveal');
  assert.equal(round.reason, undefined);
  assert.deepEqual(room.players.map(p => p.score), [2, 2, 2]);
});

function memoryStore() {
  let saved: Room | undefined;
  return {
    fail: false,
    async load() { return saved && structuredClone(saved); },
    async save(room: Room) {
      if (this.fail) throw new Error('Storage unavailable');
      saved = structuredClone(room);
    },
    async alarm() {},
  };
}
// A host plus two friends, all connected and ready.
async function seated(service: PartyService) {
  const seats = [await service.join('ABC234', { name: 'Host' }, true)];
  for (const name of ['Friend One', 'Friend Two']) seats.push(await service.join('ABC234', { name }));
  const clients = seats.map((_, i) => client('peer' + i));
  for (const [i, seat] of seats.entries()) await service.connect(clients[i].peer, seat);
  return clients[0];
}
function client(id: string) {
  const messages: ServerMessage[] = [];
  const closes: number[] = [];
  const peer: Peer = { id, send: m => messages.push(m), close: code => closes.push(code) };
  return { peer, messages, closes };
}

test('failed authentication persistence does not register a peer or replace a valid socket', async () => {
  const store = memoryStore();
  const service = new PartyService(store);
  const seat = await service.join('ABC234', { name: 'Host' }, true);
  const first = client('first');
  await service.connect(first.peer, seat);
  const replacement = client('replacement');
  store.fail = true;
  await assert.rejects(service.connect(replacement.peer, seat), /Storage unavailable/);
  assert.equal(service.peers.has('replacement'), false);
  assert.equal(service.peers.get('first'), first.peer);
  assert.deepEqual(first.closes, []);
});

test('Worker recovery preserves hibernating sockets and clears lost connections before host handover', async () => {
  const store = memoryStore();
  const service = new PartyService(store);
  const host = await service.join('ABC234', { name: 'Host' }, true);
  const friend = await service.join('ABC234', { name: 'Friend' });
  const hostClient = client('host');
  const friendClient = client('friend');
  await service.connect(hostClient.peer, host);
  await service.connect(friendClient.peer, friend);
  const hibernated = new PartyService(store);
  await hibernated.restoreConnections([hostClient.peer, friendClient.peer]);
  assert(hibernated.room!.players.every(p => p.connected));
  assert.equal(hibernated.room!.revision, service.room!.revision);

  const restarted = new PartyService(store);
  await restarted.restoreConnections([]);
  assert(restarted.room!.players.every(p => !p.connected));
  assert((await store.load())!.players.every(p => !p.connected));
  await restarted.connect(client('reconnected-friend').peer, friend);
  const disconnectedAt = restarted.room!.players.find(p => p.id === host.playerId)!.lastSeen;
  tick(restarted.room!, disconnectedAt + 60_001);
  assert.equal(restarted.room!.host, friend.playerId);
});

test('expired rooms cannot reserve AI budget or launch generation', async () => {
  const store = memoryStore();
  let reserved = 0;
  const service = new PartyService(store, 'test-key', async () => { reserved++; return false; });
  const seat = await service.join('ABC234', { name: 'Host' }, true);
  const host = client('host');
  await service.connect(host.peer, seat);
  service.room!.expiresAt = Date.now() - 1;
  await service.message(host.peer.id, { type: 'lore', id: crypto.randomUUID(), context: 'A group of train enthusiasts' });
  assert.equal(reserved, 0);
  assert.equal(service.room!.generation.count, 0);
  assert(host.messages.some(m => m.type === 'error' && /expired/i.test(m.error)));
});

test('a failed lore reservation write cannot launch a provider request', async (t) => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return Response.json({}, { status: 503 });
  });
  const store = memoryStore();
  const service = new PartyService(store, 'test-key', async () => true);
  const host = await seated(service);
  store.fail = true;
  const id = crypto.randomUUID();
  await service.message(host.peer.id, { type: 'lore', id, context: 'A group of train enthusiasts' });
  assert.equal(requests, 0);
  assert.equal(service.room!.generation.count, 0);
  assert.equal(service.room!.generation.pending, undefined);
  assert(host.messages.some(m => m.type === 'error' && m.id === id));
  assert(!host.messages.some(m => m.type === 'ack' && m.id === id));
});

test('an action on an expired room does not advance or score its overdue round', async () => {
  const store = memoryStore();
  const room = setup('brain');
  action(room, room.players[0].id, 'answer', { text: 'toast' });
  action(room, room.players[1].id, 'answer', { text: 'toast' });
  room.expiresAt = room.round!.endsAt = Date.now() - 1;
  await store.save(room);
  const service = new PartyService(store);
  await service.load();
  const host = client('host');
  host.peer.playerId = room.host;
  service.peers.set(host.peer.id, host.peer);
  await service.message(host.peer.id, { id: crypto.randomUUID(), type: 'ready', ready: false });
  assert.equal(service.room!.round!.phase, 'answer');
  assert(service.room!.players.every(p => p.score === 0));
});

test('start explains why no round could be dealt instead of silently doing nothing', () => {
  const room = createRoom('ABC234');
  for (const name of ['Host', 'Friend One', 'Friend Two']) {
    const p = addPlayer(room, name, name);
    p.ready = p.connected = true;
  }
  room.settings.topic = 'group-lore';
  assert.throws(() => action(room, room.host, 'start'), /No cards match/);
  assert.equal(room.round, undefined);
});

test('Who Said That reveals only the answer the group guessed', () => {
  const room = setup('who');
  const round = room.round!;
  for (const id of round.participants) action(room, id, 'answer', { text: 'a secret from ' + id });
  for (const id of round.participants.filter(id => id !== round.target))
    action(room, id, 'vote', { option: round.target });
  assert.equal(round.phase, 'reveal');
  const answers = project(room, room.host).round!.answers!;
  assert.deepEqual(answers.map(a => a.player), [round.target]);
});

test('a display needs the host link and cannot crowd out seats', async () => {
  const service = new PartyService(memoryStore());
  const host = await seated(service);
  const key = (host.messages.findLast(m => m.type === 'state') as Extract<ServerMessage, { type: 'state' }>).state.displayKey;
  assert(key);
  await assert.rejects(service.connect(client('guess').peer, { watch: true, display: 'wrong' }), /display link/);
  for (let i = 0; i < 4; i++) await service.connect(client('tv' + i).peer, { watch: true, display: key });
  await assert.rejects(service.connect(client('tv4').peer, { watch: true, display: key }), (e: PartyError) => e.close === 4013);
  const friend = client('friend-elsewhere');
  const seat = await service.join('ABC234', { name: 'Late Friend' });
  await service.connect(friend.peer, seat);
  assert(friend.messages.some(m => m.type === 'state' && !m.state.displayKey));
});

test('Group Lore needs three connected players before it spends AI budget', async () => {
  let reserved = 0;
  const service = new PartyService(memoryStore(), 'test-key', async () => { reserved++; return true; });
  const seat = await service.join('ABC234', { name: 'Host' }, true);
  const host = client('host');
  await service.connect(host.peer, seat);
  await service.message(host.peer.id, { type: 'lore', id: crypto.randomUUID(), context: 'A group of train enthusiasts' });
  assert.equal(reserved, 0);
  assert(host.messages.some(m => m.type === 'error' && /3 connected/.test(m.error)));
});

test('AI failures that could echo model output are not shown to the room', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: 'not json at all' } }] }));
  const service = new PartyService(memoryStore(), 'test-key', async () => true);
  const host = await seated(service);
  await service.message(host.peer.id, { type: 'lore', id: crypto.randomUUID(), context: 'A group of train enthusiasts' });
  assert.equal(service.room!.generation.status, 'Could not create this pack. Curated packs are ready.');
});

test('finished relay drawings are sent once per socket', async () => {
  const store = memoryStore();
  const room = setup('draw');
  for (let step = 0; step < room.round!.maxSteps; step++)
    for (const id of room.round!.participants)
      action(room, id, 'answer', step % 2 === 0
        ? { text: '', step, drawing: [{ color: 'ink', points: [[0.12345, 0.5], [0.9, 0.9]] }] }
        : { text: 'a caption', step });
  assert.equal(room.round!.phase, 'reveal');
  await store.save(room);
  const service = new PartyService(store);
  await service.load();
  const viewer = client('viewer');
  viewer.peer.playerId = room.host;
  service.peers.set(viewer.peer.id, viewer.peer);
  service.broadcast();
  service.broadcast();
  const [first, second] = viewer.messages.map(m => m.type === 'state' ? m.state.round!.reveal! : undefined);
  assert(first!.chains.length && !first!.cached);
  assert.equal(first!.chains[0].steps[0].drawing![0].points[0][0], 0.123);
  assert.deepEqual(second!.chains, []);
  assert.equal(second!.cached, true);
});

test('drawings are capped at 2,000 points', () => {
  const stroke = { color: 'ink', points: Array.from({ length: 180 }, () => [0.5, 0.5]) };
  assert(drawingSchema.safeParse(Array(11).fill(stroke)).success);
  assert(!drawingSchema.safeParse(Array(12).fill(stroke)).success);
});

test('names typed with a curly apostrophe are accepted', () => {
  assert.equal(joinSchema.parse({ name: 'O’Brien' }).name, "O'Brien");
});
