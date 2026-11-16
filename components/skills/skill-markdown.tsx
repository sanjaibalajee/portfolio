import type { ComponentProps } from 'react'
import * as runtime from 'react/jsx-runtime'
import { evaluate } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import headingIds from '@/lib/remark-heading-ids.mjs'

// Renders a SKILL.md body as plain Markdown (no JSX, raw HTML dropped) at build time.
// Relative links point into the skill's folder, so they resolve against its GitHub page.
export async function SkillMarkdown({ source, base }: { source: string; base: string }) {
  const { default: Content } = await evaluate(source, { ...runtime, format: 'md', remarkPlugins: [remarkGfm, headingIds] })
  function Anchor({ href = '', ...props }: ComponentProps<'a'>) {
    if (href.startsWith('#')) return <a href={href} {...props} />
    const url = new URL(href, base).href
    return <a href={url} target="_blank" rel="noopener noreferrer" {...props} />
  }
  return (
    <div className="skill-doc">
      <Content components={{ a: Anchor }} />
    </div>
  )
}
