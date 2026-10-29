import { games, type Game, type Rating, type Settings } from "./types";

// Counts only. This is safe to send to a lobby without exposing future prompts.
export interface Stock {
  game: Game;
  topic: string;
  rating: Rating;
  level: number;
  total: number;
  fresh: number;
}
export const topicNames: Record<string, string> = {
  all: "Anything",
  everyday: "Everyday",
  food: "Food",
  internet: "Internet",
  screen: "Movies & TV",
  travel: "Travel",
  relationships: "Relationships",
  "after-hours": "After hours",
  "group-lore": "Group Lore",
};
const ranks = { general: 0, spicy: 1, adult: 2 };
export function hasContentStock(value: unknown): value is Stock[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        row !== null &&
        typeof row === "object" &&
        Object.keys(games).includes(row.game) &&
        typeof row.topic === "string" &&
        Object.keys(ranks).includes(row.rating) &&
        Number.isInteger(row.level) &&
        row.level >= 1 &&
        row.level <= 3 &&
        Number.isInteger(row.total) &&
        row.total >= 0 &&
        Number.isInteger(row.fresh) &&
        row.fresh >= 0 &&
        row.fresh <= row.total,
    )
  );
}
export function stockFor(
  stock: Stock[] | null | undefined,
  settings: Settings,
  topic = settings.topic,
) {
  return (hasContentStock(stock) ? stock : []).filter(
    (c) =>
      (settings.game === "mix" || c.game === settings.game) &&
      ranks[c.rating] <= ranks[settings.rating] &&
      c.level <= settings.level &&
      (topic === "all" ||
        c.topic === topic ||
        (settings.lore && c.topic === "group-lore")),
  );
}
export function availability(
  stock: Stock[] | null | undefined,
  settings: Settings,
  players = 3,
) {
  if (!hasContentStock(stock))
    return { total: 0, fresh: 0, issue: "unavailable" as const };
  const matched = stockFor(stock, settings);
  const count = (key: "total" | "fresh") => {
    const byGame = new Map<Game, number>();
    for (const c of matched)
      byGame.set(c.game, (byGame.get(c.game) || 0) + c[key]);
    return [...byGame].reduce(
      (n, [g, size]) => n + (g === "draw" && size < players ? 0 : size),
      0,
    );
  };
  const total = count("total");
  const fresh = count("fresh");
  return {
    total,
    fresh,
    issue: fresh
      ? ("ready" as const)
      : total
        ? ("exhausted" as const)
        : matched.some((c) => c.total > 0)
          ? ("short" as const)
          : ("empty" as const),
  };
}
export function playableTopics(
  stock: Stock[],
  settings: Settings,
  players = 3,
) {
  return Object.keys(topicNames).filter(
    (topic) =>
      availability(stock, { ...settings, topic, lore: false }, players).total >
      0,
  );
}
export function cleanSettings(
  stock: Stock[],
  settings: Settings,
  players = 3,
): Settings {
  // A game/audience change may invalidate a topic. Keep the audience and history intact.
  return availability(stock, settings, players).total
    ? settings
    : { ...settings, topic: "all" };
}
export function availabilityMessage(
  issue: ReturnType<typeof availability>["issue"],
) {
  return issue === "unavailable"
    ? "Game data is loading. Reconnect if this continues."
    : issue === "empty"
      ? "No cards match this topic yet. Choose another topic."
      : issue === "short"
        ? "This topic needs more drawing prompts for your group. Choose Anything."
        : issue === "exhausted"
          ? "You’ve played the matching cards. Change topic or allow repeats."
          : "";
}
