"use client"

import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react"

import styles from "./player.module.css"

type TrackInput = {
  title: string
  artist: string
  previewUrl?: string
  artworkUrl?: string
}

type ResolvedTrack = TrackInput & {
  id: string
  album?: string
  duration: number
}

type ItunesResult = {
  trackId: number
  trackName: string
  artistName: string
  collectionName?: string
  previewUrl?: string
  artworkUrl100?: string
  trackTimeMillis?: number
}

const FALLBACK_DURATION = 30
const BAD_MATCH = /karaoke|tribute|cover|instrumental|as made famous|originally performed/i

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00"

  const safeSeconds = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(
    safeSeconds % 60,
  ).padStart(2, "0")}`
}

function pickBestMatch(results: ItunesResult[], wanted: TrackInput) {
  const wantedTitle = wanted.title.toLowerCase()
  const wantedArtist = wanted.artist.toLowerCase()

  return results
    .filter(
      (result) =>
        result.previewUrl &&
        !BAD_MATCH.test(
          `${result.trackName} ${result.artistName} ${result.collectionName ?? ""}`,
        ),
    )
    .sort((first, second) => {
      const score = (result: ItunesResult) => {
        const title = result.trackName.toLowerCase()
        const artist = result.artistName.toLowerCase()
        let value = 0

        if (artist.includes(wantedArtist) || wantedArtist.includes(artist)) value += 6
        if (title === wantedTitle) value += 6
        else if (title.startsWith(wantedTitle)) value += 3
        else if (title.includes(wantedTitle)) value += 1
        if (/\b(live|remix|re-recorded|karaoke|edit)\b/i.test(title)) value -= 3

        return value
      }

      return score(second) - score(first)
    })[0]
}

async function resolveTrack(track: TrackInput, index: number, signal: AbortSignal) {
  if (track.previewUrl) {
    return {
      ...track,
      id: `custom-${index}`,
      duration: FALLBACK_DURATION,
    }
  }

  const query = encodeURIComponent(`${track.artist} ${track.title}`)
  const response = await fetch(
    `https://itunes.apple.com/search?term=${query}&entity=song&limit=10&country=US`,
    { signal },
  )

  if (!response.ok) throw new Error(`Apple Music lookup failed (${response.status})`)

  const data = (await response.json()) as { results?: ItunesResult[] }
  const match = pickBestMatch(data.results ?? [], track)

  if (!match) {
    return {
      ...track,
      id: `unresolved-${index}`,
      duration: FALLBACK_DURATION,
    }
  }

  return {
    title: track.title,
    artist: track.artist,
    album: match.collectionName,
    previewUrl: match.previewUrl,
    artworkUrl: match.artworkUrl100?.replace("100x100bb", "600x600bb"),
    id: `itunes-${match.trackId}`,
    duration: Math.min(
      FALLBACK_DURATION,
      Math.round((match.trackTimeMillis ?? FALLBACK_DURATION * 1000) / 1000),
    ),
  }
}

function Bars({ playing }: { playing: boolean }) {
  return (
    <span
      className={`${styles.bars} ${playing ? styles.barsPlaying : ""}`}
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
    </span>
  )
}

