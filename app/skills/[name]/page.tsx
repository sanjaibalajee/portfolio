import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, FileText, Github, Package } from 'lucide-react'
import { Footer } from '@/components/footer'
import { InstallCommand } from '@/components/skills/install-command'
import { SkillMarkdown } from '@/components/skills/skill-markdown'
import { SkillRow } from '@/components/skills/skill-row'
import { findSkill, groupOf, installCommand, installPrompt, relatedSkills, skillFolderUrl, skills, skillSourceUrl } from '@/lib/skills'
import { pageMetadata } from '@/lib/site'

type Props = { params: Promise<{ name: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return skills.map(skill => ({ name: skill.name }))
}

export async function generateMetadata({ params }: Props) {
  const skill = findSkill((await params).name)
  if (!skill) notFound()
  return pageMetadata(`/skills/${skill.name}`, skill.name, skill.summary)
}

function SectionHeading({ id, title, note }: { id: string; title: string; note?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id={id} className="text-xs font-medium uppercase tracking-widest text-neutral-900 dark:text-neutral-100">{title}</h2>
      {note && <p className="text-xs text-neutral-500 dark:text-neutral-400">{note}</p>}
    </div>
  )
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

const metaLink = 'flex items-center gap-1.5 transition-colors hover:text-neutral-950 dark:hover:text-neutral-100'

export default async function SkillPage({ params }: Props) {
  const skill = findSkill((await params).name)
  if (!skill) notFound()
  const group = groupOf(skill)
  const related = relatedSkills(skill)

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col">
      <div className="grow">
        <article>
          <nav aria-label="Breadcrumb" className="mb-8 flex min-w-0 items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Link href="/skills" className="shrink-0 transition-colors hover:text-neutral-950 dark:hover:text-neutral-100">skills</Link>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">/</span>
            <Link href={`/skills#${group.id}`} className="shrink-0 lowercase transition-colors hover:text-neutral-950 dark:hover:text-neutral-100">{group.title}</Link>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">/</span>
            <span aria-current="page" className="min-w-0 truncate text-neutral-900 dark:text-neutral-100">{skill.name}</span>
          </nav>

          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 [overflow-wrap:anywhere] dark:text-neutral-100">{skill.name}</h1>
          <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">{skill.summary}</p>

          <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-500 dark:text-neutral-400">
            {skill.added && (
              <li className="flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" className="size-3.5" />
                <span>added <time dateTime={skill.added}>{formatDate(skill.added)}</time></span>
              </li>
            )}
            <li className="flex items-center gap-1.5">
              <Package aria-hidden="true" className="size-3.5" />
              {skill.bundles.length ? `ships with ${skill.bundles.join(', ')}` : 'SKILL.md only'}
            </li>
            <li>
              <a href={skillFolderUrl(skill)} className={metaLink}>
                <Github aria-hidden="true" className="size-3.5" />source <span aria-hidden="true">↗</span>
              </a>
            </li>
          </ul>

          <div className="mt-8">
            <InstallCommand command={installCommand(skill)} prompt={installPrompt(skill)} />
          </div>

          <section className="mt-12" aria-labelledby="description">
            <SectionHeading id="description" title="description" note="what your agent reads to decide when to use it" />
            <blockquote className="border-l-2 border-neutral-200 pl-4 text-sm leading-relaxed text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
              {skill.description}
            </blockquote>
          </section>

          <section className="mt-12 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800" aria-labelledby="skill-md">
            <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-400">
              <FileText aria-hidden="true" className="size-3.5" />
              <h2 id="skill-md" className="font-medium text-neutral-900 dark:text-neutral-100">SKILL.md</h2>
              <a href={skillSourceUrl(skill)} className={`ml-auto ${metaLink}`}>view on github <span aria-hidden="true">↗</span></a>
            </div>
            <div className="px-4 py-5 sm:px-7 sm:py-6">
              <SkillMarkdown source={skill.body} base={skillSourceUrl(skill)} />
            </div>
          </section>

          <section className="mt-14" aria-labelledby="related-skills">
            <div className="flex items-baseline justify-between gap-4 border-b border-neutral-200 pb-3 dark:border-neutral-800">
              <h2 id="related-skills" className="text-xs font-medium uppercase tracking-widest text-neutral-900 dark:text-neutral-100">{related.label}</h2>
              <Link href="/skills" className="shrink-0 text-xs text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100">all skills →</Link>
            </div>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
              {related.skills.map(other => <SkillRow key={other.name} skill={other} />)}
            </ul>
          </section>
        </article>
      </div>
      <Footer />
    </div>
  )
}
