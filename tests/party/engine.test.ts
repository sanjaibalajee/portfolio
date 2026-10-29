import { test } from "node:test";
import assert from "node:assert/strict";
import {
  act,
  addPlayer,
  createRoom,
  nextAlarm,
  project,
  setConnected,
  tick,
} from "../../lib/party/engine";
import { catalogue, eligibleCards } from "../../lib/party/content";
import { drawingSchema, normalise } from "../../lib/party/protocol";
import { validateCandidates } from "../../lib/party/groq";
import {
  PartyService,
  hashToken,
  secretToken,
  type Peer,
} from "../../lib/party/service";
import {
  games,
  type Game,
  type Room,
  type ServerMessage,
} from "../../lib/party/types";
const time = Date.now();
function setup(game: Game | "mix" = "imposter", n = 4) {
  const room = createRoom("ABC234", time);
  for (let i = 0; i < n; i++) {
    const p = addPlayer(room, "Player " + i, "hash-" + i, true, time);
    p.connected = true;
    p.ready = true;
  }
  room.settings.game = game;
  room.settings.level = 3;
  return room;
}
function action(
  room: Room,
  id: string,
  type: string,
  extra: Record<string, unknown> = {},
  at = time,
) {
  const e = {
    id: crypto.randomUUID(),
    roundId: room.round?.id,
    phase: room.round?.phase,
    step: room.round?.step,
    revision: room.revision,
    type,
    ...extra,
  };
  act(room, id, e, at, () => 0.3);
  return e;
}
function begin(room: Room) {
  action(room, room.host, "start");
  return room.round!;
}
function answerAll(room: Room, texts?: string[]) {
  room.round!.participants.forEach((id, i) =>
    action(room, id, "answer", { text: texts?.[i] ?? "answer " + i }),
  );
}
function finishRound(room: Room) {
  while (room.round!.phase !== "reveal") action(room, room.host, "advance");
}
for (const game of Object.keys(games) as Game[])
  test(`${game}: complete round, persist, reveal, rematch without repetition`, () => {
    const room = setup(game);
    const r = begin(room);
    const family = r.card.family;
    if (game === "draw") {
      while (r.phase === "answer") {
        r.participants.forEach((id) =>
          action(
            room,
            id,
            "answer",
            r.step % 2 === 0
              ? {
                  text: "",
                  drawing: [
                    {
                      color: "ink",
                      points: [
                        [0, 0],
                        [0.6, 0.4],
                      ],
                    },
                  ],
                }
              : { text: "a questionable cat" },
          ),
        );
      }
    } else {
      answerAll(room);
      finishRound(room);
    }
    assert.equal(r.phase, "reveal");
    const loaded = JSON.parse(JSON.stringify(room));
    tick(loaded, time + 500000);
    assert.deepEqual(
      loaded.players.map((p: any) => p.score),
      room.players.map((p) => p.score),
    );
    begin(loaded);
    assert.notEqual(loaded.round.card.family, family);
  });
