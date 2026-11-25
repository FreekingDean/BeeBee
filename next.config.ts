import type { NextConfig } from 'next'

// STATIC_EXPORT=1 builds a plain static site (used for GitHub Pages).
// BASE_PATH sets the sub-path it is served from, e.g. "/BeeBee".
const staticExport = process.env.STATIC_EXPORT === '1'
const basePath = process.env.BASE_PATH ?? ''

// CORS_ORIGIN lets a static copy of the app (e.g. on GitHub Pages) use this
// server's /api routes. Comma-separated origins, e.g. "https://you.github.io".
const corsOrigin = process.env.CORS_ORIGIN

const config: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  env: { NEXT_PUBLIC_STATIC_EXPORT: staticExport ? '1' : '' },
  ...(!staticExport &&
    corsOrigin && {
      async headers() {
        return corsOrigin.split(',').map((origin) => ({
          source: '/api/:path*',
          has: [{ type: 'header' as const, key: 'origin', value: origin.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }],
          headers: [
            { key: 'Access-Control-Allow-Origin', value: origin.trim() },
            { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
            { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
            { key: 'Vary', value: 'Origin' },
          ],
        }))
      },
    }),
  ...(staticExport && {
    output: 'export',
    basePath,
    trailingSlash: true,
    images: { unoptimized: true },
  }),
}

export default config
