import { todayIso } from './pregnancy'
import { googleClientId } from './settings'

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (c: {
            client_id: string
            scope: string
            callback: (r: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

function loadGis() {
  return new Promise<void>((resolve, reject) => {
    if (window.google) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load Google sign-in'))
    document.head.appendChild(s)
  })
}

export async function getCalendarToken() {
  await loadGis()
  return new Promise<string>((resolve, reject) => {
    window.google!.accounts.oauth2
      .initTokenClient({
        client_id: googleClientId(),
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error(r.error ?? 'No token'))),
      })
      .requestAccessToken()
  })
}

export type CalendarEvent = { id: string; title: string; date: string; time?: string; location?: string }

type GEvent = {
  id: string
  summary?: string
  location?: string
  start: { date?: string; dateTime?: string }
}

export async function fetchUpcomingEvents(token: string): Promise<CalendarEvent[]> {
  const timeMin = new Date(todayIso()).toISOString()
  const timeMax = new Date(Date.now() + 300 * 86_400_000).toISOString()
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250' })
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Calendar request failed (${res.status})`)
  const data = (await res.json()) as { items: GEvent[] }
  return data.items
    .filter((e) => e.summary)
    .map((e) => ({
      id: e.id,
      title: e.summary!,
      date: e.start.date ?? e.start.dateTime!.slice(0, 10),
      time: e.start.dateTime ? e.start.dateTime.slice(11, 16) : undefined,
      location: e.location,
    }))
}
