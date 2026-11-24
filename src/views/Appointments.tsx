import { useState } from 'react'
import Link from 'next/link'
import { fetchUpcomingEvents, getCalendarToken, type CalendarEvent } from '../gcal'
import { googleClientId, useSettings } from '../settings'
import { fmtDate, todayIso } from '../pregnancy'
import { remove, uid, type Update } from '../store'
import type { Appointment, State } from '../types'
import { Card, Empty } from '../ui'

const blank = (): Appointment => ({ id: uid(), title: '', date: todayIso() })

export function Appointments({ state, update }: { state: State; update: Update }) {
  const [draft, setDraft] = useState<Appointment>(blank)
  const set = (p: Partial<Appointment>) => setDraft((d) => ({ ...d, ...p }))
  const today = todayIso()
  const sorted = [...state.appointments].sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = sorted.filter((a) => a.date >= today)
  const past = sorted.filter((a) => a.date < today).reverse()

  const add = () => {
    update((s) => ({ ...s, appointments: [...s.appointments, draft] }))
    setDraft(blank())
  }

  const Row = ({ a }: { a: Appointment }) => {
    const p = state.providers.find((x) => x.id === a.providerId)
    return (
      <li>
        <strong>{a.title}</strong>
        <small>
          {fmtDate(a.date)}
          {a.time && ` · ${a.time}`}
          {p && ` · ${p.name}`}
          {p?.address && ` · ${p.address}`}
        </small>
        {a.notes && <small>{a.notes}</small>}
        <button className="ghost" onClick={() => update((s) => ({ ...s, appointments: remove(s.appointments, a.id) }))}>
          remove
        </button>
      </li>
    )
  }

  return (
    <>
      <Card title="Add appointment">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input placeholder="What (e.g. anatomy scan)" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          <select value={draft.providerId ?? ''} onChange={(e) => set({ providerId: e.target.value || undefined })}>
            <option value="">— with whom —</option>
            {state.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.role})
              </option>
            ))}
          </select>
          <input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
          <input type="time" value={draft.time ?? ''} onChange={(e) => set({ time: e.target.value })} />
          <input className="wide" placeholder="Notes / questions to ask" value={draft.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
          <button className="btn" disabled={!draft.title || !draft.date}>
            Add
          </button>
        </form>
      </Card>

      <CalendarImport state={state} update={update} />

      <Card title="Upcoming">
        {upcoming.length === 0 && <Empty>Nothing scheduled.</Empty>}
        <ul>
          {upcoming.map((a) => (
            <Row key={a.id} a={a} />
          ))}
        </ul>
      </Card>

      {past.length > 0 && (
        <Card title="Past">
          <ul>
            {past.map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

function CalendarImport({ state, update }: { state: State; update: Update }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [status, setStatus] = useState('')
  const imported = (id: string) => state.appointments.some((a) => a.gcalId === id)
  const settings = useSettings()

  const connect = async () => {
    setStatus('connecting…')
    try {
      const token = await getCalendarToken()
      const all = await fetchUpcomingEvents(token)
      setEvents(all)
      setStatus(all.length ? '' : 'No upcoming events found.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  const add = (e: CalendarEvent) =>
    update((s) => ({
      ...s,
      appointments: [...s.appointments, { id: uid(), gcalId: e.id, title: e.title, date: e.date, time: e.time, notes: e.location }],
    }))

  if (!googleClientId(settings))
    return (
      <Card title="Google Calendar">
        <p className="hint">
          To pull appointments from Google Calendar, add a Google OAuth client ID in <Link href="/settings">Settings</Link>.
        </p>
      </Card>
    )

  return (
    <Card
      title="Google Calendar"
      right={
        <button className="btn" onClick={connect}>
          {events.length ? 'Refresh' : 'Connect'}
        </button>
      }
    >
      {status && <p className="hint">{status}</p>}
      <ul>
        {events.map((e) => (
          <li key={e.id}>
            <span>
              {e.title}
              <small>
                {' '}
                · {fmtDate(e.date)}
                {e.time && ` ${e.time}`}
              </small>
            </span>
            <button className="ghost" disabled={imported(e.id)} onClick={() => add(e)}>
              {imported(e.id) ? 'added' : 'add'}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
