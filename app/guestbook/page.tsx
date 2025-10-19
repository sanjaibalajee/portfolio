import { Footer } from "@/components/footer"
import { GuestbookClient } from "@/components/guestbook-client"
import { getGuestbookEntries } from "@/app/actions/getGuestBookEntries"

export default async function Guestbook() {
  const { entries } = await getGuestbookEntries()

  const serializedEntries = (entries || []).map(entry => ({
    ...entry,
    timestamp: entry.timestamp.toISOString(),
    createdAt: entry.createdAt.toISOString(),
  }))

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      <div className="flex-grow">
        <section>
          <h1 className="font-semibold text-3xl mb-8 tracking-tight text-neutral-900 dark:text-neutral-100">
            guestbook
          </h1>
          <GuestbookClient initialEntries={serializedEntries} />
        </section>
      </div>
      <Footer />
    </div>
  )
}
