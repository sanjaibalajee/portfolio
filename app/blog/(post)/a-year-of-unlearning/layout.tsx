import { articleStructuredData, blogMetadata, posts } from '@/lib/blog'

export const metadata = blogMetadata('a-year-of-unlearning')

export default function AYearOfUnlearningLayout({ children }: { children: React.ReactNode }) {
  const post = posts.find(post => post.slug === 'a-year-of-unlearning')!
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData(post)).replace(/</g, '\\u003c') }} />
    {children}
  </>
}
