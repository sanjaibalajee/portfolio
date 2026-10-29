"use client";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from "lucide-react";
import {
  OnePhoneGame,
  encodeHistory,
  restoreHistory,
} from "@/lib/party/one-phone";
import { contentStock } from "@/lib/party/content";
import { availability, availabilityMessage } from "@/lib/party/availability";
import { games } from "@/lib/party/types";
import { onePhoneKey, type OnePhoneSetup } from "@/lib/party/local-setup";
import { Command, writeLocal } from "./shared";
import { AnswerForm, HoldCard, PlayerCover, RoundResults, Vote } from "./play";
import styles from "./party.module.css";

export function OnePhone({
  setup,
  onSetup,
}: {
  setup: OnePhoneSetup;
  onSetup: (s: OnePhoneSetup) => void;
}) {
  const [game, setGame] = useState<OnePhoneGame | null>(null);
  const activeGame = useRef<OnePhoneGame | null>(null);
  const [version, update] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [confirmExit, setConfirmExit] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const mutation = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  function save(g: OnePhoneGame, inProgress: boolean) {
    const names = g.room.players.map((p) => p.name);
    const settings = { ...g.room.settings };
    const history = [...g.room.history];
    const next = saveQueue.current.then(async () => {
      const hashes = await encodeHistory(history);
      writeLocal(
        onePhoneKey,
        JSON.stringify({ names, settings, history: hashes, inProgress }),
      );
    });
    saveQueue.current = next.catch(() => undefined);
    return next;
  }
  function refresh() {
    update((v) => v + 1);
    setError("");
  }
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const history = await restoreHistory(setup.history);
        if (cancelled) return;
        const g = new OnePhoneGame(setup.names, setup.settings, history);
        activeGame.current = g;
        g.start();
        await save(g, true);
        if (!cancelled) {
          setGame(g);
          setBusy(false);
          update((v) => v + 1);
        }
      } catch (e) {
        if (!cancelled) {
          setGame(activeGame.current);
          setBusy(false);
          setError(
            e instanceof Error
              ? e.message
              : "Could not start. Try another topic.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Setup is frozen for the life of a one-phone session.
  }, []);
  useEffect(() => {
    const hide = () => {
      const g = activeGame.current;
      if (g?.stage === "private") {
        g.cover();
        flushSync(() => update((v) => v + 1));
      }
    };
    const visibility = () => {
      if (document.visibilityState !== "visible") hide();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("blur", hide);
    window.addEventListener("pagehide", hide);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", escape);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener("blur", hide);
      window.removeEventListener("pagehide", hide);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", escape);
      clearInterval(timer);
    };
  }, []);
  const g = game;
  const r = g?.room.round;
  const token = g?.token || 0;
  const stage = g?.stage;
  const state = g?.view;
  const current = g?.room.players.find((p) => p.id === g.current);
  // The cover and handoff buttons sit almost where the previous screen's
  // button was. Keep them disabled briefly so the second tap of a double tap
  // can't open the next player's private turn.
  const [armedToken, setArmedToken] = useState(-1);
  useEffect(() => {
    const t = setTimeout(() => setArmedToken(token), 600);
    return () => clearTimeout(t);
  }, [token]);
  const armed = armedToken === token;
  async function backToSetup() {
    // The game never started; return to the setup it was given.
    if (!g) return onSetup(setup);
    if (mutation.current) return;
    mutation.current = true;
    try {
      await save(g, false);
      onSetup({
        names: g.room.players.map((p) => p.name),
        settings: g.room.settings,
        history: await encodeHistory(g.room.history),
      });
    } finally {
      mutation.current = false;
    }
  }
  async function next() {
    if (!g || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    try {
      g.start();
      await save(g, true);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Choose another topic.");
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  function send(type: string, data: Record<string, unknown> = {}) {
    if (!g || !["answer", "vote"].includes(type)) return false;
    try {
      const accepted = g.submit(token, type as "answer" | "vote", data);
      if (accepted) {
        refresh();
        if (g.room.round?.phase === "reveal") void save(g, false);
      }
      return accepted;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
      return false;
    }
  }
  const a = g
    ? availability(contentStock(g.room), g.room.settings, g.room.players.length)
    : undefined;
  return (
    <div className={styles.root} data-party-app>
      <header className={styles.header}>
        <button
          className={styles.back}
          aria-label="Game options"
          onClick={() => {
            g?.cover();
            refresh();
            setConfirmExit(!confirmExit);
          }}
        >
          <ArrowLeft size={23} />
        </button>
        <span className={styles.brand}>Party</span>
        <span className={styles.small}>One phone</span>
      </header>
      {confirmExit && (
        <div className={styles.notice}>
          <p>End this round and change the setup?</p>
          <div className={styles.actions}>
            <button className={styles.textButton} onClick={backToSetup}>
              Change setup
            </button>
            <button
              className={styles.textButton}
              onClick={() => setConfirmExit(false)}
            >
              Keep playing
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className={styles.notice} role="alert">
          <p>{error}</p>
          <button className={styles.textButton} onClick={backToSetup}>
            Change setup
          </button>
          {a?.issue === "exhausted" && (
            <button
              className={styles.textButton}
              onClick={() => {
                if (!g) return;
                if (g.allowRepeats()) void next();
              }}
            >
              Allow repeats
            </button>
          )}
        </div>
      )}
      {busy ? (
        <p role="status" className={styles.notice}>
          Preparing the cards…
        </p>
      ) : (
        g &&
        r &&
        state && (
          <>
            {stage === "cover" && current && (
              <>
                <PlayerCover
                  disabled={!armed}
                  name={current.name}
                  count={`Round ${r.number} · ${r.phase === "vote" ? "Private vote" : games[r.game].name}`}
                  onOpen={() => {
                    if (g.open(token)) refresh();
                  }}
                />
                {r.game === "imposter" && (
                  <div className={styles.seenList} aria-label="Cards seen">
                    {g.room.players.map((p) => (
                      <span key={p.id} data-seen={g.seen.includes(p.id)}>
                        {g.seen.includes(p.id) ? (
                          <Check size={14} aria-label="Seen" />
                        ) : (
                          <LockKeyhole size={14} aria-label="Not seen" />
                        )}
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
            {stage === "private" && current && (
              <div key={`${version}:${token}`}>
                <p className={styles.roundLabel}>
                  {current.name} ·{" "}
                  {r.phase === "vote" ? "Your vote" : "Your turn"}
                </p>
                {r.phase === "vote" ? (
                  <>
                    <h1 className={styles.phaseTitle}>
                      {r.game === "who"
                        ? "Who wrote this?"
                        : r.game === "bluff"
                          ? "Which answer is true?"
                          : "Which is funniest?"}
                    </h1>
                    <p className={styles.prompt}>{r.prompt}</p>
                    {state.me?.role === "author" ? (
                      <div className={styles.stack}>
                        <p>
                          You wrote this answer. Keep it to yourself while your
                          friends guess.
                        </p>
                        <Command
                          onClick={() => send("vote", { option: "author" })}
                        >
                          Done
                          <Check size={20} />
                        </Command>
                      </div>
                    ) : (
                      <Vote state={state} send={send} online />
                    )}
                  </>
                ) : r.game === "imposter" ? (
                  <HoldCard
                    title={
                      state.me?.role === "imposter"
                        ? "Your role"
                        : "The secret word"
                    }
                    text={
                      state.me?.role === "imposter"
                        ? "You’re the imposter"
                        : state.me?.privatePrompt
                    }
                    onSeen={() => send("answer", { text: "Card seen" })}
                  />
                ) : (
                  <>
                    <h1 className={styles.phaseTitle}>
                      {r.game === "draw"
                        ? r.step % 2
                          ? "What is this drawing?"
                          : "Time to draw"
                        : "Your answer"}
                    </h1>
                    {r.game !== "draw" && (
                      <h2
                        className={styles.prompt}
                        data-private-card={
                          r.game === "outlier" ? true : undefined
                        }
                      >
                        {r.game === "outlier"
                          ? state.me?.privatePrompt
                          : r.prompt}
                      </h2>
                    )}
                    <AnswerForm
                      state={state}
                      send={send}
                      online
                      persist={false}
                    />
                  </>
                )}
              </div>
            )}
            {stage === "handoff" && (
              <div className={styles.cover}>
                <span className={styles.coverIcon}>
                  <Check size={40} aria-hidden="true" />
                </span>
                <h1>
                  {r.game === "imposter"
                    ? "Card hidden"
                    : r.phase === "reveal"
                      ? "All done"
                      : "Saved & hidden"}
                </h1>
                <p>
                  {g.queue.length
                    ? "Hand the phone back with the screen covered."
                    : "Everyone has finished this step."}
                </p>
                <Command
                  disabled={!armed}
                  onClick={() => {
                    if (g.continue(token)) {
                      refresh();
                      if (g.stage === "reveal") void save(g, false);
                    }
                  }}
                >
                  {g.queue.length
                    ? "Pass to the next person"
                    : r.phase === "discuss"
                      ? "Start discussion"
                      : r.phase === "reveal"
                        ? "See results"
                        : r.phase === "vote"
                          ? "Start voting"
                          : "Continue relay"}
                  <ArrowRight size={22} aria-hidden="true" />
                </Command>
              </div>
            )}
            {stage === "discuss" && (
              <>
                <p className={styles.roundLabel}>
                  Round {r.number} · {games[r.game].name}
                </p>
                <h1>Talk it out</h1>
                <p className={styles.howTo}>
                  {r.game === "imposter"
                    ? "Take turns giving one clue about the word. The imposter needs to blend in. Who sounds suspicious?"
                    : "Read the answers together. One person answered a different question. Who doesn’t fit?"}
                </p>
                {r.game === "outlier" && (
                  <div className={styles.answers}>
                    {state.round?.answers?.map((answer) => (
                      <div key={answer.player} className={styles.answer}>
                        <small>
                          {
                            g.room.players.find((p) => p.id === answer.player)
                              ?.name
                          }
                        </small>
                        <strong>{answer.text}</strong>
                      </div>
                    ))}
                  </div>
                )}
                <p className={styles.timer}>
                  {Math.min(
                    45,
                    Math.max(0, Math.ceil((r.endsAt - now) / 1000)),
                  )}
                  s suggested discussion
                </p>
                <div className={styles.footerAction}>
                  <Command
                    onClick={() => {
                      if (g.discuss(token)) refresh();
                    }}
                  >
                    Choose as a group
                    <ArrowRight size={22} aria-hidden="true" />
                  </Command>
                  <p className={styles.small}>
                    Take longer if you need. This is a shared, unscored vote.
                  </p>
                </div>
              </>
            )}
            {stage === "group-vote" && (
              <GroupVote
                outlier={r.game === "outlier"}
                names={g.room.players.map((p) => ({ id: p.id, name: p.name }))}
                onPick={(id) => {
                  if (g.accuse(token, id)) {
                    refresh();
                    void save(g, false);
                  }
                }}
              />
            )}
            {stage === "reveal" && (
              <>
                {g.groupChoice && (
                  <p className={styles.notice}>
                    {g.groupChoice === r.imposter
                      ? "You caught the imposter!"
                      : "The imposter got away."}
                  </p>
                )}
                <RoundResults
                  state={state}
                  shared
                  unscored={r.game === "imposter" || r.game === "outlier"}
                  next={next}
                  changeGame={backToSetup}
                />
              </>
            )}
            {stage !== "reveal" && (
              <button
                className={styles.textButton}
                style={{ marginTop: 24 }}
                onClick={() => {
                  g.skip();
                  refresh();
                  void save(g, false);
                }}
              >
                {r.settings.rating === "adult"
                  ? "Not comfortable? Skip this round"
                  : "Skip round"}
              </button>
            )}
          </>
        )
      )}
    </div>
  );
}
function GroupVote({
  names,
  onPick,
  outlier,
}: {
  names: { id: string; name: string }[];
  onPick: (id: string) => void;
  outlier?: boolean;
}) {
  const [id, setId] = useState("");
  return (
    <div className={styles.stack}>
      <h1>{outlier ? "Who got the wrong question?" : "Who’s the imposter?"}</h1>
      <p className={styles.small}>Agree on one person, then reveal.</p>
      {names.map((p) => (
        <button
          className={`${styles.option} ${p.id === id ? styles.selected : ""}`}
          aria-pressed={id === p.id}
          key={p.id}
          onClick={() => setId(p.id)}
        >
          {p.name}
          {id === p.id && <Check size={20} />}
        </button>
      ))}
      <Command disabled={!id} onClick={() => onPick(id)}>
        Reveal
        <ArrowRight size={22} />
      </Command>
    </div>
  );
}
