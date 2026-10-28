import type { Metadata } from 'next'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cache } from 'react'
import { createProcessor } from '@mdx-js/mdx'
import blogposts from '@/app/blog/blogposts.json'
import { siteName, siteUrl } from '@/lib/site'

export const posts = blogposts.posts
export type BlogPost = typeof posts[number]

type Estree = { data?: { estree?: unknown } }
type MdxNode = Estree & { type: string; value?: unknown; children?: MdxNode[]; attributes?: { value?: unknown }[] }

const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length

// Words in string and template literals inside expressions, such as a DiffBlock body.
function literalWords(node: unknown): number {
  if (!node || typeof node !== 'object') return 0
  const { type, value } = node as { type?: string; value?: unknown }
  if (type === 'Literal' || type === 'JSXText') return typeof value === 'string' ? wordCount(value) : 0
  if (type === 'TemplateElement') return wordCount((value as { cooked?: string }).cooked ?? '')
  return Object.values(node).reduce<number>((sum, child) => sum + literalWords(child), 0)
}

export const getBlogPosts = cache(async () => Promise.all(posts.map(async post => {
  const source = await readFile(join(process.cwd(), 'app/blog/(post)', post.slug, 'page.mdx'), 'utf8')
  const tree = createProcessor().parse(source) as MdxNode
  let words = 0
  function count(node: MdxNode) {
    if (node.type === 'mdxjsEsm' || node.type === 'code') return
    if (node.type === 'text' && typeof node.value === 'string') words += wordCount(node.value)
    if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') words += literalWords(node.data?.estree)
    node.attributes?.forEach(attribute => { words += literalWords((attribute.value as Estree | null)?.data?.estree) })
    node.children?.forEach(count)
  }
  count(tree)
  return { ...post, readingMinutes: Math.max(1, Math.ceil(words / 200)) }
})))

export function blogMetadata(slug: string): Metadata {
  const post = posts.find(post => post.slug === slug)
  if (!post) throw new Error('Unknown published post')
  const url = new URL(`/blog/${post.slug}`, siteUrl).href
  const images = [{ url: `/og/${post.slug}`, width: 1200, height: 630, alt: `${post.title} · ${siteName}` }]
  return {
    title: post.title, description: post.description,
    alternates: { canonical: url, types: { 'text/markdown': `${url}.md`, 'application/rss+xml': '/feed.xml' } },
    openGraph: { type: 'article', title: post.title, description: post.description, url, publishedTime: post.published, authors: [siteUrl.href], images },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description, images },
  }
}

export function articleStructuredData(post: BlogPost) {
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: post.title, description: post.description,
    datePublished: `${post.published}T00:00:00+05:30`,
    author: { '@type': 'Person', name: siteName, url: siteUrl.href },
    mainEntityOfPage: new URL(`/blog/${post.slug}`, siteUrl).href,
    image: new URL(`/og/${post.slug}`, siteUrl).href,
  }
}
