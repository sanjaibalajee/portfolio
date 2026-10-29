import Image from 'next/image'

import { imageFolder, portraitScreens, landscapeScreens } from '@/app/blog/data/native-app-screens'

export function NativeAppGallery() {
  return (
    <div className="not-prose my-10 space-y-9">
      <div
        className="grid auto-cols-[78%] grid-flow-col gap-5 overflow-x-auto overscroll-x-contain pb-3 snap-x snap-mandatory sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-3 sm:overflow-visible sm:pb-0"
        role="region"
        aria-label="Fanpit Live on iPhone Duo: discover, event details and tickets"
        tabIndex={0}
      >
        {portraitScreens.map((screen) => (
          <figure key={screen.file} className="m-0 min-w-0 snap-center">
            <a
              href={`${imageFolder}/${screen.file}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open the full ${screen.title} screenshot`}
              className="relative block aspect-[3/4] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
            >
              <Image
                src={`${imageFolder}/${screen.file}`}
                alt={screen.description}
                fill
                sizes="(max-width: 639px) 78vw, 195px"
                className="object-contain"
              />
            </a>
            <figcaption className="mt-3 text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {screen.title}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="space-y-8 border-t border-neutral-200 pt-8 dark:border-neutral-800">
        {landscapeScreens.map((screen) => (
          <figure key={screen.file} className="m-0">
            <a
              href={`${imageFolder}/${screen.file}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open the full ${screen.title} screenshot`}
              className="relative block aspect-[7/5] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
            >
              <Image
                src={`${imageFolder}/${screen.file}`}
                alt={screen.description}
                fill
                sizes="(max-width: 672px) calc(100vw - 48px), 624px"
                className="object-contain"
              />
            </a>
            <figcaption className="mt-3 text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {screen.title}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
