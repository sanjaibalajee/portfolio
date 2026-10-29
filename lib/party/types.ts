export const games = {
  imposter: {
    name: "Imposter",
    icon: "◈",
    line: "Everyone sees a word except one person. Find the imposter.",
    instructions:
      "Everyone sees the same secret word except the imposter. Take turns giving a clue, then vote for the imposter.",
    min: 3,
  },
  psych: {
    name: "Psych",
    icon: "✳",
    line: "Write a funny answer. Vote for the one that makes you laugh.",
    instructions:
      "Write the funniest answer. Answers appear anonymously. Vote for your favourite; every vote earns its author 1 point.",
    min: 3,
  },
  bluff: {
    name: "Bluff",
    icon: "?",
    line: "Make up a believable lie, then try to pick the real answer.",
    instructions:
      "Invent a believable answer. Pick the real one for 2 points; fool a friend for 1. Matching the truth earns 2 points.",
    min: 3,
  },
  outlier: {
    name: "Wrong Question",
    icon: "≠",
    line: "One person gets a different question. Spot whose answer is off.",
    instructions:
      "One person gets a different question. Answer yours, compare the answers, then vote for the odd one out.",
    min: 3,
  },
  who: {
    name: "Who Said That?",
    icon: "“",
    line: "Answer a question in secret. Guess which friend wrote it.",
    instructions:
      "Answer honestly. One answer is picked anonymously. Guess who wrote it for 2 points. Its author sits out the vote.",
    min: 3,
  },
  brain: {
    name: "Same Brain",
    icon: "↔",
    line: "Answer in a word or two. Match a friend to score.",
    instructions:
      "Answer in one or two words. Match someone else to earn 2 points each. Spelling is normalised; synonyms stay different.",
    min: 3,
  },
  draw: {
    name: "Drawing Relay",
    icon: "⌁",
    line: "Draw, pass, and guess. See how far the original idea changes.",
    instructions:
      "Draw your prompt, then caption someone else’s drawing. The chain keeps moving; reveal it together at the end. This one is unscored.",
    min: 3,
  },
} as const;
export type Game = keyof typeof games;
export type Rating = "general" | "spicy" | "adult";
export type Phase = "answer" | "discuss" | "vote" | "reveal";
export interface Settings {
  game: Game | "mix";
  topic: string;
  level: 1 | 2 | 3;
  rating: Rating;
  seconds: number;
  chaos: boolean;
  confidence: boolean;
  lore: boolean;
}
export const defaults: Settings = {
  game: "imposter",
  topic: "all",
  level: 3,
  rating: "general",
  seconds: 60,
  chaos: false,
  confidence: false,
  lore: false,
};
export const topics = [
  "all",
  "everyday",
  "food",
  "internet",
  "screen",
  "travel",
  "relationships",
  "after-hours",
  "group-lore",
] as const;
export interface Card {
  id: string;
  family: string;
  concepts: string[];
  game: Game;
  topic: string;
  level: number;
  rating: Rating;
  prompt: string;
  secret?: string;
  other?: string;
  hint?: string;
  source?: string;
  origin?: string;
}
export interface Stroke {
  color: string;
  points: [number, number][];
}
export interface Answer {
  text: string;
  drawing?: Stroke[];
}
export interface Player {
  id: string;
  credentialHash: string;
  name: string;
  ready: boolean;
  adult: boolean;
  connected: boolean;
  lastSeen: number;
  score: number;
  confidence: number;
  roles: number;
  removed?: boolean;
}
export interface Option {
  id: string;
  text: string;
  authors: string[];
  correct?: boolean;
}
export interface Chain {
  owner: string;
  prompt: string;
  steps: (Answer & { author: string })[];
}
export interface Round {
  id: string;
  number: number;
  game: Game;
  phase: Phase;
  card: Card;
  settings: Settings;
  participants: string[];
  imposter?: string;
  target?: string;
  prompt: string;
  answers: Record<string, Answer>;
  votes: Record<string, { option: string; boost: boolean }>;
  options: Option[];
  vetoes: string[];
  endsAt: number;
  delta: Record<string, number>;
  reason?: string;
  chains: Chain[];
  step: number;
  maxSteps: number;
}
export interface Room {
  version: 1;
  code: string;
  revision: number;
  createdAt: number;
  expiresAt: number;
  host: string;
  // Secret for the read-only display link. Rooms saved before it existed have none.
  displayKey?: string;
  locked: boolean;
  settings: Settings;
  players: Player[];
  round?: Round;
  roundsPlayed: number;
  history: string[];
  receipts: Record<string, string[]>;
  recap: {
    game: Game;
    number: number;
    headline: string;
    delta: Record<string, number>;
  }[];
  exhausted: boolean;
  custom: Card[];
  generation: {
    count: number;
    status: string;
    pending?: number;
    lastAt?: number;
  };
  lastGame?: Game;
}
export interface PublicPlayer {
  id: string;
  name: string;
  ready: boolean;
  adult: boolean;
  connected: boolean;
  score: number;
}
export interface RoundView {
  id: string;
  number: number;
  game: Game;
  phase: Phase;
  prompt: string;
  endsAt: number;
  participants: string[];
  submitted: number;
  required: number;
  voted: number;
  vetoes: number;
  options: { id: string; text: string; disabled?: boolean }[];
  answers?: { player: string; text: string }[];
  reveal?: {
    secret?: string;
    other?: string;
    imposter?: string;
    target?: string;
    options: Option[];
    votes: Round["votes"];
    delta: Round["delta"];
    reason?: string;
    source?: string;
    chains: Chain[];
    // Chains were already sent on this socket; reuse the previous copy.
    cached?: boolean;
  };
  step: number;
  maxSteps: number;
  chaos: boolean;
  confidence: boolean;
}
export interface RoomView {
  stock: import("./availability").Stock[];
  adultHidden?: boolean;
  code: string;
  revision: number;
  serverNow: number;
  expiresAt: number;
  host: string;
  displayKey?: string;
  locked: boolean;
  settings: Settings;
  players: PublicPlayer[];
  round?: RoundView;
  roundsPlayed: number;
  exhausted: boolean;
  remaining: number;
  generation: { count: number; status: string };
  recap: Room["recap"];
  me?: {
    id: string;
    participating: boolean;
    privatePrompt?: string;
    role?: string;
    submitted: boolean;
    voted: boolean;
    answer?: Answer;
    drawingTask?: Answer;
    confidence: number;
  };
}
export interface Envelope {
  id: string;
  roundId?: string;
  phase?: Phase;
  step?: number;
  revision?: number;
  type: string;
  [key: string]: unknown;
}
export type ServerMessage =
  | { type: "state"; state: RoomView }
  | { type: "ack"; id: string }
  | { type: "error"; id?: string; error: string };
