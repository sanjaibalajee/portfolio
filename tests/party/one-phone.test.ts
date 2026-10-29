import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OnePhoneGame,
  encodeHistory,
  restoreHistory,
} from "../../lib/party/one-phone";
import { catalogue, contentStock } from "../../lib/party/content";
import { act, addPlayer, createRoom, project } from "../../lib/party/engine";
import {
  availability,
  cleanSettings,
  playableTopics,
} from "../../lib/party/availability";
import { scoreReason } from "../../lib/party/results";
import { defaults, games, type Game, type Room } from "../../lib/party/types";
const names = ["Sanjai", "Javed", "Maya"];
const strokes = [
  {
    color: "ink",
    points: [
      [0.2, 0.2],
      [0.8, 0.8],
    ] as [number, number][],
  },
];
function action(room: Room, type: string, data: Record<string, unknown> = {}) {
  return act(room, room.host, {
    id: crypto.randomUUID(),
    type,
    revision: room.revision,
    roundId: room.round?.id,
    ...data,
  });
}
function readyRoom() {
  const room = createRoom("ABC234");
  for (const name of names) {
    const p = addPlayer(room, name, "hash");
    p.ready = true;
    p.connected = true;
  }
  return room;
}
for (const game of Object.keys(games) as Game[]) {
  test(`one phone: ${game} completes through covered handoffs and starts a fresh rematch`, () => {
    const g = new OnePhoneGame(names, { ...defaults, game });
    g.start();
    const firstFamily = g.room.round!.card.family;
    let turns = 0;
    while (g.stage !== "reveal") {
      assert(++turns < 100);
      if (g.stage === "cover") {
        assert(!g.view.me);
        assert.equal(g.open(g.token), true);
      } else if (g.stage === "private") {
        assert.equal(g.view.me?.id, g.current);
        const r = g.room.round!;
        const token = g.token;
        if (r.phase === "vote") {
          const o = g.view.round!.options.find((o) => !o.disabled)!;
          assert(g.submit(token, "vote", { option: o.id }));
          assert(!g.submit(token, "vote", { option: o.id }));
        } else {
          const text =
            game === "imposter"
              ? "Card seen"
              : game === "brain"
                ? "toast"
                : `answer ${g.current!.slice(0, 6)}`;
          assert(
            g.submit(token, "answer", {
              text,
              ...(game === "draw" && r.step % 2 === 0
                ? { drawing: strokes }
                : {}),
            }),
          );
          assert(!g.submit(token, "answer", { text: "double tap" }));
        }
        assert.equal(g.stage, "handoff");
        assert(!g.view.me);
      } else if (g.stage === "handoff") {
        const token = g.token;
        assert(g.continue(token));
        assert(!g.continue(token));
      } else if (g.stage === "discuss") assert(g.discuss(g.token));
      else if (g.stage === "group-vote")
        assert(g.accuse(g.token, g.room.round!.imposter!));
    }
    if (game === "imposter" || game === "outlier") {
      assert.deepEqual(g.room.round!.votes, {});
      assert(g.room.players.every((p) => p.score === 0));
    }
    g.start();
    assert.equal(g.stage, "cover");
    assert.equal(g.room.round!.number, 2);
    assert.notEqual(g.room.round!.card.family, firstFamily);
  });
}

test("a covered one-phone turn cannot expose a previous player or accept a stale action", () => {
  const g = new OnePhoneGame(names, { ...defaults, game: "imposter" });
  g.start();
  const id = g.current;
  const coverToken = g.token;
  g.open(coverToken);
  const privateToken = g.token;
  assert.equal(g.view.me!.id, id);
  g.cover();
  assert(!g.view.me);
  assert(!g.submit(privateToken, "answer", { text: "Card seen" }));
  assert.equal(g.current, id);
  g.open(g.token);
  g.submit(g.token, "answer", { text: "Card seen" });
  assert.notEqual(g.current, id);
  assert(!g.open(coverToken));
  assert(!g.view.me);
});

test("one phone persists only hashed used-content IDs and can restore no-repeat history", async () => {
  const g = new OnePhoneGame(names, defaults);
  g.start();
  const r = g.room.round!;
  const hashes = await encodeHistory(g.room.history);
  assert(hashes.every((h) => /^[a-f0-9]{64}$/.test(h)));
  assert(!JSON.stringify(hashes).includes(r.card.secret!));
  const restored = await restoreHistory(hashes);
  assert.deepEqual(restored, g.room.history);
  const reloaded = new OnePhoneGame(names, defaults, restored);
  reloaded.start();
  assert.notEqual(reloaded.room.round!.card.family, r.card.family);
  assert.equal(reloaded.stage, "cover");
  assert(!reloaded.view.me);
});

test("one adult decline hides all local private cards and submissions", () => {
  const g = new OnePhoneGame(names, { ...defaults, rating: "adult" });
  g.start();
  g.open(g.token);
  const secret = g.room.round!.card.secret;
  g.skip();
  assert.equal(g.stage, "reveal");
  assert(g.view.round!.reveal!.reason);
  assert(!g.view.round!.reveal!.secret);
  if (secret) assert(!JSON.stringify(g.view).includes(secret));
});

