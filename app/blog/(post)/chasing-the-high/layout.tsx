import { articleStructuredData, blogMetadata, posts } from '@/lib/blog'

export const metadata = blogMetadata('chasing-the-high')

export default function ChasingTheHighLayout({ children }: { children: React.ReactNode }) {
  const post = posts.find(post => post.slug === 'chasing-the-high')!
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData(post)).replace(/</g, '\\u003c') }} />
    {children}
  </>
}
