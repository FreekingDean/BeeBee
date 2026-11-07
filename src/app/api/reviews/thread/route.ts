import type { NextRequest } from 'next/server'
import { active, reviewSources, unavailable } from '../../../../server/sources'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim()
  const source = req.nextUrl.searchParams.get('source') ?? 'reddit'
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
  const s = active(reviewSources).find((x) => x.name === source)
  if (!s) return unavailable('review')
  return Response.json(await s.thread(id))
}
