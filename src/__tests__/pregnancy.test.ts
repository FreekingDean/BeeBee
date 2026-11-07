import { dateForWeek, dueDateFromLmp, gestation, trimester } from '../pregnancy'

describe('pregnancy math', () => {
  test('due date is 280 days after LMP', () => {
    expect(dueDateFromLmp('2026-08-20')).toBe('2027-05-27')
  })

  test('gestation counts completed weeks and days', () => {
    expect(gestation('2027-05-27', '2026-11-06')).toEqual({ week: 11, day: 1, daysLeft: 202 })
    expect(gestation('2027-05-27', '2027-05-27')).toEqual({ week: 40, day: 0, daysLeft: 0 })
  })

  test('trimester boundaries', () => {
    expect(trimester(13)).toBe(1)
    expect(trimester(14)).toBe(2)
    expect(trimester(27)).toBe(2)
    expect(trimester(28)).toBe(3)
  })

  test('dateForWeek inverts gestation', () => {
    const due = '2027-05-27'
    const w20 = dateForWeek(due, 20)
    expect(gestation(due, w20)).toMatchObject({ week: 20, day: 0 })
  })
})
