import { act, addPlayer, createRoom, project } from "./engine";
import { catalogue, contentStock } from "./content";
import { availability, availabilityMessage } from "./availability";
import type { Room, Settings } from "./types";

export class OnePhoneGame {
  readonly room: Room;
  stage: "cover" | "private" | "handoff" | "discuss" | "group-vote" | "reveal" =
    "cover";
  queue: string[] = [];
  seen: string[] = [];
  token = 0;
  groupChoice = "";
  private phaseKey = "";
  private whoVotes = new Map<string, Record<string, unknown>>();
  constructor(names: string[], settings: Settings, history: string[] = []) {
    this.room = createRoom("ONEPHONE");
    this.room.settings = { ...settings };
    this.room.history = [...history];
    for (const name of names) {
      const p = addPlayer(this.room, name, "", settings.rating === "adult");
      p.connected = true;
      p.ready = true;
    }
  }
  private action(id: string, type: string, data: Record<string, unknown> = {}) {
    act(this.room, id, {
      ...data,
      id: crypto.randomUUID(),
      type,
      roundId: this.room.round?.id,
      phase: this.room.round?.phase,
      step: this.room.round?.step,
      revision: this.room.revision,
    });
    // One phone has no timer during private turns. The group starts discussion explicitly.
    if (this.room.round) this.room.round.endsAt = 0;
  }
  start() {
    const a = availability(
      contentStock(this.room),
      this.room.settings,
      this.room.players.length,
    );
    if (a.issue !== "ready") throw new Error(availabilityMessage(a.issue));
    this.action(this.room.host, "start");
    this.groupChoice = "";
    this.seen = [];
    this.queue = [];
    this.phaseKey = "";
    this.whoVotes.clear();
    this.prepareTurn();
  }
  allowRepeats() {
    if (
      availability(
        contentStock(this.room),
        this.room.settings,
        this.room.players.length,
      ).issue !== "exhausted"
    )
      return false;
    this.room.history = [];
    return true;
  }
  private prepareTurn() {
    const r = this.room.round!;
    if (r.phase === "reveal") {
      this.stage = "reveal";
      this.token++;
      return;
    }
    if (r.phase === "discuss") {
      this.stage = "discuss";
      r.endsAt = Date.now() + 45_000;
      this.token++;
      return;
    }
    const key = `${r.phase}:${r.step}`;
    if (key !== this.phaseKey) {
      this.phaseKey = key;
      this.queue = this.room.players
        .filter((p) => r.participants.includes(p.id))
        .map((p) => p.id);
    }
    this.stage = "cover";
    this.token++;
  }
  get current() {
    return this.queue[0];
  }
  get view() {
    return project(
      this.room,
      this.stage === "private" ? this.current : undefined,
      Date.now(),
      true,
    );
  }
  open(token: number) {
    if (token !== this.token || this.stage !== "cover") return false;
    this.stage = "private";
    this.token++;
    return true;
  }
  cover() {
    if (this.stage === "private") {
      this.stage = "cover";
      this.token++;
    }
  }
  submit(
    token: number,
    type: "answer" | "vote",
    data: Record<string, unknown>,
  ) {
    if (token !== this.token || this.stage !== "private" || !this.current)
      return false;
    const id = this.current;
    const r = this.room.round!;
    const whoVote = r.game === "who" && r.phase === "vote" && type === "vote";
    if (whoVote) {
      // Everyone gets a covered voting turn, so skipping the author cannot identify them.
      // Collect first, then score genuine guesses only after the last handoff.
      if (id !== r.target) {
        if (!r.options.some((o) => o.id === data.option))
          throw new Error("Choose a friend first.");
        this.whoVotes.set(id, data);
      }
    } else this.action(id, type, data);
    if (!this.seen.includes(id)) this.seen.push(id);
    this.queue.shift();
    if (whoVote && !this.queue.length) {
      for (const [voter, vote] of this.whoVotes)
        this.action(voter, "vote", vote);
      this.whoVotes.clear();
    }
    this.stage = "handoff";
    this.token++;
    return true;
  }
  continue(token: number) {
    if (token !== this.token || this.stage !== "handoff") return false;
    this.prepareTurn();
    return true;
  }
  discuss(token: number) {
    if (token !== this.token || this.stage !== "discuss") return false;
    this.stage = "group-vote";
    this.token++;
    return true;
  }
  accuse(token: number, player: string) {
    if (
      token !== this.token ||
      this.stage !== "group-vote" ||
      !this.room.round!.participants.includes(player)
    )
      return false;
    this.groupChoice = player;
    const r = this.room.round!;
    // A shared accusation is an unscored group round, never fabricated individual votes.
    r.phase = "reveal";
    r.endsAt = 0;
    this.stage = "reveal";
    this.token++;
    return true;
  }
  skip() {
    const r = this.room.round;
    if (!r || r.phase === "reveal") return;
    this.action(this.current || r.participants[0], "skip");
    // Any one-phone player can end a round without revealing anybody's answers.
    r.phase = "reveal";
    r.reason = "Round skipped. Private cards and answers stay hidden.";
    r.endsAt = 0;
    this.stage = "reveal";
    this.token++;
  }
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
let index: Promise<Map<string, string>> | undefined;
export async function encodeHistory(history: string[]) {
  return Promise.all(history.map(digest));
}
export async function restoreHistory(hashes: string[]) {
  index ??= Promise.all(
    [...new Set(catalogue.flatMap((c) => [c.family, ...c.concepts]))].map(
      async (token) => [await digest(token), token] as const,
    ),
  ).then((pairs) => new Map(pairs));
  const map = await index;
  return hashes.map((h) => map.get(h)).filter((x): x is string => !!x);
}
