import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { blogLikes } from '@/db/schema'

export async function getBlogLikes(slug: string, visitorHash: string) {
  const [result] = await db.select({
    count: sql<number>`count(*)::integer`,
    liked: sql<boolean>`coalesce(bool_or(${blogLikes.visitorHash} = ${visitorHash}), false)`,
  }).from(blogLikes).where(eq(blogLikes.postSlug, slug))
  return result
}

export async function setBlogLike(slug: string, visitorHash: string, liked: boolean) {
  if (liked) {
    // The primary key makes retries and simultaneous clicks idempotent.
    await db.insert(blogLikes).values({ postSlug: slug, visitorHash }).onConflictDoNothing()
  } else {
    await db.delete(blogLikes).where(and(eq(blogLikes.postSlug, slug), eq(blogLikes.visitorHash, visitorHash)))
  }
  return getBlogLikes(slug, visitorHash)
}
