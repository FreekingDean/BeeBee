import { seedResources, seedShopping, seedTasks } from '../seed'
import { patch, remove, upsert } from '../store'

describe('list helpers', () => {
  const list = [
    { id: 'a', n: 1 },
    { id: 'b', n: 2 },
  ]
  test('patch', () => expect(patch(list, 'b', { n: 9 })).toEqual([{ id: 'a', n: 1 }, { id: 'b', n: 9 }]))
  test('remove', () => expect(remove(list, 'a')).toEqual([{ id: 'b', n: 2 }]))
  test('upsert replaces or appends', () => {
    expect(upsert(list, { id: 'a', n: 5 })[0]).toEqual({ id: 'a', n: 5 })
    expect(upsert(list, { id: 'c', n: 3 })).toHaveLength(3)
  })
})

describe('seed data', () => {
  test('ids are stable and unique', () => {
    for (const items of [seedTasks, seedShopping, seedResources]) {
      const ids = items.map((x) => x.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids.every((id) => id.startsWith('seed-'))).toBe(true)
    }
  })
  test('task windows are sane', () => {
    for (const t of seedTasks) expect(t.startWeek).toBeLessThanOrEqual(t.endWeek)
  })
  test('every shopping item has a category', () => {
    for (const s of seedShopping) expect(s.category).toBeTruthy()
    expect(seedShopping.some((s) => s.category === 'for mom')).toBe(true)
  })
})
