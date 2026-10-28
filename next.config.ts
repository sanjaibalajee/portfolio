import type { NextConfig } from "next";
import createMDX from '@next/mdx'
import { resolve } from 'node:path'

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  redirects: async () => [
    { source: '/:path*', has: [{ type: 'host', value: 'sanjaibalajee\\.me' }], destination: 'https://www.sanjaibalajee.com/:path*', permanent: true },
    { source: '/:path*', has: [{ type: 'host', value: 'www\\.sanjaibalajee\\.me' }], destination: 'https://www.sanjaibalajee.com/:path*', permanent: true },
    { source: '/:path*', has: [{ type: 'host', value: 'sanjaibalajee\\.com' }], destination: 'https://www.sanjaibalajee.com/:path*', permanent: true },
  ],
  outputFileTracingIncludes: {
    '/markdown/**': ['./app/blog/**/page.mdx'],
    '/': ['./app/blog/**/page.mdx'],
    '/index.md': ['./app/blog/**/page.mdx'],
    '/blog': ['./app/blog/**/page.mdx'],
    '/blog/*': ['./app/blog/**/page.mdx'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.fanpit.app',
        port: '',
        pathname: '/banners/**',
        search: '',
      },
    ],
  },
};

const withMDX = createMDX({
  options: { remarkPlugins: [resolve('./lib/remark-heading-ids.mjs')] },
})

export default withMDX(nextConfig);
