import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogue, contentStock, eligibleCards, selectCard } from "../../lib/party/content";
import { imposterOrigin, imposterWords } from "../../lib/party/data/imposter";
import { createRoom } from "../../lib/party/engine";
import { availability, playableTopics } from "../../lib/party/availability";
import { normalise } from "../../lib/party/protocol";
import baselineWords from "../../lib/party/data/words.json";

test("the full baseline word bank and new general words remain playable together", () => {
  const room = createRoom("WORDS5");
  const playable = new Set(eligibleCards(room).map((c) => c.id));
  for (const word of baselineWords) assert(playable.has(word.id), word.secret);
  for (const word of imposterWords.filter((c) => c.rating === "general"))
    assert(playable.has(word.id), word.secret);
});

test("Imposter secrets are unique, concise and playable at every offered difficulty and topic", () => {
  const words = catalogue.filter((c) => c.game === "imposter");
  assert.equal(new Set(words.map((c) => normalise(c.secret!))).size, words.length);
  for (const c of imposterWords) {
    assert(c.secret && c.secret.trim() === c.secret && c.secret.length <= 55);
    assert.equal(c.concepts[0], `word:${normalise(c.secret!).replaceAll(" ", "-")}`);
    assert(!c.hint);
  }
  const room = createRoom("WORDS1");
  for (const rating of ["general", "adult"] as const) {
    let previous = new Set<string>();
    for (const level of [1, 2, 3] as const) {
      room.settings = { ...room.settings, rating, level, topic: "all" };
      const eligible = eligibleCards(room);
      const ids = new Set(eligible.map((c) => c.id));
      assert([...previous].every((id) => ids.has(id)));
      assert(ids.size > previous.size);
      previous = ids;
      assert(eligible.every((c) => c.level <= level));
      if (rating === "general") assert(eligible.every((c) => c.rating === "general"));
      const stock = contentStock(room);
      for (const topic of playableTopics(stock, room.settings)) {
        const settings = { ...room.settings, topic };
        assert.equal(availability(stock, settings).issue, "ready");
        const selected = selectCard({ ...room, settings }, () => 0.2)!;
        assert(selected && selected.level <= level);
        assert(topic === "all" || selected.topic === topic);
      }
    }
  }
});

test("explicit vocabulary only enters an adult-rated pool", () => {
  const room = createRoom("WORDS2");
  const explicit = ["Dildo", "Blowjob", "Butt plug", "Pegging", "BDSM", "Masturbation"];
  for (const secret of explicit) {
    const card = catalogue.find((c) => c.secret === secret)!;
    assert(card, secret);
    assert.equal(card.rating, "adult");
    assert.equal(card.topic, "after-hours");
    for (const rating of ["general", "spicy"] as const) {
      room.settings.rating = rating;
      assert(!eligibleCards(room).includes(card));
    }
    room.settings.rating = "adult";
    assert(eligibleCards(room).includes(card));
  }
});

test("the original word pack mixes adult and general rounds independently of bank size", () => {
  const room = createRoom("WORDS3");
  let seed = 42;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (const rating of ["general", "adult"] as const) {
    room.settings.rating = rating;
    const counts = { curated: 0, adult: 0, general: 0, hard: 0 };
    for (let i = 0; i < 1000; i++) {
      const card = selectCard(room, random)!;
      if (card.origin === imposterOrigin) counts.curated++;
      if (card.rating === "adult") counts.adult++;
      if (card.rating === "general") counts.general++;
      if (card.level === 3) counts.hard++;
    }
    assert(counts.curated > 500, JSON.stringify(counts));
    assert(counts.general > 250 && counts.hard > 100, JSON.stringify(counts));
    if (rating === "adult") assert(counts.adult > 450 && counts.adult < 750);
    else assert.equal(counts.adult, 0);
  }
});

test("the original word pack respects used concepts and falls back without resetting history", () => {
  const room = createRoom("WORDS4");
  room.settings.rating = "adult";
  room.history = imposterWords.flatMap((c) => [c.family, ...c.concepts]);
  const history = [...room.history];
  const selected = selectCard(room, () => 0.1)!;
  assert(selected && selected.origin !== imposterOrigin);
  assert(!history.includes(selected.family));
  assert.deepEqual(room.history, history);
  const card = imposterWords.find((c) => c.secret === "Deja vu")!;
  room.settings.rating = "general";
  room.history = [card.concepts[0]];
  assert(!eligibleCards(room).includes(card));
  room.settings.lore = true;
  room.custom = [{ ...card, id: "lore-test", family: "lore-test", concepts: ["lore-test"], topic: "group-lore", origin: "groq-reviewed-v1" }];
  assert.equal(selectCard(room, () => 0.1)?.id, "lore-test");
});
