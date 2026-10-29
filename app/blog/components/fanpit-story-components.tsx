'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import fanpitEventArchive from '@/app/blog/data/fanpit-events.json'
import { buildLog, ORDER_STEPS, ANALYTICS_STEPS } from '@/app/blog/data/outworld-flows'

export interface FanpitEventPoster {
  title: string
  slug: string
  date: string
  visibility: 'public' | 'private'
  brand: string
  venue: string
  city: string
  image: string
}

const monthFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatMonth(date: string) {
  return monthFormatter.format(new Date(`${date}T00:00:00Z`)).toLowerCase()
}

// the shared frame for every block in this post: hairlines, no fill, no shadow.
function Block({
  label,
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <section className="not-prose my-10 border-y border-neutral-200 dark:border-neutral-800">
      {label && (
        <p className="border-b border-neutral-200 py-2.5 text-xs text-neutral-500 dark:border-neutral-800">
          {label}
        </p>
      )}
      {children}
    </section>
  )
}

export function BuildLog() {
  const entries = buildLog

  return (
    <Block label="the log">
      <ol className="m-0 list-none divide-y divide-neutral-200 p-0 dark:divide-neutral-800">
        {entries.map(([stamp, title, detail]) => (
          <li key={`${stamp}-${title}`} className="grid grid-cols-[68px_1fr] gap-4 py-3.5 sm:grid-cols-[84px_1fr]">
            <span className="pt-px text-xs tabular-nums text-neutral-500">{stamp}</span>
            <span>
              <span className="block text-sm text-neutral-900 dark:text-neutral-100">{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-neutral-500">{detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </Block>
  )
}

const WALL_TILES = 24
const WALL_SWAP_MS = 900
const WALL_FADE_MS = 320

function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function PosterImage({
  event,
  visible,
  onReady,
}: {
  event: FanpitEventPoster
  visible: boolean
  onReady?: () => void
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${event.title}, ${event.brand}; poster unavailable`}
        className={`absolute inset-0 flex flex-col justify-end bg-neutral-100 p-3 text-neutral-700 transition-opacity duration-300 dark:bg-neutral-900 dark:text-neutral-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="text-xs leading-snug">{event.title}</span>
        <span className="mt-2 text-[10px] text-neutral-500">{event.brand}</span>
        <span className="mt-1 text-[10px] text-neutral-500">poster unavailable</span>
      </div>
    )
  }

  return (
    <Image
      src={event.image}
      alt={`${event.title}, ${event.brand}`}
      fill
      sizes="(max-width: 639px) calc((100vw - 60px) / 3), 152px"
      loading="lazy"
      decoding="async"
      onLoad={onReady}
      onError={() => {
        setFailed(true)
        onReady?.()
      }}
      className={`object-cover transition-opacity duration-300 group-hover:scale-[1.03] ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )
}

// crossfades to a new poster only once that poster has actually decoded, so a
// tile never blinks to an empty box mid-rotation.
function PosterTile({ event }: { event: FanpitEventPoster }) {
  const [shown, setShown] = useState(event)
  const [incoming, setIncoming] = useState<FanpitEventPoster | null>(null)
  const [loaded, setLoaded] = useState(false)

  // adjusting state during render is the supported way to react to a changed prop;
  // doing it in an effect would cost an extra paint of the old poster.
  if (event.slug !== shown.slug && event.slug !== incoming?.slug) {
    setIncoming(event)
    setLoaded(false)
  }

  useEffect(() => {
    if (!incoming || !loaded) return
    const settle = setTimeout(() => {
      setShown(incoming)
      setIncoming(null)
      setLoaded(false)
    }, WALL_FADE_MS)
    return () => clearTimeout(settle)
  }, [incoming, loaded])

  const face = incoming && loaded ? incoming : shown

  return (
    <div
      className="group relative aspect-[4/5] overflow-hidden bg-neutral-100 dark:bg-neutral-900"
      title={face.title}
    >
      <PosterImage key={shown.slug} event={shown} visible />
      {incoming && (
        <PosterImage
          key={incoming.slug}
          event={incoming}
          visible={loaded}
          onReady={() => setLoaded(true)}
        />
      )}

      <span className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <span className="line-clamp-3 text-[10px] leading-snug text-white">{face.title}</span>
        <span className="mt-1 text-[10px] text-white/60">{face.brand}</span>
      </span>

      {/* events that never had a public page stay unlinked; nothing on the tile says so. */}
      {face.visibility === 'public' && (
        <a
          href={`https://outworld.fanpit.live/events/${encodeURIComponent(face.slug)}`}
          target="_blank"
          rel="noreferrer"
          aria-label={face.title}
          className="absolute inset-0"
        />
      )}
    </div>
  )
}

export function EventWall({
  events = fanpitEventArchive.events as FanpitEventPoster[],
}: { events?: FanpitEventPoster[] } = {}) {
  // one entry per slug, and nothing without a poster to show.
  const catalog = useMemo(() => {
    const seen = new Set<string>()
    return events.filter((event) => {
      if (!event.image || seen.has(event.slug)) return false
      seen.add(event.slug)
      return true
    })
  }, [events])

  const [expanded, setExpanded] = useState(false)
  const [held, setHeld] = useState(false)
  const [hidden, setHidden] = useState(false)
  // first paint has to match the server, so rotation only starts after mount.
  const [tiles, setTiles] = useState(() => catalog.slice(0, WALL_TILES))

  const tilesRef = useRef(tiles)
  const queue = useRef<FanpitEventPoster[]>([])
  const slots = useRef<number[]>([])
  const step = useRef(0)

  const { communities, first, last } = useMemo(() => {
    const dates = catalog.map((event) => event.date).sort()
    return {
      communities: new Set(catalog.map((event) => event.brand)).size,
      first: dates[0],
      last: dates[dates.length - 1],
    }
  }, [catalog])

  // queue holds exactly the posters that are not on the wall right now. every swap
  // takes from its head and returns the outgoing poster to its tail, so the two sets
  // stay disjoint and no poster can appear in two tiles at once.
  useEffect(() => {
    const onWall = new Set(tilesRef.current.map((event) => event.slug))
    queue.current = shuffle(catalog.filter((event) => !onWall.has(event.slug)))
    slots.current = shuffle(tilesRef.current.map((_, index) => index))
    step.current = 0
  }, [catalog])

  useEffect(() => {
    const track = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', track)
    return () => document.removeEventListener('visibilitychange', track)
  }, [])

  useEffect(() => {
    if (expanded || held || hidden) return
    if (catalog.length <= WALL_TILES || !slots.current.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cycle = setInterval(() => {
      const rows = tilesRef.current
      const incoming = queue.current.shift()
      if (!incoming) return

      // belt and braces: never put a poster on the wall that is already up there.
      if (rows.some((row) => row.slug === incoming.slug)) {
        queue.current.push(incoming)
        return
      }

      const slot = slots.current[step.current % slots.current.length]
      step.current += 1
      queue.current.push(rows[slot])

      const updated = rows.map((row, index) => (index === slot ? incoming : row))
      tilesRef.current = updated
      setTiles(updated)
    }, WALL_SWAP_MS)

    return () => clearInterval(cycle)
  }, [catalog, expanded, held, hidden])

  const visible = expanded ? catalog : tiles

  return (
    <Block label="the wall">
      <div className="py-5">
        <h2 className="m-0 text-sm text-neutral-900 dark:text-neutral-100">
          events communities have put on outworld.
        </h2>
        <p className="mb-0 mt-2 text-xs tabular-nums text-neutral-500">
          {catalog.length} events · {communities} communities · {formatMonth(first)} →{' '}
          {formatMonth(last)}
        </p>
      </div>

      <div
        className="grid grid-cols-3 gap-1.5 border-t border-neutral-200 pt-1.5 sm:grid-cols-4 dark:border-neutral-800"
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocusCapture={() => setHeld(true)}
        onBlurCapture={() => setHeld(false)}
      >
        {visible.map((event, index) => (
          <PosterTile key={expanded ? event.slug : index} event={event} />
        ))}
      </div>

      {!expanded && catalog.length > WALL_TILES && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full border-t border-neutral-200 py-3.5 text-xs text-neutral-500 transition-colors hover:text-neutral-900 dark:border-neutral-800 dark:hover:text-neutral-100"
        >
          show all {catalog.length} ↓
        </button>
      )}
    </Block>
  )
}

interface MigrationProps {
  label: string
  before: string
  after: string
  removed: string[]
  added: string[]
  note?: React.ReactNode
}

// a diff, because that is what these migrations actually were.
export function Migration({ label, before, after, removed, added, note }: MigrationProps) {
  return (
    <Block label={label}>
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        <div className="py-4">
          <p className="m-0 text-xs text-neutral-500">
            <span className="mr-2 text-red-500/80">−</span>
            {before}
          </p>
          <ul className="m-0 mt-2.5 list-none space-y-1 p-0">
            {removed.map((item) => (
              <li key={item} className="pl-5 text-sm leading-relaxed text-neutral-500 line-through decoration-neutral-700">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="py-4">
          <p className="m-0 text-xs text-neutral-500">
            <span className="mr-2 text-emerald-500/80">+</span>
            {after}
          </p>
          <ul className="m-0 mt-2.5 list-none space-y-1 p-0">
            {added.map((item) => (
              <li key={item} className="pl-5 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
                {item}
              </li>
            ))}
          </ul>
        </div>
        {note && (
          <p className="m-0 py-4 text-xs leading-relaxed text-neutral-500">{note}</p>
        )}
      </div>
    </Block>
  )
}



export function OrderLifecycle() {
  return (
    <Block label="one order, several failure boundaries">
      <div role="list" className="grid gap-px bg-neutral-200 sm:grid-cols-3 dark:bg-neutral-800">
        {ORDER_STEPS.map(([title, detail], index) => (
          <div role="listitem" key={title} className="min-w-0 bg-white p-4 dark:bg-neutral-950">
            <p className="m-0 text-[10px] tabular-nums text-neutral-400">
              {String(index + 1).padStart(2, '0')}
            </p>
            <p className="mb-0 mt-2 text-sm text-neutral-900 dark:text-neutral-100">{title}</p>
            <p className="mb-0 mt-1.5 text-xs leading-relaxed text-neutral-500">{detail}</p>
          </div>
        ))}
      </div>

      <div className="grid border-t border-neutral-200 sm:grid-cols-2 dark:border-neutral-800">
        <div className="py-4 pr-0 sm:border-r sm:border-neutral-200 sm:pr-5 dark:sm:border-neutral-800">
          <p className="m-0 text-xs text-neutral-900 dark:text-neutral-100">unknown provider result</p>
          <p className="mb-0 mt-1.5 text-xs leading-relaxed text-neutral-500">
            keep the hold, mark the payment order uncertain, then reconcile it with the provider.
          </p>
        </div>
        <div className="border-t border-neutral-200 py-4 sm:border-t-0 sm:pl-5 dark:border-neutral-800">
          <p className="m-0 text-xs text-neutral-900 dark:text-neutral-100">late payment capture</p>
          <p className="mb-0 mt-1.5 text-xs leading-relaxed text-neutral-500">
            reacquire capacity atomically; if that is no longer possible, move to refund.
          </p>
        </div>
      </div>

      <p className="m-0 border-t border-neutral-200 py-3 text-[11px] leading-relaxed text-neutral-500 dark:border-neutral-800">
        unique indexes enforce idempotency at the database boundary. the route, webhook, reconciler and
        worker can all retry without creating a second order or seat.
      </p>
    </Block>
  )
}



export function AnalyticsPipeline() {
  return (
    <Block label="analytics as a read pipeline">
      <ol className="m-0 list-none divide-y divide-neutral-200 p-0 dark:divide-neutral-800">
        {ANALYTICS_STEPS.map(([title, detail], index) => (
          <li key={title} className="grid grid-cols-[28px_88px_1fr] items-baseline gap-3 py-3.5 sm:grid-cols-[36px_108px_1fr]">
            <span className="text-[10px] tabular-nums text-neutral-400">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-xs text-neutral-900 dark:text-neutral-100">{title}</span>
            <span className="text-xs leading-relaxed text-neutral-500">{detail}</span>
          </li>
        ))}
      </ol>
      <div className="grid border-t border-neutral-200 sm:grid-cols-2 dark:border-neutral-800">
        <p className="m-0 py-3 text-[11px] leading-relaxed text-neutral-500 sm:border-r sm:border-neutral-200 sm:pr-5 dark:sm:border-neutral-800">
          a dedicated single-concurrency worker keeps analytical scans away from order-critical jobs.
        </p>
        <p className="m-0 border-t border-neutral-200 py-3 text-[11px] leading-relaxed text-neutral-500 sm:border-t-0 sm:pl-5 dark:border-neutral-800">
          a feature flag switches reads back to the raw table without discarding either data path.
        </p>
      </div>
    </Block>
  )
}

interface Tool {
  name: string
  note: string
  // file in /public/tools; omitted when no usable mark exists for the brand
  mark?: string
}

const TOOL_GROUPS: { group: string; items: Tool[] }[] = [
  {
    group: 'writing the code',
    items: [
      { name: 'zed', note: 'the editor most of this got written in', mark: 'zed' },
      { name: 'cursor', note: 'the other one, for the long refactors', mark: 'cursor' },
      { name: 'claude code', note: 'the agent i actually leave running', mark: 'claude' },
      { name: 'codex', note: 'a second opinion on the same diff', mark: 'codex' },
      { name: 'ghostty', note: 'the terminal all of that lives in', mark: 'ghostty' },
      { name: 'xcode', note: 'the check-in app the door staff hold', mark: 'xcode' },
    ],
  },
  {
    group: 'running it',
    items: [
      {
        name: 'aws',
        note: 'app runner and ec2 first, then ecs, fargate, ecr, lambda, sqs, s3, cloudfront, elasticache, ssm, cloudwatch, iam, etc',
        mark: 'aws',
      },
      { name: 'docker', note: 'one image, three services', mark: 'docker' },
      { name: 'vercel', note: 'the frontend and every preview of it', mark: 'vercel' },
      { name: 'better auth', note: 'sign-in, sessions, and who gets to see what', mark: 'better-auth' },
      { name: 'posthog', note: 'funnels, and what people actually do', mark: 'posthog' },
    ],
  },
  {
    group: 'reaching people',
    items: [
      { name: 'twilio', note: 'whatsapp reminders, five hours before doors', mark: 'twilio' },
      { name: 'sendgrid', note: 'tickets and invoices, by email' },
      { name: 'vertex ai', note: 'the drafting that sits behind bolt', mark: 'vertex' },
    ],
  },
  {
    group: 'everything else',
    items: [
      { name: 'slack', note: 'where the whole team lives', mark: 'slack' },
      { name: 'arc', note: 'the browser i keep going back to', mark: 'arc' },
      { name: 'dia', note: 'the one slowly replacing it' },
    ],
  },
]

// every mark is drawn as a mask filled with the current text colour, so brand
// palettes never fight the page and a missing mark degrades to a monogram.
function ToolMark({ tool }: { tool: Tool }) {
  if (!tool.mark) {
    return (
      <span
        aria-hidden
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border border-neutral-300 text-[9px] leading-none text-neutral-500 dark:border-neutral-700"
      >
        {tool.name[0]}
      </span>
    )
  }

  const source = `url(/tools/${tool.mark}.svg)`
  return (
    <span
      aria-hidden
      className="mt-0.5 block h-4 w-4 shrink-0 bg-neutral-500 transition-colors group-hover:bg-neutral-900 dark:group-hover:bg-neutral-100"
      style={{
        maskImage: source,
        WebkitMaskImage: source,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}

export function ToolShelf() {
  return (
    <Block label="the shelf">
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {TOOL_GROUPS.map(({ group, items }) => (
          <div key={group} className="py-4">
            <p className="m-0 mb-3 text-xs text-neutral-500">{group}</p>
            <ul className="m-0 list-none space-y-2.5 p-0">
              {items.map((tool) => (
                <li key={tool.name} className="group flex items-start gap-3">
                  <ToolMark tool={tool} />
                  <span className="w-24 shrink-0 text-sm leading-snug text-neutral-900 dark:text-neutral-100">
                    {tool.name}
                  </span>
                  <span className="min-w-0 flex-1 text-xs leading-snug text-neutral-500">
                    {tool.note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Block>
  )
}

export function SurfaceRebuild() {
  const surfaces: [string, string, string][] = [
    [
      'organizer dashboard',
      'mar–apr 2026',
      'thousand-line pages split into guest, registration, outreach, analytics and settings workflows',
    ],
    [
      'cohost dashboard',
      'jul 2026',
      'the same tools rebuilt around scoped permissions, shared hooks and explicit loading and failure states',
    ],
    [
      'public surfaces',
      'jun–aug 2026',
      'discovery, brand timelines, galleries, event detail, ticket selection, sharing and search metadata',
    ],
  ]

  return (
    <Block label="three surfaces, rebuilt">
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {surfaces.map(([name, when, detail]) => (
          <div key={name} className="py-4">
            <p className="m-0 flex items-baseline justify-between gap-4 text-sm text-neutral-900 dark:text-neutral-100">
              {name}
              <span className="shrink-0 text-xs text-neutral-500">{when}</span>
            </p>
            <p className="mb-0 mt-1.5 text-xs leading-relaxed text-neutral-500">{detail}</p>
          </div>
        ))}
      </div>
    </Block>
  )
}

interface IncidentProps {
  when: string
  value: string
  label: string
  children: React.ReactNode
}

export function Incident({ when, value, label, children }: IncidentProps) {
  return (
    <aside className="not-prose my-10 border-l-2 border-red-500/60 pl-5">
      <p className="m-0 text-xs text-neutral-500">{when}</p>
      <p className="mb-0 mt-2 text-3xl tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
        {value}
        <span className="ml-3 align-middle text-xs tracking-normal text-neutral-500">{label}</span>
      </p>
      <div className="mt-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{children}</div>
    </aside>
  )
}

export function AmritMoment({
  image,
  compact = false,
  withMusic = false,
}: {
  image: string
  compact?: boolean
  withMusic?: boolean
}) {
  return (
    <figure className="not-prose my-12 border-y border-neutral-200 py-7 dark:border-neutral-800">
      <div className="grid gap-6 sm:grid-cols-[150px_1fr]">
        <a
          href="https://outworld.fanpit.live/events/iBD4S8IS"
          target="_blank"
          rel="noreferrer"
          className="relative block aspect-[4/5] w-24 overflow-hidden bg-neutral-100 [text-decoration:none!important] sm:w-[150px] dark:bg-neutral-900"
        >
          <Image
            src={image}
            alt="poster for amrit ramnath's exclusive unplugged performance"
            fill
            sizes="(max-width: 639px) 96px, 150px"
            loading="lazy"
            decoding="async"
            className="object-cover"
          />
        </a>

        <figcaption className="flex flex-col justify-center">
          <p className="m-0 text-xs tabular-nums text-neutral-500">dec 20, 2025 · chennai</p>
          {compact ? (
            <p className="mb-0 mt-3 text-sm leading-relaxed text-neutral-900 dark:text-neutral-100">
              <span className="block">i was in thailand when i found out</span>
              <span className="block">amrit ramnath&apos;s show was on outworld.</span>
              <span className="block">seeing his name there felt unreal.</span>
            </p>
          ) : (
            <>
              <p className="mb-0 mt-3 text-lg leading-snug tracking-tight text-neutral-900 dark:text-neutral-100">
                i was in thailand when i found out amrit ramnath was running his show on outworld.
              </p>
              <p className="mb-0 mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                i had listened to him before any of this, and so had some of my friends. seeing his name
                on a real event page inside something i wrote, on my phone, from a beach, took a minute
                to process.
              </p>
            </>
          )}
          <a
            href="https://outworld.fanpit.live/events/iBD4S8IS"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block text-xs text-neutral-500 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-900 dark:decoration-neutral-700 dark:hover:text-neutral-100"
          >
            amrit ramnath · an exclusive unplugged performance ↗
          </a>
        </figcaption>
      </div>
      {withMusic && (
        <div className="mt-6" data-amrit-music>
          <iframe
            title="Kaadhal Alaipayuthey by Amrit Ramnath on Spotify"
            src="https://open.spotify.com/embed/track/0gn50It1wJxkhAn7IQe5XS?utm_source=generator&theme=0"
            width="100%"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="block w-full rounded-xl border-0"
          />
          <a
            href="https://open.spotify.com/track/0gn50It1wJxkhAn7IQe5XS"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-neutral-500 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-900 dark:decoration-neutral-700 dark:hover:text-neutral-100"
          >
            open in spotify ↗
          </a>
        </div>
      )}
    </figure>
  )
}
