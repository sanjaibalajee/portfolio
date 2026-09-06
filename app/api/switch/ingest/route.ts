import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db/drizzle";
import { ingestSchema, ingestSolutions } from "@/lib/switch/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function tokenMatches(header: string | null) {
  const expected = process.env.SWITCH_INGEST_TOKEN;
  if (!expected || !header?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice(7));
  const target = Buffer.from(expected);
  // Compare against a fixed length so the check does not leak the token length.
  return provided.length === target.length && timingSafeEqual(provided, target);
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }
  if (!process.env.SWITCH_INGEST_TOKEN) {
    return NextResponse.json({ error: "SWITCH_INGEST_TOKEN is not configured" }, { status: 503 });
  }
  if (!tokenMatches(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = ingestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await ingestSolutions(parsed.data));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingest failed" },
      { status: 500 },
    );
  }
}
