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
    'set_due_date',
    'Change the due date, e.g. after a dating ultrasound moves it. Confirm the new date with the user first.',
    { date: { type: 'string', description: 'YYYY-MM-DD' } },
    ['date'],
  ),
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
    'add_finding',
    'Record a finding: scan result, measurement, test result, heartbeat, weight.',
    {
      title: { type: 'string', description: 'e.g. "Heartbeat 160 bpm", "NIPT low risk"' },
      detail: { type: 'string' },
      date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
      private: { type: 'boolean', description: 'Only the birth parent can see it' },
    },
    ['title'],
  ),
  fn('set_baby', "Update the baby's nickname or sex.", { name: { type: 'string' }, sex: { type: 'string', enum: ['girl', 'boy', 'unknown'] } }, []),
  fn('set_parent_names', 'Update what the two parents are called.', { birth: { type: 'string' }, partner: { type: 'string' } }, []),
  fn(
    'add_purchase',
    'Log something that was actually bought and what it cost.',
    { item: { type: 'string' }, cost: { type: 'number' }, date: { type: 'string', description: 'YYYY-MM-DD' }, store: { type: 'string' } },
    ['item', 'cost'],
  ),
  fn('add_question', 'Add a question to ask the pediatrician.', { text: { type: 'string' } }, ['text']),
  fn('answer_question', 'Record the answer to a pediatrician question by id.', { id: { type: 'string' }, answer: { type: 'string' } }, ['id', 'answer']),
  fn(
    'add_resource',
    'Add a book, podcast, or website to the library.',
    { kind: { type: 'string', enum: ['book', 'podcast', 'site'] }, title: { type: 'string' }, author: { type: 'string' }, url: { type: 'string' }, fromWeek: { type: 'integer' } },
    ['kind', 'title'],
  ),
  fn('mark_bought', 'Mark a shopping item as bought by id.', { id: { type: 'string' } }, ['id']),
  fn('mark_read', 'Mark a library resource as finished by id.', { id: { type: 'string' } }, ['id']),
  fn(
    'remove_item',
    'Remove something by id. Confirm with the user first.',
    { kind: { type: 'string', enum: ['provider', 'appointment', 'task', 'shopping', 'purchase', 'question', 'resource'] }, id: { type: 'string' } },
    ['kind', 'id'],
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
    'Search baby-product catalogs (Babylist, plus Walmart if configured). Returns name, price, summary, and link.',
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
    baby: { name: s.babyName, sex: s.sex },
    careTeam: s.providers.map((p) => ({ id: p.id, role: p.role, name: p.name, practice: p.practice })),
    upcomingAppointments: s.appointments.filter((a) => a.date >= todayIso()).map((a) => ({ id: a.id, title: a.title, date: a.date })),
    tasksSlipped: open.filter((t) => t.endWeek < week).map((t) => ({ id: t.id, title: t.title, by: t.endWeek })),
    tasksNow: open.filter((t) => t.startWeek <= week && t.endWeek >= week).map((t) => ({ id: t.id, title: t.title, owner: t.owner })),
    tasksNext4Weeks: open.filter((t) => t.startWeek > week && t.startWeek <= week + 4).map((t) => ({ id: t.id, title: t.title })),
    shoppingDueSoon: s.shopping.filter((x) => !x.bought && x.buyByWeek <= week + 4).map((x) => ({ id: x.id, item: x.item })),
    recentFindings: s.findings.filter((f) => who === 'birth' || !f.private).slice(-5).map((f) => ({ id: f.id, date: f.date, title: f.title })),
    pediatricQuestions: s.pediatricQuestions.map((q) => ({ id: q.id, text: q.text, answered: Boolean(q.answer) })),
    unreadResources: s.resources.filter((r) => !r.done).map((r) => ({ id: r.id, kind: r.type, title: r.title })),
    spent: s.purchases.reduce((n, p) => n + p.cost, 0),
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
- When they share a result from a scan, test, or visit (heartbeat, measurements, NIPT, glucose, weight), add_finding so it's remembered.
- When they say they bought something, mark_bought if it's on the list and add_purchase with the cost if they mention one.
- When they want help picking a product (pump, car seat, stroller…): search_reviews for what real parents say, read_thread on the 1-2 most relevant threads, then search_products for current price and rating. Recommend 2-3 options with one line each on why, with price. Offer to add the pick to their shopping list with add_shopping including the url.
- If a search tool says it is not configured, say so plainly and tell them which .env keys enable it.
- After acting, confirm in one line and move to the next useful thing or ask if there's anything else.
- Never give diagnostic medical advice; point to their OB for anything clinical.`

export const START = '(Start the conversation. Greet briefly and raise the most important thing.)'

const icons: Record<string, string> = {
  search_providers: '🔍',
  add_provider: '🩺',
  add_task: '📝',
  complete_task: '✅',
  add_appointment: '📅',
  set_due_date: '🗓️',
  add_finding: '🩻',
  set_baby: '👶',
  set_parent_names: '👪',
  add_purchase: '💸',
  add_question: '❓',
  answer_question: '💡',
  add_resource: '📚',
  mark_bought: '🛍️',
  mark_read: '📗',
  remove_item: '🗑️',
  add_shopping: '🛒',
  search_reviews: '💬',
  read_thread: '📖',
  search_products: '🏷️',
}

export const iconFor = (name: string) => icons[name] ?? '⚙️'

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
    case 'set_due_date':
      return `Due date changed to ${a.date}`
    case 'add_finding':
      return `Recorded finding: ${a.title}`
    case 'set_baby':
      return 'Updated baby details'
    case 'set_parent_names':
      return 'Updated parent names'
    case 'add_purchase':
      return `Logged purchase: ${a.item}`
    case 'add_question':
      return `Added pediatrician question: ${a.text}`
    case 'answer_question':
      return 'Recorded an answer'
    case 'add_resource':
      return `Added to library: ${a.title}`
    case 'mark_bought':
      return 'Marked an item bought'
    case 'mark_read':
      return 'Marked a resource finished'
    case 'remove_item':
      return `Removed a ${a.kind}`
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
    case 'set_due_date':
      return isoDate(a.date) ? { ...s, dueDate: a.date } : s
    case 'add_finding':
      return { ...s, findings: [...s.findings, { id: uid(), title: a.title, detail: a.detail, date: isoDate(a.date) ? a.date! : todayIso(), private: a.private }] }
    case 'set_baby':
      return { ...s, babyName: a.name?.trim() || s.babyName, sex: a.sex ?? s.sex }
    case 'set_parent_names':
      return { ...s, names: { birth: a.birth?.trim() || s.names.birth, partner: a.partner?.trim() || s.names.partner } }
    case 'add_purchase':
      return { ...s, purchases: [...s.purchases, { id: uid(), item: a.item, cost: Number(a.cost) || 0, date: isoDate(a.date) ? a.date! : todayIso(), store: a.store }] }
    case 'add_question':
      return { ...s, pediatricQuestions: [...s.pediatricQuestions, { id: uid(), text: a.text }] }
    case 'answer_question':
      return { ...s, pediatricQuestions: s.pediatricQuestions.map((q) => (q.id === a.id ? { ...q, answer: a.answer } : q)) }
    case 'add_resource':
      return { ...s, resources: [...s.resources, { id: uid(), type: a.kind, title: a.title, author: a.author, url: a.url, fromWeek: a.fromWeek ?? 1, done: false }] }
    case 'mark_bought':
      return { ...s, shopping: s.shopping.map((x) => (x.id === a.id ? { ...x, bought: true } : x)) }
    case 'mark_read':
      return { ...s, resources: s.resources.map((r) => (r.id === a.id ? { ...r, done: true } : r)) }
    case 'remove_item': {
      const drop = <T extends { id: string }>(list: T[]) => list.filter((x) => x.id !== a.id)
      switch (a.kind) {
        case 'provider':
          return { ...s, providers: drop(s.providers) }
        case 'appointment':
          return { ...s, appointments: drop(s.appointments) }
        case 'task':
          return { ...s, tasks: drop(s.tasks) }
        case 'shopping':
          return { ...s, shopping: drop(s.shopping) }
        case 'purchase':
          return { ...s, purchases: drop(s.purchases) }
        case 'question':
          return { ...s, pediatricQuestions: drop(s.pediatricQuestions) }
        case 'resource':
          return { ...s, resources: drop(s.resources) }
        default:
          return s
      }
    }
    default:
      return s
  }
}

const isoDate = (d?: string) => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d))
