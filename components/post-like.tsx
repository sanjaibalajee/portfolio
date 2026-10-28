'use client'

import { Heart } from 'lucide-react'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

type Likes = { count: number; liked: boolean }
type LikeState = { data: Likes | null; pending: boolean; error: string; load: () => Promise<void>; toggle: () => Promise<void> }
const PostLikeContext = createContext<LikeState | null>(null)

export function PostLikeProvider({ slugs, children }: { slugs: string[]; children: ReactNode }) {
  const pathname = usePathname()
  const slug = slugs.find(slug => pathname === `/blog/${slug}`)
  return slug ? <PostLikeState key={slug} slug={slug}>{children}</PostLikeState> : children
}

async function readLikes(endpoint: string, signal?: AbortSignal): Promise<Likes> {
  const response = await fetch(endpoint, { cache: 'no-store', signal })
  if (!response.ok) throw new Error('Unavailable')
  return response.json()
}

function PostLikeState({ slug, children }: { slug: string; children: ReactNode }) {
  const [data, setData] = useState<Likes | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const endpoint = `/api/blog/likes/${slug}`
  async function load() {
    try {
      setData(await readLikes(endpoint))
      setError('')
    } catch { setError('likes are unavailable right now.') }
  }
  useEffect(() => {
    const controller = new AbortController()
    readLikes(endpoint, controller.signal)
      .then(value => { if (!controller.signal.aborted) setData(value) })
      .catch(() => { if (!controller.signal.aborted) setError('likes are unavailable right now.') })
    return () => controller.abort()
  }, [endpoint])

  async function toggle() {
    if (!data || pending) return
    const previous = data
    const liked = !data.liked
    setPending(true)
    setError('')
    setData({ liked, count: Math.max(0, data.count + (liked ? 1 : -1)) })
    try {
      const response = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ liked }) })
      if (!response.ok) throw new Error('Unavailable')
      setData(await response.json())
    } catch {
      setData(previous)
      setError('couldn’t save that. try again.')
    } finally { setPending(false) }
  }

  return <PostLikeContext value={{ data, pending, error, load, toggle }}>{children}</PostLikeContext>
}

export function PostLike({ compact = false }: { compact?: boolean }) {
  const state = useContext(PostLikeContext)
  if (!state) return null
  const { data, pending, error, load, toggle } = state
  const retry = !data && !!error
  return <div data-post-like={compact ? 'top' : 'bottom'} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
    <button type="button" onClick={retry ? load : toggle} title={error || (data?.liked ? 'Unlike this post' : 'Like this post')} aria-label={retry ? 'Retry loading likes' : data?.liked ? 'Unlike this post' : 'Like this post'} aria-pressed={data?.liked ?? false} disabled={(!data && !error) || pending} className={`inline-flex shrink-0 items-center rounded-full border border-neutral-300 text-neutral-600 transition-colors hover:border-neutral-500 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60 aria-pressed:text-rose-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-100 dark:aria-pressed:text-rose-400 ${compact ? 'min-h-9 min-w-11 justify-center gap-1.5 px-2.5' : 'min-h-11 gap-2 px-4'}`}>
      <Heart size={compact ? 13 : 15} aria-hidden="true" fill={data?.liked ? 'currentColor' : 'none'} />
      <span>{compact ? data?.count ?? (error ? 'retry' : '…') : data ? `${data.count} ${data.count === 1 ? 'like' : 'likes'}` : error ? 'likes unavailable · retry' : 'loading likes…'}</span>
    </button>
    {!compact && <span className="text-neutral-500 dark:text-neutral-400" role="status">{error || (data?.liked ? 'thank you for reading.' : 'enjoyed this? leave a little heart.')}</span>}
  </div>
}
