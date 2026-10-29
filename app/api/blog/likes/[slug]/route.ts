import { NextRequest, NextResponse } from 'next/server'
import { posts } from '@/lib/blog'
import { isDatabaseConfigured } from '@/db/drizzle'
import { likeCookie, likeIdentity, sameOrigin } from '@/lib/blog-like-identity'
import { getBlogLikes, setBlogLike } from '@/lib/blog-likes'

export const dynamic = 'force-dynamic'

const respond = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })

async function readBody(request: Request) {
  const reader = request.body?.getReader()
  if (!reader) return ''
  let bytes = 0
  let text = ''
  const decoder = new TextDecoder()
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) return text + decoder.decode()
    bytes += chunk.value.byteLength
    if (bytes > 128) { await reader.cancel(); return null }
    text += decoder.decode(chunk.value, { stream: true })
  }
}

async function handle(request: NextRequest, context: { params: Promise<{ slug: string }> }, write: boolean) {
  const { slug } = await context.params
  if (!posts.some(post => post.slug === slug)) return respond({ error: 'Post not found' }, 404)
  const secret = process.env.AUTH_SECRET
  if (!isDatabaseConfigured || !secret) return respond({ error: 'Likes are temporarily unavailable' }, 503)
  let liked = false
  if (write) {
    // NextURL normalizes 127.0.0.1 to localhost. Compare against the actual Host.
    if (!sameOrigin(request.headers.get('origin'), request.nextUrl.protocol, request.headers.get('host')) || request.headers.get('sec-fetch-site') === 'cross-site') return respond({ error: 'Invalid origin' }, 403)
    if (!request.headers.get('content-type')?.startsWith('application/json')) return respond({ error: 'JSON required' }, 415)
    const text = await readBody(request)
    if (text === null) return respond({ error: 'Request too large' }, 413)
    try {
      const body: unknown = JSON.parse(text)
      if (!body || typeof body !== 'object' || !('liked' in body) || typeof body.liked !== 'boolean' || Object.keys(body).length !== 1) return respond({ error: 'Expected a liked boolean' }, 400)
      liked = body.liked
    } catch { return respond({ error: 'Invalid JSON' }, 400) }
  }
  const identity = likeIdentity(request.cookies.get(likeCookie)?.value, secret)
  // A read establishes the browser identity before writes, including first visits.
  if (write && identity.fresh) return respond({ error: 'Refresh likes before trying again' }, 409)
  try {
    const data = write ? await setBlogLike(slug, identity.visitorHash, liked) : await getBlogLikes(slug, identity.visitorHash)
    const response = respond(data)
    if (identity.fresh) response.cookies.set(likeCookie, identity.cookie, { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'lax', path: '/api/blog/likes', maxAge: 60 * 60 * 24 * 365 })
    return response
  } catch {
    // Do not return database connection details to an anonymous client.
    return respond({ error: 'Likes are temporarily unavailable' }, 503)
  }
}

export function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) { return handle(request, context, false) }
export function PUT(request: NextRequest, context: { params: Promise<{ slug: string }> }) { return handle(request, context, true) }
