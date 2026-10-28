"use client";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Check,
  Eye,
  Hand,
  LockKeyhole,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { games, type RoomView, type Stroke } from "@/lib/party/types";
import { scoreReason } from "@/lib/party/results";
import { normalise } from "@/lib/party/protocol";
import { Command, readLocal, writeLocal } from "./shared";
import { Drawing, DrawingPad } from "./drawing";
import styles from "./party.module.css";
export type Send = (type: string, data?: Record<string, unknown>) => boolean;

export function HoldCard({
  title,
  text,
  onSeen,
}: {
  title: string;
  text?: string;
  onSeen?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [seen, setSeen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function hide() {
    clearTimeout(timer.current);
    setVisible(false);
  }
  function hold() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setVisible(true);
      setSeen(true);
    }, 300);
  }
  useEffect(() => {
    const cover = () => {
      clearTimeout(timer.current);
      flushSync(() => setVisible(false));
    };
    window.addEventListener("blur", cover);
    window.addEventListener("pagehide", cover);
    document.addEventListener("visibilitychange", cover);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("blur", cover);
      window.removeEventListener("pagehide", cover);
      document.removeEventListener("visibilitychange", cover);
    };
  }, []);
  return (
    <div className={styles.privateCard}>
      <div className={styles.privateContent} aria-live="off">
        {visible ? (
          <>
            <p className={styles.small}>{title}</p>
            <strong data-private-card>{text}</strong>
          </>
        ) : (
          <>
            <LockKeyhole size={30} aria-hidden="true" />
            <h2>Your card is covered</h2>
            <p>Keep the screen facing you.</p>
          </>
        )}
      </div>
      <button
        type="button"
        className={styles.holdButton}
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          hold();
        }}
        onPointerUp={hide}
        onPointerCancel={hide}
        onLostPointerCapture={hide}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            hold();
          }
          if (e.key === "Escape") hide();
        }}
        onKeyUp={hide}
        onBlur={hide}
      >
        <Hand size={20} aria-hidden="true" /> Hold to view your card
      </button>
      <p className={styles.small}>Release to hide it.</p>
      {onSeen && (
        <Command
          disabled={!seen || visible}
          onClick={() => {
            hide();
            onSeen();
          }}
        >
          <Check size={20} aria-hidden="true" />
          I’ve seen it. Hide & continue
        </Command>
      )}
    </div>
  );
}

