const store = new Map<string, string>()
Object.assign(global, {
  localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) },
  window: { dispatchEvent: () => true },
})

type Mod = typeof import('../settings')
const load = (staticExport: boolean): Mod => {
  process.env.NEXT_PUBLIC_STATIC_EXPORT = staticExport ? '1' : ''
  let mod!: Mod
  jest.isolateModules(() => {
    mod = require('../settings')
  })
  return mod
}

beforeEach(() => store.clear())

describe('settings', () => {
  test('with its own server, everything goes through /api', () => {
    const s = load(false)
    expect(s.apiBase()).toBe('')
    expect(s.llmEndpoint()).toEqual({ url: '/api/llm/v1/chat/completions', headers: {}, model: undefined })
  })

  test('as a static site, nothing works until configured', () => {
    const s = load(true)
    expect(s.apiBase()).toBeNull()
    expect(s.llmEndpoint()).toBeNull()
    const ready = s.featureStatus(s.loadSettings()).filter((f) => f.ready)
    expect(ready).toEqual([])
  })

  test('an AI key calls the provider directly', () => {
    const s = load(true)
    s.saveSettings({ ...s.emptySettings, llmUrl: ' https://api.openai.com/v1/ ', llmKey: 'sk-1', llmModel: 'gpt-4o-mini' })
    expect(s.llmEndpoint()).toEqual({ url: 'https://api.openai.com/v1/chat/completions', headers: { Authorization: 'Bearer sk-1' }, model: 'gpt-4o-mini' })
  })

  test('a backend URL serves the /api features', () => {
    const s = load(true)
    s.saveSettings({ ...s.emptySettings, backendUrl: 'https://beebee.example.com/' })
    expect(s.apiBase()).toBe('https://beebee.example.com')
    expect(s.llmEndpoint()?.url).toBe('https://beebee.example.com/api/llm/v1/chat/completions')
    const status = Object.fromEntries(s.featureStatus(s.loadSettings()).map((f) => [f.name, f.ready]))
    expect(status['Provider lookup (Care team)']).toBe(true)
    expect(status['Google Calendar import']).toBe(false)
  })
})

describe('reddit from the browser', () => {
  test('uses the installed-app grant with no secret', async () => {
    const { redditWith } = require('../server/adapters/reddit') as typeof import('../server/adapters/reddit')
    const calls: [string, RequestInit][] = []
    global.fetch = jest.fn(async (url: string, init: RequestInit) => {
      calls.push([url, init])
      if (url.includes('access_token')) return { ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) }
      return { ok: true, json: async () => ({ data: { children: [] } }) }
    }) as unknown as typeof fetch
    await redditWith(() => ({ id: 'abc' })).search('stroller')
    const [, auth] = calls[0]
    expect(auth.body).toContain('installed_client')
    expect((auth.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa('abc:')}`)
    expect(auth.headers).not.toHaveProperty('User-Agent')
    expect((calls[1][1].headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })
})
