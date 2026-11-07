import { useEffect, useState } from 'react'
import { seedResources, seedShopping, seedTasks } from './seed'
import type { State } from './types'

const KEY = 'beebee:v1'

const initial = (): State => ({
  chat: [],
  names: { birth: 'Birth parent', partner: 'Partner' },
  babyName: 'Beebee',
  sex: 'unknown',
  providers: [],
  appointments: [],
  tasks: seedTasks,
  findings: [],
  shopping: seedShopping,
  purchases: [],
  resources: seedResources,
  pediatricQuestions: [],
})

function migrate(s: State): State {
  const tasks = s.tasks.map((t) => ({ ...t, owner: t.owner ?? seedTasks.find((x) => x.id === t.id)?.owner ?? 'both' }))
  s = { ...s, tasks }
  if (s.shopping.every((x) => x.category)) return s
  const kept = s.shopping.filter((x) => x.bought || !x.id.startsWith('seed-')).map((x) => ({ ...x, category: x.category ?? 'other' }))
  return { ...s, shopping: [...seedShopping.filter((x) => !kept.some((k) => k.id === x.id)), ...kept] }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? migrate({ ...initial(), ...JSON.parse(raw) }) : initial()
  } catch {
    return initial()
  }
}

export type Update = (fn: (s: State) => State) => void

export function useStore(): [State, Update, () => void, boolean] {
  const [state, setState] = useState<State>(initial)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setState(load())
    setReady(true)
  }, [])
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(state))
  }, [state, ready])
  const reset = () => setState(initial())
  return [state, (fn) => setState(fn), reset, ready]
}

export const uid = () => Math.random().toString(36).slice(2, 10)

export function upsert<T extends { id: string }>(list: T[], item: T) {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item]
}

export function patch<T extends { id: string }>(list: T[], id: string, p: Partial<T>) {
  return list.map((x) => (x.id === id ? { ...x, ...p } : x))
}

export function remove<T extends { id: string }>(list: T[], id: string) {
  return list.filter((x) => x.id !== id)
}