export function AnswerForm({
  state,
  send,
  online,
  persist = true,
}: {
  state: RoomView;
  send: Send;
  online: boolean;
  persist?: boolean;
}) {
  const r = state.round!;
  const key = `party:draft:${state.code}:${r.id}:${r.step}`;
  const [text, setText] = useState(() => {
    try {
      return persist ? JSON.parse(readLocal(key) || "{}").text || "" : "";
    } catch {
      return "";
    }
  });
  const [drawing, setDrawing] = useState<Stroke[]>(() => {
    try {
      return persist ? JSON.parse(readLocal(key) || "{}").drawing || [] : [];
    } catch {
      return [];
    }
  });
  const [sent, setSent] = useState(false);
  const latch = useRef(false);
  const drawingTurn = r.game === "draw" && r.step % 2 === 0;
  function change(t: string, d: Stroke[]) {
    setText(t);
    setDrawing(d);
    if (persist) writeLocal(key, JSON.stringify({ text: t, drawing: d }));
    setSent(false);
    latch.current = false;
  }
  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => {
      setSent(false);
      latch.current = false;
    }, 2500);
    return () => clearTimeout(timer);
  }, [sent]);
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (latch.current) return;
        latch.current = true;
        if (send("answer", { text, ...(drawingTurn ? { drawing } : {}) })) {
          setSent(true);
          // The socket clears the draft only after the server accepts it.
        } else latch.current = false;
      }}
    >
      {r.game === "draw" && state.me?.drawingTask && (
        <div className={styles.stack}>
          {state.me.drawingTask.drawing ? (
            <>
              <p>Describe this drawing in a few words.</p>
              <Drawing strokes={state.me.drawingTask.drawing} />
            </>
          ) : (
            <h2 className={styles.prompt}>{state.me.drawingTask.text}</h2>
          )}
        </div>
      )}
      {drawingTurn ? (
        <DrawingPad value={drawing} onChange={(d) => change(text, d)} />
      ) : (
        <label>
          {r.game === "imposter"
            ? "Your clue"
            : r.game === "bluff"
              ? "Your believable lie"
              : r.game === "draw"
                ? "Your caption"
                : "Your answer"}
          <textarea
            value={text}
            onChange={(e) => change(e.target.value, drawing)}
            maxLength={160}
            required
            placeholder={r.game === "brain" ? "One or two words" : "Type here…"}
          />
        </label>
      )}
      <Command
        disabled={
          !online ||
          sent ||
          (drawingTurn
            ? !drawing.some((s) => s.points.length > 1)
            : !text.trim())
        }
      >
        {sent ? "Submitting…" : "Submit answer"}
        <ArrowRight size={20} aria-hidden="true" />
      </Command>
    </form>
  );
}
export function Vote({
  state,
  send,
  online,
}: {
  state: RoomView;
  send: Send;
  online: boolean;
}) {
  const [picked, setPicked] = useState("");
  const [sending, setSending] = useState(false);
  const latch = useRef(false);
  useEffect(() => {
    if (!sending) return;
    const t = setTimeout(() => {
      setSending(false);
      latch.current = false;
    }, 2500);
    return () => clearTimeout(t);
  }, [sending]);
  return (
    <div className={styles.stack}>
      <div className={styles.stack} role="group" aria-label="Choose your vote">
        {state.round!.options.map((o) => (
          <button
            type="button"
            key={o.id}
            aria-pressed={picked === o.id}
            className={`${styles.option} ${picked === o.id ? styles.selected : ""}`}
            disabled={!online || sending || o.disabled}
            onClick={() => setPicked(o.id)}
          >
            <span>
              {o.text}
              {o.disabled ? " (yours)" : ""}
            </span>
            {picked === o.id && <Check size={20} aria-hidden="true" />}
          </button>
        ))}
      </div>
      <Command
        disabled={!picked || sending || !online}
        onClick={() => {
          if (latch.current) return;
          latch.current = true;
          if (send("vote", { option: picked })) setSending(true);
          else latch.current = false;
        }}
      >
        {sending ? "Submitting…" : "Confirm vote"}
        <Check size={20} aria-hidden="true" />
      </Command>
    </div>
  );
}
export function RoundResults({
  state,
  next,
  changeGame,
  shared = false,
  unscored = false,
}: {
  state: RoomView;
  next?: () => void;
  changeGame?: () => void;
  shared?: boolean;
  unscored?: boolean;
}) {
  const r = state.round!;
  const reveal = r.reveal!;
  const name = (id?: string) =>
    state.players.find((p) => p.id === id)?.name || "A player";
  const me = !shared && state.me?.id;
  const myPoints = me ? reveal.delta[me] || 0 : 0;
  const heading =
    r.game === "imposter"
      ? "The imposter was"
      : r.game === "outlier"
        ? "The wrong question went to"
        : r.game === "who"
          ? "Written by"
          : r.game === "bluff"
            ? "The correct answer"
            : r.game === "brain"
              ? "Did you match?"
              : r.game === "draw"
                ? "Here’s how it went"
                : "Your favourite answers";
  return (
    <div className={styles.results}>
      <p className={styles.roundLabel}>
        Round {r.number} · {games[r.game].name}
      </p>
      {r.game === "draw" && !reveal.reason && (
        <h1 className={styles.phaseTitle}>Here’s how it went</h1>
      )}
      {reveal.reason ? (
        <div className={styles.resultAnswer}>
          <h1>{reveal.reason}</h1>
          <p>No points this round.</p>
        </div>
      ) : (
        <>
          {["psych", "bluff", "brain", "who"].includes(r.game) && (
            <h1 className={styles.resultQuestion}>{r.prompt}</h1>
          )}
          {["imposter", "outlier", "bluff", "who"].includes(r.game) && (
            <div className={styles.resultAnswer}>
              <p>{heading}</p>
              <h2
                style={
                  r.game === "bluff" && reveal.secret
                    ? {
                        fontSize: `${Math.max(36, Math.min(88, 104 - reveal.secret.length * 5))}px`,
                        margin: "4px 0",
                      }
                    : undefined
                }
              >
                {reveal.imposter
                  ? name(reveal.imposter)
                  : reveal.target
                    ? name(reveal.target)
                    : reveal.secret}
              </h2>
              {r.game === "imposter" && (
                <p>
                  The secret word was <strong>{reveal.secret}</strong>.
                </p>
              )}
            </div>
          )}
          {r.game === "outlier" && (
            <div className={styles.stack}>
              <p>
                <strong>Everyone else:</strong> {r.prompt}
              </p>
              <p>
                <strong>The outlier:</strong> {reveal.other}
              </p>
            </div>
          )}
          {me && r.game !== "draw" && !unscored && (
            <div className={styles.personalResult}>
              <span className={styles.trophy}>
                <Trophy
                  size={32}
                  fill="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>
              <div>
                <h2>
                  {r.game === "bluff" &&
                  myPoints >= 2 &&
                  scoreReason(state, me).includes("truth")
                    ? "You found the truth"
                    : myPoints > 0
                      ? "Nicely played"
                      : "Next round is yours"}
                </h2>
                <strong>
                  {myPoints > 0 ? "+" : ""}
                  {myPoints} {Math.abs(myPoints) === 1 ? "point" : "points"}
                </strong>
              </div>
            </div>
          )}
          {r.game === "brain" && <h2>Matching answers</h2>}
          {r.game === "psych" && <h2>{heading}</h2>}
          {(r.game === "brain" || r.game === "psych") && (
            <AnswerBreakdown state={state} />
          )}
          {reveal.chains.map((chain, i) => (
            <details
              className={styles.details}
              key={chain.owner}
              open={i === 0}
            >
              <summary>
                Chain {i + 1} · {name(chain.owner)}
              </summary>
              <p>
                Started with: <strong>{chain.prompt}</strong>
              </p>
              {chain.steps.map((step, j) => (
                <div className={styles.answer} key={j}>
                  <small>{name(step.author)}</small>
                  {step.drawing ? (
                    <Drawing strokes={step.drawing} />
                  ) : (
                    <p>{step.text}</p>
                  )}
                </div>
              ))}
            </details>
          ))}
          {r.game !== "draw" && !unscored && (
            <section className={styles.roundScores}>
              <h2>This round</h2>
              {state.players
                .filter((p) => r.participants.includes(p.id))
                .sort(
                  (a, b) =>
                    (reveal.delta[b.id] || 0) - (reveal.delta[a.id] || 0),
                )
                .map((p, i) => (
                  <div className={styles.resultRow} key={p.id}>
                    <span
                      className={`${styles.avatar} ${styles[`avatar${i % 4}`]}`}
                      aria-hidden="true"
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>
                        {p.name}
                        {p.id === me ? " (you)" : ""}
                      </strong>
                      <p>{scoreReason(state, p.id)}</p>
                    </div>
                    <strong
                      className={styles.points}
                      data-zero={!reveal.delta[p.id]}
                    >
                      {(reveal.delta[p.id] || 0) > 0 ? "+" : ""}
                      {reveal.delta[p.id] || 0}
                    </strong>
                  </div>
                ))}
            </section>
          )}
        </>
      )}
      <div className={styles.resultActions}>
        {next ? (
          <Command onClick={next}>
            Next round
            <ArrowRight size={22} aria-hidden="true" />
          </Command>
        ) : (
          <p className={styles.notice}>
            Waiting for the host to start the next round.
          </p>
        )}
        {changeGame && (
          <button className={styles.textButton} onClick={changeGame}>
            Change game
          </button>
        )}
      </div>
      {!reveal.reason &&
        !(unscored && r.game === "imposter") &&
        !["brain", "psych", "draw"].includes(r.game) && (
          <details className={styles.details}>
            <summary>Answers & votes</summary>
            <AnswerBreakdown state={state} />
          </details>
        )}
    </div>
  );
}
function AnswerBreakdown({ state }: { state: RoomView }) {
  const r = state.round!;
  const reveal = r.reveal!;
  const name = (id: string) =>
    state.players.find((p) => p.id === id)?.name || "A player";
  const groups = new Map<string, { player: string; text: string }[]>();
  if (r.game === "brain")
    for (const answer of r.answers || []) {
      const key = normalise(answer.text);
      groups.set(key, [...(groups.get(key) || []), answer]);
    }
  if (r.game === "brain")
    return (
      <div>
        {[...groups].map(([text, answers]) => (
          <div className={styles.answer} key={text}>
            <strong>{answers?.[0].text}</strong>
            <p>{answers?.map((a) => name(a.player)).join(", ")}</p>
          </div>
        ))}
      </div>
    );
  if (r.game === "psych" || r.game === "bluff")
    return (
      <div>
        {[...reveal.options]
          .sort(
            (a, b) =>
              Object.values(reveal.votes).filter((v) => v.option === b.id)
                .length -
              Object.values(reveal.votes).filter((v) => v.option === a.id)
                .length,
          )
          .map((o) => {
            const voters = Object.entries(reveal.votes)
              .filter(([, v]) => v.option === o.id)
              .map(([id]) => name(id));
            return (
              <div className={styles.answer} key={o.id}>
                <strong>{o.text}</strong>
                <p>
                  {o.correct
                    ? "Correct answer"
                    : `By ${o.authors.map(name).join(" & ")}`}
                </p>
                <small>
                  {voters.length
                    ? `Picked by ${voters.join(", ")}`
                    : "No votes"}
                </small>
              </div>
            );
          })}
      </div>
    );
  return (
    <div>
      {r.answers
        ?.filter((a) => a.text !== "Card seen")
        .map((a) => (
          <div className={styles.answer} key={a.player}>
            <small>{name(a.player)}</small>
            <strong>{a.text}</strong>
          </div>
        ))}
      {Object.entries(reveal.votes).map(([id, v]) => (
        <p key={id}>
          {name(id)} picked {name(v.option)}.
        </p>
      ))}
    </div>
  );
}
export function Waiting({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.waiting}>
      <Check size={30} aria-hidden="true" />
      <h2>{children}</h2>
      <p>Waiting for the other players.</p>
    </div>
  );
}
export function PlayerCover({
  name,
  count,
  onOpen,
  disabled,
}: {
  name: string;
  count: string;
  onOpen: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.cover}>
      <span className={styles.coverIcon}>
        <SmartphoneIcon />
      </span>
      <p className={styles.small}>{count}</p>
      <h1>
        Pass the phone to
        <br />
        <strong>{name}</strong>
      </h1>
      <p>Everyone else, look away.</p>
      <Command onClick={onOpen} disabled={disabled}>
        I’m {name}
        <Eye size={22} aria-hidden="true" />
      </Command>
    </div>
  );
}
function SmartphoneIcon() {
  return <LockKeyhole size={40} aria-hidden="true" />;
}
