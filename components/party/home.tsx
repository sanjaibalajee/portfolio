"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
import { defaults, games, type Settings } from "@/lib/party/types";
import { onePhoneKey, type OnePhoneSetup } from "@/lib/party/local-setup";
import { settingsSchema, joinSchema, normalise } from "@/lib/party/protocol";
import {
  availability,
  availabilityMessage,
  cleanSettings,
  type Stock,
} from "@/lib/party/availability";
import {
  Command,
  clearLocal,
  joinParty,
  readLocal,
  writeLocal,
} from "./shared";
import { GamePicker, ModePicker, SettingsPicker } from "./setup";
import styles from "./party.module.css";
const OnePhone = dynamic(() => import("./one-phone").then((m) => m.OnePhone), {
  ssr: false,
  loading: () => (
    <div data-party-app className={styles.root}>
      <p className={styles.notice}>Getting your game ready…</p>
    </div>
  ),
});
const subscribeHydration = () => () => {};
type HomeProps = { endpoint: string; socketEndpoint: string; stock: Stock[] };
function savedSetup(): OnePhoneSetup | null {
  try {
    const s = JSON.parse(readLocal(onePhoneKey) || "null");
    if (
      !s ||
      !settingsSchema.safeParse(s.settings).success ||
      !Array.isArray(s.names) ||
      s.names.length < 3 ||
      s.names.length > 12 ||
      !s.names.every(
        (name: unknown) => joinSchema.safeParse({ name }).success,
      ) ||
      new Set(s.names.map(normalise)).size !== s.names.length ||
      !Array.isArray(s.history) ||
      s.history.length > 10000 ||
      !s.history.every(
        (id: unknown) => typeof id === "string" && /^[a-f0-9]{64}$/.test(id),
      )
    )
      return null;
    return s;
  } catch {
    return null;
  }
}
export function PartyHome(props: HomeProps) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  return hydrated ? (
    <Home {...props} />
  ) : (
    <div className={styles.root} data-party-app>
      <p role="status">Opening Party…</p>
    </div>
  );
}
function Home({ endpoint, stock }: HomeProps) {
  const router = useRouter();
  const [saved] = useState(savedSetup);
  const [screen, setScreen] = useState<"games" | "setup" | "join" | "play">(
    saved?.inProgress ? "setup" : "games",
  );
  const [mode, setMode] = useState<"one" | "phones">("one");
  const [settings, setSettings] = useState<Settings>(() =>
    cleanSettings(
      stock,
      saved?.settings || {
        ...defaults,
        seconds: 90,
      },
    ),
  );
  const [names, setNames] = useState<string[]>(saved?.names || []);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [history, setHistory] = useState<string[]>(saved?.history || []);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    saved?.inProgress
      ? "The previous round was cleared on reload. Check the names, then deal a new round. Previously used cards stay used."
      : "",
  );
  function addName() {
    const value = name.trim().replace(/’/g, "'");
    if (!value) return;
    if (!/^[\p{L}\p{N} _.'-]{1,24}$/u.test(value)) {
      setError("Use up to 24 letters, numbers or spaces for each name.");
      return;
    }
    // Same rule as the game engine, so "Sam" and "Sam." can't both be added.
    if (names.some((n) => normalise(n) === normalise(value))) {
      setError(
        "That name is already added. Use a nickname to tell people apart.",
      );
      return;
    }
    if (names.length >= 12) return;
    setNames([...names, value]);
    setSettings(cleanSettings(stock, settings, Math.max(3, names.length + 1)));
    setAdult(false);
    setName("");
    setError("");
  }
  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const seat = await joinParty(
        endpoint,
        name.trim(),
        screen === "join" ? code.trim().toUpperCase() : undefined,
      );
      if (screen !== "join")
        writeLocal(`party:setup:${seat.code}`, JSON.stringify(settings));
      router.push(`/party/${seat.code}`);
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TypeError"
          ? e.message
          : "Couldn’t reach the party server. Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }
  const a = availability(stock, settings, Math.max(3, names.length));
  if (screen === "play")
    return (
      <OnePhone
        setup={{ names, settings, history }}
        onSetup={(s) => {
          setNames(s.names);
          setSettings(s.settings);
          setHistory(s.history);
          setScreen("setup");
          setNotice("");
        }}
      />
    );
  return (
    <div className={styles.root} data-party-app>
      <header className={styles.header}>
        {screen === "games" ? (
          <Link className={styles.back} href="/" aria-label="Back to portfolio">
            <ArrowLeft size={23} />
          </Link>
        ) : (
          <button
            className={styles.back}
            aria-label="Back to games"
            onClick={() => {
              setScreen("games");
              setError("");
            }}
          >
            <ArrowLeft size={23} />
          </button>
        )}
        <Link href="/party" className={styles.brand}>
          Party
        </Link>
        {screen === "games" ? (
          <button
            className={styles.textButton}
            onClick={() => {
              setScreen("join");
              setName("");
              setError("");
            }}
          >
            Join
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </header>
      {screen === "games" ? (
        <>
          <div className={styles.heading}>
            <h1 className={styles.hero}>What are we playing?</h1>
            <p>Pick a game. Bring at least 3 people.</p>
          </div>
          <GamePicker
            value={settings.game}
            onChange={(game) =>
              setSettings(cleanSettings(stock, { ...settings, game }))
            }
          />
          <div className={styles.homeAction}>
            <Command
              onClick={() => {
                setScreen("setup");
                setError("");
                setName("");
              }}
            >
              Continue
              <ArrowRight size={22} aria-hidden="true" />
            </Command>
          </div>
        </>
      ) : screen === "join" ? (
        <>
          <div className={styles.heading}>
            <h1>Join your friends</h1>
            <p>Enter the code from their screen.</p>
          </div>
          <form onSubmit={connect} className={styles.form}>
            <label>
              Your name
              <input
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={24}
              />
            </label>
            <label>
              Room code
              <input
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                minLength={6}
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.replace(/[^a-z2-9]/gi, "").toUpperCase(),
                  )
                }
                placeholder="ABC234"
                required
              />
            </label>
            <Command disabled={busy || !endpoint}>
              {busy ? "Joining…" : "Join party"}
              <ArrowRight size={22} aria-hidden="true" />
            </Command>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </form>
        </>
      ) : (
        <>
          <div className={styles.heading}>
            <h1>
              {settings.game === "mix"
                ? "Surprise me"
                : games[settings.game].name}
            </h1>
            <p>
              {settings.game === "mix"
                ? "We’ll explain each game when it starts."
                : games[settings.game].instructions}
            </p>
          </div>
          {notice && <p className={styles.notice}>{notice}</p>}
          <h2>How are you playing?</h2>
          <ModePicker
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError("");
              setName("");
            }}
          />
          {mode === "phones" ? (
            <form className={styles.form} onSubmit={connect}>
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
              <p className={styles.small}>
                You’ll play too. Friends join with a code, then you choose the
                topic together.
              </p>
              <Command disabled={busy || !endpoint}>
                {busy ? "Creating…" : "Create room"}
                <ArrowRight size={22} aria-hidden="true" />
              </Command>
              {!endpoint && (
                <p className={styles.notice}>
                  Rooms aren’t available right now. You can play on one phone.
                </p>
              )}
            </form>
          ) : (
            <>
              <div className={styles.actions}>
                <h2 style={{ flex: 1 }}>Who’s playing?</h2>
                {names.length > 0 && (
                  <button
                    type="button"
                    className={styles.textButton}
                    aria-label="New group, clear names and saved rounds"
                    onClick={() => {
                      clearLocal(onePhoneKey);
                      setNames([]);
                      setHistory([]);
                      setAdult(false);
                      setSettings({ ...defaults, game: settings.game });
                      setName("");
                      setNotice("");
                    }}
                  >
                    New group
                  </button>
                )}
              </div>
              <p className={styles.small} style={{ marginTop: 6 }}>
                Add everyone’s name, including yours. 3–12 people.
              </p>
              <form
                className={styles.nameInput}
                style={{ marginTop: 14 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  addName();
                }}
              >
                <input
                  aria-label="Player name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={24}
                  placeholder="Add a name"
                  disabled={names.length >= 12}
                  autoComplete="off"
                />
                <Command
                  aria-label="Add player"
                  disabled={!name.trim() || names.length >= 12}
                >
                  <Plus size={24} aria-hidden="true" />
                </Command>
              </form>
              <div className={styles.nameList}>
                {names.map((n) => (
                  <div className={styles.nameRow} key={n}>
                    <span>{n}</span>
                    <button
                      className={styles.iconButton}
                      aria-label={`Remove ${n}`}
                      onClick={() => {
                        setNames(names.filter((v) => v !== n));
                        setAdult(false);
                      }}
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <SettingsPicker
                settings={settings}
                stock={stock}
                players={Math.max(3, names.length)}
                onChange={(s) => {
                  setSettings(s);
                  setAdult(false);
                }}
                chooseGame={false}
              />
              {settings.rating === "adult" && (
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={adult}
                    onChange={(e) => setAdult(e.target.checked)}
                  />
                  Everyone is 18+ and agrees to adult prompts.
                </label>
              )}
              <div className={styles.footerAction}>
                {a.issue !== "ready" && (
                  <p className={styles.notice}>
                    {availabilityMessage(a.issue)}
                  </p>
                )}
                <Command
                  disabled={
                    names.length < 3 ||
                    (settings.rating === "adult" && !adult) ||
                    a.issue !== "ready"
                  }
                  onClick={() => {
                    setError("");
                    setScreen("play");
                  }}
                >
                  Start game
                  <ArrowRight size={22} aria-hidden="true" />
                </Command>
                {names.length < 3 && (
                  <p className={styles.small}>
                    Add {3 - names.length} more{" "}
                    {names.length === 2 ? "person" : "people"} to start.
                  </p>
                )}
              </div>
            </>
          )}
          {error && (
            <p role="alert" className={styles.error} style={{ marginTop: 12 }}>
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
