import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db, isDatabaseConfigured } from "@/db/drizzle";
import { switchNotes, switchProblems } from "@/db/schema";

export const dynamic = "force-dynamic";

const noteSchema = z.object({ body: z.string().max(20_000) });

async function guard(slug: string) {
  if (!isDatabaseConfigured) {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [problem] = await db
    .select({ slug: switchProblems.slug })
    .from(switchProblems)
    .where(eq(switchProblems.slug, slug))
    .limit(1);
  if (!problem) return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  return null;
}

export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const blocked = await guard(slug);
  if (blocked) return blocked;

  const parsed = noteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid note" }, { status: 400 });

  const body = parsed.data.body.trim();
  if (!body) {
    await db.delete(switchNotes).where(eq(switchNotes.problemSlug, slug));
    return NextResponse.json({ note: null });
  }

  const [note] = await db
    .insert(switchNotes)
    .values({ problemSlug: slug, body })
    .onConflictDoUpdate({
      target: switchNotes.problemSlug,
      set: { body, updatedAt: new Date() },
    })
    .returning();

  return NextResponse.json({
    note: { body: note.body, updatedAt: note.updatedAt.toISOString() },
  });
}
