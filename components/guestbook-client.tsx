'use client'

import { useState } from "react"

interface GuestbookEntry {
  id: number
  name: string
  message: string
  timestamp: string
}

interface GuestbookClientProps {
  initialEntries: GuestbookEntry[]
}

export function GuestbookClient({ initialEntries }: GuestbookClientProps) {
  const [entries, setEntries] = useState<GuestbookEntry[]>(initialEntries)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const fetchEntries = async () => {
    try {
      const response = await fetch('/api/guestbook')
      const data = await response.json()
      if (data.entries) {
        setEntries(data.entries)
      }
    } catch (error) {
      console.error('Failed to fetch entries:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/guestbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, message }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to sign guestbook')
        return
      }

      setSuccess(true)
      setName('')
      setMessage('')
      await fetchEntries()
    } catch (error) {
      setError('Failed to sign guestbook')
      console.error('Error signing guestbook:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      <p className="leading-relaxed text-base text-neutral-800 dark:text-neutral-200">
        drop a message. say hi. leave your mark.
      </p>

      {/* Entries List */}
      <div className="border-t border-neutral-300 dark:border-neutral-700 pt-8">
        <h2 className="font-semibold text-xl mb-6 tracking-tight text-neutral-900 dark:text-neutral-100">
          entries ({entries.length})
        </h2>

        {entries.length === 0 ? (
          <p className="text-neutral-600 dark:text-neutral-400">
            No entries yet. Be the first to sign!
          </p>
        ) : (
          <div className="space-y-6">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="border-l-2 border-neutral-300 dark:border-neutral-700 pl-4 py-2"
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {entry.name}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatDate(entry.timestamp)}
                  </span>
                </div>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {entry.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sign Form */}
      <div className="border-t border-neutral-300 dark:border-neutral-700 pt-8">
        <h2 className="font-semibold text-xl mb-4 tracking-tight text-neutral-900 dark:text-neutral-100">
          sign the guestbook
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
            >
              name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              placeholder="your name"
            />
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
            >
              message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              required
              rows={4}
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 resize-none"
              placeholder="your message..."
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {message.length}/500
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Thanks for signing the guestbook!
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 font-mono font-medium hover:bg-neutral-900 hover:text-neutral-100 dark:hover:bg-neutral-100 dark:hover:text-neutral-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '> signing...' : '> sign_guestbook'}
          </button>
        </form>
      </div>
    </div>
  )
}
