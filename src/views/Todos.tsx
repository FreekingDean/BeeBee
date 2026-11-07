import { useState } from 'react'
import { gestation } from '../pregnancy'
import { mine } from '../session'
import { patch, remove, uid, type Update } from '../store'
import type { Owner, Person, State, TaskCategory } from '../types'
import { Card, Check, Tag } from '../ui'

const categories: TaskCategory[] = ['medical', 'admin', 'home', 'learn', 'pediatric']

export function Todos({ state, update, who }: { state: State; update: Update; who: Person }) {
  const week = state.dueDate ? gestation(state.dueDate).week : 0
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TaskCategory>('admin')
  const [owner, setOwner] = useState<Owner>('both')
  const [onlyMine, setOnlyMine] = useState(false)
  const ownerLabel = (o: Owner) => (o === 'both' ? 'both' : state.names[o])
  const [start, setStart] = useState(Math.max(week, 1))
  const [end, setEnd] = useState(Math.max(week + 2, 3))
  const [showDone, setShowDone] = useState(false)

  const tasks = [...state.tasks].sort((a, b) => a.startWeek - b.startWeek || a.endWeek - b.endWeek)
  const visible = tasks.filter((t) => (showDone || !t.done) && (!onlyMine || mine(t.owner, who)))

  const add = () => {
    update((s) => ({ ...s, tasks: [...s.tasks, { id: uid(), title, category, owner, startWeek: start, endWeek: end, done: false }] }))
    setTitle('')
  }

  const phase = (w: number) => (w < 14 ? 'First trimester' : w < 28 ? 'Second trimester' : w < 40 ? 'Third trimester' : 'Past due')
  const groups = ['First trimester', 'Second trimester', 'Third trimester', 'Past due']

  return (
    <div className="space-y-4">
      <Card title="Add a to-do">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
          <input placeholder="What needs doing" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && title && add()} />
          <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={owner} onChange={(e) => setOwner(e.target.value as Owner)}>
            {(['both', 'birth', 'partner'] as Owner[]).map((o) => (
              <option key={o} value={o}>
                {ownerLabel(o)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs">
            wk <input type="number" className="w-16" value={start} onChange={(e) => setStart(+e.target.value)} />
            – <input type="number" className="w-16" value={end} onChange={(e) => setEnd(+e.target.value)} />
          </label>
          <button className="btn" disabled={!title} onClick={add}>
            Add
          </button>
        </div>
      </Card>

      <Card
        title="Everything"
        right={
          <span className="flex gap-3 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> just mine
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> show done
            </label>
          </span>
        }
      >
        {groups.map((g) => {
          const items = visible.filter((t) => phase(t.startWeek) === g)
          if (items.length === 0) return null
          return (
            <div key={g} className="py-2">
              <h3>{g}</h3>
              {items.map((t) => {
                const status = t.done ? '' : t.endWeek < week ? 'overdue' : t.startWeek <= week ? 'now' : ''
                return (
                  <Check
                    key={t.id}
                    checked={t.done}
                    onChange={(v) => update((s) => ({ ...s, tasks: patch(s.tasks, t.id, { done: v }) }))}
                    onDelete={() => update((s) => ({ ...s, tasks: remove(s.tasks, t.id) }))}
                  >
                    {t.title} <Tag>{t.category}</Tag> <Tag>wk {t.startWeek}–{t.endWeek}</Tag>
                    {t.owner !== 'both' && <Tag>{state.names[t.owner]}</Tag>}
                    {status && <span className={`ml-1 text-xs font-medium ${status === 'overdue' ? 'text-amber-600' : 'text-primary'}`}>{status}</span>}
                  </Check>
                )
              })}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
