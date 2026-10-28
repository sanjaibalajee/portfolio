import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availability,
  availabilityMessage,
  stockFor,
} from "../../lib/party/availability";
import { defaults } from "../../lib/party/types";
import type { Stock } from "../../lib/party/availability";

test("missing room content metadata never crashes or claims a fresh pack is exhausted", () => {
  for (const missing of [undefined, null]) {
    const stock = missing as unknown as Stock[];
    assert.doesNotThrow(() => stockFor(stock, defaults));
    const result = availability(stock, defaults);
    assert.equal(result.issue, "unavailable");
    assert(!availabilityMessage(result.issue).includes("played"));
  }
});

test("an empty loaded catalogue is distinct from missing or partial room metadata", () => {
  assert.equal(availability([], defaults).issue, "empty");
  for (const broken of [
    [null],
    [{}],
    [
      {
        game: "imposter",
        topic: "all",
        rating: "general",
        level: 3,
        total: 1,
        fresh: 2,
      },
    ],
  ]) {
    const stock = broken as Stock[];
    assert.doesNotThrow(() => stockFor(stock, defaults));
    assert.equal(availability(stock, defaults).issue, "unavailable");
  }
});

test("a valid room update recovers availability without resetting used-content history", async () => {
  const { contentStock, catalogue } = await import("../../lib/party/content");
  const history = [catalogue[0].family, ...catalogue[0].concepts];
  const room = { history, custom: [] };
  const first = availability(contentStock(room), defaults);
  assert.equal(first.issue, "ready");
  assert.equal(availability(undefined, defaults).issue, "unavailable");
  assert.deepEqual(availability(contentStock(room), defaults), first);
  assert.deepEqual(room.history, history);
});
