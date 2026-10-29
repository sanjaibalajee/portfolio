import type * as Portfolio from './portfolio-data'
import type * as Site from './site'

export const markdownPath = '/index.md'
export const llmsTxtPath = '/llms.txt'

// An explicit media range takes precedence over a wildcard, even at q=0.
export function prefersMarkdown(accept: string | null) {
  if (!accept) return false
  const ranges = accept.split(',').map(entry => {
    const [type, ...parameters] = entry.split(';')
    const quality = parameters.find(parameter => /^\s*q\s*=/i.test(parameter))
    const value = quality?.split('=')[1].trim()
    const q = value === undefined ? 1 : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(value) ? Number(value) : 0
    return { type: type.trim().toLowerCase(), q }
  })
  if (!ranges.some(range => range.type === 'text/markdown')) return false

  function quality(type: string) {
    const matching = ranges.filter(range => [type, 'text/*', '*/*'].includes(range.type))
    const specificity = (range: typeof ranges[number]) => range.type === type ? 2 : range.type === 'text/*' ? 1 : 0
    const mostSpecific = Math.max(...matching.map(specificity))
    return Math.max(0, ...matching.filter(range => specificity(range) === mostSpecific).map(range => range.q))
  }

  return quality('text/markdown') > 0 && quality('text/markdown') >= quality('text/html')
}

export function markdownHeaders(canonical: URL) {
  return {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, no-store',
    Vary: 'Accept',
    Link: `<${canonical.href}>; rel="canonical"`,
  }
}

function text(value: string) {
  return value.replace(/[\\`*_[\]]/g, '\\$&')
}

function link(label: string, href: string) {
  return `[${text(label)}](${href})`
}

export function portfolioMarkdown(portfolio: typeof Portfolio, site: typeof Site, posts: readonly { slug: string; title: string; description: string; date: string; readingMinutes: number }[] = []) {
  const { profile, experiences, education, skills, interests, selectedWork, currently } = portfolio
  const inline = (parts: Portfolio.InlineContent[]) => parts.map(part => typeof part === 'string' ? text(part) : link(part.label, part.href)).join('')
  return [
    ['---', `title: ${JSON.stringify(profile.name)}`, `description: ${JSON.stringify(site.siteDescription)}`, `url: ${JSON.stringify(site.siteUrl.href)}`, '---'].join('\n'),
    `# ${text(profile.name)}`,
    '## about',
    text(profile.intro),
    '## selected work',
    ...selectedWork.map(work => `### ${text(work.title)}\n\n${text(work.description)}\n\n${work.links.map(item => link(item.label, new URL(item.href, site.siteUrl).href)).join(' · ')}`),
    ...(posts.length ? ['## recent writing', ...posts.slice(0, 2).map(post => `### ${link(post.title, new URL(`/blog/${post.slug}`, site.siteUrl).href)}\n\n${text(post.description)}\n\n${post.date} · ~${post.readingMinutes} min read`)] : []),
    '## currently',
    `${currently.date}\n\n${text(currently.text)}`,
    '## experience',
    ...experiences.map(item => [
      `### ${text(item.company)}`,
      `${text(item.role)} · ${text(item.location)} · ${text(item.period)}`,
      ...(item.paragraphs ?? []).map(inline),
    ].join('\n\n')),
    '## education',
    `### ${text(education.school)}`,
    `${text(education.degree)} · ${text(education.period)}`,
    '## skills',
    text(skills.join('; ')),
    '## interests',
    text(interests.join(', ')),
    '## contact',
    site.socialLinks.map(item => `- ${link(item.label, item.href)}`).join('\n'),
    '## pages',
    site.publicPages.filter(item => item.href !== '/').map(item => `- ${link(item.label, new URL(item.href, site.siteUrl).href)}`).join('\n'),
    `Follow the blog: ${link('RSS', new URL('/feed.xml', site.siteUrl).href)}`,
  ].join('\n\n') + '\n'
}

export function llmsTxt(site: typeof Site, posts: readonly { slug: string; title: string }[] = []) {
  return [
    `# ${text(site.siteName)}`,
    `> ${text(site.siteDescription)}`,
    'The homepage and blog support Accept: text/markdown. Direct Markdown links are listed below.',
    '## portfolio',
    `- ${link('homepage in Markdown', new URL(markdownPath, site.siteUrl).href)}: about, experience, education, skills, interests and contact links.`,
    '## blog',
    `- ${link('blog index in Markdown', new URL('/blog/index.md', site.siteUrl).href)}`,
    ...posts.map(post => `- ${link(post.title, new URL(`/blog/${post.slug}.md`, site.siteUrl).href)}`),
    `- ${link('RSS feed', new URL('/feed.xml', site.siteUrl).href)}`,
    '## pages',
    site.publicPages.filter(item => item.href !== '/').map(item => `- ${link(item.label, new URL(item.href, site.siteUrl).href)}`).join('\n'),
  ].join('\n\n') + '\n'
}