test("secret roles and answer keys never reach spectators, imposters or late joins", () => {
  const room = setup();
  const r = begin(room);
  const spectator = JSON.stringify(project(room));
  assert(!spectator.includes(r.card.secret!));
  assert(!spectator.includes("credentialHash"));
  assert(!spectator.includes("receipts"));
  const imp = project(room, r.imposter);
  assert(!JSON.stringify(imp).includes(r.card.secret!));
  assert.equal(imp.me!.role, "imposter");
  assert(!("hint" in imp.me!));
  const late = addPlayer(room, "late", "h");
  assert.equal(project(room, late.id).me!.participating, false);
  assert(!JSON.stringify(project(room, late.id)).includes(r.card.secret!));
  assert.equal(
    project(
      room,
      r.participants.find((id) => id !== r.imposter),
    ).me?.privatePrompt,
    r.card.secret,
  );
});
test("Psych authors, answers and votes stay private until their relevant phase", () => {
  const room = setup("psych");
  const r = begin(room);
  action(room, r.participants[0], "answer", { text: "private submission" });
  assert(
    !JSON.stringify(project(room, r.participants[1])).includes(
      "private submission",
    ),
  );
  r.participants
    .slice(1)
    .forEach((id, i) => action(room, id, "answer", { text: "different " + i }));
  const snapshot = project(room, r.participants[0]);
  assert.equal(r.phase, "vote");
  assert(snapshot.round!.options.every((o) => !("authors" in o)));
  assert(
    snapshot.round!.options.find((o) => o.text === "private submission")!
      .disabled,
  );
  const voter = r.participants[0];
  const option = r.options.find((o) => !o.authors.includes(voter))!;
  action(room, voter, "vote", { option: option.id });
  assert(!("votes" in project(room, r.participants[1]).round!));
  assert.throws(
    () => action(room, voter, "vote", { option: option.id }),
    /already/,
  );
});
test("self-votes and client-authored scores are rejected", () => {
  const room = setup("psych");
  const r = begin(room);
  answerAll(room);
  const id = r.participants[0];
  const own = r.options.find((o) => o.authors.includes(id))!;
  assert.throws(() => action(room, id, "vote", { option: own.id }), /yourself/);
  assert.throws(() => action(room, id, "score", { score: 9999 }), /valid/);
  assert.throws(
    () => action(room, id, "vote", { option: own.id, score: 99 }),
    /valid/,
  );
  assert.equal(room.players.find((p) => p.id === id)!.score, 0);
});
test("duplicate actions and stale rounds never duplicate transitions", () => {
  const room = setup("brain");
  const r = begin(room);
  const e = action(room, r.participants[0], "answer", { text: "toast" });
  const revision = room.revision;
  assert.equal(act(room, r.participants[0], e, time), false);
  assert.equal(room.revision, revision);
  r.participants
    .slice(1)
    .forEach((id) => action(room, id, "answer", { text: "toast" }));
  assert.deepEqual(
    room.players.map((p) => p.score),
    [2, 2, 2, 2],
  );
  tick(room, time + 999999);
  assert.deepEqual(
    room.players.map((p) => p.score),
    [2, 2, 2, 2],
  );
  begin(room);
  assert.throws(
    () =>
      action(room, r.participants[0], "answer", {
        roundId: r.id,
        text: "toast",
      }),
    /round changed/,
  );
});
test("duplicate bluffs merge with shared credit, true answers are rewarded once", () => {
  const room = setup("bluff");
  const r = begin(room);
  answerAll(room, [
    "a plausible lie",
    "a plausible lie",
    r.card.secret!,
    "another lie",
  ]);
  const duplicate = r.options.filter((o) => o.text === "a plausible lie");
  assert.equal(duplicate.length, 1);
  assert.equal(duplicate[0].authors.length, 2);
  assert.equal(r.options.filter((o) => o.correct).length, 1);
  const truth = r.options.find((o) => o.correct)!;
  for (const id of r.participants) {
    const own = truth.authors.includes(id);
    action(room, id, "vote", { option: own ? duplicate[0].id : truth.id });
  }
  assert.equal(r.phase, "reveal");
  assert.equal(r.delta[truth.authors[0]], 2);
  for (const author of duplicate[0].authors) assert.equal(r.delta[author], 3);
});
test("Who Said That excludes its author from voting and never sends target early", () => {
  const room = setup("who");
  const r = begin(room);
  answerAll(room);
  assert(!("target" in project(room).round!));
  assert.equal(project(room, r.target).me!.role, "author");
  assert.throws(
    () => action(room, r.target!, "vote", { option: r.participants[0] }),
    /wrote/,
  );
  for (const id of r.participants.filter((id) => id !== r.target))
    action(room, id, "vote", { option: r.target });
  assert.equal(r.phase, "reveal");
  assert.equal(project(room).round!.reveal!.target, r.target);
});
test("outlier gets only its own question, role identity stays secret", () => {
  const room = setup("outlier");
  const r = begin(room);
  assert.equal(project(room, r.imposter).me!.privatePrompt, r.card.other);
  assert.equal(project(room, r.imposter).me!.role, undefined);
  assert(!JSON.stringify(project(room)).includes(r.card.other!));
  assert.notEqual(normalise(r.card.prompt), normalise(r.card.other!));
});
test("imposter roles rotate fairly without publishing order", () => {
  const room = setup();
  for (let i = 0; i < 8; i++) {
    begin(room);
    finishRound(room);
  }
  assert.deepEqual(
    room.players.map((p) => p.roles),
    [2, 2, 2, 2],
  );
  assert(!JSON.stringify(project(room)).includes("roles"));
});
test("catching the imposter and confidence are server-scored", () => {
  const room = setup();
  room.settings.confidence = true;
  const r = begin(room);
  answerAll(room);
  action(room, room.host, "advance");
  const innocent = r.participants.find((id) => id !== r.imposter)!;
  for (const id of r.participants) {
    const target = id === r.imposter ? innocent : r.imposter!;
    action(room, id, "vote", { option: target, boost: true });
  }
  assert.equal(r.delta[r.imposter!], -1);
  for (const id of r.participants.filter((id) => id !== r.imposter))
    assert.equal(r.delta[id], 4);
  assert(room.players.every((p) => p.confidence === 2));
});
test("adult opt-in is checked per seat and withdrawal immediately hides round", () => {
  const room = setup();
  room.settings.rating = "adult";
  room.players[2].adult = false;
  assert.throws(() => begin(room), /Every player/);
  room.players[2].adult = true;
  const r = begin(room);
  action(room, r.participants[0], "answer", { text: "should never reveal" });
  action(room, room.players[2].id, "consent", { adult: false });
  const view = project(
    room,
    r.participants.find((id) => room.players.find((p) => p.id === id)?.adult),
  );
  assert.equal(r.phase, "reveal");
  assert(!JSON.stringify(view).includes("should never reveal"));
  assert.equal(view.round!.reveal!.secret, undefined);
  assert.deepEqual(r.delta, {});
});
test("one adult veto ends the round without showing answers", () => {
  const room = setup("psych");
  room.settings.rating = "adult";
  const r = begin(room);
  action(room, r.participants[0], "skip");
  assert.equal(r.phase, "reveal");
  assert.deepEqual(project(room, room.host).round!.reveal!.options, []);
});
test("general rounds require a majority skip and never change the content filters", () => {
  const room = setup();
  const r = begin(room);
  action(room, r.participants[0], "skip");
  assert.equal(r.phase, "answer");
  action(room, r.participants[1], "skip");
  assert.equal(r.phase, "reveal");
  assert.equal(room.settings.rating, "general");
});
test("no repeat concepts across settings, JSON reloads or explicit rematches; exhaustion is explicit", () => {
  const room = setup("outlier");
  room.settings.topic = "food";
  room.settings.rating = "general";
  const available = eligibleCards(room).length;
  const families = new Set();
  for (let i = 0; i < available; i++) {
    const r = begin(room);
    assert(!families.has(r.card.family));
    families.add(r.card.family);
    finishRound(room);
  }
  begin(room);
  assert.equal(room.exhausted, true);
  const last = room.round!.id;
  assert.equal(room.roundsPlayed, available);
  assert.equal(room.round!.id, last);
  action(room, room.host, "replay");
  assert.equal(room.history.length, 0);
  begin(room);
  assert.equal(room.roundsPlayed, available + 1);
});
test("history treats word concepts shared by AI and curated banks as already seen", () => {
  const room = setup();
  const word = catalogue.find((c) => c.game === "imposter")!;
  room.history = [...word.concepts];
  room.custom = [{ ...word, id: "ai-variant", family: "different-family" }];
  assert(
    !eligibleCards(room).some((c) =>
      c.concepts.some((x) => word.concepts.includes(x)),
    ),
  );
});
test("late joins cannot submit, and a host may spectate while controlling a round", () => {
  const room = setup("psych", 5);
  room.players[0].ready = false;
  const r = begin(room);
  assert(!r.participants.includes(room.host));
  answerAll(room);
  assert.equal(r.phase, "vote");
  action(room, room.host, "advance");
  assert.equal(r.phase, "reveal");
  const p = addPlayer(room, "late", "h");
  assert.throws(
    () => action(room, p.id, "vote", { option: r.options[0]?.id }),
    /next round/,
  );
});
test("host transfers after 60s offline; reconnect during grace preserves host", () => {
  const room = setup();
  const original = room.host;
  setConnected(room, original, false, time);
  tick(room, time + 59999);
  assert.equal(room.host, original);
  setConnected(room, original, true, time + 59999);
  tick(room, time + 61000);
  assert.equal(room.host, original);
  setConnected(room, original, false, time + 62000);
  tick(room, time + 122000);
  assert.notEqual(room.host, original);
  assert(room.players.find((p) => p.id === room.host)!.connected);
});
test("durable deadlines progress phases and score at most once", () => {
  const room = setup();
  const r = begin(room);
  action(room, r.participants[0], "answer", { text: "one clue" });
  action(room, r.participants[1], "answer", { text: "another clue" });
  assert.equal(nextAlarm(room, time), r.endsAt);
  tick(room, r.endsAt);
  assert.equal(r.phase, "discuss");
  tick(room, r.endsAt);
  assert.equal(r.phase, "vote");
  tick(room, r.endsAt);
  assert.equal(r.phase, "reveal");
  const scores = room.players.map((p) => p.score);
  tick(room, time + 999999);
  assert.deepEqual(
    room.players.map((p) => p.score),
    scores,
  );
});
test("drawing relay passes only previous step without author or full chain", () => {
  const room = setup("draw");
  const r = begin(room);
  r.participants.forEach((id) =>
    action(room, id, "answer", {
      text: "",
      drawing: [
        {
          color: "ink",
          points: [
            [0, 0],
            [1, 1],
          ],
        },
      ],
    }),
  );
  const view = project(room, r.participants[0]);
  assert(view.me!.drawingTask!.drawing);
  assert(!("author" in view.me!.drawingTask!));
  assert(!("chains" in view.round!));
  assert.equal(r.step, 1);
  assert.equal(project(room).me, undefined);
});
test("drawing protocol rejects unbounded points, colours, and coordinates", () => {
  assert(
    !drawingSchema.safeParse([
      {
        color: "url(secret)",
        points: [
          [0, 0],
          [1, 1],
        ],
      },
    ]).success,
  );
  assert(
    !drawingSchema.safeParse([{ color: "ink", points: [[2, 0]] }]).success,
  );
  assert(
    !drawingSchema.safeParse(
      Array.from({ length: 71 }, () => ({ color: "ink", points: [[0, 0]] })),
    ).success,
  );
});
test("AI validation rejects malformed, adult leakage, duplicates and revealing hints", () => {
  const room = setup("mix");
  const item = {
    game: "imposter",
    prompt: "Give one clue. Keep the word secret.",
    secret: "Unusual creature",
    hint: "It is an unusual creature",
    other: null,
    concept: "unusual-creature",
    rating: "general",
  };
  assert.equal(validateCandidates({ cards: [item] }, room).length, 0);
  assert.equal(
    validateCandidates({ cards: [{ ...item, unexpected: true }] }, room).length,
    0,
  );
  const c = {
    ...item,
    game: "psych",
    secret: null,
    hint: null,
    prompt: "The worst sexting advice your toaster could give.",
  };
  assert.equal(validateCandidates({ cards: [c] }, room).length, 0);
  const valid = {
    ...c,
    prompt: "A terrible product invented by a colony of anxious pigeons.",
    concept: "anxious-pigeon-product",
  };
  const cards = validateCandidates({ cards: [valid, valid] }, room);
  assert.equal(cards.length, 1);
  room.custom = cards;
  assert.equal(validateCandidates({ cards: [valid] }, room).length, 0);
});
test("content inventory has unique families, verified fact sources, all games and adult mix", () => {
  assert.equal(new Set(catalogue.map((c) => c.id)).size, catalogue.length);
  assert.equal(new Set(catalogue.map((c) => c.family)).size, catalogue.length);
  for (const g of Object.keys(games)) {
    assert(catalogue.some((c) => c.game === g));
    if (g !== "bluff")
      assert(
        catalogue.filter((c) => c.game === g && c.rating === "adult").length >=
          10,
      );
  }
  assert(
    catalogue
      .filter((c) => c.game === "bluff")
      .every((c) => c.source?.startsWith("https://")),
  );
  assert(catalogue.length > 1700);
});
function memoryStore() {
  let saved: Room | undefined;
  let fail = false;
  return {
    store: {
      async load() {
        return saved ? structuredClone(saved) : undefined;
      },
      async save(room: Room) {
        if (fail) throw Error("Disk unavailable");
        saved = structuredClone(room);
      },
      async alarm() {},
    },
    get saved() {
      return saved;
    },
    set fail(v: boolean) {
      fail = v;
    },
  };
}
function peer(id: string) {
  const messages: ServerMessage[] = [];
  const p: Peer = { id, send: (m) => messages.push(m), close: () => {} };
  return { p, messages };
}
test("service authenticates credentials, isolates rooms, recovers after reload and rejects forgery", async () => {
  const disk = memoryStore();
  const s = new PartyService(disk.store);
  const seat = await s.join("ABC234", { name: "Alice" }, true);
  const good = peer("one");
  await s.connect(good.p, seat);
  assert.equal(good.p.playerId, seat.playerId);
  const bad = peer("bad");
  await assert.rejects(
    () => s.connect(bad.p, { ...seat, token: secretToken() }),
    /invalid/,
  );
  const other = new PartyService(memoryStore().store);
  await other.join("DEF567", { name: "Elsewhere" }, true);
  await assert.rejects(() => other.connect(peer("cross").p, seat), /invalid/);
  const resumed = new PartyService(disk.store);
  await resumed.connect(peer("two").p, seat);
  assert.equal(resumed.room!.players[0].id, seat.playerId);
  assert(!JSON.stringify(good.messages).includes(seat.token));
  assert.equal((await hashToken(seat.token)).length, 64);
});
test("concurrent joins, idempotent actions, read-only displays and persistence failures", async () => {
  const disk = memoryStore();
  const s = new PartyService(disk.store);
  const a = await s.join("ABC234", { name: "Alice" }, true);
  const seats = await Promise.all(
    ["Bob", "Cara", "Dan"].map((name) => s.join("ABC234", { name })),
  );
  assert.equal(s.room!.players.length, 4);
  const clients = [a, ...seats].map((seat, i) => ({
    seat,
    ...peer("peer" + i),
  }));
  for (const c of clients) await s.connect(c.p, c.seat);
  const watcher = peer("tv");
  await assert.rejects(
    () => s.connect(peer("guess").p, { watch: true }),
    /display link/,
  );
  await s.connect(watcher.p, { watch: true, display: s.room!.displayKey });
  await s.message("tv", { id: crypto.randomUUID(), type: "start" });
  assert(
    watcher.messages.some(
      (m) => m.type === "error" && m.error.includes("read-only"),
    ),
  );
  const e = { id: crypto.randomUUID(), type: "ready", ready: true };
  await s.message("peer0", e);
  const rev = s.room!.revision;
  await s.message("peer0", e);
  assert.equal(s.room!.revision, rev);
  disk.fail = true;
  await s.message("peer0", {
    id: crypto.randomUUID(),
    type: "ready",
    ready: false,
  });
  assert.equal(s.room!.players[0].ready, true);
  assert(clients[0].messages.some((m) => m.type === "error"));
});
test("absent AI key preserves usable room and curated packs", async () => {
  const s = new PartyService(memoryStore().store);
  const seat = await s.join("ABC234", { name: "Host" }, true);
  const client = peer("host");
  await s.connect(client.p, seat);
  await s.message("host", {
    type: "lore",
    id: crypto.randomUUID(),
    context: "Everyone loves trains and instant noodles.",
  });
  assert(
    client.messages.some(
      (m) => m.type === "error" && m.error.includes("Groq key"),
    ),
  );
  assert.equal(s.room!.generation.count, 0);
  assert(project(s.room!).remaining > 0);
});
test("adult content stays hidden from late seats and unconsenting shared displays", () => {
  const room = setup("psych");
  room.settings.rating = "adult";
  begin(room);
  const late = addPlayer(room, "Late Friend", "h", false);
  assert.equal(project(room, late.id).round, undefined);
  assert.equal(project(room).round, undefined);
  assert.equal(project(room).adultHidden, true);
  assert(project(room, undefined, time, true).round);
  assert(project(room, room.host).round);
});
test("an imposter escapes a tied vote", () => {
  const room = setup();
  const r = begin(room);
  answerAll(room);
  action(room, room.host, "advance");
  const other = r.participants.find((id) => id !== r.imposter)!;
  const innocentVoters = r.participants.filter(
    (id) => id !== r.imposter && id !== other,
  );
  action(room, r.imposter!, "vote", { option: other });
  action(room, other, "vote", { option: r.imposter });
  action(room, innocentVoters[0], "vote", { option: other });
  action(room, innocentVoters[1], "vote", { option: r.imposter });
  assert.equal(r.delta[r.imposter!], 3);
});
test("unusable AI outlier and Who Said That templates are rejected before admission", () => {
  const room = setup("mix");
  const base = {
    secret: null,
    hint: null,
    concept: "bad-format",
    rating: "general",
    other: null,
  };
  assert.equal(
    validateCandidates(
      {
        cards: [
          {
            ...base,
            game: "who",
            prompt: "Who in this group is most likely to miss a train?",
          },
        ],
      },
      room,
    ).length,
    0,
  );
  assert.equal(
    validateCandidates(
      {
        cards: [
          {
            ...base,
            game: "outlier",
            prompt: "Would you eat a train-shaped pizza?",
            other: "Would you ride a pizza-shaped train?",
          },
        ],
      },
      room,
    ).length,
    0,
  );
});
test("AI provider errors, malformed output and editorial refusal leave curated play available", async () => {
  const { generateLore } = await import("../../lib/party/groq");
  const original = globalThis.fetch;
  try {
    for (const status of [401, 429, 503, 400]) {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ error: { code: "test_failure" } }), {
          status,
        });
      await assert.rejects(
        () =>
          generateLore(setup("mix"), "Trains and bad karaoke", "fake-test-key"),
        /Groq|key/,
      );
    }
    globalThis.fetch = async () =>
      Response.json({
        choices: [{ message: { content: "this is not json" } }],
      });
    await assert.rejects(() =>
      generateLore(setup("mix"), "Trains and bad karaoke", "fake-test-key"),
    );
    const room = setup("mix");
    assert(eligibleCards(room).length > 0);
    let calls = 0;
    globalThis.fetch = async () =>
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify(
                ++calls === 1
                  ? {
                      cards: [
                        {
                          game: "psych",
                          prompt:
                            "A completely useless invention for extremely anxious railway conductors.",
                          secret: null,
                          other: null,
                          hint: null,
                          concept: "anxious-conductor-invention",
                          rating: "general",
                        },
                      ],
                    }
                  : { approved: [] },
              ),
            },
          },
        ],
      });
    await assert.rejects(
      () => generateLore(room, "Trains and bad karaoke", "fake-test-key"),
      /editorial/,
    );
    assert.equal(room.custom.length, 0);
    assert(eligibleCards(room).length > 0);
  } finally {
    globalThis.fetch = original;
  }
});
test("drawing relay reserves a different unseen prompt per chain and keeps other prompts private", () => {
  const room = setup("draw");
  const r = begin(room);
  assert.equal(
    new Set(r.chains.map((c) => c.prompt)).size,
    r.participants.length,
  );
  for (const id of r.participants) {
    const view = project(room, id);
    assert(view.me!.drawingTask!.text);
    assert(!("chains" in view.round!));
  }
  assert(
    r.chains.every((chain) =>
      catalogue.some(
        (c) => c.prompt === chain.prompt && room.history.includes(c.family),
      ),
    ),
  );
});
test("one malformed AI card does not discard valid cards from the same batch", () => {
  const room = setup("mix");
  const good = {
    game: "psych",
    prompt: "A terrible slogan for a railway run entirely by anxious geese.",
    secret: null,
    hint: null,
    other: null,
    concept: "anxious-geese-railway",
    rating: "general",
  };
  const cards = validateCandidates(
    { cards: [{ ...good, hint: "x".repeat(200) }, good] },
    room,
  );
  assert.equal(cards.length, 1);
});
test("a cancelled round refunds used confidence tokens without awarding scores", () => {
  const room = setup("psych");
  room.settings.game = "bluff";
  room.settings.rating = "adult";
  room.settings.confidence = true;
  const r = begin(room);
  answerAll(room);
  const id = r.participants[0];
  const option = r.options.find((o) => !o.authors.includes(id))!;
  action(room, id, "vote", { option: option.id, boost: true });
  assert.equal(room.players.find((p) => p.id === id)!.confidence, 2);
  action(room, r.participants[1], "skip");
  assert.equal(room.players.find((p) => p.id === id)!.confidence, 3);
  assert(room.players.every((p) => p.score === 0));
});

test("an abandoned clue round ends without free imposter points", () => {
  const room = setup();
  const r = begin(room);
  tick(room, r.endsAt);
  assert.equal(r.phase, "reveal");
  assert(room.players.every((p) => p.score === 0));
  assert.match(r.reason!, /Not enough clues/);
});
