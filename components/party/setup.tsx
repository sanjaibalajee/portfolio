"use client";
import {
  Brain,
  CircleHelp,
  Laugh,
  MessageCircle,
  Pencil,
  ShieldQuestion,
  Shuffle,
  Unplug,
  Check,
  Smartphone,
  Users,
} from "lucide-react";
import { games, type Settings } from "@/lib/party/types";
import {
  cleanSettings,
  playableTopics,
  topicNames,
  type Stock,
} from "@/lib/party/availability";
import styles from "./party.module.css";

export const gameIcons = {
  imposter: ShieldQuestion,
  psych: Laugh,
  bluff: CircleHelp,
  outlier: Unplug,
  who: MessageCircle,
  brain: Brain,
  draw: Pencil,
  mix: Shuffle,
};
export function GamePicker({
  value,
  onChange,
}: {
  value: Settings["game"];
  onChange: (game: Settings["game"]) => void;
}) {
  return (
    <div className={styles.gameGrid} role="group" aria-label="Choose a game">
      {Object.entries(games).map(([id, g]) => {
        const Icon = gameIcons[id as keyof typeof gameIcons];
        return (
          <button
            type="button"
            key={id}
            className={`${styles.gameCard} ${value === id ? styles.selected : ""}`}
            aria-pressed={value === id}
            onClick={() => onChange(id as Settings["game"])}
          >
            <span className={styles.gameCardTop}>
              <Icon size={24} aria-hidden="true" />
              {value === id && <Check size={18} aria-hidden="true" />}
            </span>
            <strong>{g.name}</strong>
            <span>{g.line}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={`${styles.gameCard} ${value === "mix" ? styles.selected : ""}`}
        aria-pressed={value === "mix"}
        onClick={() => onChange("mix")}
      >
        <span className={styles.gameCardTop}>
          <Shuffle size={24} aria-hidden="true" />
          {value === "mix" && <Check size={18} aria-hidden="true" />}
        </span>
        <strong>Surprise me</strong>
        <span>A different game each round. We’ll explain it as you go.</span>
      </button>
    </div>
  );
}
export function ModePicker({
  value,
  onChange,
}: {
  value: "one" | "phones";
  onChange: (v: "one" | "phones") => void;
}) {
  return (
    <div
      className={styles.modes}
      role="group"
      aria-label="How are you playing?"
    >
      {(["one", "phones"] as const).map((id) => {
        const Icon = id === "one" ? Smartphone : Users;
        return (
          <button
            type="button"
            aria-pressed={value === id}
            className={value === id ? styles.selected : ""}
            key={id}
            onClick={() => onChange(id)}
          >
            <Icon size={22} aria-hidden="true" />
            <strong>{id === "one" ? "One phone" : "Everyone’s phone"}</strong>
            <span>
              {id === "one"
                ? "Add names and pass it around"
                : "Invite friends with a room code"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
export function SettingsPicker({
  settings,
  stock,
  players = 3,
  onChange,
  chooseGame = true,
}: {
  settings: Settings;
  stock: Stock[];
  players?: number;
  onChange: (s: Settings) => void;
  chooseGame?: boolean;
}) {
  function change(next: Partial<Settings>) {
    onChange(cleanSettings(stock, { ...settings, ...next }, players));
  }
  const topics = playableTopics(stock, settings, players);
  return (
    <div className={styles.stack}>
      {chooseGame && (
        <>
          <h2>Choose a game</h2>
          <GamePicker
            value={settings.game}
            onChange={(game) => change({ game })}
          />
        </>
      )}
      <div className={styles.settingSection}>
        <h2>Topic</h2>
        <div className={styles.chips} role="group" aria-label="Topic">
          {topics.map((t) => (
            <button
              type="button"
              key={t}
              aria-pressed={settings.topic === t}
              className={settings.topic === t ? styles.selected : ""}
              onClick={() => change({ topic: t, lore: false })}
            >
              {topicNames[t]}
            </button>
          ))}
        </div>
      </div>
      {settings.game === "imposter" && (
        <div className={styles.settingSection}>
          <h2>Word difficulty</h2>
          <div className={styles.chips} role="group" aria-label="Word difficulty">
            {(["Easy", "Tricky", "Devious"] as const).map((label, i) => (
              <button
                type="button"
                key={label}
                aria-pressed={settings.level === i + 1}
                className={settings.level === i + 1 ? styles.selected : ""}
                onClick={() => change({ level: (i + 1) as Settings["level"] })}
              >
                {label}
              </button>
            ))}
          </div>
          <p className={styles.small}>Harder settings mix in more specific words and ideas.</p>
        </div>
      )}
      <label className={styles.adultSwitch}>
        <span>
          <strong>18+ mix</strong>
          <span>Explicit words, sex and hookup humour mixed with regular rounds.</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={settings.rating === "adult"}
          onChange={(e) =>
            change({ rating: e.target.checked ? "adult" : "general" })
          }
        />
      </label>
      {settings.rating === "adult" && (
        <p className={styles.small}>
          Only play with adults who are happy to join. Anyone can skip a round.
        </p>
      )}
    </div>
  );
}
