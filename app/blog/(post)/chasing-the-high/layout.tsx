import type { Metadata } from 'next'

const description = "i used to think i build because i love building. mostly true. but there's an engine underneath it that doesn't care what it runs on, and naming it changed how i work."

export const metadata: Metadata = {
  title: 'chasing the high',
  description,
  openGraph: {
    title: 'chasing the high',
    description,
  },
}

export default function ChasingTheHighLayout({ children }: { children: React.ReactNode }) {
  return children
}
