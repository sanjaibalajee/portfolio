
import { Footer } from "@/components/footer"
import musicData from "./music-data.json"

export default function Music() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      <div className="flex-grow">
        <section>
          <h1 className="font-semibold text-2xl mb-8 tracking-tighter text-neutral-50">
            music
          </h1>

          <div className="space-y-8">
            <p className="leading-relaxed text-neutral-300">
              I need music in the background to get anything done. 
            </p>

            <div className="pt-2">
              <h2 className="font-semibold text-lg mb-4 text-neutral-50">
                Favorite Artists
              </h2>

              <div className="space-y-3">
                {musicData.favoriteArtists.map((artist) => (
                  <div key={artist.name} className="pl-4 border-l-2 border-neutral-800">
                    <div className="font-medium text-neutral-50">
                      {artist.name}
                    </div>
                    <div className="text-sm mt-1 text-neutral-400">
                      {artist.songs}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <h2 className="font-semibold text-lg mb-4 text-neutral-50">
                Playlists
              </h2>

              <div className="space-y-2">
                {musicData.playlists.map((playlist) => (
                  <div key={playlist.name}>
                    <a
                      href={playlist.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-50 hover:text-neutral-300 transition-colors inline-flex items-center gap-1 underline decoration-neutral-600 hover:decoration-neutral-400 underline-offset-4"
                    >
                      {playlist.name}
                      <span className="text-neutral-500">→</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <h2 className="font-semibold text-lg mb-4 text-neutral-50">
                Currently on Repeat
              </h2>
              <div className="space-y-2">
                {musicData.currentlyOnRepeat.map((song) => (
                  <div key={song} className="text-neutral-300">
                    {song}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
