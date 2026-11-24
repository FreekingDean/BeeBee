import type { NextConfig } from 'next'

// STATIC_EXPORT=1 builds a plain static site (used for GitHub Pages).
// BASE_PATH sets the sub-path it is served from, e.g. "/BeeBee".
const staticExport = process.env.STATIC_EXPORT === '1'
const basePath = process.env.BASE_PATH ?? ''

const config: NextConfig = {
  reactStrictMode: true,
  ...(staticExport && {
    output: 'export',
    basePath,
    trailingSlash: true,
    images: { unoptimized: true },
  }),
}

export default config
