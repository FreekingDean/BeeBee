import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const upstream = await fetch(`https://npiregistry.cms.hhs.gov/api/?${req.nextUrl.searchParams}`)
  return new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': 'application/json' } })
}
