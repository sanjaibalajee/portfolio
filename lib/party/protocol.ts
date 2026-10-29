import { z } from "zod";
import { games, topics } from "./types";
// Three decimals is sub-pixel on the 800×600 canvas and keeps relay rooms small.
const coordinate = z
  .number()
  .min(0)
  .max(1)
  .transform((n) => Math.round(n * 1000) / 1000);
const point = z.tuple([coordinate, coordinate]);
export const drawingSchema = z
  .array(
    z
      .object({
        color: z.enum(["ink", "red", "blue", "green"]),
        points: z.array(point).min(1).max(180),
      })
      .strict(),
  )
  .max(70)
  .refine(
    (s) => s.reduce((n, x) => n + x.points.length, 0) <= 2000,
    "Drawing is too large.",
  );
export const settingsSchema = z
  .object({
    game: z.enum([
      "mix",
      ...(Object.keys(games) as [
        keyof typeof games,
        ...(keyof typeof games)[],
      ]),
    ]),
    topic: z.enum(topics),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    rating: z.enum(["general", "spicy", "adult"]),
    seconds: z.number().int().min(30).max(180),
    chaos: z.boolean(),
    confidence: z.boolean(),
    lore: z.boolean(),
  })
  .strict();
const base = {
  id: z.string().min(8).max(80),
  roundId: z.string().max(80).optional(),
  phase: z.enum(["answer", "discuss", "vote", "reveal"]).optional(),
  step: z.number().int().min(0).max(5).optional(),
  revision: z.number().int().optional(),
};
export const intentSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("ready"), ready: z.boolean() }).strict(),
  z
    .object({ ...base, type: z.literal("consent"), adult: z.boolean() })
    .strict(),
  z
    .object({ ...base, type: z.literal("settings"), settings: settingsSchema })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("start"),
      settings: settingsSchema.optional(),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("answer"),
      text: z.string().trim().max(160),
      drawing: drawingSchema.optional(),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("vote"),
      option: z.string().max(80),
      boost: z.boolean().default(false),
    })
    .strict(),
  z
    .object({ ...base, type: z.literal("kick"), player: z.string().max(80) })
    .strict(),
  z.object({ ...base, type: z.literal("lock"), locked: z.boolean() }).strict(),
  z
    .object({
      ...base,
      type: z.literal("lore"),
      context: z.string().trim().min(8).max(600),
    })
    .strict(),
  ...(["advance", "skip", "claim-host", "leave", "replay"] as const).map(
    (type) => z.object({ ...base, type: z.literal(type) }).strict(),
  ),
]);
export const joinSchema = z
  .object({
    // iOS types a curly apostrophe by default.
    name: z.preprocess(
      (v) => (typeof v === "string" ? v.replace(/’/g, "'") : v),
      z
        .string()
        .trim()
        .min(1)
        .max(24)
        .regex(/^[\p{L}\p{N} _.'-]+$/u, "Use letters, numbers and spaces."),
    ),
    adult: z.boolean().default(false),
  })
  .strict();
export const normalise = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
