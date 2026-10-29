import Image from 'next/image'
import { folder, sketches } from '@/app/blog/data/architecture-sketches'

export function ArchitectureSketch({ name }: { name: keyof typeof sketches }) {
  const sketch = sketches[name]
  const src = `${folder}/${name}`

  // Both themes render on the server. Browsers skip lazy images that stay hidden.
  return (
    <figure className="not-prose my-9" data-architecture-sketch={name}>
      {(['', '-dark'] as const).map(theme => (
        <a
          key={theme}
          href={`${src}${theme}.svg`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open the full architecture sketch"
          className={`${theme ? 'hidden dark:block' : 'block dark:hidden'} overflow-hidden rounded-lg border border-neutral-200 bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 dark:border-neutral-800 dark:bg-neutral-950`}
        >
          <picture>
            <source
              media="(max-width: 639px)"
              srcSet={`${src}-mobile${theme}.svg`}
              width={sketch.mobileWidth}
              height={sketch.mobileHeight}
            />
            <Image
              src={`${src}${theme}.svg`}
              alt={sketch.alt}
              width={sketch.width}
              height={sketch.height}
              sizes="(max-width: 672px) calc(100vw - 48px), 624px"
              unoptimized
              className="block h-auto w-full"
            />
          </picture>
        </a>
      ))}
      <figcaption className="mt-3 text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        {sketch.caption}
      </figcaption>
    </figure>
  )
}
