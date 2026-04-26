import { Footer } from "@/components/footer"
import slides from "./slides.json"

interface Slide {
  id: string
  title: string
  event: string
  date: string
}

export default function Slides() {
  const decks: Slide[] = slides.slides

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      <div className="flex-grow">
        <section>
          <h1 className="font-semibold text-3xl mb-8 tracking-tight text-neutral-900 dark:text-neutral-100">
            slides
          </h1>
          {decks.length === 0 ? (
            <p className="text-neutral-600 dark:text-neutral-400">no slides yet</p>
          ) : (
            <div className="space-y-4">
              {decks.map((deck) => (
                <a
                  key={deck.id}
                  href={`/resources/slides/${deck.id}`}
                  className="block group hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg p-4 -mx-4 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                    <div>
                      <h2 className="font-medium text-base sm:text-lg tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {deck.title}
                      </h2>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                        {deck.event}
                      </p>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {deck.date}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </div>
  )
}
