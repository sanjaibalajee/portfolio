import type { Metadata } from 'next'

const description = "a diff of the beliefs I've upgraded, deleted, and rewritten over the past year"

export const metadata: Metadata = {
  title: 'a year of unlearning',
  description,
  openGraph: {
    title: 'a year of unlearning',
    description,
  },
}

export default function AYearOfUnlearningLayout({ children }: { children: React.ReactNode }) {
  return children
}
