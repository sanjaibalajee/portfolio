import { articleStructuredData, blogMetadata, posts } from '@/lib/blog'

export const metadata = blogMetadata('sidequestmaxxing-my-way-back')

export default function SidequestmaxxingLayout({ children }: { children: React.ReactNode }) {
  const post = posts.find(post => post.slug === 'sidequestmaxxing-my-way-back')!
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData(post)).replace(/</g, '\\u003c') }} />
    {children}
  </>
}
