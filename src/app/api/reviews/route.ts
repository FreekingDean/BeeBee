import type { NextRequest } from 'next/server'
import { active, reviewSources, unavailable } from '../../../server/sources'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return Response.json({ error: 'q is required' }, { status: 400 })
  const sources = active(reviewSources)
  if (!sources.length) return unavailable('review')
  const results = await Promise.all(sources.map((s) => s.search(q)))
  return Response.json({ results: results.flat() })
}
