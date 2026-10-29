"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, QrCode, X } from "lucide-react";
import QRCode from "qrcode";
import { games, type RoomView, type Settings } from "@/lib/party/types";
import {
  availability,
  availabilityMessage,
  cleanSettings,
  hasContentStock,
} from "@/lib/party/availability";
import { settingsSchema } from "@/lib/party/protocol";
import { Command, clearLocal, joinParty, readLocal, type Seat } from "./shared";
import { SettingsPicker } from "./setup";
import {
  AnswerForm,
  HoldCard,
  RoundResults,
  Vote,
  Waiting,
  type Send,
} from "./play";
import { usePartySocket } from "./use-room";
import styles from "./party.module.css";
const subscribeHydration = () => () => {};
function savedSeat(code: string): Seat | null {
  try {
    return JSON.parse(readLocal(`party:seat:${code}`) || "null");
  } catch {
    return null;
  }
}
interface Props {
  code: string;
  endpoint: string;
  socketEndpoint: string;
  display: boolean;
}
export function PartyRoomClient(props: Props) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  return hydrated ? (
    <Room key={`${props.code}:${props.display}`} {...props} />
  ) : (
    <div data-party-app className={styles.root}>
      <p role="status">Opening your party…</p>
    </div>
  );
}
function Room({ code, endpoint, socketEndpoint, display }: Props) {
  const router = useRouter();
  const [seat, setSeat] = useState<Seat | null>(() => savedSeat(code));
  const [name, setName] = useState(() => readLocal("party:name") || "");
  const [displayAdult, setDisplayAdult] = useState(false);
  // The display secret travels in the fragment so it never reaches a server log.
  const [displayKey] = useState(() =>
    display ? decodeURIComponent(window.location.hash.slice(1)) : "",
  );
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [share, setShare] = useState(false);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedDisplay, setCopiedDisplay] = useState(false);
  const [editingRound, setEditingRound] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const {
    state: receivedState,
    status,
    error,
    setError,
    send,
    terminal,
    offset,
  } = usePartySocket(
    code,
    endpoint,
    socketEndpoint,
    seat,
    display,
    displayAdult,
    displayKey,
  );
  // React may retain an older snapshot through a development refresh or reconnect.
  const state =
    receivedState && hasContentStock(receivedState.stock)
      ? receivedState
      : undefined;
  const online = status === "live";
  const r = state?.round;
  const editing = r?.phase === "reveal" && editingRound === r.id;
  function setEditing(value: boolean) {
    setEditingRound(value ? r?.id || null : null);
  }
  const host = !!state?.me && state.host === state.me.id;
  const me = state?.players.find((p) => p.id === state.me?.id);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    let stopped = false;
    if (share)
      void QRCode.toDataURL(`${window.location.origin}/party/${code}`, {
        width: 248,
        margin: 2,
        color: { dark: "#111b46", light: "#ffffff" },
      }).then((url) => {
        if (!stopped) setQr(url);
      });
    return () => {
      stopped = true;
    };
  }, [share, code]);
  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setJoinError("");
    try {
      setSeat(await joinParty(endpoint, name.trim(), code));
    } catch (e) {
      setJoinError(
        e instanceof Error && e.name !== "TypeError"
          ? e.message
          : "Couldn’t reach the party server. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/party/${code}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShare(true);
    }
  }
  async function copyDisplay() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/party/${code}?display=1#${state?.displayKey}`,
      );
      setCopiedDisplay(true);
      setTimeout(() => setCopiedDisplay(false), 2500);
    } catch {
      setError("Couldn’t copy. Long-press the display link to share it.");
    }
  }
  function leave() {
    // Keep the seat if the server can't hear about it; the host would see a ghost.
    if (!terminal && !display && !send("leave")) {
      setError("Reconnect before leaving so your seat is freed.");
      return;
    }
    // Another tab still uses this seat.
    if (terminal !== "tab") {
      clearLocal(`party:seat:${code}`);
      clearLocal(`party:pending:${code}`);
    }
    router.push("/party");
  }
  const seconds = r?.endsAt
    ? Math.max(
        0,
        Math.ceil(
          (r.endsAt - Math.max(now + offset.current, state?.serverNow || 0)) /
            1000,
        ),
      )
    : 0;
  const ready = state?.players.filter((p) => p.ready && p.connected) || [];
  const a = state
    ? availability(state.stock, state.settings, Math.max(3, ready.length))
    : undefined;
  const canStart =
    online &&
    ready.length >= 3 &&
    (state?.settings.rating !== "adult" || ready.every((p) => p.adult)) &&
    a?.issue === "ready";
  return (
    <div className={styles.root} data-party-app>
      <header
        className={`${styles.header} ${r?.phase === "reveal" && !editing ? styles.resultHeader : ""}`}
      >
        <Link href="/party" className={styles.back} aria-label="Back to games">
          <ArrowLeft size={23} />
        </Link>
        <Link href="/party" className={styles.brand}>
          Party
        </Link>
        <button
          className={styles.iconButton}
          aria-label="Show invite"
          onClick={() => setShare(!share)}
        >
          <QrCode size={23} />
        </button>
      </header>
      {!seat && !display ? (
        <>
          <div className={styles.heading}>
            <h1>You’re invited</h1>
            <p>Room {code}. Your friends are waiting.</p>
          </div>
          <form className={styles.form} onSubmit={join}>
            <label>
              Your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={24}
                autoComplete="nickname"
              />
            </label>
            <Command disabled={busy || !endpoint}>
              {busy ? "Joining…" : "Join party"}
              <ArrowRight size={22} />
            </Command>
            {joinError && (
              <p className={styles.error} role="alert">
                {joinError}
              </p>
            )}
          </form>
        </>
      ) : (
        <>
          {error && (
            <div className={styles.toast} role="alert">
              <span>{error}</span>
              <button
                className={styles.iconButton}
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={20} />
              </button>
            </div>
          )}
          {terminal ? (
            <p role="status" className={styles.notice}>
              {terminal === "tab"
                ? "Only one tab can use a seat."
                : terminal === "update"
                  ? "A newer version of Party is live."
                  : terminal === "ended"
                    ? "Thanks for playing."
                    : display
                      ? "Ask the host for a fresh link."
                      : "Join again to keep playing."}
              {terminal === "tab" || terminal === "update" ? (
                <button
                  className={styles.textButton}
                  onClick={() => window.location.reload()}
                >
                  Reload
                </button>
              ) : (
                <button className={styles.textButton} onClick={leave}>
                  {terminal === "seat" && !display
                    ? "Leave room"
                    : "Back to games"}
                </button>
              )}
            </p>
          ) : display && !displayKey ? (
            <p role="status" className={styles.notice}>
              Open the display link from the host’s phone. It’s under Room
              options.
            </p>
          ) : !state ? (
            <p role="status" className={styles.notice}>
              Connecting to your party…
            </p>
          ) : (
            <>
              {!online && (
                <p role="status" className={styles.notice}>
                  Reconnecting… Your seat and draft are saved.
                </p>
              )}
              {share && (
                <div className={styles.invite}>
                  <div className={styles.qr}>
                    {qr && (
                      <Image
                        unoptimized
                        src={qr}
                        alt={`QR invite to room ${code}`}
                        width={124}
                        height={124}
                      />
                    )}
                    <div>
                      <p>Join with this code</p>
                      <strong className={styles.roomCode}>{code}</strong>
                      <button className={styles.textButton} onClick={copy}>
                        <Copy size={18} />
                        {copied ? "Copied" : "Copy invite link"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {display && (
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={displayAdult}
                    onChange={(e) => setDisplayAdult(e.target.checked)}
                  />
                  This display can show 18+ rounds.
                </label>
              )}
              {state.settings.rating === "adult" && !display && (
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={me?.adult || false}
                    disabled={!online}
                    onChange={(e) =>
                      send("consent", { adult: e.target.checked })
                    }
                  />
                  I’m 18+ and happy to play adult rounds.
                </label>
              )}
              {state.adultHidden && (
                <p className={styles.notice}>
                  An 18+ round is in progress. Confirm above to see it.
                </p>
              )}
              {!display && !me?.ready && (
                <Command
                  className={styles.secondary}
                  onClick={() => send("ready", { ready: true })}
                >
                  Join the next round
                  <Check size={20} />
                </Command>
              )}
              {(!r || (r.phase === "reveal" && editing)) && host && (
                <Lobby
                  key={r?.id || code}
                  state={state}
                  send={send}
                  online={online}
                  copy={copy}
                  copied={copied}
                  onStarted={() => setEditing(false)}
                  onCancel={r ? () => setEditing(false) : undefined}
                />
              )}
              {!r && !host && (
                <>
                  <div className={styles.heading}>
                    <h1>You’re in, {me?.name || "everyone"}.</h1>
                    <p>
                      {state.players.find((p) => p.id === state.host)?.name ||
                        "The host"}{" "}
                      will start when everyone joins.
                    </p>
                  </div>
                  <GameDescription game={state.settings.game} />
                  <PlayerList state={state} />
                </>
              )}
              {r?.phase === "reveal" && !editing && (
                <>
                  <RoundResults
                    state={state}
                    next={
                      host
                        ? () => {
                            if (canStart) send("start");
                            else setEditing(true);
                          }
                        : undefined
                    }
                    changeGame={host ? () => setEditing(true) : undefined}
                    shared={display}
                  />
                  {host && !canStart && (
                    <p className={styles.small}>
                      {a?.issue !== "ready"
                        ? availabilityMessage(a?.issue || "empty")
                        : ready.length < 3
                          ? "Waiting for at least 3 connected players."
                          : "Waiting for everyone to confirm 18+."}
                    </p>
                  )}
                  <details className={styles.details}>
                    <summary>Overall scores</summary>
                    {[...state.players]
                      .sort((a, b) => b.score - a.score)
                      .map((p) => (
                        <div className={styles.scoreRow} key={p.id}>
                          <span>{p.name}</span>
                          <strong>{p.score} points</strong>
                        </div>
                      ))}
                  </details>
                </>
              )}
              {r && r.phase !== "reveal" && (
                <>
                  <div className={styles.roundTop}>
                    <span>
                      Round {r.number} · {games[r.game].name}
                      {r.game === "draw"
                        ? ` · ${r.step + 1}/${r.maxSteps}`
                        : ""}
                    </span>
                    <span className={styles.timer} aria-label="Time remaining">
                      {seconds}s
                    </span>
                  </div>
                  <h1 className={styles.phaseTitle}>{phaseTitle(state)}</h1>
                  <p className={styles.howTo}>{phaseHelp(state)}</p>
                  {!["imposter", "outlier", "draw"].includes(r.game) && (
                    <h2 className={styles.prompt}>{r.prompt}</h2>
                  )}
                  {state.me?.participating && state.me.privatePrompt && (
                    <HoldCard
                      key={r.id}
                      title={
                        state.me.role === "imposter"
                          ? "Your role"
                          : r.game === "outlier"
                            ? "Your question"
                            : "The secret word"
                      }
                      text={
                        state.me.role === "imposter"
                          ? "You’re the imposter"
                          : state.me.privatePrompt
                      }
                    />
                  )}
                  {!state.me?.participating && !display && (
                    <p className={styles.notice}>
                      You’ll join the next round. Watch this one with your
                      friends.
                    </p>
                  )}
                  {r.phase === "answer" &&
                    state.me?.participating &&
                    (state.me.submitted ? (
                      <Waiting>Answer submitted</Waiting>
                    ) : (
                      <AnswerForm
                        key={`${r.id}:${r.step}`}
                        state={state}
                        send={send}
                        online={online}
                      />
                    ))}
                  {(r.phase === "discuss" || r.phase === "vote") &&
                    r.answers &&
                    ["imposter", "outlier"].includes(r.game) && (
                      <div className={styles.answers}>
                        {r.answers.map((answer) => (
                          <div className={styles.answer} key={answer.player}>
                            <small>
                              {
                                state.players.find(
                                  (p) => p.id === answer.player,
                                )?.name
                              }
                            </small>
                            <strong>{answer.text}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  {r.phase === "vote" &&
                    state.me?.participating &&
                    (state.me.voted ? (
                      <Waiting>Vote submitted</Waiting>
                    ) : state.me.role === "author" ? (
                      <Waiting>You wrote this one. Let them guess.</Waiting>
                    ) : (
                      <Vote
                        key={`${r.id}:vote`}
                        state={state}
                        send={send}
                        online={online}
                      />
                    ))}
                  {r.phase !== "discuss" && (
                    <p className={styles.small} style={{ marginTop: 20 }}>
                      {r.phase === "answer"
                        ? `${r.submitted} of ${r.required} answers submitted`
                        : `${r.voted} votes submitted`}
                    </p>
                  )}
                  {host && (
                    <div className={styles.footerAction}>
                      <Command
                        className={styles.secondary}
                        disabled={!online}
                        onClick={() => send("advance")}
                      >
                        {r.phase === "discuss"
                          ? "Start voting"
                          : r.phase === "vote"
                            ? "Show results"
                            : "Finish answers"}
                        <ArrowRight size={20} />
                      </Command>
                    </div>
                  )}
                  {state.me?.participating && (
                    <button
                      className={styles.textButton}
                      disabled={!online}
                      style={{ marginTop: 14 }}
                      onClick={() => send("skip")}
                    >
                      {state.settings.rating === "adult"
                        ? "Skip round"
                        : "Vote to skip round"}
                    </button>
                  )}
                </>
              )}
              <details className={styles.details} style={{ marginTop: 26 }}>
                <summary>Room options</summary>
                <p>Room {code}</p>
                <button
                  className={styles.textButton}
                  onClick={() => setShare(!share)}
                >
                  Show invite
                </button>
                {host && state.displayKey && (
                  <>
                    <a
                      className={styles.textButton}
                      href={`/party/${code}?display=1#${state.displayKey}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open a shared screen
                    </a>
                    <button className={styles.textButton} onClick={copyDisplay}>
                      <Copy size={18} />
                      {copiedDisplay ? "Copied" : "Copy shared screen link"}
                    </button>
                  </>
                )}
                {!display && (
                  <button
                    className={styles.textButton}
                    onClick={() => (confirmLeave ? leave() : setConfirmLeave(true))}
                  >
                    {confirmLeave ? "Confirm leave" : "Leave room"}
                  </button>
                )}
                {!host &&
                  !display &&
                  !state.players.find((p) => p.id === state.host)
                    ?.connected && (
                    <button
                      className={styles.textButton}
                      onClick={() => send("claim-host")}
                    >
                      Become host after 60 seconds
                    </button>
                  )}
              </details>
            </>
          )}
        </>
      )}
    </div>
  );
}
function PlayerList({ state }: { state: RoomView }) {
  return (
    <div className={styles.players}>
      {state.players.map((p) => (
        <div className={styles.player} key={p.id}>
          <span
            className={`${styles.dot} ${!p.connected ? styles.offline : ""}`}
            aria-label={p.connected ? "Connected" : "Away"}
          />
          <span className={styles.playerName}>
            {p.name}
            {p.id === state.me?.id ? " (you)" : ""}
          </span>
          <small>
            {p.id === state.host ? "Host" : p.connected ? "Joined" : "Away"}
            {state.settings.rating === "adult" && p.adult
              ? " · 18+ confirmed"
              : ""}
          </small>
        </div>
      ))}
    </div>
  );
}
function GameDescription({ game }: { game: Settings["game"] }) {
  return (
    <div className={styles.howTo}>
      <strong>{game === "mix" ? "Surprise me" : games[game].name}</strong>
      {game === "mix"
        ? "A new game each round. We’ll explain it when it starts."
        : games[game].instructions}
    </div>
  );
}
function Lobby({
  state,
  send,
  online,
  copy,
  copied,
  onStarted,
  onCancel,
}: {
  state: RoomView;
  send: Send;
  online: boolean;
  copy: () => void;
  copied: boolean;
  onStarted: () => void;
  onCancel?: () => void;
}) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = settingsSchema.safeParse(
        JSON.parse(readLocal(`party:setup:${state.code}`) || "null"),
      );
      return cleanSettings(
        state.stock,
        !state.roundsPlayed && saved.success ? saved.data : state.settings,
      );
    } catch {
      return state.settings;
    }
  });
  const [chooseGame, setChooseGame] = useState(false);
  const [confirmKick, setConfirmKick] = useState("");
  const [starting, setStarting] = useState(false);
  const dirty = JSON.stringify(settings) !== JSON.stringify(state.settings);
  useEffect(() => {
    // Start carries the settings itself; a late save would hit the new round.
    if (!dirty || !online || starting) return;
    const t = setTimeout(() => send("settings", { settings }), 400);
    return () => clearTimeout(t);
  }, [dirty, online, starting, settings, state.revision, send]);
  useEffect(() => {
    if (!starting) return;
    const t = setTimeout(() => setStarting(false), 2000);
    return () => clearTimeout(t);
  }, [starting]);
  const ready = state.players.filter((p) => p.ready && p.connected);
  const consent = settings.rating !== "adult" || ready.every((p) => p.adult);
  const a = availability(state.stock, settings, Math.max(3, ready.length));
  return (
    <>
      <div className={styles.heading}>
        <h1>{onCancel ? "Next round" : "Get everyone in"}</h1>
        <p>
          {onCancel
            ? "Keep playing or try something else."
            : "Send the code. You’ll play too."}
        </p>
      </div>
      {!onCancel && (
        <>
          <div className={styles.invite}>
            <p>Room code</p>
            <strong className={styles.roomCode}>{state.code}</strong>
            <div>
              <button className={styles.textButton} onClick={copy}>
                <Copy size={18} />
                {copied ? "Copied" : "Copy invite"}
              </button>
            </div>
          </div>
          <PlayerList state={state} />
        </>
      )}
      <div className={styles.actions}>
        <h2 style={{ flex: 1 }}>
          {settings.game === "mix" ? "Surprise me" : games[settings.game].name}
        </h2>
        <button
          className={styles.textButton}
          onClick={() => setChooseGame(!chooseGame)}
        >
          {chooseGame ? "Done" : "Change game"}
        </button>
      </div>
      <GameDescription game={settings.game} />
      <SettingsPicker
        settings={settings}
        stock={state.stock}
        players={Math.max(3, ready.length)}
        onChange={setSettings}
        chooseGame={chooseGame}
      />
      {!consent && (
        <p className={styles.notice}>
          Waiting for 18+ confirmation from{" "}
          {ready
            .filter((p) => !p.adult)
            .map((p) => p.name)
            .join(", ")}
          . Each person confirms on their own phone.
        </p>
      )}
      {a.issue !== "ready" && (
        <div className={styles.notice}>
          <p>{availabilityMessage(a.issue)}</p>
          {a.issue === "exhausted" && !dirty && (
            <button
              className={styles.textButton}
              onClick={() => send("replay")}
            >
              Allow repeats
            </button>
          )}
        </div>
      )}
      <div className={styles.footerAction}>
        <Command
          disabled={
            !online ||
            ready.length < 3 ||
            !consent ||
            a.issue !== "ready" ||
            starting
          }
          onClick={() => {
            if (send("start", { settings })) {
              setStarting(true);
              clearLocal(`party:setup:${state.code}`);
              onStarted();
            }
          }}
        >
          {starting ? "Starting…" : "Start round"}
          <ArrowRight size={22} />
        </Command>
        {ready.length < 3 && (
          <p className={styles.small}>
            {ready.length} joined. At least 3 connected players needed.
          </p>
        )}
        {onCancel && (
          <button className={styles.textButton} onClick={onCancel}>
            Back to results
          </button>
        )}
      </div>
      {settings.game !== "bluff" && (
        <Lore
          state={state}
          send={send}
          online={online && !dirty}
          canUse={
            availability(
              state.stock,
              { ...settings, topic: "group-lore", lore: false },
              Math.max(3, ready.length),
            ).fresh > 0
          }
          onUse={() =>
            setSettings({ ...settings, topic: "group-lore", lore: false })
          }
        />
      )}
      <details className={styles.details}>
        <summary>Manage players</summary>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={state.locked}
            disabled={!online}
            onChange={(e) => send("lock", { locked: e.target.checked })}
          />
          Close the room to new players
        </label>
        {state.players
          .filter((p) => p.id !== state.me?.id)
          .map((p) => (
            <div className={styles.scoreRow} key={p.id}>
              <span>{p.name}</span>
              <button
                className={styles.textButton}
                disabled={!online}
                onClick={() => {
                  if (confirmKick === p.id) {
                    send("kick", { player: p.id });
                    setConfirmKick("");
                  } else setConfirmKick(p.id);
                }}
              >
                {confirmKick === p.id ? "Confirm remove" : "Remove"}
              </button>
            </div>
          ))}
      </details>
    </>
  );
}
function Lore({
  state,
  send,
  online,
  canUse,
  onUse,
}: {
  state: RoomView;
  send: Send;
  online: boolean;
  canUse: boolean;
  onUse: () => void;
}) {
  const [context, setContext] = useState("");
  return (
    <details className={styles.details} style={{ marginTop: 24 }}>
      <summary>Group Lore · use your inside jokes</summary>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          send("lore", { context });
        }}
      >
        <p className={styles.small}>
          Describe a shared memory or group obsession. We’ll turn it into new
          prompts. This text goes to Groq; leave out private details.
        </p>
        <label>
          Your group’s lore
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            minLength={8}
            maxLength={600}
            required
            placeholder="Our trips always involve missed trains and terrible karaoke…"
          />
        </label>
        <Command
          disabled={
            !online ||
            state.generation.status.startsWith("Writing") ||
            state.generation.count >= 10
          }
        >
          Make a pack
          <ArrowRight size={20} />
        </Command>
        {state.generation.count > 0 && (
          <p role="status" className={styles.small}>
            {state.generation.status}
          </p>
        )}
        {canUse && (
          <button
            type="button"
            className={styles.textButton}
            disabled={!online}
            onClick={onUse}
          >
            Use Group Lore for the next round
          </button>
        )}
      </form>
    </details>
  );
}
function phaseTitle(state: RoomView) {
  const r = state.round!;
  return r.phase === "discuss"
    ? "Talk it out"
    : r.phase === "vote"
      ? r.game === "bluff"
        ? "Which answer is true?"
        : r.game === "who"
          ? "Who wrote this?"
          : ["imposter", "outlier"].includes(r.game)
            ? "Who’s the imposter?"
            : "Which is funniest?"
      : r.game === "draw"
        ? r.step % 2
          ? "Describe the drawing"
          : "Time to draw"
        : r.game === "imposter"
          ? "Give one clue"
          : "Your answer";
}
function phaseHelp(state: RoomView) {
  const r = state.round!;
  return r.phase === "discuss"
    ? "Compare the clues. Decide who sounds suspicious."
    : r.phase === "vote"
      ? r.game === "bluff"
        ? "One answer is real. The others are your friends’ bluffs."
        : r.game === "psych"
          ? "Vote for your favourite answer. You can’t choose your own."
          : r.game === "who"
            ? "Pick the friend you think wrote this answer."
            : "Pick one person, then confirm your vote."
      : games[r.game].instructions;
}
