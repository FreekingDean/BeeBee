const DAY = 86_400_000
const TERM_DAYS = 280

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function dueDateFromLmp(lmp: string) {
  return new Date(Date.parse(lmp) + TERM_DAYS * DAY).toISOString().slice(0, 10)
}

export function gestation(dueDate: string, on = todayIso()) {
  const daysLeft = Math.round((Date.parse(dueDate) - Date.parse(on)) / DAY)
  const days = TERM_DAYS - daysLeft
  return { week: Math.floor(days / 7), day: days % 7, daysLeft }
}

export function trimester(week: number) {
  if (week < 14) return 1
  if (week < 28) return 2
  return 3
}

export function dateForWeek(dueDate: string, week: number) {
  return new Date(Date.parse(dueDate) - (TERM_DAYS - week * 7) * DAY)
    .toISOString()
    .slice(0, 10)
}

export function fmtDate(iso: string) {
  return new Date(iso + 'T00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
