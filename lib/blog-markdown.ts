import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import blogposts from '@/app/blog/blogposts.json'
import { folder, sketches } from '@/app/blog/data/architecture-sketches'
import { milestones } from '@/app/blog/data/outworld-timeline'
import { buildLog, ORDER_STEPS, ANALYTICS_STEPS } from '@/app/blog/data/outworld-flows'
import { imageFolder, portraitScreens, landscapeScreens } from '@/app/blog/data/native-app-screens'
import { siteUrl } from '@/lib/site'
import { mdxMarkdown, type ComponentRenderer } from '@/lib/mdx-markdown'
import { getBlogPosts } from '@/lib/blog'

const documents = blogposts.posts.map(post => ({ ...post, path: `/blog/${post.slug}` }))

function frontMatter(fields: Record<string, string>) {
  return ['---', ...Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`), '---'].join('\n')
}

const string = (value: unknown) => typeof value === 'string' ? value : ''
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

function components(url: URL): Record<string, ComponentRenderer> {
  return {
    PostMeta: props => string(props.date),
    ArchitectureSketch: props => {
      const name = string(props.name)
      const sketch = sketches[name as keyof typeof sketches]
      if (!sketch) throw new Error('Unknown architecture sketch')
      return `![${sketch.alt}](${folder}/${name}.svg)\n\n${sketch.caption}`
    },
    OutworldTimeline: () => milestones.map(item => `- ${item.period}: [${item.title}](${new URL(item.href, url).href}). ${item.detail}`).join('\n'),
    BuildLog: () => buildLog.map(([date, title, detail]) => `- ${date}: ${title}. ${detail}`).join('\n'),
    EventWall: () => `[View the event poster archive on the article page.](${url.href})`,
    Incident: (props, children) => `${string(props.when)} · ${string(props.value)} ${string(props.label)}\n\n${children}`,
    Migration: props => [
      `### ${string(props.label)}`,
      `before: ${string(props.before)}`,
      strings(props.removed).map(item => `- ${item}`).join('\n'),
      `after: ${string(props.after)}`,
      strings(props.added).map(item => `- ${item}`).join('\n'),
      string(props.note),
    ].filter(Boolean).join('\n\n'),
    AmritMoment: props => [
      'dec 20, 2025 · chennai',
      props.compact
        ? "i was in thailand when i found out amrit ramnath's show was on outworld. seeing his name there felt unreal."
        : "i was in thailand when i found out amrit ramnath was running his show on outworld.\n\ni had listened to him before any of this, and so had some of my friends. seeing his name on a real event page inside something i wrote, on my phone, from a beach, took a minute to process.",
      `![poster for amrit ramnath's exclusive unplugged performance](${string(props.image)})`,
      '[amrit ramnath · an exclusive unplugged performance](https://outworld.fanpit.live/events/iBD4S8IS)',
      props.withMusic ? '[Kaadhal Alaipayuthey by Amrit Ramnath on Spotify](https://open.spotify.com/track/0gn50It1wJxkhAn7IQe5XS)' : '',
    ].filter(Boolean).join('\n\n'),
    NativeAppGallery: () => [...portraitScreens, ...landscapeScreens].map(screen => `![${screen.description}](${imageFolder}/${screen.file})\n\n${screen.title}`).join('\n\n'),
    OrderLifecycle: () => [
      ORDER_STEPS.map(([title, detail], index) => `${index + 1}. ${title}: ${detail}`).join('\n'),
      'unknown provider result: keep the hold, mark the payment order uncertain, then reconcile it with the provider.',
      'late payment capture: reacquire capacity atomically; if that is no longer possible, move to refund.',
      'unique indexes enforce idempotency at the database boundary. the route, webhook, reconciler and worker can all retry without creating a second order or seat.',
    ].join('\n\n'),
    AnalyticsPipeline: () => [
      ANALYTICS_STEPS.map(([title, detail], index) => `${index + 1}. ${title}: ${detail}`).join('\n'),
      'a dedicated single-concurrency worker keeps analytical scans away from order-critical jobs.',
      'a feature flag switches reads back to the raw table without discarding either data path.',
    ].join('\n\n'),
    Gallery: props => strings(props.images).map((file, index) => `![${string(props.folder)}, photo ${index + 1}](/images/${string(props.folder)}/${file})`).join('\n\n'),
    Tweet: props => `[${string(props.caption) || 'View the tweet'}](https://x.com/i/status/${string(props.id)})`,
    Highlight: (props, children) => [children, string(props.note)].filter(Boolean).join('\n\n'),
  }
}

export async function blogMarkdown(pathname: string) {
  const url = new URL(pathname, siteUrl)
  if (pathname === '/blog') {
    return {
      url,
      markdown: [
        frontMatter({ title: 'blog | sanjai balajee', url: url.href }),
        '# blog',
        ...((await getBlogPosts()).map(post => `## [${post.title}](${new URL(`/blog/${post.slug}`, siteUrl).href})\n\n${post.description}\n\n${post.date} · ~${post.readingMinutes} min read\n\n[Markdown](${new URL(`/blog/${post.slug}.md`, siteUrl).href})`)),
        `[Follow via RSS](${new URL('/feed.xml', siteUrl).href})`,
      ].join('\n\n') + '\n',
    }
  }
  const document = documents.find(item => item.path === pathname)
  if (!document) return null
  // Only paths from the published registry can be read.
  const source = await readFile(join(process.cwd(), 'app/blog/(post)', document.slug, 'page.mdx'), 'utf8')
  const related = document.related.flatMap(slug => blogposts.posts.filter(post => post.slug === slug))
  return {
    url,
    markdown: frontMatter({ title: document.title, date: document.date, url: url.href }) + '\n\n' + mdxMarkdown(source, url, components(url)) + `\n## read next\n\n${related.map(post => `- [${post.title}](${new URL(`/blog/${post.slug}`, siteUrl).href}): ${post.description}`).join('\n')}\n\n[Follow via RSS](${new URL('/feed.xml', siteUrl).href})\n`,
  }
}
