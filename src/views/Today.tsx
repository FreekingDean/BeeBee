import { fmtDate, gestation, todayIso, trimester } from '../pregnancy'
import { mine, other } from '../session'
import { patch, type Update } from '../store'
import type { Person, State } from '../types'
import { Card, Check, Empty, Tag } from '../ui'

export function Today({ state, update, go, who }: { state: State; update: Update; go: (tab: string) => void; who: Person }) {
  if (!state.dueDate) return null

  const today = todayIso()
  const { week, day, daysLeft } = gestation(state.dueDate)
  const providerName = (id?: string) => state.providers.find((p) => p.id === id)?.name

  const upcoming = state.appointments
    .filter((a) => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)

  const open = state.tasks.filter((t) => !t.done)
  const active = open.filter((t) => t.startWeek <= week && t.endWeek >= week).sort((a, b) => a.endWeek - b.endWeek)
  const now = active.filter((t) => mine(t.owner, who))
  const theirs = active.filter((t) => !mine(t.owner, who))
  const slipped = open.filter((t) => t.endWeek < week && mine(t.owner, who))
  const soon = open.filter((t) => t.startWeek > week && t.startWeek <= week + 2 && mine(t.owner, who))

  const toBuy = state.shopping
    .filter((s) => !s.bought && s.buyByWeek <= week + 3)
    .sort((a, b) => a.buyByWeek - b.buyByWeek)

  const reading = state.resources.filter((r) => !r.done && r.fromWeek <= week).slice(0, 3)

  const toggleTask = (id: string, done: boolean) => update((s) => ({ ...s, tasks: patch(s.tasks, id, { done }) }))

  return (
    <div className="space-y-4">
      <div className="hero">
        <div className="text-sm opacity-80">
          Hi {state.names[who]} · {state.babyName} · trimester {trimester(week)}
        </div>
        <div className="text-4xl font-bold">
          {week}w {day}d
        </div>
        <div className="mt-1 text-sm opacity-90">
          {daysLeft > 0 ? `${daysLeft} days until ${fmtDate(state.dueDate)}` : `Due ${fmtDate(state.dueDate)}`}
        </div>
      </div>

      {state.chat.length > 0 && lastAssistantLine(state) && (
        <Card title="Assistant" right={<button onClick={() => go('Assistant')} className="link">open chat</button>}>
          <p className="text-sm">{lastAssistantLine(state)}</p>
        </Card>
      )}

      <Card title="Next appointments" right={<button onClick={() => go('Appointments')} className="link">all</button>}>
        {upcoming.length === 0 && <Empty>Nothing booked. Add one under Appointments.</Empty>}
        {upcoming.map((a) => (
          <div key={a.id} className="flex items-baseline justify-between py-1.5 text-sm">
            <span>
              {a.title}
              {providerName(a.providerId) && <span className="text-faint"> · {providerName(a.providerId)}</span>}
            </span>
            <span>
              {fmtDate(a.date)}
              {a.time && ` ${a.time}`}
            </span>
          </div>
        ))}
      </Card>

      {slipped.length > 0 && (
        <Card title="Slipped past their window">
          {slipped.map((t) => (
            <Check key={t.id} checked={t.done} onChange={(v) => toggleTask(t.id, v)}>
              {t.title} <Tag>by wk {t.endWeek}</Tag>
            </Check>
          ))}
        </Card>
      )}

      <Card title="This week, for you" right={<button onClick={() => go('To-do')} className="link">all</button>}>
        {now.length === 0 && <Empty>Nothing due this week. Enjoy it.</Empty>}
        {now.map((t) => (
          <Check key={t.id} checked={t.done} onChange={(v) => toggleTask(t.id, v)}>
            {t.title} <Tag>{t.category}</Tag> <Tag>wk {t.startWeek}–{t.endWeek}</Tag>
          </Check>
        ))}
        {theirs.length > 0 && (
          <details className="mt-2">
            <summary>
              {theirs.length} on {state.names[other(who)]}'s plate
            </summary>
            {theirs.map((t) => (
              <Check key={t.id} checked={t.done} onChange={(v) => toggleTask(t.id, v)}>
                {t.title} <Tag>wk {t.startWeek}–{t.endWeek}</Tag>
              </Check>
            ))}
          </details>
        )}
      </Card>

      {soon.length > 0 && (
        <Card title="Coming up">
          {soon.map((t) => (
            <div key={t.id} className="py-1 text-sm text-muted">
              {t.title} <Tag>from wk {t.startWeek}</Tag>
            </div>
          ))}
        </Card>
      )}

      {toBuy.length > 0 && (
        <Card title="Buy soon" right={<button onClick={() => go('Baby stuff')} className="link">all</button>}>
          {toBuy.map((s) => (
            <Check
              key={s.id}
              checked={s.bought}
              onChange={(v) => update((st) => ({ ...st, shopping: patch(st.shopping, s.id, { bought: v }) }))}
            >
              {s.item} <Tag>by wk {s.buyByWeek}</Tag>
            </Check>
          ))}
        </Card>
      )}

      {reading.length > 0 && (
        <Card title="Worth a look" right={<button onClick={() => go('Library')} className="link">all</button>}>
          {reading.map((r) => (
            <div key={r.id} className="py-1 text-sm">
              {r.title} <span className="text-faint">· {r.author}</span> <Tag>{r.type}</Tag>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function lastAssistantLine(s: State) {
  return [...s.chat].reverse().find((m) => m.role === 'assistant' && m.content)?.content ?? ''
}
