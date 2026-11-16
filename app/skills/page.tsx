import { Footer } from '@/components/footer'
import { InstallCommand } from '@/components/skills/install-command'
import { SkillRow } from '@/components/skills/skill-row'
import { installCommand, installPrompt, skillGroups, skills, skillsRepo, skillsRepoUrl } from '@/lib/skills'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata('/skills', 'skills', 'agent skills for claude code, codex, cursor and anything else that reads SKILL.md. one command to install.')

const chip = 'rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'

export default function SkillsPage() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col">
      <div className="grow">
        <section>
          <h1 className="mb-4 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">skills</h1>
          <p className="leading-relaxed text-neutral-700 dark:text-neutral-300">
            skills i wrote for coding agents: claude code, codex, cursor and anything else that reads SKILL.md. each one installs on its own.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span>{skills.length} skills</span>
            <span aria-hidden="true">·</span>
            <span>{skillGroups.length} groups</span>
            <span aria-hidden="true">·</span>
            <a href={skillsRepoUrl} className="underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-950 hover:decoration-neutral-500 dark:decoration-neutral-700 dark:hover:text-neutral-100">{skillsRepo}</a>
          </p>

          <div className="mt-8">
            <InstallCommand command={installCommand()} prompt={installPrompt()} />
          </div>

          <div className="mt-14 space-y-10">
            {skillGroups.map(group => (
              <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} className="scroll-mt-8">
                <div className="border-b border-neutral-200 pb-3 dark:border-neutral-800">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 id={`${group.id}-title`} className="text-xs font-medium uppercase tracking-widest text-neutral-900 dark:text-neutral-100">{group.title}</h2>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                      {group.skills.length} {group.skills.length === 1 ? 'skill' : 'skills'}
                    </span>
                  </div>
                  {group.description && <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{group.description}</p>}
                </div>
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
                  {group.skills.map(skill => <SkillRow key={skill.name} skill={skill} copyable />)}
                </ul>
              </section>
            ))}
          </div>

          <p className="mt-12 border-t border-neutral-200 pt-6 text-sm leading-relaxed text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
            add <code className={chip}>-g</code> to install for every project, or <code className={chip}>-a claude-code</code> (or codex, cursor) to pick the agent. the <a href={skillsRepoUrl} className="underline underline-offset-4 hover:text-neutral-950 dark:hover:text-neutral-100">readme</a> covers the claude code plugin and installing from a clone.
          </p>
        </section>
      </div>
      <Footer />
    </div>
  )
}
