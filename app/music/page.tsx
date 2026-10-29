import { pageMetadata } from '@/lib/site'

import { Footer } from "@/components/footer"
import { Player } from "./player"
import musicData from "./music-data.json"

export const metadata = pageMetadata('/music', 'music', 'a small collection of music that keeps me moving.')

export default function Music() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col">
      <div className="flex-grow">
        <section>
          <h1 className="mb-8 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            music
          </h1>
          <p className="mb-10 leading-relaxed text-neutral-700 dark:text-neutral-300">
            I need music in the background to get anything done. Here are a few
            records currently in rotation.
          </p>

          <Player tracks={musicData.vinylTracks} />

          <div className="mt-12">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-sm text-neutral-700 dark:text-neutral-300">artists on repeat</h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {musicData.favoriteArtists.length}
              </p>
            </div>
            <div className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-900 border-y border-neutral-200 dark:border-neutral-800">
              {musicData.favoriteArtists.map((artist) => (
                <div
                  key={artist.name}
                  className="flex items-baseline justify-between gap-6 py-3"
                >
                  <span className="text-[13px] text-neutral-800 dark:text-neutral-200">{artist.name}</span>
                  <span className="min-w-0 truncate text-right text-[11px] text-neutral-600 dark:text-neutral-400">
                    {artist.songs}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-sm text-neutral-700 dark:text-neutral-300">playlists</h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">apple music</p>
            </div>
            <div className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-900 border-y border-neutral-200 dark:border-neutral-800">
              {musicData.playlists.map((playlist) => (
                <a
                  key={playlist.name}
                  href={playlist.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-baseline justify-between gap-6 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900/40"
                >
                  <span className="text-[13px] text-neutral-700 dark:text-neutral-300 transition-colors group-hover:text-neutral-950 dark:group-hover:text-neutral-50">
                    {playlist.name}
                  </span>
                  <span className="text-[11px] text-neutral-600 dark:text-neutral-400 transition-colors group-hover:text-neutral-600 dark:group-hover:text-neutral-400">
                    open ↗
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
