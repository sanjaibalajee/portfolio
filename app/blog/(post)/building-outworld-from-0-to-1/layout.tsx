import { articleStructuredData, blogMetadata, posts } from '@/lib/blog'

export const metadata = blogMetadata('building-outworld-from-0-to-1')

export default function OutworldStoryLayout({ children }: { children: React.ReactNode }) {
  const post = posts.find(post => post.slug === 'building-outworld-from-0-to-1')!
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData(post)).replace(/</g, '\\u003c') }} />
    {children}
  </>
}
