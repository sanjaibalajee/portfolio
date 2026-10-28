import type { MetadataRoute } from 'next'
import { publicPages, siteUrl } from '@/lib/site'
import blogposts from '@/app/blog/blogposts.json'
import decks from '@/app/resources/slides/slides.json'

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...publicPages.map(page => page.href),
    '/resources/slides',
    ...blogposts.posts.map(post => `/blog/${post.slug}`),
    ...decks.slides.map(deck => `/resources/slides/${deck.id}`),
  ]
  return paths.map(path => ({ url: new URL(path, siteUrl).href }))
}