export function Player({ tracks: trackInputs }: { tracks: TrackInput[] }) {
  const initialTracks = useMemo<ResolvedTrack[]>(
    () =>
      trackInputs.map((track, index) => ({
        ...track,
        id: `pending-${index}`,
        duration: FALLBACK_DURATION,
      })),
    [trackInputs],
  )
  const [tracks, setTracks] = useState(initialTracks)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(FALLBACK_DURATION)
  const [volume, setVolume] = useState(0.75)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [libraryState, setLibraryState] = useState<"loading" | "ready" | "offline">(
    "loading",
  )
  const audioRef = useRef<HTMLAudioElement>(null)
  const playAfterSelectionRef = useRef(false)

  const currentTrack = tracks[currentIndex] ?? initialTracks[0]
  const playable = Boolean(currentTrack?.previewUrl)
  const progress = Math.min(currentTime / Math.max(duration, 1), 1) * 100

  useEffect(() => {
    const controller = new AbortController()

    Promise.all(
      trackInputs.map((track, index) =>
        resolveTrack(track, index, controller.signal).catch(() => initialTracks[index]),
      ),
    ).then((resolvedTracks) => {
      if (controller.signal.aborted) return

      setTracks(resolvedTracks)
      setLibraryState(
        resolvedTracks.some((track) => track.previewUrl) ? "ready" : "offline",
      )
    })

    return () => controller.abort()
  }, [initialTracks, trackInputs])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    audio.currentTime = 0
    audio.load()
    setCurrentTime(0)
    setDuration(currentTrack?.duration ?? FALLBACK_DURATION)
    setIsPlaying(false)

    if (playAfterSelectionRef.current && currentTrack?.previewUrl) {
      void audio.play().catch(() => setIsPlaying(false))
    }
    playAfterSelectionRef.current = false
  }, [currentIndex, currentTrack?.duration, currentTrack?.previewUrl])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const selectTrack = useCallback(
    (index: number, play = true) => {
      const nextIndex = (index + tracks.length) % tracks.length
      playAfterSelectionRef.current = play

      if (nextIndex === currentIndex) {
        const audio = audioRef.current
        if (!audio || !tracks[nextIndex]?.previewUrl) return
        audio.currentTime = 0
        void audio.play().catch(() => setIsPlaying(false))
        playAfterSelectionRef.current = false
        return
      }

      setCurrentIndex(nextIndex)
    },
    [currentIndex, tracks],
  )

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack?.previewUrl) return

    if (audio.paused) {
      setIsBuffering(true)
      void audio.play().catch(() => {
        setIsPlaying(false)
        setIsBuffering(false)
      })
    } else {
      audio.pause()
    }
  }, [currentTrack?.previewUrl])

  const handlePlayerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return

    if (event.code === "Space") {
      event.preventDefault()
      togglePlayback()
    }
    if (event.key === "ArrowRight") selectTrack(currentIndex + 1, isPlaying)
    if (event.key === "ArrowLeft") selectTrack(currentIndex - 1, isPlaying)
  }

  const seek = (value: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = value
    setCurrentTime(value)
  }

  const state = isBuffering
    ? "buffering"
    : isPlaying
      ? "now playing"
      : currentTime > 0
        ? "paused"
        : "up next"

  return (
    <section
      aria-label="Music player"
      tabIndex={0}
      onKeyDown={handlePlayerKeyDown}
      className="border-t border-neutral-800 outline-none focus-visible:border-neutral-500"
    >
      {/* Now playing. The hairline at the bottom edge of this block doubles as
          the seek bar, so the player needs no chrome of its own. */}
      <div className="relative pt-8 pb-7">
        <div className="flex items-start gap-5">
          <div className="relative size-28 shrink-0 border border-neutral-800 sm:size-36">
            {currentTrack?.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- resolved client-side from the iTunes search API
              <img
                src={currentTrack.artworkUrl}
                alt={`${currentTrack.title} cover art`}
                className={`size-full object-cover transition duration-700 ${
                  isPlaying ? "opacity-100 grayscale-0" : "opacity-60 grayscale"
                }`}
              />
            ) : (
              <div className="grid size-full place-items-center text-sm text-neutral-700">
                {currentTrack?.title.slice(0, 2).toLowerCase()}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <p className="flex items-center gap-2 text-[10px] text-neutral-600" aria-live="polite">
              {state}
              <span className="text-neutral-700">
                · {String(currentIndex + 1).padStart(2, "0")}/
                {String(tracks.length).padStart(2, "0")}
              </span>
            </p>
            <h2 className="mt-2.5 truncate text-xl font-semibold tracking-tight text-neutral-100 sm:text-2xl">
              {currentTrack?.title ?? "nothing queued"}
            </h2>
            <p className="mt-1.5 truncate text-sm text-neutral-400">
              {currentTrack?.artist ?? "—"}
            </p>
            <p className="mt-1 truncate text-xs text-neutral-600">
              {currentTrack?.album ??
                (libraryState === "loading" ? "matching on apple music…" : "no preview")}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-1">
          <button
            type="button"
            onClick={() => selectTrack(currentIndex - 1, isPlaying)}
            aria-label="Previous track"
            className="grid size-9 place-items-center text-neutral-500 transition-colors hover:text-neutral-100 focus-visible:text-neutral-100 focus-visible:outline focus-visible:outline-neutral-600"
          >
            <SkipBack className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={togglePlayback}
            disabled={!playable}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="grid size-9 place-items-center bg-neutral-100 text-neutral-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600"
          >
            {isPlaying ? (
              <Pause className="size-3.5 fill-current" aria-hidden="true" />
            ) : (
              <Play className="size-3.5 fill-current" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => selectTrack(currentIndex + 1, isPlaying)}
            aria-label="Next track"
            className="grid size-9 place-items-center text-neutral-500 transition-colors hover:text-neutral-100 focus-visible:text-neutral-100 focus-visible:outline focus-visible:outline-neutral-600"
          >
            <SkipForward className="size-3.5" aria-hidden="true" />
          </button>

          <p className="ml-3 text-[11px] text-neutral-500 tabular-nums">
            {formatTime(currentTime)}
            <span className="text-neutral-700"> / {formatTime(duration)}</span>
          </p>

          <div className="ml-auto hidden items-center gap-2.5 sm:flex">
            <Volume2 className="size-3 text-neutral-600" aria-hidden="true" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-label="Volume"
              className={styles.volume}
              style={{ "--progress": `${volume * 100}%` } as CSSProperties}
            />
          </div>
        </div>

        {/* The block's bottom hairline is the progress track. */}
        <div className="absolute inset-x-0 bottom-0 h-4 translate-y-1/2">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-neutral-800" />
          <div
            className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-neutral-100 transition-[width] duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max={Math.max(duration, 1)}
            step="0.1"
            value={Math.min(currentTime, duration)}
            onChange={(event) => seek(Number(event.target.value))}
            disabled={!playable}
            aria-label="Track position"
            className={styles.seek}
          />
        </div>
      </div>

      <div className="pt-7">
        <h3 className="text-sm text-neutral-300">rotation</h3>

        <div className="mt-4 divide-y divide-neutral-900 border-y border-neutral-800">
          {tracks.map((track, index) => {
            const isActive = index === currentIndex

            return (
              <button
                type="button"
                key={track.id}
                onClick={() => selectTrack(index)}
                aria-current={isActive ? "true" : undefined}
                data-active={isActive}
                className="group grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3.5 py-2.5 text-left transition-colors hover:bg-neutral-900/40 focus-visible:bg-neutral-900/40 focus-visible:outline-none data-[active=true]:bg-neutral-900/40"
              >
                <span className="relative block size-9 border border-neutral-800">
                  {track.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- resolved client-side from the iTunes search API
                    <img
                      src={track.artworkUrl}
                      alt=""
                      className={`size-full object-cover transition duration-500 ${
                        isActive && isPlaying
                          ? "opacity-100 grayscale-0"
                          : "opacity-50 grayscale group-hover:opacity-80"
                      }`}
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-[10px] text-neutral-700 tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                  {track.previewUrl && !(isActive && isPlaying) && (
                    <span className="absolute inset-0 grid place-items-center bg-neutral-950/55 opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="size-3 fill-neutral-100 text-neutral-100" aria-hidden="true" />
                    </span>
                  )}
                </span>

                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-neutral-300 transition-colors group-hover:text-neutral-100 group-data-[active=true]:text-neutral-50">
                    {track.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-neutral-600">
                    {track.artist}
                  </span>
                </span>

                <span className="pr-0.5 text-[10px] text-neutral-600">
                  {isActive ? (
                    <Bars playing={isPlaying} />
                  ) : !track.previewUrl && libraryState !== "loading" ? (
                    "no preview"
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>

        <p className="mt-3 flex items-center justify-end gap-2 text-[10px] text-neutral-600">
          <span className="border border-neutral-800 px-1.5 py-0.5 text-neutral-400">space</span>
          play/pause
          <span className="border border-neutral-800 px-1.5 py-0.5 text-neutral-400">← →</span>
          change track
        </p>
      </div>

      <audio
        ref={audioRef}
        src={currentTrack?.previewUrl}
        preload="metadata"
        className="hidden"
        onLoadStart={() => currentTrack?.previewUrl && setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => {
          setIsPlaying(true)
          setIsBuffering(false)
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const mediaDuration = event.currentTarget.duration
          setDuration(Number.isFinite(mediaDuration) ? mediaDuration : currentTrack.duration)
        }}
        onEnded={() => selectTrack(currentIndex + 1)}
      />
    </section>
  )
}
