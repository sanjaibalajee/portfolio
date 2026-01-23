import { Footer } from "@/components/footer"
import Link from "next/link"

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow">
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:mb-2">
          {children}
        </article>
        <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <Link
            href="/guestbook"
            className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            sign my guestbook →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
