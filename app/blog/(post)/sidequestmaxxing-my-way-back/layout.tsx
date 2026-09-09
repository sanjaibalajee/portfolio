import type { Metadata } from 'next'

const description = "early 2025. i tell myself i'm resting, but really i'm just scrolling, overthinking, watching life happen through a screen. how random sidequests, late nights, and saying yes to things that scared me pulled me out of that phase and made life feel real again."

export const metadata: Metadata = {
  title: 'sidequestmaxxing my way back',
  description,
  openGraph: {
    title: 'sidequestmaxxing my way back',
    description,
    images: [
      {
        url: '/images/sidequestmaxxing-my-way-back/og_image.png',
        width: 1200,
        height: 630,
        alt: 'sidequestmaxxing my way back',
      },
    ],
  },
}

export default function SidequestmaxxingLayout({ children }: { children: React.ReactNode }) {
  return children
}
