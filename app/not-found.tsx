import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-start justify-center min-h-[60vh]">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="font-semibold text-6xl tracking-tight text-neutral-900 dark:text-neutral-100">
            404
          </h1>
          <h2 className="font-semibold text-2xl tracking-tight text-neutral-800 dark:text-neutral-200">
            page not found
          </h2>
        </div>

        <p className="text-base text-neutral-700 dark:text-neutral-300 max-w-md leading-relaxed">
          looks like you've wandered into uncharted territory. this page doesn't exist, or maybe it never did.
        </p>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-block px-4 py-2 border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 font-mono font-medium hover:bg-neutral-900 hover:text-neutral-100 dark:hover:bg-neutral-100 dark:hover:text-neutral-900 transition-all"
          >
            → go home
          </Link>
        </div>
      </div>
    </div>
  )
}
