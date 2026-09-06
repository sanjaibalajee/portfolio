import { timingSafeEqual } from "node:crypto";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/drizzle";
import { switchSubmissions } from "@/db/schema";
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

/** Shared gate for both handlers; returns a response only when the request is rejected. */
function reject(request: Request) {
  if (!isDatabaseConfigured) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }
  if (!process.env.SWITCH_INGEST_TOKEN) {
    return NextResponse.json({ error: "SWITCH_INGEST_TOKEN is not configured" }, { status: 503 });
  }
  if (!tokenMatches(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Watermark for the sync job: the newest submission already stored. The job
 * pages backwards through LeetCode only until it reaches this, so a routine run
 * reads a single page instead of the whole history.
 */
export async function GET(request: Request) {
  const rejected = reject(request);
  if (rejected) return rejected;

  const [latest] = await db
    .select({ submittedAt: switchSubmissions.submittedAt })
    .from(switchSubmissions)
    .orderBy(desc(switchSubmissions.submittedAt))
    .limit(1);

  return NextResponse.json({
    lastSubmittedAt: latest?.submittedAt.toISOString() ?? null,
    lastSubmittedAtSeconds: latest ? Math.floor(latest.submittedAt.getTime() / 1000) : 0,
  });
}

export async function POST(request: Request) {
  const rejected = reject(request);
  if (rejected) return rejected;

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
