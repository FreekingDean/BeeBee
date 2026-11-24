import { dateForWeek } from '../pregnancy'
import { review } from '../review'
import type { State } from '../types'

const dueAtWeek = (week: number) => {
  const due = new Date(Date.now() + (40 - week) * 7 * 86_400_000).toISOString().slice(0, 10)
  return due
}

const base = (week: number, over: Partial<State> = {}): State => ({
  chat: [],
  dueDate: dueAtWeek(week),
  names: { birth: 'A', partner: 'B' },
  babyName: 'Bean',
  sex: 'unknown',
  providers: [],
  appointments: [{ id: 'a', title: 'Visit', date: dateForWeek(dueAtWeek(week), week + 1) }],
  tasks: [],
  findings: [],
  shopping: [],
  purchases: [],
  resources: [],
  pediatricQuestions: [],
  ...over,
})

const titles = (s: State) => review(s, 'birth').map((x) => x.title)

describe('review', () => {
  test('nothing without a due date', () => {
    expect(review(base(10, { dueDate: undefined }), 'birth')).toEqual([])
  })

  test('asks for an OB first, hospital and pediatrician later', () => {
    expect(titles(base(8))).toEqual(['Add your OB'])
    expect(titles(base(22))).toEqual(['Add your OB', 'Pick a labor hospital'])
    expect(titles(base(30))).toEqual(['Add your OB', 'Pick a labor hospital', 'Find a pediatrician'])
  })

  test('quiet when the care team is complete', () => {
    const providers = ['OB', 'Labor Hospital', 'Pediatrician'].map((role, i) => ({ id: String(i), role, name: 'x' })) as State['providers']
    expect(titles(base(30, { providers }))).toEqual([])
  })

  test('flags an empty calendar', () => {
    expect(titles(base(8, { appointments: [] }))).toContain('Book your next visit')
  })

  test('surfaces my overdue tasks, not my partner’s', () => {
    const tasks: State['tasks'] = [
      { id: '1', title: 'Glucose screening', category: 'medical', owner: 'birth', startWeek: 24, endWeek: 28, done: false },
      { id: '2', title: 'Install car seat', category: 'home', owner: 'partner', startWeek: 34, endWeek: 37, done: false },
    ]
    expect(titles(base(38, { tasks }))).toContain('Catch up: Glucose screening')
    expect(titles(base(38, { tasks }))).not.toContain('Catch up: Install car seat')
    expect(review(base(38, { tasks }), 'partner').map((x) => x.title)).toContain('Catch up: Install car seat')
  })

  test('nudges shopping once three items are due', () => {
    const shopping: State['shopping'] = ['a', 'b', 'c'].map((item) => ({ id: item, item, category: 'gear', buyByWeek: 30, bought: false }))
    expect(titles(base(34, { shopping }))).toContain('Shop for 3 items due now')
    expect(titles(base(34, { shopping: shopping.slice(0, 2) }))).not.toContain('Shop for 2 items due now')
  })

  test('caps at five', () => {
    const tasks: State['tasks'] = Array.from({ length: 6 }, (_, i) => ({ id: String(i), title: `t${i}`, category: 'admin', owner: 'both', startWeek: 1, endWeek: 2, done: false }))
    expect(review(base(30, { tasks, appointments: [] }), 'birth')).toHaveLength(5)
  })
})
