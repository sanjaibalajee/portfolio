import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { ExperienceItem } from '@/components/experience-item'
import { AgentViewSwitch } from '@/components/agent-view'
import { profile, experiences, education, skills, interests, selectedWork, currently } from '@/lib/portfolio-data'
import { siteUrl } from '@/lib/site'
import { getBlogPosts } from '@/lib/blog'
import { PostList } from '@/components/post-list'
import Link from 'next/link'

export const metadata: Metadata = {
  alternates: { canonical: '/', types: { 'text/markdown': '/index.md' } },
}

export default async function Home() {
  const recentPosts = (await getBlogPosts()).slice(0, 2)
  const person = {
    '@context': 'https://schema.org', '@type': 'Person',
    name: profile.name, url: siteUrl.href,
    sameAs: ['https://github.com/sanjaibalajee'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, '\\u003c') }} />
      <AgentViewSwitch>
        <div className="flex min-h-[calc(100vh-200px)] flex-col">
          <div className="grow">
            <section>
              <h1 className="mb-8 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">about</h1>
              <div className="space-y-8">
                <p className="text-base leading-relaxed text-neutral-800 dark:text-neutral-200">{profile.intro}</p>
                <section className="border-t border-neutral-300 pt-8 dark:border-neutral-700" aria-labelledby="selected-work">
                  <h2 id="selected-work" className="mb-6 text-2xl font-semibold tracking-tight">selected work</h2>
                  <div className="space-y-6">
                    {selectedWork.map(work => <div key={work.title}>
                      <h3 className="text-base font-medium">{work.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{work.description}</p>
                      <div className="mt-2 flex gap-4 text-xs">{work.links.map(link => <a key={link.href} href={link.href} className="py-1 underline underline-offset-4">{link.label} <span aria-hidden="true">↗</span></a>)}</div>
                    </div>)}
                  </div>
                </section>
                <section className="border-t border-neutral-300 pt-8 dark:border-neutral-700" aria-labelledby="recent-writing">
                  <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
                    <h2 id="recent-writing" className="text-2xl font-semibold tracking-tight">recent writing</h2>
                    <Link href="/blog" className="text-xs underline underline-offset-4">all posts →</Link>
                  </div>
                  <PostList posts={recentPosts} headingLevel={3} />
                </section>
                <section className="border-t border-neutral-300 pt-8 dark:border-neutral-700" aria-labelledby="currently">
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                    <h2 id="currently" className="text-2xl font-semibold tracking-tight">currently</h2>
                    <time dateTime={currently.updated} className="text-xs text-neutral-500 dark:text-neutral-400">{currently.date}</time>
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{currently.text}</p>
                </section>
                <div className="border-t border-neutral-300 pt-8 dark:border-neutral-700">
                  <h2 className="mb-6 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">experience</h2>
                  {experiences.map(item => (
                    <ExperienceItem key={item.company} company={item.company} role={item.role} location={item.location} period={item.period}>
                      {item.paragraphs?.map((parts, index) => (
                        <p key={index}>{parts.map((part, partIndex) => typeof part === 'string' ? part : (
                          <a key={partIndex} href={part.href} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline underline-offset-2 transition-colors hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">{part.label}</a>
                        ))}</p>
                      ))}
                    </ExperienceItem>
                  ))}
                </div>
                <div className="border-t border-neutral-300 pt-8 dark:border-neutral-700">
                  <h2 className="mb-6 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">education</h2>
                  <div className="mb-6">
                    <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
                      <h3 className="text-base font-semibold tracking-tight text-neutral-900 sm:text-lg dark:text-neutral-100">{education.school}</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">{education.period}</p>
                    </div>
                    <p className="text-sm text-neutral-700 sm:text-base dark:text-neutral-300">{education.degree}</p>
                  </div>
                </div>
                <div className="border-t border-neutral-300 pt-8 dark:border-neutral-700">
                  <h2 className="mb-4 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">skills</h2>
                  <p className="text-base leading-relaxed text-neutral-800 dark:text-neutral-200">{skills.join('; ')}</p>
                </div>
                <div className="border-t border-neutral-300 pt-8 dark:border-neutral-700">
                  <h2 className="mb-4 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">interests</h2>
                  <p className="text-base leading-relaxed text-neutral-800 dark:text-neutral-200">{interests.join(', ')}</p>
                </div>
              </div>
            </section>
          </div>
          <Footer />
        </div>
      </AgentViewSwitch>
    </>
  )
}
