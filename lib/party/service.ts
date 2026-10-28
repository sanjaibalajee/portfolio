import {
  act,
  addPlayer,
  createRoom,
  nextAlarm,
  PartyError,
  project,
  setConnected,
  tick,
} from "./engine";
import { generateLore } from "./groq";
import { intentSchema, joinSchema } from "./protocol";
import type { Room, ServerMessage } from "./types";

export interface Persistence {
  load(): Promise<Room | undefined>;
  save(room: Room): Promise<void>;
  alarm(time: number): Promise<void>;
}
export interface Peer {
  id: string;
  playerId?: string;
  adult?: boolean;
  // Hashed network address, used only for the per-client AI quota.
  client?: string;
  // Round whose drawing chains this socket already received.
  chains?: string;
  send(message: ServerMessage): void;
  close(code: number, reason: string): void;
}
export async function hashToken(token: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export function secretToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export function roomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => chars[b % chars.length])
    .join("");
}
export class PartyService {
  room?: Room;
  peers = new Map<string, Peer>();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    readonly storage: Persistence,
    readonly key?: string,
    readonly reserveGeneration: (client?: string) => Promise<boolean> = async () =>
      true,
  ) {}
  serial<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn);
    this.queue = next.catch(() => undefined);
    return next;
  }
  async load() {
    this.room ??= await this.storage.load();
    return this.room;
  }
  async restoreConnections(peers: Peer[]) {
    return this.serial(async () => {
      const room = await this.load();
      if (!room) return;
      this.peers = new Map(peers.map((peer) => [peer.id, peer]));
      let changed = false;
      for (const player of room.players) {
        if (player.removed) continue;
        const connected = peers.some((peer) => peer.playerId === player.id);
        if (player.connected !== connected) {
          setConnected(room, player.id, connected);
          changed = true;
        }
      }
      // Hibernation retains sockets; an instance restart may lose all of them.
      // Persisted presence alone must never keep a departed host online forever.
      if (changed) await this.persist();
    });
  }
  async persist() {
    if (this.room) {
      try {
        await this.storage.save(this.room);
        await this.storage.alarm(nextAlarm(this.room));
      } catch (error) {
        this.room = await this.storage.load();
        throw error;
      }
    }
  }
  broadcast() {
    if (!this.room) return;
    for (const peer of this.peers.values()) {
      if (
        peer.playerId &&
        !this.room.players.some((p) => p.id === peer.playerId && !p.removed)
      ) {
        peer.close(4003, "Seat removed");
        continue;
      }
      const state = project(this.room, peer.playerId, Date.now(), peer.adult);
      // A finished relay can hold megabytes of drawings. Send them once per socket.
      const reveal = state.round?.reveal;
      if (reveal?.chains.length) {
        if (peer.chains === state.round!.id) {
          reveal.chains = [];
          reveal.cached = true;
        } else peer.chains = state.round!.id;
      }
      peer.send({ type: "state", state });
    }
  }
  async join(code: string, input: unknown, creating = false) {
    return this.serial(async () => {
      await this.load();
      if (creating && this.room)
        throw new PartyError("Room code collision. Try again.");
      if (!creating && !this.room)
        throw new PartyError("Room not found. Check the code.");
      const info = joinSchema.parse(input);
      const token = secretToken();
      const draft = structuredClone(this.room ?? createRoom(code));
      const p = addPlayer(draft, info.name, await hashToken(token), info.adult);
      p.ready = true;
      this.room = draft;
      await this.persist();
      this.broadcast();
      return { code, playerId: p.id, token };
    });
  }
  async connect(
    peer: Peer,
    auth: {
      playerId?: string;
      token?: string;
      watch?: boolean;
      display?: string;
      adult?: boolean;
    },
  ) {
    return this.serial(async () => {
      const stored = await this.load();
      if (!stored || stored.expiresAt <= Date.now())
        throw new PartyError("This room has expired or does not exist.", 4004);
      const room = structuredClone(stored);
      room.displayKey ??= crypto.randomUUID();
      let playerId: string | undefined;
      if (auth.watch) {
        if (auth.display !== room.displayKey)
          throw new PartyError(
            "This display link is no longer valid. Copy a new one from the host’s phone.",
          );
        // Seats are bounded by eviction below; displays get their own small cap.
        if ([...this.peers.values()].filter((p) => !p.playerId).length >= 4)
          throw new PartyError("Too many displays are open for this room.", 4013);
      } else {
        if (
          typeof auth.token !== "string" ||
          auth.token.length !== 64 ||
          typeof auth.playerId !== "string"
        )
          throw new PartyError("Join the room to get a seat.");
        const hash = await hashToken(auth.token);
        const player = room.players.find(
          (p) =>
            p.id === auth.playerId && !p.removed && p.credentialHash === hash,
        );
        if (!player)
          throw new PartyError("Your seat credential is invalid. Join again.");
        playerId = player.id;
        setConnected(room, player.id, true);
      }
      tick(room);
      this.room = room;
      await this.persist();
      // Commit authentication before installing the peer or evicting its old socket.
      peer.playerId = playerId;
      if (auth.watch) peer.adult = auth.adult === true;
      for (const old of this.peers.values())
        if (playerId && old.playerId === playerId) {
          this.peers.delete(old.id);
          old.close(4001, "Seat connected in another tab");
        }
      this.peers.set(peer.id, peer);
      this.broadcast();
    });
  }
  async disconnect(id: string) {
    return this.serial(async () => {
      const peer = this.peers.get(id);
      this.peers.delete(id);
      if (
        peer?.playerId &&
        this.room &&
        !Array.from(this.peers.values()).some(
          (p) => p.playerId === peer.playerId,
        )
      ) {
        setConnected(this.room, peer.playerId, false);
        await this.persist();
        this.broadcast();
      }
    });
  }
  async message(id: string, data: unknown) {
    let generation:
      { room: Room; context: string; version: number } | undefined;
    await this.serial(async () => {
      const peer = this.peers.get(id);
      if (!peer) return;
      try {
        if (!peer.playerId) throw new PartyError("The display is read-only.");
        const room = this.room!;
        if (room.expiresAt <= Date.now()) throw new PartyError("This room has expired.");
        if (tick(room)) {
          await this.persist();
          this.broadcast();
        }
        const parsed = intentSchema.safeParse(data);
        if (!parsed.success) throw new PartyError("Invalid action.");
        const intent = parsed.data;
        const draft = structuredClone(room);
        const accepted = act(draft, peer.playerId, intent);
        let pendingGeneration: typeof generation;
        if (
          intent.type === "lore" &&
          accepted
        ) {
          const room = draft;
          if (peer.playerId !== room.host)
            throw new PartyError("Only the host can create a lore pack.");
          if (room.settings.game === "bluff")
            throw new PartyError(
              "Group Lore is for creative games. Factual bluff uses checked facts.",
            );
          if (!this.key)
            throw new PartyError(
              "Add a server-side Groq key to enable Group Lore. Curated packs are ready.",
            );
          if (
            room.settings.rating === "adult" &&
            room.players.some((p) => !p.removed && p.ready && !p.adult)
          )
            throw new PartyError(
              "Every ready player must opt into adult content first.",
            );
          if (room.generation.pending)
            throw new PartyError("A pack is already being prepared.");
          if (room.generation.count >= 10 || room.custom.length >= 100)
            throw new PartyError(
              "Room generation limit reached. Your packs are ready.",
            );
          if (
            room.generation.lastAt &&
            Date.now() - room.generation.lastAt < 60_000
          )
            throw new PartyError("Wait a minute between pack requests.");
          // A lone host could otherwise drain the shared daily budget.
          if (
            room.players.filter((p) => !p.removed && p.ready && p.connected)
              .length < 3
          )
            throw new PartyError(
              "Group Lore needs at least 3 connected players.",
            );
          if (!(await this.reserveGeneration(peer.client)))
            throw new PartyError(
              "Today’s AI budget is used. Curated packs are ready.",
            );
          room.generation.count++;
          room.generation.lastAt = Date.now();
          room.generation.pending = Date.now();
          room.generation.status = "Writing and checking a fresh pack…";
          pendingGeneration = {
            room: structuredClone(room),
            context: intent.context,
            version: room.generation.pending,
          };
        }
        if (accepted) {
          this.room = draft;
          await this.persist();
          generation = pendingGeneration;
          this.broadcast();
        }
        peer.send({ type: "ack", id: intent.id });
      } catch (error) {
        peer.send({
          type: "error",
          id:
            typeof data === "object" && data !== null && "id" in data
              ? String(data.id)
              : undefined,
          error:
            error instanceof PartyError
              ? error.message
              : "That action could not be completed. Try again.",
        });
      }
    });
    if (generation) {
      const batch = generation;
      try {
        const cards = await generateLore(batch.room, batch.context, this.key);
        await this.serial(async () => {
          if (!this.room || this.room.generation.pending !== batch.version)
            return;
          const admitted = cards.slice(
            0,
            Math.max(0, 100 - this.room.custom.length),
          );
          this.room.custom.push(...admitted);
          this.room.generation.status = `${admitted.length} new cards ready. Choose Group Lore as the topic to play them.`;
          delete this.room.generation.pending;
          this.room.revision++;
          await this.persist();
          this.broadcast();
        });
      } catch (error) {
        await this.serial(async () => {
          if (!this.room || this.room.generation.pending !== batch.version)
            return;
          this.room.generation.status =
            error instanceof Error && error.name === "LoreError"
              ? error.message
              : "Could not create this pack. Curated packs are ready.";
          delete this.room.generation.pending;
          this.room.revision++;
          await this.persist();
          this.broadcast();
        });
      }
    }
  }
  async alarm() {
    return this.serial(async () => {
      await this.load();
      if (!this.room) return;
      if (this.room.expiresAt <= Date.now()) {
        for (const peer of this.peers.values())
          peer.close(4004, "Room expired");
        this.peers.clear();
        return;
      }
      if (tick(this.room)) {
        await this.persist();
        this.broadcast();
      } else await this.storage.alarm(nextAlarm(this.room));
    });
  }
}
