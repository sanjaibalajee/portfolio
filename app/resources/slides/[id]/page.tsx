import { notFound } from "next/navigation"
import { Footer } from "@/components/footer"
import slides from "../slides.json"

interface Slide {
  id: string
  title: string
  event: string
  date: string
  pdf: string
}

export function generateStaticParams() {
  return slides.slides.map((slide: Slide) => ({ id: slide.id }))
}

export default async function SlidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deck = (slides.slides as Slide[]).find((s) => s.id === id)

  if (!deck) notFound()

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      <div className="flex-grow">
        <section>
          <div className="mb-6">
            <h1 className="font-semibold text-3xl tracking-tight text-neutral-900 dark:text-neutral-100">
              {deck.title}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              {deck.event?.trim() && (
                <>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{deck.event}</p>
                  <span className="text-neutral-400 dark:text-neutral-600">·</span>
                </>
              )}
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{deck.date}</p>
            </div>
          </div>
          <div className="w-full rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
            <iframe
              src={deck.pdf}
              className="w-full"
              style={{ height: "80vh" }}
              title={deck.title}
            />
          </div>
          <div className="mt-4">
            <a
              href={deck.pdf}
              download
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors underline underline-offset-4"
            >
              download pdf
            </a>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
