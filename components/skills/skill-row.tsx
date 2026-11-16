import Link from 'next/link'
import { CopyIconButton } from '@/components/skills/install-command'
import { installCommand, skillNumber, type Skill } from '@/lib/skills'

export function SkillRow({ skill, copyable = false }: { skill: Skill; copyable?: boolean }) {
  return (
    <li className="group relative flex items-start gap-4 py-4">
      <span aria-hidden="true" className="w-5 shrink-0 text-xs leading-6 tabular-nums text-neutral-400 dark:text-neutral-600">
        {String(skillNumber(skill)).padStart(2, '0')}
      </span>
      <Link href={`/skills/${skill.name}`} className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-neutral-500">
        <h3 className="flex items-center gap-2 font-semibold leading-6 text-neutral-900 dark:text-neutral-100">
          {skill.name}
          <span aria-hidden="true" className="-translate-x-1 text-neutral-400 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100">→</span>
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600 transition-colors group-hover:text-neutral-800 dark:text-neutral-400 dark:group-hover:text-neutral-300">{skill.summary}</p>
      </Link>
      {copyable && <CopyIconButton text={installCommand(skill)} label={`Copy install command for ${skill.name}`} className="relative -mt-1" />}
    </li>
  )
}
