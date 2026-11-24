import { gestation, todayIso } from './pregnancy'
import { mine } from './session'
import type { Person, State } from './types'

export type Suggestion = { title: string; why: string; prompt: string }

export function review(s: State, who: Person): Suggestion[] {
  if (!s.dueDate) return []
  const week = gestation(s.dueDate).week
  const has = (role: string) => s.providers.some((p) => p.role === role)
  const out: Suggestion[] = []

  if (!has('OB'))
    out.push({ title: 'Add your OB', why: 'No OB on the care team yet.', prompt: 'I want to add my OB to the care team.' })
  if (week >= 20 && !has('Labor Hospital'))
    out.push({ title: 'Pick a labor hospital', why: 'Worth deciding before the third trimester.', prompt: 'Help me pick and add the hospital where I will deliver.' })
  if (week >= 26 && !has('Pediatrician'))
    out.push({ title: 'Find a pediatrician', why: 'Most practices want a prenatal visit around week 32.', prompt: 'Help me find and add a pediatrician.' })

  const upcoming = s.appointments.filter((a) => a.date >= todayIso())
  if (upcoming.length === 0 && week < 41)
    out.push({ title: 'Book your next visit', why: 'Nothing is on the calendar.', prompt: 'I have no upcoming appointments. What should I book next and when?' })

  for (const t of s.tasks.filter((t) => !t.done && t.endWeek < week && mine(t.owner, who)).slice(0, 3))
    out.push({ title: `Catch up: ${t.title}`, why: `Was due by week ${t.endWeek}.`, prompt: `Help me with this overdue item: "${t.title}". It was due by week ${t.endWeek}.` })

  const dueNow = s.shopping.filter((x) => !x.bought && x.buyByWeek <= week)
  if (dueNow.length >= 3)
    out.push({ title: `Shop for ${dueNow.length} items due now`, why: dueNow.slice(0, 3).map((x) => x.item).join(', ') + '…', prompt: 'Which items on my shopping list that are due now should I buy first, and what do you recommend?' })

  return out.slice(0, 5)
}
