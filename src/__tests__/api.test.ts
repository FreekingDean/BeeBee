import { NextRequest } from 'next/server'
import { GET as llm } from '../app/api/llm/[...path]/route'
import { GET as npi } from '../app/api/npi/route'
import { GET as products } from '../app/api/products/route'
import { GET as reviews } from '../app/api/reviews/route'
import { GET as sources } from '../app/api/sources/route'

const req = (url: string) => new NextRequest(`http://localhost${url}`)

beforeEach(() => {
  delete process.env.REDDIT_CLIENT_ID
  delete process.env.REDDIT_CLIENT_SECRET
  delete process.env.WALMART_CONSUMER_ID
  delete process.env.WALMART_PRIVATE_KEY_PATH
})

describe('sources', () => {
  test('reports what is configured', async () => {
    expect(await sources().json()).toEqual({
      reviews: [{ name: 'reddit', configured: false }],
      products: [
        { name: 'babylist', configured: true },
        { name: 'walmart', configured: false },
      ],
    })
    process.env.REDDIT_CLIENT_ID = 'id'
    process.env.REDDIT_CLIENT_SECRET = 'secret'
    expect((await sources().json()).reviews[0].configured).toBe(true)
  })
})

describe('reviews and products', () => {
  test('require q', async () => {
    expect((await reviews(req('/api/reviews'))).status).toBe(400)
    expect((await products(req('/api/products'))).status).toBe(400)
  })
  test('explain missing keys', async () => {
    const r = await reviews(req('/api/reviews?q=pump'))
    expect(r.status).toBe(503)
    expect((await r.json()).error).toContain('REDDIT_CLIENT_ID')
  })

  test('products aggregate the configured sources', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ products: [{ id: 1, brand: 'B', name: 'Crib', heroUrl: 'u', pricing: { current: 1 }, images: {} }] }) })) as unknown as typeof fetch
    const p = await products(req('/api/products?q=crib'))
    expect(p.status).toBe(200)
    expect((await p.json()).results).toEqual([expect.objectContaining({ source: 'babylist', name: 'Crib' })])
  })
})

describe('proxies', () => {
  test('npi forwards the query string', async () => {
    global.fetch = jest.fn(async () => new Response('{"ok":1}', { status: 200 })) as typeof fetch
    const r = await npi(req('/api/npi?version=2.1&last_name=Fisher*'))
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://npiregistry.cms.hhs.gov/api/?version=2.1&last_name=Fisher*')
    expect(await r.json()).toEqual({ ok: 1 })
  })

  test('llm forwards path and body to LLM_URL and streams back', async () => {
    process.env.LLM_URL = 'http://model:8080/'
    global.fetch = jest.fn(async () => new Response('data: x\n\n', { status: 200, headers: { 'Content-Type': 'text/event-stream' } })) as typeof fetch
    const r = await llm(new NextRequest('http://localhost/api/llm/v1/chat/completions', { method: 'POST', body: '{"stream":true}' }), { params: Promise.resolve({ path: ['v1', 'chat', 'completions'] }) })
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('http://model:8080/v1/chat/completions')
    expect(init).toMatchObject({ method: 'POST', body: '{"stream":true}' })
    expect(r.headers.get('Content-Type')).toBe('text/event-stream')
    expect(await r.text()).toBe('data: x\n\n')
  })

  test('llm reports an unreachable model server', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('ECONNREFUSED')
    }) as typeof fetch
    const r = await llm(req('/api/llm/v1/models'), { params: Promise.resolve({ path: ['v1', 'models'] }) })
    expect(r.status).toBe(502)
    expect((await r.json()).error.message).toContain('Could not reach')
  })
})
