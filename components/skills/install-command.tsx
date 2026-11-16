'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

type CopyState = 'idle' | 'copied' | 'error'

function useCopy() {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  async function copy(text: string) {
    clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('error')
    }
    timer.current = setTimeout(() => setState('idle'), 2000)
  }
  return { state, copy, reset: () => setState('idle') }
}

function Status({ state, text }: { state: CopyState; text: string }) {
  return <span className="sr-only" aria-live="polite">{state === 'copied' ? `copied ${text}` : state === 'error' ? 'could not copy' : ''}</span>
}

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500'

// A terminal-style install card: switch between the shell command and a prompt that asks
// your agent to run it, then copy whichever is showing.
export function InstallCommand({ command, prompt }: { command: string; prompt: string }) {
  const [format, setFormat] = useState<'command' | 'prompt'>('command')
  const { state, copy, reset } = useCopy()
  const text = format === 'prompt' ? prompt : command

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-2 dark:border-neutral-800 dark:bg-neutral-900/70">
        <div role="group" aria-label="Copy format" className="flex items-center">
          {(['command', 'prompt'] as const).map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={format === option}
              onClick={() => { setFormat(option); reset() }}
              className={`relative px-2.5 py-2.5 text-xs text-neutral-500 transition-colors hover:text-neutral-950 aria-pressed:text-neutral-950 aria-pressed:after:absolute aria-pressed:after:inset-x-2.5 aria-pressed:after:-bottom-px aria-pressed:after:h-px aria-pressed:after:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100 dark:aria-pressed:text-neutral-100 dark:aria-pressed:after:bg-neutral-100 ${focus}`}
            >
              {option}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => copy(text)}
          className={`ml-auto flex items-center gap-1.5 rounded px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 ${focus}`}
        >
          {state === 'copied'
            ? <Check aria-hidden="true" className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            : <Copy aria-hidden="true" className="size-3.5" />}
          {state === 'copied' ? 'copied' : state === 'error' ? 'copy failed' : `copy ${format}`}
          <Status state={state} text={format} />
        </button>
      </div>
      <div className="px-4 py-3.5 font-mono text-sm leading-6 text-neutral-800 [overflow-wrap:anywhere] dark:text-neutral-200">
        {format === 'command'
          ? (
            <code>
              <span className="mr-2 select-none text-neutral-400 dark:text-neutral-600">$</span>
              {/* Wrap between words only, so `pr-babysit` never splits at its hyphen. */}
              {command.split(' ').map((word, index) => (
                <span key={index}>
                  {index > 0 && ' '}
                  <span className={`whitespace-nowrap ${word.startsWith('-') ? 'text-neutral-500 dark:text-neutral-400' : ''}`}>{word}</span>
                </span>
              ))}
            </code>
          )
          : <p className="text-neutral-700 dark:text-neutral-300">{prompt}</p>}
      </div>
    </div>
  )
}

export function CopyIconButton({ text, label, className = '' }: { text: string; label: string; className?: string }) {
  const { state, copy } = useCopy()
  return (
    <button
      type="button"
      onClick={() => copy(text)}
      aria-label={label}
      title={text}
      className={`grid size-8 shrink-0 place-items-center rounded-md border border-transparent text-neutral-400 transition-colors hover:border-neutral-200 hover:bg-white hover:text-neutral-950 dark:text-neutral-500 dark:hover:border-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-100 ${focus} ${className}`}
    >
      {state === 'copied'
        ? <Check aria-hidden="true" className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        : <Copy aria-hidden="true" className="size-3.5" />}
      <Status state={state} text="install command" />
    </button>
  )
}
