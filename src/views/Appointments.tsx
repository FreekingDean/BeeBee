import { useState } from 'react'
import { calendarConfigured, fetchUpcomingEvents, getCalendarToken, type CalendarEvent } from '../gcal'
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
      <div className="row">
        <div>
          <div className="font-medium">{a.title}</div>
          <div className="hint">
            {fmtDate(a.date)}
            {a.time && ` · ${a.time}`}
            {p && ` · ${p.name}`}
            {p?.address && ` · ${p.address}`}
          </div>
          {a.notes && <div className="hint">{a.notes}</div>}
        </div>
        <button
          className="ghost"
          onClick={() => update((s) => ({ ...s, appointments: remove(s.appointments, a.id) }))}
        >
          remove
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card title="Add appointment">
        <div className="grid gap-2 sm:grid-cols-2">
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
          <input className="sm:col-span-2" placeholder="Notes / questions to ask" value={draft.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
        </div>
        <button className="btn mt-3" disabled={!draft.title || !draft.date} onClick={add}>
          Add
        </button>
      </Card>

      <CalendarImport state={state} update={update} />

      <Card title="Upcoming">
        {upcoming.length === 0 && <Empty>Nothing scheduled.</Empty>}
        {upcoming.map((a) => (
          <Row key={a.id} a={a} />
        ))}
      </Card>

      {past.length > 0 && (
        <Card title="Past">
          {past.map((a) => (
            <Row key={a.id} a={a} />
          ))}
        </Card>
      )}
    </div>
  )
}

function CalendarImport({ state, update }: { state: State; update: Update }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [status, setStatus] = useState('')
  const imported = (id: string) => state.appointments.some((a) => a.gcalId === id)

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

  if (!calendarConfigured)
    return (
      <Card title="Google Calendar">
        <p className="hint text-sm">
          To pull appointments from Google Calendar, create an OAuth client ID in Google Cloud Console and put it in <code>.env</code> as{' '}
          <code>VITE_GOOGLE_CLIENT_ID</code>. See <code>.env.example</code>.
        </p>
      </Card>
    )

  return (
    <Card title="Google Calendar" right={<button className="btn" onClick={connect}>{events.length ? 'Refresh' : 'Connect'}</button>}>
      {status && <p className="hint">{status}</p>}
      {events.map((e) => (
        <div key={e.id} className="row items-center">
          <span>
            {e.title}
            <span className="text-faint">
              {' '}· {fmtDate(e.date)}
              {e.time && ` ${e.time}`}
            </span>
          </span>
          <button className="ghost" disabled={imported(e.id)} onClick={() => add(e)}>
            {imported(e.id) ? 'added' : 'add'}
          </button>
        </div>
      ))}
    </Card>
  )
}
