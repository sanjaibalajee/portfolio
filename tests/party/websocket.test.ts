import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import {
  games,
  type RoomView,
  type ServerMessage,
  type Game,
} from "../../lib/party/types";
const port = Number(process.env.PARTY_TEST_PORT || 18987);
const base = process.env.PARTY_TEST_URL || `http://127.0.0.1:${port}`;
interface Seat {
  code: string;
  playerId: string;
  token: string;
}
async function until<T>(fn: () => T | undefined, ms = 8000): Promise<T> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const value = fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 15));
  }
  throw Error("Timed out waiting for party state");
}
class Client {
  ws: WebSocket;
  state?: RoomView;
  messages: ServerMessage[] = [];
  closed = "";
  constructor(
    code: string,
    seat?: Seat | { watch: true; display?: string },
    authCopies = 1,
  ) {
    this.ws = new WebSocket(`${base.replace("http", "ws")}/rooms/${code}/ws`, {
      origin: "http://localhost:3001",
    });
    this.ws.on("error", (e) => {
      this.closed = e.message;
    });
    this.ws.on("close", (code, reason) => {
      this.closed = code + ":" + reason.toString();
    });
    this.ws.on("open", () => {
      for (let i = 0; i < authCopies; i++)
        this.ws.send(JSON.stringify({ type: "auth", ...seat }));
    });
    this.ws.on("message", (raw) => {
      if (raw.toString() === "pong") return;
      const m = JSON.parse(raw.toString());
      this.messages.push(m);
      if (m.type === "state") {
        // Like the browser, reuse relay chains this socket already received.
        const reveal = m.state.round?.reveal;
        const previous = this.state?.round;
        if (reveal?.cached && previous && previous.id === m.state.round.id)
          reveal.chains = previous.reveal?.chains || [];
        this.state = m.state;
      }
    });
  }
  async ready() {
    try {
      await until(() => this.state);
      return this;
    } catch {
      throw Error(
        "No state: " +
          this.closed +
          " " +
          JSON.stringify(this.messages.filter((m) => m.type === "error")),
      );
    }
  }
  async send(type: string, extra: Record<string, unknown> = {}) {
    const id = crypto.randomUUID();
    this.ws.send(
      JSON.stringify({
        id,
        type,
        roundId: this.state?.round?.id,
        phase: this.state?.round?.phase,
        step: this.state?.round?.step,
        revision: this.state?.revision,
        ...extra,
      }),
    );
    const result = await until(() =>
      this.messages.find(
        (m) => (m.type === "ack" || m.type === "error") && m.id === id,
      ),
    );
    if (result.type === "error") throw Error(result.error);
    return id;
  }
}
async function seat(name: string, code?: string): Promise<Seat> {
  const r = await fetch(`${base}/rooms${code ? `/${code}/join` : ""}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3001",
    },
    body: JSON.stringify({ name, adult: true }),
  });
  const data = await r.json();
  assert.equal(r.status, 200, JSON.stringify(data));
  return data;
}
test(
  "real WebSockets: all games, private displays, reconnect, room isolation, restart durability",
  { timeout: 60000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "portfolio-party-test-"));
    let child: ChildProcess | undefined;
    const clients: Client[] = [];
    async function launch() {
      if (process.env.PARTY_TEST_URL) return;
      child = spawn(
        process.execPath,
        ["--import", "tsx", "scripts/party/server.ts"],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            GROQ_API_KEY: "",
            PARTY_PORT: String(port),
            PARTY_DATA_DIR: dir,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let output = "";
      child.stdout!.on("data", (d) => (output += d));
      child.stderr!.on("data", (d) => (output += d));
      await until(() => output.includes("server ready") || undefined);
    }
    async function stop() {
      const c = child;
      if (!c) return;
      if (c.exitCode !== null || c.signalCode !== null) {
        child = undefined;
        return;
      }
      await new Promise<void>((resolve) => {
        c.once("exit", () => resolve());
        c.kill("SIGTERM");
      });
      child = undefined;
    }
    try {
      await launch();
      const host = await seat("Host");
      const seats = [
        host,
        ...(await Promise.all(
          ["Friend One", "Friend Two", "Friend Three"].map((name) =>
            seat(name, host.code),
          ),
        )),
      ];
      for (const s of seats)
        clients.push(await new Client(host.code, s).ready());
      const display = await new Client(host.code, {
        watch: true,
        display: clients[0].state!.displayKey,
      }).ready();
      clients.push(display);
      for (const c of clients.slice(0, 4))
        await c.send("ready", { ready: true });
      await until(() => clients[0].state?.players.every((p) => p.ready));
      for (const game of Object.keys(games) as Game[]) {
        const hostClient = clients[0];
        await hostClient.send("settings", {
          settings: { ...hostClient.state!.settings, game, level: 3 },
        });
        await hostClient.send("start");
        await until(() =>
          clients
            .slice(0, 4)
            .every(
              (c) =>
                c.state?.round?.game === game &&
                c.state.round.phase === "answer",
            ),
        );
        if (game === "imposter") {
          const roles = clients.slice(0, 4).map((c) => c.state!.me!.role);
          assert.equal(roles.filter((r) => r === "imposter").length, 1);
          assert(!JSON.stringify(display.state).includes("privatePrompt"));
          assert(!JSON.stringify(display.state).includes("secret"));
        }
        if (game === "draw") {
          for (let step = 0; step < 3; step++) {
            await until(() =>
              clients.slice(0, 4).every((c) => c.state?.round?.step === step),
            );
            for (const c of clients.slice(0, 4))
              await c.send(
                "answer",
                step % 2 === 0
                  ? {
                      text: "",
                      drawing: process.env.PARTY_TEST_LARGE_DRAW
                        ? Array.from({ length: 20 }, () => ({
                            color: "ink",
                            points: Array.from({ length: 60 }, (_, p) => [
                              Number((p / 60).toFixed(4)),
                              Number(((59 - p) / 60).toFixed(4)),
                            ]),
                          }))
                        : [
                            {
                              color: "ink",
                              points: [
                                [0, 0],
                                [0.5, 0.5],
                                [1, 1],
                              ],
                            },
                          ],
                    }
                  : { text: "a very strange duck" },
              );
          }
        } else {
          for (let i = 0; i < 4; i++)
            await clients[i].send("answer", {
              text: game === "brain" ? "toast" : "answer " + i,
            });
          await until(() => hostClient.state?.round?.phase !== "answer");
          if (hostClient.state!.round!.phase === "discuss")
            await hostClient.send("advance");
          await until(() => hostClient.state?.round?.phase !== "discuss");
          for (const c of clients.slice(0, 4)) {
            await until(() => c.state?.round?.phase !== "answer");
            if (
              c.state!.round!.phase !== "vote" ||
              c.state!.me!.role === "author"
            )
              continue;
            const option = c.state!.round!.options.find((o) => !o.disabled)!;
            await c.send("vote", { option: option.id });
          }
        }
        await until(() =>
          clients.every((c) => c.state?.round?.phase === "reveal"),
        );
        assert.equal(hostClient.state!.round!.game, game);
      }
      if (process.env.PARTY_TEST_LARGE_DRAW)
        assert(
          Math.max(
            ...clients[0].messages.map((m) => Buffer.byteLength(JSON.stringify(m))),
          ) >
            128 * 1024,
        );
      const other = await seat("Different Room");
      const otherClient = await new Client(other.code, other).ready();
      clients.push(otherClient);
      assert.equal(otherClient.state!.players.length, 1);
      assert(!JSON.stringify(otherClient.state).includes("Friend One"));
      const previous = clients[1].state!.players.find(
        (p) => p.id === seats[1].playerId,
      )!.score;
      clients[1].ws.close();
      const replacement = await new Client(host.code, seats[1]).ready();
      clients.push(replacement);
      assert.equal(replacement.state!.me!.id, seats[1].playerId);
      assert.equal(
        replacement.state!.players.find((p) => p.id === seats[1].playerId)!
          .score,
        previous,
      );
      const savedRevision = clients[0].state!.revision;
      for (const c of clients) c.ws.close();
      await stop();
      await launch();
      const resumed = await new Client(host.code, host).ready();
      clients.push(resumed);
      assert.equal(resumed.state!.roundsPlayed, 7);
      assert.equal(resumed.state!.round!.game, "draw");
      assert.equal(resumed.state!.round!.phase, "reveal");
      assert(resumed.state!.revision >= savedRevision);
      assert(
        resumed.state!.round!.reveal!.chains.every(
          (chain) => chain.steps.length === 3,
        ),
      );
      const origin = await fetch(base + "/rooms", {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Intruder" }),
      });
      assert.equal(origin.status, 403);
      const forged = new Client(host.code, { ...host, token: "0".repeat(64) });
      clients.push(forged);
      await until(() => forged.messages.some((m) => m.type === "error"));
      assert.equal(forged.state, undefined);
      const repeatedAuth = new Client(host.code, host, 2);
      clients.push(repeatedAuth);
      await repeatedAuth.ready();
      await repeatedAuth.send("ready", { ready: true });
      assert.equal(repeatedAuth.closed, "");
    } finally {
      for (const c of clients) c.ws.terminate();
      await stop();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
