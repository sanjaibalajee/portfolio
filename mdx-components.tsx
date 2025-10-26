import type { MDXComponents } from 'mdx/types'
import { Tweet } from '@/app/blog/components/tweet'
import { Gallery } from '@/app/blog/components/gallery'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Tweet,
    Gallery,
    h1: ({ children }) => (
      <h1 className="font-semibold text-3xl mb-8 tracking-tight text-neutral-900 dark:text-neutral-100">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="font-semibold text-2xl mb-6 mt-8 tracking-tight text-neutral-900 dark:text-neutral-100">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-semibold text-xl mb-4 mt-6 tracking-tight text-neutral-900 dark:text-neutral-100">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="leading-relaxed text-base text-neutral-800 dark:text-neutral-200 mb-4">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-800 dark:text-neutral-200">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside space-y-2 mb-4 text-neutral-800 dark:text-neutral-200">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed text-base">
        {children}
      </li>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    hr: () => (
      <hr className="border-t border-neutral-300 dark:border-neutral-700 my-8" />
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-neutral-300 dark:border-neutral-700 pl-4 italic text-neutral-700 dark:text-neutral-300 my-4">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-sm font-mono text-neutral-900 dark:text-neutral-100">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg overflow-x-auto mb-4">
        {children}
      </pre>
    ),
    ...components,
  }
}
