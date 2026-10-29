import { ImageResponse } from 'next/og'
import { posts } from '@/lib/blog'
import { siteName, siteDescription, siteUrl } from '@/lib/site'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = posts.find(post => post.slug === slug)
  if (!post && slug !== 'home') return new Response('Not found', { status: 404 })
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0a0a0a', color: '#f5f5f5', padding: '64px 72px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#a3a3a3' }}>
        <span>{siteName}</span><span>{post ? 'writing' : 'personal site'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', fontSize: 68, lineHeight: 1.12, letterSpacing: '-2px', maxWidth: 1020 }}>{post?.title ?? siteName}</div>
        <div style={{ display: 'flex', fontSize: 26, lineHeight: 1.4, color: '#a3a3a3', maxWidth: 960 }}>{post?.description ?? siteDescription}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #404040', paddingTop: 24, fontSize: 22, color: '#a3a3a3' }}>
        <span>{siteUrl.hostname.replace(/^www\./, '')}</span><span>{post?.date ?? 'build things. write about them.'}</span>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=0, s-maxage=86400' } },
  )
}
