// Builds app/skills/skills.json from a clone of github.com/sanjaibalajee/skills.
// Usage: npm run skills:sync [-- path/to/skills]   (defaults to ../skills)
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? join(import.meta.dirname, '../../skills'))
const output = join(import.meta.dirname, '../app/skills/skills.json')
const fallbackRepo = 'sanjaibalajee/skills'

if (!existsSync(join(root, 'skills'))) {
  console.error(`No skills/ folder in ${root}. Pass the path to a clone of ${fallbackRepo}.`)
  process.exit(1)
}

function git(...args) {
  try {
    return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function repoName() {
  const match = git('remote', 'get-url', 'origin').match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)
  return match?.[1] ?? fallbackRepo
}

// SKILL.md frontmatter here is flat `key: value` YAML, optionally quoted.
function frontmatter(source, file) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!match) throw new Error(`${file} has no frontmatter`)
  const fields = {}
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([a-z-]+):\s*(.*)$/)
    if (!field) continue
    let value = field[2].trim()
    if (value.startsWith('"')) value = JSON.parse(value)
    else if (value.startsWith("'")) value = value.slice(1, -1).replaceAll("''", "'")
    fields[field[1]] = value
  }
  return { fields, body: source.slice(match[0].length) }
}

// The README's catalog table holds the short, one-line description of each skill.
function readmeSummaries() {
  const summaries = new Map()
  const readme = join(root, 'README.md')
  if (!existsSync(readme)) return summaries
  for (const line of readFileSync(readme, 'utf8').split('\n')) {
    const row = line.match(/^\|\s*\[([^\]]+)\]\(skills\/([^/]+)\/SKILL\.md\)\s*\|\s*(.+?)\s*\|\s*$/)
    if (row) summaries.set(row[2], row[3])
  }
  return summaries
}

function firstSentence(text) {
  return text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text
}

const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const summaries = readmeSummaries()
const skills = readdirSync(join(root, 'skills'))
  .filter(name => existsSync(join(root, 'skills', name, 'SKILL.md')))
  .sort()
  .map(folder => {
    const file = join(root, 'skills', folder, 'SKILL.md')
    const { fields, body } = frontmatter(readFileSync(file, 'utf8'), file)
    const name = fields.name ?? folder
    if (name !== folder) throw new Error(`${file} is named ${name}, but its folder is ${folder}`)
    if (!fields.description) throw new Error(`${file} has no description`)
    if (!summaries.has(name)) console.warn(`README has no catalog row for ${name}; using the first sentence of its description.`)
    const added = git('log', '--diff-filter=A', '--follow', '--format=%as', '--', `skills/${name}/SKILL.md`).split('\n').filter(Boolean).at(-1)
    const bundles = readdirSync(join(root, 'skills', name))
      .filter(entry => !entry.startsWith('.') && statSync(join(root, 'skills', name, entry)).isDirectory())
      .sort()
    return {
      name,
      summary: summaries.get(name) ?? firstSentence(fields.description),
      description: fields.description,
      added: added || null,
      bundles,
      // The page already shows the name as its title, so drop SKILL.md's own `# name` heading.
      body: body.replace(new RegExp(`^\\s*# ${name}\\s*\\n`), '').trim() + '\n',
    }
  })

const names = new Set(skills.map(skill => skill.name))
const config = existsSync(join(root, 'skills.sh.json')) ? JSON.parse(readFileSync(join(root, 'skills.sh.json'), 'utf8')) : { groupings: [] }
const groups = config.groupings.map(group => {
  for (const name of group.skills) if (!names.has(name)) throw new Error(`skills.sh.json group ${group.title} lists ${name}, which has no SKILL.md`)
  return { id: slug(group.title), title: group.title, description: group.description ?? '', skills: group.skills }
})
const grouped = new Set(groups.flatMap(group => group.skills))
const ungrouped = skills.map(skill => skill.name).filter(name => !grouped.has(name))
if (ungrouped.length) {
  const other = { id: 'other', title: 'Other', description: '', skills: ungrouped }
  if (config.notGrouped === 'top') groups.unshift(other)
  else groups.push(other)
}

const catalog = { repo: repoName(), branch: 'main', groups, skills }
writeFileSync(output, JSON.stringify(catalog, null, 2) + '\n')
console.log(`Wrote ${skills.length} skills in ${groups.length} groups from ${root} to app/skills/skills.json`)