test("fresh empty topic and drawing shortage never claim that cards were already used", () => {
  const room = readyRoom();
  room.settings = { ...defaults, game: "bluff", topic: "after-hours" };
  assert.throws(() => action(room, "start"), /No cards match/);
  assert.equal(room.exhausted, false);
  assert.equal(room.roundsPlayed, 0);
  assert.equal(availability(contentStock(room), room.settings).issue, "empty");
  assert.throws(() => action(room, "replay"), /only after/);
  room.settings = { ...defaults, game: "draw", topic: "internet" };
  const stock = contentStock(room);
  assert.equal(availability(stock, room.settings, 12).issue, "short");
  assert.equal(cleanSettings(stock, room.settings, 12).topic, "all");
});

test("every offered game, audience and topic starts fresh for 3 to 12 players", () => {
  for (const game of [...Object.keys(games), "mix"] as (Game | "mix")[])
    for (const rating of ["general", "adult"] as const)
      for (const count of [3, 12]) {
        const room = readyRoom();
        while (room.players.length < count) {
          const p = addPlayer(
            room,
            `Extra ${room.players.length}`,
            "hash",
            true,
          );
          p.ready = true;
          p.connected = true;
        }
        room.players.forEach((p) => (p.adult = true));
        const settings = { ...defaults, game, rating };
        const offered = playableTopics(contentStock(room), settings, count);
        assert(offered.includes("all"), `${game}/${rating}/${count}`);
        for (const topic of offered) {
          room.settings = { ...settings, topic };
          room.history = [];
          delete room.round;
          action(room, "start");
          assert(room.round, `${game}/${rating}/${topic}/${count}`);
          assert.equal(room.exhausted, false);
        }
      }
});

test("real depletion survives filter changes; repeats require an explicit reset", () => {
  const room = readyRoom();
  room.settings = { ...defaults, game: "bluff" };
  room.history = catalogue
    .filter((c) => c.game === "bluff")
    .flatMap((c) => [c.family, ...c.concepts]);
  const before = [...room.history];
  action(room, "start");
  assert.equal(room.exhausted, true);
  assert.equal(
    availability(project(room).stock, room.settings).issue,
    "exhausted",
  );
  action(room, "settings", { settings: { ...room.settings, rating: "adult" } });
  assert.deepEqual(room.history, before);
  action(room, "replay");
  assert.deepEqual(room.history, []);
});

test("starting applies the three basic settings atomically without a separate save", () => {
  const room = readyRoom();
  const settings = { ...defaults, game: "brain" as const, topic: "everyday" };
  action(room, "start", { settings });
  assert.equal(room.round!.game, "brain");
  assert.deepEqual(room.round!.settings, settings);
  assert(!("hint" in project(room, room.host).me!));
});

test("bluff result copy accounts for written truths, fooled friends and true guesses", () => {
  const g = new OnePhoneGame(names, { ...defaults, game: "bluff" });
  g.start();
  const r = g.room.round!;
  r.phase = "reveal";
  r.options = [
    {
      id: "truth",
      text: r.card.secret!,
      correct: true,
      authors: [g.room.players[0].id],
    },
    { id: "lie", text: "a lie", authors: [g.room.players[1].id] },
  ];
  r.votes = {
    [g.room.players[1].id]: { option: "truth", boost: false },
    [g.room.players[2].id]: { option: "lie", boost: false },
  };
  r.delta = { [g.room.players[0].id]: 2, [g.room.players[1].id]: 3 };
  const view = project(g.room);
  assert.equal(
    scoreReason(view, g.room.players[0].id),
    "Wrote the correct answer",
  );
  assert.equal(
    scoreReason(view, g.room.players[1].id),
    "Picked the truth · Fooled Maya",
  );
  assert.equal(scoreReason(view, g.room.players[2].id), "No points this round");
});

test("Who Said That gives every person a private vote turn without identifying its author", () => {
  const g = new OnePhoneGame(names, { ...defaults, game: "who" });
  g.start();
  while (g.room.round!.phase === "answer") {
    if (g.stage === "cover") g.open(g.token);
    g.submit(g.token, "answer", { text: `private ${g.current}` });
    g.continue(g.token);
  }
  const r = g.room.round!;
  const turns: string[] = [];
  while (g.stage !== "reveal") {
    if (g.stage === "cover") {
      g.open(g.token);
      turns.push(g.current!);
    }
    assert.equal(r.phase, "vote");
    g.submit(g.token, "vote", { option: r.target });
    if (turns.length < names.length) assert.equal(r.phase, "vote");
    g.continue(g.token);
  }
  assert.equal(turns.length, names.length);
  assert(turns.includes(r.target!));
  assert.equal(Object.keys(r.votes).length, names.length - 1);
  assert(!r.votes[r.target!]);
});

test("all one-phone adult games remain visible only in their intended private or reveal stage", () => {
  for (const game of Object.keys(games) as Game[]) {
    const g = new OnePhoneGame(names, { ...defaults, game, rating: "adult" });
    g.start();
    const covered = g.view;
    assert(covered.round, `${game} covered adult round`);
    assert(!covered.me);
    g.open(g.token);
    assert(g.view.me?.participating);
    g.skip();
    assert(g.view.round?.reveal?.reason);
    assert(!g.view.round?.reveal?.secret);
    assert(!g.view.round?.reveal?.chains.length);
  }
});
