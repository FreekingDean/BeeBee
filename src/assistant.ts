import { searchProviders } from './npi'
import { gestation, todayIso } from './pregnancy'
import { uid, type Update } from './store'
import type { Action, ChatMsg, Person, State, ToolCall } from './types'

const BASE = '/api/llm/v1'

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[]) => ({
  type: 'function',
  function: { name, description, parameters: { type: 'object', properties, required } },
})

const tools = [
  fn(
    'search_providers',
    'Search the US national provider registry (NPI) for a doctor or hospital. Returns up to 5 matches.',
    {
      role: { type: 'string', enum: ['OB', 'MFM', 'Genetic Counselor', 'Labor Hospital', 'Pediatrician'] },
      state: { type: 'string', description: 'Two-letter US state code' },
      city: { type: 'string' },
      name: { type: 'string', description: 'Doctor name as the user said it, e.g. "Fisher" or "Allan Fisher"; or hospital name' },
    },
    ['role', 'state'],
  ),
  fn(
    'add_provider',
    'Add a doctor, hospital, or practice to the care team. Use details from search_providers when available.',
    {
      role: { type: 'string', enum: ['OB', 'GYN', 'MFM', 'Genetic Counselor', 'Labor Hospital', 'Practice', 'Pediatrician', 'Doula', 'Other'] },
      name: { type: 'string' },
      practice: { type: 'string' },
      phone: { type: 'string' },
      address: { type: 'string' },
      npi: { type: 'string' },
    },
    ['role', 'name'],
  ),
  fn(
    'add_task',
    'Add a to-do with a pregnancy-week window.',
    {
      title: { type: 'string' },
      category: { type: 'string', enum: ['medical', 'admin', 'home', 'learn', 'pediatric'] },
      startWeek: { type: 'integer' },
      endWeek: { type: 'integer' },
      owner: { type: 'string', enum: ['birth', 'partner', 'both'] },
    },
    ['title', 'category', 'startWeek', 'endWeek'],
  ),
  fn('complete_task', 'Mark an existing task done by id.', { id: { type: 'string' } }, ['id']),
  fn(
    'add_appointment',
    'Add an appointment.',
    { title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' }, time: { type: 'string', description: 'HH:MM' } },
    ['title', 'date'],
  ),
  fn(
    'add_shopping',
    'Add an item to the baby shopping checklist.',
    {
      item: { type: 'string' },
      category: { type: 'string', enum: ['nursery', 'feeding', 'diapering', 'clothing', 'gear', 'bath & health', 'hospital bag', 'for mom', 'other'] },
      buyByWeek: { type: 'integer' },
      url: { type: 'string', description: 'Product link, if you found one' },
    },
    ['item', 'buyByWeek'],
  ),
  fn(
    'search_reviews',
    'Search real parent discussions (Reddit parenting subs) for opinions on a product or brand. Returns threads with id, title, excerpt, score.',
    { query: { type: 'string', description: 'e.g. "Spectra S1 vs Medela pump"' } },
    ['query'],
  ),
  fn('read_thread', 'Read a discussion thread from search_reviews in full: post body and top comments.', { id: { type: 'string' } }, ['id']),
  fn(
    'search_products',
    'Search retailer catalogs for a product. Returns name, price, rating, review count, and link.',
    { query: { type: 'string' } },
    ['query'],
  ),
]

async function get(path: string, params: Record<string, string>) {
  const res = await fetch(`${path}?${new URLSearchParams(params)}`)
  const data = await res.json()
  if (!res.ok) return `Error: ${data.error ?? res.status}`
  return JSON.stringify(data)
}

function snapshot(s: State, who: Person) {
  const week = s.dueDate ? gestation(s.dueDate).week : 0
  const open = s.tasks.filter((t) => !t.done)
  const homeState = s.providers.map((p) => p.address?.match(/, ([A-Z]{2}) \d{5}/)?.[1]).find(Boolean)
  return {
    today: todayIso(),
    talkingTo: s.names[who],
    birthParent: s.names.birth,
    partner: s.names.partner,
    dueDate: s.dueDate,
    week,
    homeState: homeState ?? 'unknown, ask if needed',
    careTeam: s.providers.map((p) => ({ role: p.role, name: p.name, practice: p.practice })),
    upcomingAppointments: s.appointments.filter((a) => a.date >= todayIso()).map((a) => ({ title: a.title, date: a.date })),
    tasksSlipped: open.filter((t) => t.endWeek < week).map((t) => ({ id: t.id, title: t.title, by: t.endWeek })),
    tasksNow: open.filter((t) => t.startWeek <= week && t.endWeek >= week).map((t) => ({ id: t.id, title: t.title, owner: t.owner })),
    tasksNext4Weeks: open.filter((t) => t.startWeek > week && t.startWeek <= week + 4).map((t) => t.title),
    shoppingDueSoon: s.shopping.filter((x) => !x.bought && x.buyByWeek <= week + 4).map((x) => x.item),
    recentFindings: s.findings.filter((f) => who === 'birth' || !f.private).slice(-5).map((f) => `${f.date} ${f.title}`),
  }
}

const system = `You are a warm, practical pregnancy planning assistant chatting with one of two expecting parents. You can see their tracker and can change it with tools.
Style: short, friendly, one question at a time. Talk like a helpful friend, not a form.
How to help:
- Lead with the single most important gap for their week (missing OB, unbooked screening, slipped task, etc.) and ask about it.
- When they name a doctor or hospital, call search_providers with the last name and their state (ask for the state or city if unknown), pick the match that fits what they said, and add it with add_provider including phone, address, and npi from the result. If several plausible matches, list them briefly and ask which.
- If they mention a practice or group, store it in the practice field.
- When they say they've done something, use complete_task on the matching task id.
- When they mention a date for something, add_appointment.
- When they want help picking a product (pump, car seat, stroller…): search_reviews for what real parents say, read_thread on the 1-2 most relevant threads, then search_products for current price and rating. Recommend 2-3 options with one line each on why, with price. Offer to add the pick to their shopping list with add_shopping including the url.
- If a search tool says it is not configured, say so plainly and tell them which .env keys enable it.
- After acting, confirm in one line and move to the next useful thing or ask if there's anything else.
- Never give diagnostic medical advice; point to their OB for anything clinical.`

export const START = '(Start the conversation. Greet briefly and raise the most important thing.)'

export function describeCall(c: ToolCall) {
  let a: Record<string, string>
  try {
    a = JSON.parse(c.function.arguments || '{}')
  } catch {
    return `${c.function.name}…`
  }
  switch (c.function.name) {
    case 'search_providers':
      return `Searched ${a.role}${a.name ? ` "${a.name}"` : ''} in ${a.city ? `${a.city}, ` : ''}${a.state}`
    case 'add_provider':
      return `Added ${a.name} as ${a.role}`
    case 'add_task':
      return `Added to-do: ${a.title}`
    case 'complete_task':
      return 'Marked a task done'
    case 'add_appointment':
      return `Added appointment: ${a.title} on ${a.date}`
    case 'add_shopping':
      return `Added to shopping: ${a.item}`
    case 'search_reviews':
      return `Searched parent reviews for "${a.query}"`
    case 'read_thread':
      return 'Read a discussion thread'
    case 'search_products':
      return `Searched products for "${a.query}"`
    default:
      return c.function.name
  }
}

export type Progress = (m: ChatMsg, replaceLast?: boolean) => void

export async function chat(state: State, who: Person, userText: string, update: Update, onProgress: Progress) {
  const history: ChatMsg[] = [...state.chat, { role: 'user', content: userText, hidden: userText === START }]
  onProgress(history[history.length - 1])
  const push = (m: ChatMsg) => {
    history.push(m)
    onProgress(m)
  }

  for (let round = 0; round < 8; round++) {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: system }, { role: 'user', content: `Tracker snapshot:\n${JSON.stringify(snapshot(state, who))}` }, ...history.map(strip)],
        tools,
        temperature: 0.4,
        stream: true,
      }),
    })
    if (!res.ok || !res.body) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`)

    const msg: ChatMsg & { role: 'assistant' } = { role: 'assistant', content: null }
    push(msg)
    for await (const delta of sse(res.body)) {
      if (delta.content) msg.content = (msg.content ?? '') + delta.content
      for (const tc of delta.tool_calls ?? []) {
        const calls = (msg.tool_calls ??= [])
        const cur = (calls[tc.index] ??= { id: tc.id ?? `call_${round}_${tc.index}`, function: { name: '', arguments: '' } })
        if (tc.id) cur.id = tc.id
        cur.function.name += tc.function?.name ?? ''
        cur.function.arguments += tc.function?.arguments ?? ''
      }
      onProgress({ ...msg, tool_calls: msg.tool_calls?.map((c) => ({ ...c, function: { ...c.function } })) }, true)
    }
    if (!msg.tool_calls?.length) return

    for (const call of msg.tool_calls) {
      const args = JSON.parse(call.function.arguments || '{}')
      let result = 'done'
      if (call.function.name === 'search_providers') {
        const r = await searchProviders(args)
        result = r.length
          ? JSON.stringify(r.slice(0, 5).map((p) => ({ name: p.name, specialty: p.specialty, phone: p.phone, address: p.address, npi: p.npi })))
          : 'No matches. Try without city, or a shorter name prefix.'
      } else if (call.function.name === 'search_reviews') {
        result = await get('/api/reviews', { q: args.query })
      } else if (call.function.name === 'read_thread') {
        result = await get('/api/reviews/thread', { id: args.id })
      } else if (call.function.name === 'search_products') {
        result = await get('/api/products', { q: args.query })
      } else {
        update((s) => applyAction(s, { type: call.function.name, ...args } as Action))
      }
      push({ role: 'tool', tool_call_id: call.id, content: result })
    }
  }
}

type Delta = { content?: string | null; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] }

async function* sse(body: ReadableStream<Uint8Array>): AsyncGenerator<Delta> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) return
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      const delta = (JSON.parse(data) as { choices: { delta: Delta }[] }).choices[0]?.delta
      if (delta) yield delta
    }
  }
}

function strip(m: ChatMsg) {
  if (m.role === 'user') return { role: m.role, content: m.content }
  if (m.role === 'assistant' && m.tool_calls) return { ...m, content: m.content ?? '', tool_calls: m.tool_calls.map((c) => ({ ...c, type: 'function' })) }
  return m
}

export function applyAction(s: State, a: Action): State {
  switch (a.type) {
    case 'add_task':
      return { ...s, tasks: [...s.tasks, { id: uid(), title: a.title, category: a.category, owner: a.owner ?? 'both', startWeek: a.startWeek, endWeek: a.endWeek, done: false }] }
    case 'add_shopping':
      return { ...s, shopping: [...s.shopping, { id: uid(), item: a.item, category: a.category ?? 'other', buyByWeek: a.buyByWeek, bought: false, url: a.url }] }
    case 'add_appointment':
      return { ...s, appointments: [...s.appointments, { id: uid(), title: a.title, date: a.date, time: a.time }] }
    case 'add_provider':
      return { ...s, providers: [...s.providers, { id: uid(), role: a.role, name: a.name, practice: a.practice, phone: a.phone, address: a.address, npi: a.npi }] }
    case 'complete_task':
      return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, done: true } : t)) }
    default:
      return s
  }
}
