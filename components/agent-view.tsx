'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { usePathname } from 'next/navigation'
import { llmsTxtPath } from '@/lib/portfolio-markdown'
import { agentMarkdownPath } from '@/lib/agent-routes'

const AgentContext = createContext({ active: false, setActive: (_active: boolean) => {} })

export function AgentViewProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [activePath, setActivePath] = useState<string | null>(null)
  const pageScroll = useRef(0)
  const active = activePath !== null && activePath === pathname

  function setActive(next: boolean) {
    if (!next && !active) { setActivePath(null); return }
    if (next === active) return
    if (next) pageScroll.current = window.scrollY
    flushSync(() => setActivePath(next ? pathname : null))
    window.scrollTo({ top: next ? 0 : pageScroll.current, behavior: 'instant' })
  }

  return <AgentContext value={{ active, setActive }}>{children}</AgentContext>
}

export function useAgentView() {
  return useContext(AgentContext)
}

export function AgentViewToggle() {
  const { active, setActive } = useContext(AgentContext)
  return (
    <div role="group" aria-label="View this page as" className="flex items-center rounded-full border border-neutral-200 p-0.5 text-xs dark:border-neutral-800">
      {(['human', 'agent'] as const).map(view => (
        <button
          key={view}
          type="button"
          aria-pressed={active === (view === 'agent')}
          onClick={() => setActive(view === 'agent')}
          className="rounded-full px-3 py-1.5 text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 aria-pressed:bg-neutral-100 aria-pressed:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100 dark:aria-pressed:bg-neutral-800 dark:aria-pressed:text-neutral-100"
        >{view}</button>
      ))}
    </div>
  )
}

export function AgentViewSwitch({ children }: { children: React.ReactNode }) {
  const { active } = useContext(AgentContext)
  const pathname = usePathname()
  return <><div hidden={active} data-human-view>{children}</div>{active && <AgentTranscript key={pathname} pathname={pathname} />}</>
}

type Transcript = { status: number; headers: string; markdown: string } | { error: true }

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')
  return (
    <button type="button" className="shrink-0 underline underline-offset-4 hover:text-neutral-950 dark:hover:text-neutral-100" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setState('copied') }
      catch { setState('error') }
    }} aria-live="polite">{state === 'copied' ? 'copied' : state === 'error' ? 'could not copy' : label}</button>
  )
}

function AgentTranscript({ pathname }: { pathname: string }) {
  const markdownPath = agentMarkdownPath(pathname)
  const markdownLabel = markdownPath.split('/').at(-1) ?? 'markdown'
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(pathname, { headers: { Accept: 'text/markdown' }, cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok || !response.headers.get('content-type')?.startsWith('text/markdown')) throw new Error('Unexpected response')
        const markdown = await response.text()
        if (controller.signal.aborted) return
        const headers = ['content-type', 'vary', 'cache-control', 'link'].flatMap(name => {
          const value = response.headers.get(name)
          return value ? [`${name}: ${value}`] : []
        }).join('\n')
        setTranscript({ status: response.status, headers, markdown })
      })
      .catch(() => { if (!controller.signal.aborted) setTranscript({ error: true }) })
    return () => controller.abort()
  }, [pathname, attempt])

  const command = `curl -i -H 'Accept: text/markdown' ${typeof window === 'undefined' ? pathname : `${window.location.origin}${pathname}`}`
  return (
    <section aria-labelledby="agent-heading" className="pb-8">
      <h1 id="agent-heading" className="mb-4 text-3xl font-semibold tracking-tight">agent view</h1>
      <p className="mb-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">this page as markdown, fetched with the same request an agent makes.</p>
      <div className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-neutral-200 p-4 text-xs leading-6 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
        <code className="min-w-0 break-all">{command}</code>
        <CopyButton text={command} label="copy request" />
      </div>
      {!transcript ? <p role="status" className="py-6 text-sm text-neutral-600 dark:text-neutral-400">loading markdown…</p> : 'error' in transcript ? (
        <div role="alert" className="space-y-3 py-6 text-sm">
          <p>could not load the markdown.</p>
          <button type="button" className="mr-5 underline underline-offset-4" onClick={() => { setTranscript(null); setAttempt(value => value + 1) }}>try again</button>
          <a href={markdownPath} className="underline underline-offset-4">open markdown</a>
        </div>
      ) : (
        <>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-xs leading-6 break-words dark:border-neutral-800 dark:bg-neutral-900/50"><code><span className="text-neutral-500">{`status: ${transcript.status}\n${transcript.headers}\n\n`}</span>{transcript.markdown}</code></pre>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-xs text-neutral-600 dark:text-neutral-400">
            <CopyButton text={transcript.markdown} label="copy markdown" />
            <a href={markdownPath} className="underline underline-offset-4">{markdownLabel}</a>
            <a href={llmsTxtPath} className="underline underline-offset-4">llms.txt</a>
          </div>
        </>
      )}
    </section>
  )
}
