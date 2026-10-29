import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'
import headingIds from '../lib/remark-heading-ids.mjs'
import { createProcessor } from '@mdx-js/mdx'

async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  const resolved = outputText.replace(/from (["'])(@mdx-js\/mdx|mdast-util-to-markdown)\1/g, (_match, _quote, name) => `from ${JSON.stringify(import.meta.resolve(name))}`)
  return import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`)
}

const portfolio = await loadModule('../lib/portfolio-data.ts')
const site = await loadModule('../lib/site.ts')
const { prefersMarkdown, portfolioMarkdown, llmsTxt, markdownHeaders } = await loadModule('../lib/portfolio-markdown.ts')
const { mdxMarkdown } = await loadModule('../lib/mdx-markdown.ts')
const { rssFeed } = await loadModule('../lib/feed.ts')
const { likeIdentity, sameOrigin } = await loadModule('../lib/blog-like-identity.ts')
const { parseReadingPosition, readingTarget } = await loadModule('../lib/reading-progress.ts')

test('Reading progress accepts unfinished positions and ignores corrupt, stale or completed records', () => {
  const now = 1_800_000_000_000
  const position = { version: 1, anchor: 'checkout', sectionProgress: 0.3, progress: 0.45, savedAt: now }
  assert.deepEqual(parseReadingPosition(JSON.stringify(position), now), position)
  for (const raw of [null, '{', 'null', '[]', JSON.stringify({ ...position, version: 2 }), JSON.stringify({ ...position, progress: 1 }), JSON.stringify({ ...position, progress: 0.01 }), JSON.stringify({ ...position, sectionProgress: -1 }), JSON.stringify({ ...position, savedAt: now - 91 * 86400_000 }), JSON.stringify({ ...position, anchor: ['checkout'] })]) {
    assert.equal(parseReadingPosition(raw, now), null)
  }
})

test('Resume uses the section at the new screen size and falls back when a section was removed', () => {
  const position = { version: 1, anchor: 'checkout', sectionProgress: 0.25, progress: 0.5, savedAt: Date.now() }
  assert.equal(readingTarget(position, 200, 6000, { top: 2000, bottom: 4000 }), 2468)
  assert.equal(readingTarget(position, 200, 9000, { top: 3500, bottom: 7500 }), 4468)
  assert.equal(readingTarget(position, 200, 6000), 3168)
})

test('Like origin checks preserve loopback hosts and reject cross-site or missing origins', () => {
  assert(sameOrigin('http://127.0.0.1:3001', 'http:', '127.0.0.1:3001'))
  assert(sameOrigin('https://www.sanjaibalajee.com', 'https:', 'www.sanjaibalajee.com'))
  assert(!sameOrigin('http://localhost:3001', 'http:', '127.0.0.1:3001'))
  assert(!sameOrigin('https://other.example', 'https:', 'www.sanjaibalajee.com'))
  assert(!sameOrigin(null, 'https:', 'www.sanjaibalajee.com'))
  assert(!sameOrigin('null', 'https:', 'www.sanjaibalajee.com'))
})

test('New homepage sections and recent writing stay available in Markdown', () => {
  const posts = [{ slug: 'a-post', title: 'an article', description: 'a story', date: 'Oct 25, 2026', readingMinutes: 7 }]
  const document = portfolioMarkdown(portfolio, site, posts)
  for (const work of portfolio.selectedWork) {
    assert(document.includes(work.title))
    assert(document.includes(work.description))
    for (const link of work.links) assert(document.includes(new URL(link.href, site.siteUrl).href))
  }
  assert(document.includes(portfolio.currently.text))
  assert(document.includes('https://www.sanjaibalajee.com/blog/a-post'))
  assert(document.includes('~7 min read'))
})

test('RSS escapes XML and uses stable canonical links and actual publication dates', () => {
  const xml = rssFeed([{ slug: 'a-post', title: 'a & <b> "c"', description: 'a > b & c', published: '2026-10-25' }], site)
  assert(xml.includes('a &amp; &lt;b&gt; &quot;c&quot;'))
  assert(xml.includes('a &gt; b &amp; c'))
  assert(xml.includes('<guid isPermaLink="true">https://www.sanjaibalajee.com/blog/a-post</guid>'))
  assert(xml.includes('<pubDate>Sat, 24 Oct 2026 18:30:00 GMT</pubDate>'))
  assert(xml.includes('https://www.sanjaibalajee.com/feed.xml'))
  assert(!xml.includes('sanjaibalajee.me'))
})

test('Heading links remain unique for repeated titles, punctuation and suffixed titles', () => {
  const tree = createProcessor().parse('## Hello, world!\n\n## Hello world\n\n## Hello world-1\n\n## Hello world\n\n## `café` & code')
  headingIds()(tree)
  const ids = tree.children.filter(node => node.type === 'heading').map(node => node.data.hProperties.id)
  assert.deepEqual(ids, ['hello-world', 'hello-world-1', 'hello-world-1-1', 'hello-world-2', 'cafe-code'])
})

test('Anonymous likes reuse a valid identity, reject tampering and keep raw IDs out of storage', () => {
  const original = likeIdentity(undefined, 'test-only-secret')
  assert.equal(original.fresh, true)
  const reloaded = likeIdentity(original.cookie, 'test-only-secret')
  assert.equal(reloaded.fresh, false)
  assert.equal(reloaded.visitorHash, original.visitorHash)
  assert.equal(reloaded.visitorHash.length, 64)
  assert.notEqual(reloaded.visitorHash, original.cookie.split('.')[0])
  assert.equal(likeIdentity(original.cookie, 'a-different-secret').fresh, true)
  assert.equal(likeIdentity(original.cookie.slice(0, -1) + 'x', 'test-only-secret').fresh, true)
  assert.notEqual(likeIdentity(undefined, 'test-only-secret').visitorHash, original.visitorHash)
})

for (const [accept, expected] of [
  [null, false], ['', false], ['*/*', false], ['text/html', false],
  ['text/markdown', true], ['Text/Markdown; charset=utf-8', true],
  ['text/markdown;q=0', false], ['text/markdown;q=0.000, */*;q=1', false],
  ['text/markdown;q=0.5, text/html;q=1', false],
  ['text/html;q=0.5, text/markdown;q=1', true],
  ['text/markdown;q=0.8, text/html;q=0.8', true],
  ['text/markdown;q=0.8, text/*;q=0.9', false],
  ['text/markdown;q=0.8, text/html;q=0, */*;q=1', true],
  ['text/markdown;q=0.8, text/html;q=0, text/*;q=1', true],
  ['text/markdown;q=invalid', false], ['text/markdown;q=1.1', false],
  ['text/markdown;q=0.1234', false], ['application/text/markdown', false],
  ['text/markdown-extra', false], ['text/markdown; Q = 0', false],
]) {
  test(`Accept ${JSON.stringify(accept)} chooses ${expected ? 'Markdown' : 'HTML'}`, () => {
    assert.equal(prefersMarkdown(accept), expected)
  })
}

test('Markdown includes every homepage section and every experience paragraph', () => {
  const markdown = portfolioMarkdown(portfolio, site)
  const headings = ['about', 'experience', 'education', 'skills', 'interests']
  const positions = headings.map(heading => markdown.indexOf(`## ${heading}\n`))
  assert(positions.every(position => position >= 0))
  assert.deepEqual([...positions].sort((a, b) => a - b), positions)
  assert(markdown.includes(portfolio.profile.intro))
  for (const item of portfolio.experiences) {
    assert(markdown.includes(item.company))
    assert(markdown.includes(item.role))
    assert(markdown.includes(item.period))
    for (const parts of item.paragraphs ?? []) for (const part of parts) {
      assert(markdown.includes(typeof part === 'string' ? part : `[${part.label}](${part.href})`))
    }
  }
  assert(markdown.includes(portfolio.education.degree))
  assert(markdown.includes(portfolio.skills.join('; ')))
  assert(markdown.includes(portfolio.interests.join(', ')))
})

test('Markdown and discovery use the canonical domain and public links', () => {
  for (const document of [portfolioMarkdown(portfolio, site), llmsTxt(site)]) {
    assert(document.includes('https://www.sanjaibalajee.com'))
    assert(!document.includes('sanjaibalajee.me'))
    assert(!document.includes('/switch/dashboard'))
    assert(!document.includes('/switch/login'))
  }
  assert(llmsTxt(site).includes('https://www.sanjaibalajee.com/index.md'))
})

test('Markdown safely escapes content and quotes front matter', () => {
  const custom = { ...portfolio, profile: { ...portfolio.profile, name: 'a: "b"', intro: 'a [link] *and* _text_ `code`' } }
  const markdown = portfolioMarkdown(custom, site)
  assert(markdown.includes('title: "a: \\"b\\""'))
  assert(markdown.includes('a \\[link\\] \\*and\\* \\_text\\_ \\`code\\`'))
})

test('Negotiated responses are inline, vary by Accept and are not shared-cached', () => {
  const headers = markdownHeaders(site.siteUrl)
  assert.equal(headers['Content-Type'], 'text/markdown; charset=utf-8')
  assert.equal(headers['Content-Disposition'], 'inline')
  assert.equal(headers.Vary, 'Accept')
  assert(headers['Cache-Control'].includes('no-store'))
  assert.equal(headers.Link, '<https://www.sanjaibalajee.com/>; rel="canonical"')
})

test('Blog Markdown preserves prose, quotes, images and absolute links without JSX or imports', () => {
  const source = `import Secret from './internal-file'\n\n# a post\n\n<p className="date">Oct 25, 2026</p>\n\n**keep this** and [another post](/blog/chasing-the-high).\n\n<BigQuote>keep the quote.</BigQuote>\n\n<figure><a href="/photo.png"><Image src="/photo.png" alt="the photo" /></a><figcaption>the caption.</figcaption></figure>`
  const markdown = mdxMarkdown(source, new URL('https://example.com/blog/post'))
  for (const phrase of ['# a post', 'Oct 25, 2026', '**keep this**', '> keep the quote.', 'https://example.com/blog/chasing-the-high', '![the photo](https://example.com/photo.png)', 'the caption.']) assert(markdown.includes(phrase), phrase)
  for (const phrase of ['import Secret', 'internal-file', 'className', '<Image', '<figure']) assert(!markdown.includes(phrase), phrase)
})

test('MDX literal arrays and JSX notes are available to component renderers', () => {
  let received
  const markdown = mdxMarkdown('<Migration before="old" added={[\'one\', \'two\']} note={<>keep this note</>} />', new URL('https://example.com'), {
    Migration: props => { received = props; return `${props.before}\n\n${props.added.join(', ')}\n\n${props.note}` },
  })
  assert.deepEqual(received.added, ['one', 'two'])
  assert.equal(received.note, 'keep this note')
  assert(markdown.includes('keep this note'))
})

test('Blog code blocks retain their complete template-literal contents', async () => {
  const source = await readFile(new URL('../app/blog/(post)/a-year-of-unlearning/page.mdx', import.meta.url), 'utf8')
  const markdown = mdxMarkdown(source, new URL('https://example.com/blog/a-year-of-unlearning'), { PostMeta: props => String(props.date) })
  assert(markdown.includes('```diff\n# file: whatibelieve.config'))
  assert(markdown.includes('+ responsibility: "it works while i sleep"'))
  assert(markdown.includes('- strategy: "waiting for the perfect plan"'))
  assert(!markdown.includes('<DiffBlock>'))
})

test('MDX exports, executable expressions and interpolation are never executed or returned', () => {
  globalThis.__mdxMarkdownSideEffect = 0
  const source = 'export const internal = "PRIVATE_SOURCE"\n\n# safe\n\n{globalThis.__mdxMarkdownSideEffect++}\n\n{`PRIVATE_INTERPOLATION ${globalThis.__mdxMarkdownSideEffect++}`}\n\n<script>PRIVATE_SCRIPT</script>'
  const markdown = mdxMarkdown(source, new URL('https://example.com'))
  assert.equal(globalThis.__mdxMarkdownSideEffect, 0)
  assert(!markdown.includes('PRIVATE_'))
  assert(!markdown.includes('globalThis'))
  assert(markdown.includes('# safe'))
  delete globalThis.__mdxMarkdownSideEffect
})

test('New self-closing components require an explicit Markdown representation', () => {
  assert.throws(() => mdxMarkdown('<NewVisual />', new URL('https://example.com')), /Missing Markdown renderer/)
})

test('Every published post is discoverable through llms.txt', async () => {
  const { posts } = JSON.parse(await readFile(new URL('../app/blog/blogposts.json', import.meta.url), 'utf8'))
  const document = llmsTxt(site, posts)
  assert(document.includes('https://www.sanjaibalajee.com/blog/index.md'))
  for (const post of posts) assert(document.includes(`(https://www.sanjaibalajee.com/blog/${post.slug}.md)`), post.slug)
  assert(document.includes('[building outworld from 0 to 1](https://www.sanjaibalajee.com/blog/building-outworld-from-0-to-1.md)'))
})
