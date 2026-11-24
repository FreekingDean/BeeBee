import { fmtDate, gestation, todayIso, trimester } from '../pregnancy'
import { review } from '../review'
import { mine, other } from '../session'
import { patch, type Update } from '../store'
import type { Person, State } from '../types'
import { Card, Check, Empty, Tag } from '../ui'

type Props = { state: State; update: Update; go: (tab: string) => void; ask: (prompt: string) => void; who: Person }

export function Today({ state, update, go, ask, who }: Props) {
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
  const suggestions = review(state, who)

  const toggleTask = (id: string, done: boolean) => update((s) => ({ ...s, tasks: patch(s.tasks, id, { done }) }))

  return (
    <>
      <header className="hero">
        <p>
          Hi {state.names[who]} · {state.babyName} · trimester {trimester(week)}
        </p>
        <strong>
          {week}w {day}d
        </strong>
        <p>{daysLeft > 0 ? `${daysLeft} days until ${fmtDate(state.dueDate)}` : `Due ${fmtDate(state.dueDate)}`}</p>
      </header>

      {suggestions.length > 0 && (
        <Card title="Suggested next steps" right={<button onClick={() => go('Assistant')} className="link">open chat</button>}>
          <ul>
            {suggestions.map((x) => (
              <li key={x.title}>
                <strong>{x.title}</strong>
                <small>{x.why}</small>
                <button className="btn" onClick={() => ask(x.prompt)}>
                  Let's do it
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Next appointments" right={<button onClick={() => go('Appointments')} className="link">all</button>}>
        {upcoming.length === 0 && <Empty>Nothing booked. Add one under Appointments.</Empty>}
        <ul>
          {upcoming.map((a) => (
            <li key={a.id}>
              <span>
                {a.title}
                {providerName(a.providerId) && <small> · {providerName(a.providerId)}</small>}
              </span>
              <time dateTime={a.date}>
                {fmtDate(a.date)}
                {a.time && ` ${a.time}`}
              </time>
            </li>
          ))}
        </ul>
      </Card>

      {slipped.length > 0 && (
        <Card title="Slipped past their window">
          <ul>
            {slipped.map((t) => (
              <Check key={t.id} checked={t.done} onChange={(v) => toggleTask(t.id, v)}>
                {t.title} <Tag>by wk {t.endWeek}</Tag>
              </Check>
            ))}
          </ul>
        </Card>
      )}

      <Card title="This week, for you" right={<button onClick={() => go('To-do')} className="link">all</button>}>
        {now.length === 0 && <Empty>Nothing due this week. Enjoy it.</Empty>}
        <ul>
          {now.map((t) => (
            <Check key={t.id} checked={t.done} onChange={(v) => toggleTask(t.id, v)}>
              {t.title} <Tag>{t.category}</Tag> <Tag>wk {t.startWeek}–{t.endWeek}</Tag>
            </Check>
          ))}
        </ul>
        {theirs.length > 0 && (
          <details>
            <summary>
              {theirs.length} on {state.names[other(who)]}'s plate
            </summary>
            <ul>
              {theirs.map((t) => (
                <Check key={t.id} checked={t.done} onChange={(v) => toggleTask(t.id, v)}>
                  {t.title} <Tag>wk {t.startWeek}–{t.endWeek}</Tag>
                </Check>
              ))}
            </ul>
          </details>
        )}
      </Card>

      {soon.length > 0 && (
        <Card title="Coming up">
          <ul>
            {soon.map((t) => (
              <li key={t.id}>
                <span>
                  {t.title} <Tag>from wk {t.startWeek}</Tag>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {toBuy.length > 0 && (
        <Card title="Buy soon" right={<button onClick={() => go('Baby stuff')} className="link">all</button>}>
          <ul>
            {toBuy.map((s) => (
              <Check key={s.id} checked={s.bought} onChange={(v) => update((st) => ({ ...st, shopping: patch(st.shopping, s.id, { bought: v }) }))}>
                {s.item} <Tag>by wk {s.buyByWeek}</Tag>
              </Check>
            ))}
          </ul>
        </Card>
      )}

      {reading.length > 0 && (
        <Card title="Worth a look" right={<button onClick={() => go('Library')} className="link">all</button>}>
          <ul>
            {reading.map((r) => (
              <li key={r.id}>
                <span>
                  {r.title} <small>· {r.author}</small> <Tag>{r.type}</Tag>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
