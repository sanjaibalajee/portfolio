import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const likeCookie = 'blog-reader'

export function sameOrigin(origin: string | null, protocol: string, host: string | null) {
  if (!origin || !host) return false
  try { return origin === new URL(`${protocol}//${host}`).origin }
  catch { return false }
}

export function likeIdentity(cookie: string | undefined, secret: string) {
  const sign = (id: string) => createHmac('sha256', secret).update(`blog-like:${id}`).digest('hex')
  if (cookie && /^[a-f0-9]{32}\.[a-f0-9]{64}$/.test(cookie)) {
    const [id, signature] = cookie.split('.')
    if (timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(id), 'hex'))) {
      return { cookie, visitorHash: signature, fresh: false }
    }
  }
  const id = randomBytes(16).toString('hex')
  const visitorHash = sign(id)
  return { cookie: `${id}.${visitorHash}`, visitorHash, fresh: true }
}
