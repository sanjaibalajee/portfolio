import { contentStock, eligibleCards, selectCard } from "./content";
import { availability, availabilityMessage } from "./availability";
import { intentSchema, normalise } from "./protocol";
import {
  defaults,
  type Answer,
  type Envelope,
  type Option,
  type Player,
  type Room,
  type RoomView,
  type Round,
} from "./types";

export class PartyError extends Error {
  // Socket close code when this rejects a connection. 4003/4004 are terminal
  // in the browser; anything else is retried.
  constructor(
    message: string,
    readonly close = 4003,
  ) {
    super(message);
    this.name = "PartyError";
  }
}
function fail(message: string): never {
  throw new PartyError(message);
}
const uuid = () => crypto.randomUUID();
const random = () => {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
};
function shuffle<T>(a: T[], rng: () => number) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function createRoom(code: string, now = Date.now()): Room {
  return {
    version: 1,
    code,
    revision: 0,
    createdAt: now,
    expiresAt: now + 12 * 3600_000,
    host: "",
    displayKey: uuid(),
    locked: false,
    settings: { ...defaults },
    players: [],
    roundsPlayed: 0,
    history: [],
    receipts: {},
    recap: [],
    exhausted: false,
    custom: [],
    generation: { count: 0, status: "ready" },
  };
}
export function addPlayer(
  room: Room,
  name: string,
  credentialHash: string,
  adult = false,
  now = Date.now(),
): Player {
  if (room.expiresAt <= now) fail("This room has expired. Start a new party.");
  if (room.locked) fail("The host has locked this room.");
  if (room.players.filter((p) => !p.removed).length >= 12)
    fail("This room is full (12 players).");
  if (
    room.players.some(
      (p) => !p.removed && normalise(p.name) === normalise(name),
    )
  )
    fail("That name is already in the room. Try another.");
  const p: Player = {
    id: uuid(),
    credentialHash,
    name,
    adult,
    ready: false,
    connected: false,
    lastSeen: now,
    score: 0,
    confidence: 3,
    roles: 0,
  };
  room.players.push(p);
  room.receipts[p.id] = [];
  if (!room.host || !room.players.some((p) => p.id === room.host && !p.removed))
    room.host = p.id;
  room.revision++;
  return p;
}
export function setConnected(
  room: Room,
  id: string,
  connected: boolean,
  now = Date.now(),
) {
  const p = room.players.find((p) => p.id === id && !p.removed);
  if (!p) return;
  p.connected = connected;
  p.lastSeen = now;
  room.revision++;
}
const active = (room: Room) => room.players.filter((p) => !p.removed);
const isParticipant = (r: Round, id: string) => r.participants.includes(id);
function pendingVoters(r: Round) {
  if (r.game === "who") return r.participants.filter((id) => id !== r.target);
  return r.participants;
}
function start(room: Room, now: number, rng: () => number) {
  if (room.round && room.round.phase !== "reveal")
    fail("Finish the current round first.");
  const seats = active(room).filter((p) => p.ready && p.connected);
  if (seats.length < 3) fail("At least 3 connected, ready players are needed.");
  if (room.settings.rating === "adult" && seats.some((p) => !p.adult))
    fail("Every player needs to confirm they are 18+ and opt in.");
  const available = availability(
    contentStock(room),
    room.settings,
    seats.length,
  );
  const card = selectCard(room, rng, seats.length);
  if (
    !card ||
    (card.game === "draw" && eligibleCards(room, "draw").length < seats.length)
  ) {
    if (available.issue !== "exhausted")
      fail(
        availabilityMessage(available.issue) ||
          "No cards fit these settings. Choose another topic.",
      );
    room.exhausted = true;
    return;
  }
  room.exhausted = false;
  const ids = shuffle(
    seats.map((p) => p.id),
    rng,
  );
  const r: Round = {
    id: uuid(),
    number: ++room.roundsPlayed,
    game: card.game,
    phase: "answer",
    card,
    settings: { ...room.settings },
    participants: ids,
    prompt: card.prompt,
    answers: {},
    votes: {},
    options: [],
    vetoes: [],
    endsAt: now + room.settings.seconds * 1000,
    delta: {},
    chains: [],
    step: 0,
    maxSteps: Math.min(5, ids.length % 2 === 0 ? ids.length - 1 : ids.length),
  };
  if (card.game === "imposter" || card.game === "outlier") {
    const least = Math.min(...seats.map((p) => p.roles));
    const candidates = seats.filter((p) => p.roles === least);
    const seat = candidates[Math.floor(rng() * candidates.length)];
    seat.roles++;
    r.imposter = seat.id;
  }
  if (card.game === "draw") {
    const pool = eligibleCards(room, "draw").filter(
      (c) => c.family !== card.family,
    );
    r.chains = ids.map((owner, i) => {
      const promptCard =
        i === 0 ? card : pool.splice(Math.floor(rng() * pool.length), 1)[0];
      room.history.push(promptCard.family, ...promptCard.concepts);
      return { owner, prompt: promptCard.prompt, steps: [] };
    });
  }
  room.history.push(card.family, ...card.concepts);
  room.history = [...new Set(room.history)];
  room.lastGame = card.game;
  room.round = r;
}
function optionsFor(r: Round, rng: () => number) {
  const options: Option[] = [];
  if (r.game === "bluff")
    options.push({
      id: uuid(),
      text: r.card.secret!,
      authors: [],
      correct: true,
    });
  for (const [id, answer] of Object.entries(r.answers)) {
    if (!answer.text) continue;
    const matching = options.find(
      (o) => normalise(o.text) === normalise(answer.text),
    );
    if (matching) matching.authors.push(id);
    else options.push({ id: uuid(), text: answer.text, authors: [id] });
  }
  return shuffle(options, rng);
}
function finish(room: Room, now: number, reason?: string) {
  const r = room.round!;
  if (r.phase === "reveal") return;
  r.phase = "reveal";
  r.endsAt = 0;
  r.reason = reason;
  if (reason) {
    for (const [id, vote] of Object.entries(r.votes)) {
      const player = room.players.find((p) => p.id === id);
      if (vote.boost && player)
        player.confidence = Math.min(3, player.confidence + 1);
    }
  }
  const gain = (id: string, points: number) => {
    r.delta[id] = (r.delta[id] ?? 0) + points;
  };
  if (!reason) {
    if (r.game === "brain") {
      const groups = new Map<string, string[]>();
      for (const [id, a] of Object.entries(r.answers)) {
        const k = normalise(a.text);
        if (k) groups.set(k, [...(groups.get(k) ?? []), id]);
      }
      for (const group of groups.values())
        if (group.length > 1) group.forEach((id) => gain(id, 2));
    }
    if (r.game === "bluff")
      for (const o of r.options)
        if (o.correct) o.authors.forEach((id) => gain(id, 2));
    const counts = new Map<string, number>();
    for (const v of Object.values(r.votes))
      counts.set(v.option, (counts.get(v.option) ?? 0) + 1);
    const top = Math.max(0, ...counts.values());
    const winners = [...counts].filter(([, n]) => n === top).map(([id]) => id);
    const caught = winners.length === 1 && winners[0] === r.imposter;
    if (r.imposter && !caught) gain(r.imposter, 3);
    for (const [id, vote] of Object.entries(r.votes)) {
      let correct = false;
      if (r.game === "imposter" || r.game === "outlier")
        correct = vote.option === r.imposter;
      if (r.game === "who") correct = vote.option === r.target;
      if (r.game === "bluff" || r.game === "psych") {
        const o = r.options.find((o) => o.id === vote.option)!;
        correct = !!o.correct;
        if (!o.correct) o.authors.forEach((author) => gain(author, 1));
      }
      if (correct) gain(id, 2);
      if (vote.boost) gain(id, correct ? 2 : -1);
    }
  }
  for (const p of room.players) p.score += r.delta[p.id] ?? 0;
  const headline =
    reason ??
    (r.game === "draw"
      ? "The drawing chains are ready."
      : r.game === "brain"
        ? "Great minds, questionable thoughts."
        : r.imposter
          ? `${room.players.find((p) => p.id === r.imposter)?.name} had the other side of the story.`
          : "The votes are in.");
  room.recap.push({
    game: r.game,
    number: r.number,
    headline,
    delta: { ...r.delta },
  });
  room.recap = room.recap.slice(-24);
}
function advance(room: Room, now: number, rng: () => number) {
  const r = room.round!;
  if (r.phase === "reveal") return;
  if (r.phase === "answer") {
    if (
      (r.game === "imposter" || r.game === "outlier") &&
      Object.keys(r.answers).length < 2
    ) {
      return finish(
        room,
        now,
        "Not enough clues came in. No points this round.",
      );
    }
    if (r.game === "draw") {
      r.chains.forEach((chain, i) => {
        const author = r.participants[(i + r.step) % r.participants.length];
        chain.steps.push({
          author,
          ...(r.answers[author] ?? { text: "(missed this step)" }),
        });
      });
      r.step++;
      if (r.step >= r.maxSteps) return finish(room, now);
      r.answers = {};
      r.endsAt = now + r.settings.seconds * 1000;
      return;
    }
    if (r.game === "brain") return finish(room, now);
    if (r.game === "imposter" || r.game === "outlier") {
      r.phase = "discuss";
      r.endsAt = now + 45_000;
      return;
    }
    if (r.game === "who") {
      const candidates = Object.keys(r.answers).filter(
        (id) => r.answers[id].text,
      );
      if (!candidates.length)
        return finish(room, now, "No answers this round. Try another.");
      r.target = candidates[Math.floor(rng() * candidates.length)];
      r.prompt = r.answers[r.target].text;
      r.options = r.participants.map((id) => ({
        id,
        text: room.players.find((p) => p.id === id)!.name,
        authors: [],
      }));
    } else r.options = optionsFor(r, rng);
    if (r.options.length < 2) {
      // Matching the truth earns points even if there is nothing left to vote on.
      if (r.game === "bluff" && r.options.some((o) => o.correct && o.authors.length))
        return finish(room, now);
      return finish(
        room,
        now,
        "Not enough different answers to vote. Try another.",
      );
    }
    r.phase = "vote";
    r.endsAt = now + 40_000;
    return;
  }
  if (r.phase === "discuss") {
    r.phase = "vote";
    r.endsAt = now + 40_000;
    r.options = r.participants.map((id) => ({
      id,
      text: room.players.find((p) => p.id === id)!.name,
      authors: [],
    }));
    return;
  }
  if (r.phase === "vote") finish(room, now);
}
export function tick(room: Room, now = Date.now(), rng = random) {
  let changed = false;
  const host = room.players.find((p) => p.id === room.host && !p.removed);
  if (!host || (!host.connected && now - host.lastSeen >= 60_000)) {
    const replacement = active(room).find((p) => p.connected);
    if (replacement && replacement.id !== room.host) {
      room.host = replacement.id;
      changed = true;
    }
  }
  if (room.generation.pending && now - room.generation.pending > 60_000) {
    room.generation.status =
      "Generation interrupted. Your existing packs are ready.";
    delete room.generation.pending;
    changed = true;
  }
  const r = room.round;
  if (r && r.phase !== "reveal" && r.endsAt <= now) {
    advance(room, now, rng);
    changed = true;
  }
  if (changed) room.revision++;
  return changed;
}
export function nextAlarm(room: Room, now = Date.now()) {
  const times = [room.expiresAt];
  if (room.round && room.round.phase !== "reveal")
    times.push(room.round.endsAt);
  const host = room.players.find((p) => p.id === room.host);
  if (host && !host.connected && active(room).some((p) => p.connected))
    times.push(host.lastSeen + 60_000);
  if (room.generation.pending) times.push(room.generation.pending + 61_000);
  return Math.max(now + 100, Math.min(...times));
}
export function act(
  room: Room,
  playerId: string,
  envelope: unknown,
  now = Date.now(),
  rng = random,
) {
  const parsed = intentSchema.safeParse(envelope);
  if (!parsed.success)
    fail("That action was not valid. Refresh and try again.");
  const e = parsed.data;
  const p =
    room.players.find((p) => p.id === playerId && !p.removed) ??
    fail("This seat is no longer in the room.");
  if (room.expiresAt <= now) fail("This room has expired.");
  if (room.receipts[p.id]?.includes(e.id)) return false;
  const r = room.round;
  const host = () => {
    if (room.host !== p.id) fail("Only the host can do that.");
  };
  const liveRound = (participant = true) => {
    if (!r || r.id !== e.roundId)
      fail("The round changed. Your screen is refreshing.");
    if (participant && !isParticipant(r, p.id))
      fail("You can play from the next round.");
    return r;
  };
  switch (e.type) {
    case "ready":
      p.ready = e.ready;
      break;
    case "consent":
      p.adult = e.adult;
      if (
        !e.adult &&
        r?.phase !== "reveal" &&
        r?.settings.rating === "adult" &&
        r.participants.includes(p.id)
      )
        finish(room, now, "Adult consent was withdrawn. No answers revealed.");
      break;
    case "settings":
      host();
      if (r && r.phase !== "reveal") fail("Change settings between rounds.");
      if (e.revision !== room.revision)
        fail("Settings changed. Check the latest settings and try again.");
      room.settings = e.settings;
      room.exhausted = false;
      break;
    case "start":
      host();
      if (e.settings) {
        if (r && r.phase !== "reveal") fail("Finish the current round first.");
        if (e.revision !== room.revision)
          fail("The room changed. Check the players and try again.");
        room.settings = e.settings;
      }
      start(room, now, rng);
      break;
    case "answer": {
      const round = liveRound();
      if (round.phase !== "answer") fail("Answers have closed.");
      if (round.game === "draw" && e.step !== round.step)
        fail("The drawing step changed. Answer the current task.");
      if (round.answers[p.id]) fail("Your answer is already locked in.");
      const drawingTurn = round.game === "draw" && round.step % 2 === 0;
      if (drawingTurn && !e.drawing?.some((s) => s.points.length > 1))
        fail("Add a few strokes before submitting.");
      if (!drawingTurn && !e.text) fail("Write an answer first.");
      if (!drawingTurn && e.drawing) fail("This step needs text.");
      if (
        round.settings.chaos &&
        round.game !== "draw" &&
        e.text.split(/\s+/).length > 7
      )
        fail("Chaos rule: seven words maximum.");
      if (round.game === "brain" && e.text.split(/\s+/).length > 2)
        fail("Same Brain: one or two words.");
      round.answers[p.id] = {
        text: e.text,
        ...(drawingTurn ? { drawing: e.drawing } : {}),
      };
      if (round.participants.every((id) => round.answers[id]))
        advance(room, now, rng);
      break;
    }
    case "vote": {
      const round = liveRound();
      if (round.phase !== "vote") fail("Voting is closed.");
      if (round.votes[p.id]) fail("Your vote is already locked in.");
      if (!pendingVoters(round).includes(p.id))
        fail("You wrote this one. Enjoy the guesses.");
      const option =
        round.options.find((o) => o.id === e.option) ??
        fail("That option is no longer available.");
      if (
        option.authors.includes(p.id) ||
        ((round.game === "imposter" || round.game === "outlier") &&
          option.id === p.id)
      )
        fail("You cannot vote for yourself.");
      if (
        e.boost &&
        (!round.settings.confidence ||
          p.confidence <= 0 ||
          round.game === "psych")
      )
        fail("No confidence token available for this vote.");
      if (e.boost) p.confidence--;
      round.votes[p.id] = { option: option.id, boost: e.boost };
      if (pendingVoters(round).every((id) => round.votes[id]))
        finish(room, now);
      break;
    }
    case "advance":
      host();
      liveRound(false);
      if (e.phase !== r!.phase || e.step !== r!.step)
        fail("The phase changed. Check the current task before advancing.");
      advance(room, now, rng);
      break;
    case "skip": {
      const round = liveRound();
      if (round.phase === "reveal") fail("The round has finished.");
      if (!round.vetoes.includes(p.id)) round.vetoes.push(p.id);
      if (
        round.settings.rating === "adult" ||
        round.vetoes.length >= Math.ceil(round.participants.length / 2)
      )
        finish(room, now, "Skipped by the group. No answers revealed.");
      break;
    }
    case "kick":
      host();
      {
        const seat =
          room.players.find((p) => p.id === e.player && !p.removed) ??
          fail("Player not found.");
        if (seat.id === p.id) fail("Use leave to leave the party.");
        seat.removed = true;
        seat.connected = false;
        if (r?.phase !== "reveal" && r?.participants.includes(seat.id))
          finish(room, now, "A player left. Start another round.");
        break;
      }
    case "leave":
      p.removed = true;
      p.connected = false;
      if (r?.phase !== "reveal" && r?.participants.includes(p.id))
        finish(room, now, "A player left. Start another round.");
      if (room.host === p.id)
        room.host =
          active(room).find((p) => p.connected)?.id ??
          active(room)[0]?.id ??
          "";
      break;
    case "lock":
      host();
      room.locked = e.locked;
      break;
    case "claim-host": {
      const old = room.players.find((p) => p.id === room.host);
      if (old && (old.connected || now - old.lastSeen < 60_000))
        fail("The host’s seat is reserved for 60 seconds.");
      room.host = p.id;
      break;
    }
    case "replay":
      host();
      if (
        (r && r.phase !== "reveal") ||
        availability(
          contentStock(room),
          room.settings,
          Math.max(
            3,
            active(room).filter((p) => p.ready && p.connected).length,
          ),
        ).issue !== "exhausted"
      )
        fail("Replay is available only after a pack runs out.");
      room.history = [];
      room.exhausted = false;
      break;
    case "lore":
      host();
      break; // Service validates budget and generates outside the room transaction.
  }
  room.receipts[p.id] = [...(room.receipts[p.id] ?? []), e.id].slice(-96);
  room.revision++;
  return true;
}
function drawingTask(r: Round, id: string): Answer | undefined {
  const seat = r.participants.indexOf(id);
  if (seat < 0) return;
  const index = (seat - r.step + r.participants.length) % r.participants.length;
  const chain = r.chains[index];
  const task: Answer | undefined =
    r.step === 0 ? { text: chain.prompt || r.card.prompt } : chain.steps.at(-1);
  return task
    ? { text: task.text, ...(task.drawing ? { drawing: task.drawing } : {}) }
    : undefined;
}
export function project(
  room: Room,
  playerId?: string,
  now = Date.now(),
  adultDisplay = false,
): RoomView {
  const p = room.players.find((p) => p.id === playerId && !p.removed);
  const r = room.round;
  const view: RoomView = {
    stock: contentStock(room),
    code: room.code,
    revision: room.revision,
    serverNow: now,
    expiresAt: room.expiresAt,
    host: room.host,
    locked: room.locked,
    settings: { ...room.settings },
    players: active(room).map(
      ({ id, name, ready, adult, connected, score }) => ({
        id,
        name,
        ready,
        adult,
        connected,
        score,
      }),
    ),
    roundsPlayed: room.roundsPlayed,
    exhausted: room.exhausted,
    remaining: eligibleCards(room).length,
    generation: {
      count: room.generation.count,
      status: room.generation.status,
    },
    recap: room.recap,
  };
  if (r) {
    const reveal = r.phase === "reveal";
    view.round = {
      id: r.id,
      number: r.number,
      game: r.game,
      phase: r.phase,
      prompt:
        r.game === "outlier"
          ? "Which answer doesn’t fit?"
          : r.game === "imposter"
            ? "One word. One imposter."
            : r.game === "draw"
              ? "Pass the picture. Lose the plot."
              : r.prompt,
      endsAt: r.endsAt,
      participants: r.participants,
      submitted: Object.keys(r.answers).length,
      required: r.participants.length,
      voted: Object.keys(r.votes).length,
      vetoes: r.vetoes.length,
      step: r.step,
      maxSteps: r.maxSteps,
      chaos: r.settings.chaos,
      confidence: r.settings.confidence,
      options:
        r.phase === "vote"
          ? r.options.map((o) => ({
              id: o.id,
              text: o.text,
              disabled:
                !!p &&
                (o.authors.includes(p.id) ||
                  ((r.game === "imposter" || r.game === "outlier") &&
                    o.id === p.id)),
            }))
          : [],
    };
    if (
      ["discuss", "vote"].includes(r.phase) &&
      (r.game === "imposter" || r.game === "outlier")
    )
      view.round.answers = Object.entries(r.answers).map(([player, a]) => ({
        player,
        text: a.text,
      }));
    if (reveal) {
      view.round.reveal = {
        delta: r.delta,
        reason: r.reason,
        options: r.reason ? [] : r.options,
        votes: r.reason ? {} : r.votes,
        chains: r.reason ? [] : r.chains,
        ...(!r.reason
          ? {
              secret: r.card.secret,
              other: r.card.other,
              imposter: r.imposter,
              target: r.target,
              source: r.card.source,
            }
          : {}),
      };
      // Who Said That only ever reveals the one answer the group guessed.
      if (!r.reason)
        view.round.answers = Object.entries(r.answers)
          .filter(([player]) => r.game !== "who" || player === r.target)
          .map(([player, a]) => ({ player, text: a.text }));
      if (r.game === "outlier" && !r.reason) view.round.prompt = r.card.prompt;
    }
  }
  if (p) {
    const participating = !!r && isParticipant(r, p.id);
    if (p.id === room.host) view.displayKey = room.displayKey;
    view.me = {
      id: p.id,
      participating,
      submitted: !!r?.answers[p.id],
      voted: !!r?.votes[p.id],
      confidence: p.confidence,
    };
    if (participating && r && r.phase !== "reveal") {
      view.me.answer = r.answers[p.id];
      if (r.game === "imposter") {
        view.me.role = r.imposter === p.id ? "imposter" : "in the know";
        view.me.privatePrompt =
          r.imposter === p.id
            ? "Blend in. You don’t know the word."
            : r.card.secret;
      }
      if (r.game === "outlier")
        view.me.privatePrompt =
          r.imposter === p.id ? r.card.other : r.card.prompt;
      if (r.game === "draw") view.me.drawingTask = drawingTask(r, p.id);
      if (r.game === "who" && r.phase === "vote" && r.target === p.id)
        view.me.role = "author";
    }
  }
  if (r?.settings.rating === "adult" && !(p?.adult || (!p && adultDisplay))) {
    delete view.round;
    view.adultHidden = true;
  }
  return view;
}
