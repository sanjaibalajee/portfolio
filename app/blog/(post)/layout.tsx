import { Footer } from "@/components/footer"

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
      </div>
      <Footer />
    </div>
  )
}
