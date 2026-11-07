import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const base = () => (process.env.LLM_URL ?? 'http://localhost:8080').replace(/\/$/, '')

async function forward(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const url = `${base()}/${path.join('/')}${req.nextUrl.search}`
  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'GET' ? undefined : await req.text(),
    })
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    })
  } catch {
    return Response.json({ error: { message: `Could not reach the model server at ${base()}` } }, { status: 502 })
  }
}

export { forward as GET, forward as POST }
