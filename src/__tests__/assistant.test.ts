import { applyAction, chat, describeCall, START } from '../assistant'
import type { ChatMsg, State } from '../types'

const baseState = (): State => ({
  chat: [],
  dueDate: '2027-05-27',
  names: { birth: 'A', partner: 'B' },
  babyName: 'Bean',
  sex: 'unknown',
  providers: [],
  appointments: [],
  tasks: [{ id: 't1', title: 'Pick an OB', category: 'admin', owner: 'both', startWeek: 4, endWeek: 8, done: false }],
  findings: [],
  shopping: [],
  purchases: [],
  resources: [],
  pediatricQuestions: [],
})

type Delta = Record<string, unknown>
const sseBody = (deltas: Delta[]) => {
  const enc = new TextEncoder()
  const lines = [...deltas.map((d) => `data: ${JSON.stringify({ choices: [{ delta: d }] })}\n\n`), 'data: [DONE]\n\n']
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const l of lines) c.enqueue(enc.encode(l))
      c.close()
    },
  })
}
const words = (text: string): Delta[] => text.split(/(?<= )/).map((w) => ({ content: w }))
const call = (name: string, args: object, id = `c_${name}`): Delta[] => {
  const json = JSON.stringify(args)
  const pieces = json.match(/.{1,7}/g) ?? []
  return [{ tool_calls: [{ index: 0, id, function: { name, arguments: '' } }] }, ...pieces.map((p) => ({ tool_calls: [{ index: 0, function: { arguments: p } }] }))]
}

type Call = { url: string; body?: Record<string, unknown> }
function mockFetch(script: (c: Call, n: number) => unknown) {
  const calls: Call[] = []
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    const c: Call = { url, body: init?.body ? JSON.parse(init.body as string) : undefined }
    calls.push(c)
    const r = script(c, calls.length)
    if (r instanceof ReadableStream) return { ok: true, status: 200, body: r } as Response
    return { ok: true, status: 200, json: async () => r } as Response
  }) as typeof fetch
  return calls
}

function harness() {
  let state = baseState()
  const update = (fn: (s: State) => State) => {
    state = fn(state)
  }
  let ticks = 0
  const progress = (m: ChatMsg, replace?: boolean) => {
    if (replace) ticks++
    update((s) => ({ ...s, chat: replace ? [...s.chat.slice(0, -1), m] : [...s.chat, m] }))
  }
  return { get state() { return state }, update, progress, get ticks() { return ticks } }
}

describe('chat loop', () => {
  test('streams text into one assistant bubble', async () => {
    const h = harness()
    mockFetch(() => sseBody(words('Hi there! Do you have an OB yet?')))
    await chat(h.state, 'birth', START, h.update, h.progress)
    const msgs = h.state.chat
    expect(msgs[0]).toMatchObject({ role: 'user', hidden: true })
    expect(msgs[1]).toMatchObject({ role: 'assistant', content: 'Hi there! Do you have an OB yet?' })
    expect(msgs).toHaveLength(2)
    expect(h.ticks).toBeGreaterThan(3)
  })

  test('reassembles split tool calls, runs them, and feeds results back', async () => {
    const h = harness()
    const calls = mockFetch((c, n) => {
      if (c.url.startsWith('/api/npi')) return { results: [{ number: '1', enumeration_type: 'NPI-1', basic: { first_name: 'ALLAN', last_name: 'FISHER', credential: 'MD' }, other_names: [], addresses: [{ address_purpose: 'LOCATION', address_1: '95 MADISON AVE', city: 'MORRISTOWN', state: 'NJ', postal_code: '07960', telephone_number: '973' }], taxonomies: [{ desc: 'Obstetrics & Gynecology', primary: true }] }] }
      if (n === 1) return sseBody(call('search_providers', { role: 'OB', state: 'NJ', name: 'Fisher' }))
      if (n === 3) return sseBody(call('add_provider', { role: 'OB', name: 'Dr. Allan Fisher, MD', practice: 'Atlantic', npi: '1' }))
      return sseBody(words('Added them as your OB.'))
    })
    await chat(h.state, 'birth', 'I see Dr Fisher at Atlantic', h.update, h.progress)

    expect(h.state.providers).toEqual([expect.objectContaining({ role: 'OB', name: 'Dr. Allan Fisher, MD', practice: 'Atlantic', npi: '1' })])
    const roles = h.state.chat.map((m) => m.role)
    expect(roles).toEqual(['user', 'assistant', 'tool', 'assistant', 'tool', 'assistant'])

    const secondRequest = calls[2].body!.messages as Record<string, unknown>[]
    const echoed = secondRequest.find((m) => m.role === 'assistant' && m.tool_calls) as { tool_calls: { type: string }[]; content: string }
    expect(echoed.tool_calls[0].type).toBe('function')
    expect(echoed.content).toBe('')
    const toolResult = secondRequest.find((m) => m.role === 'tool') as { content: string }
    expect(toolResult.content).toContain('Dr. Allan Fisher')
  })

  test('review and product tools call the app API and relay errors', async () => {
    const h = harness()
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/reviews')) return { ok: false, status: 503, json: async () => ({ error: 'No review source is configured.' }) } as Response
      const body = JSON.parse(init!.body as string) as { messages: ChatMsg[] }
      const toolResults = body.messages.filter((m) => m.role === 'tool').length
      const stream = toolResults === 0 ? sseBody(call('search_reviews', { query: 'spectra s1' })) : sseBody(words('Reviews are not set up yet.'))
      return { ok: true, status: 200, body: stream } as Response
    }) as typeof fetch
    await chat(h.state, 'birth', 'which pump?', h.update, h.progress)
    const tool = h.state.chat.find((m) => m.role === 'tool') as { content: string }
    expect(tool.content).toBe('Error: No review source is configured.')
    expect(h.state.chat.at(-1)).toMatchObject({ content: 'Reviews are not set up yet.' })
  })

  test('throws on a non-OK model response', async () => {
    const h = harness()
    global.fetch = jest.fn(async () => ({ ok: false, status: 500, text: async () => 'Missing tool call type' })) as unknown as typeof fetch
    await expect(chat(h.state, 'birth', 'hi', h.update, h.progress)).rejects.toThrow('LLM 500')
  })
})

describe('applyAction', () => {
  test('adds and completes', () => {
    let s = baseState()
    s = applyAction(s, { type: 'add_shopping', item: 'Spectra S1', category: 'feeding', buyByWeek: 30, url: 'https://x' })
    s = applyAction(s, { type: 'add_appointment', title: 'Anatomy scan', date: '2027-01-10' })
    s = applyAction(s, { type: 'complete_task', id: 't1' })
    expect(s.shopping[0]).toMatchObject({ item: 'Spectra S1', url: 'https://x', bought: false })
    expect(s.appointments[0]).toMatchObject({ title: 'Anatomy scan' })
    expect(s.tasks[0].done).toBe(true)
  })

  test('defaults owner and category', () => {
    const s = applyAction(baseState(), { type: 'add_task', title: 'x', category: 'home', startWeek: 1, endWeek: 2 } as never)
    expect(s.tasks[1].owner).toBe('both')
  })
})

describe('describeCall', () => {
  test('describes complete calls and tolerates partial JSON', () => {
    expect(describeCall({ id: '1', function: { name: 'search_providers', arguments: '{"role":"OB","state":"NJ","name":"Fisher"}' } })).toBe('Searched OB "Fisher" in NJ')
    expect(describeCall({ id: '1', function: { name: 'search_products', arguments: '{"query":"stro' } })).toBe('search_products…')
  })
})
