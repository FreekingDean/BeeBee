import { Fragment, useState } from 'react'
import { gestation } from '../pregnancy'
import { mine } from '../session'
import { patch, remove, uid, type Update } from '../store'
import type { Owner, Person, State, TaskCategory } from '../types'
import { Card, Check, Tag } from '../ui'

const categories: TaskCategory[] = ['medical', 'admin', 'home', 'learn', 'pediatric']
const groups = ['First trimester', 'Second trimester', 'Third trimester', 'Past due']
const phase = (w: number) => (w < 14 ? groups[0] : w < 28 ? groups[1] : w < 40 ? groups[2] : groups[3])

export function Todos({ state, update, who }: { state: State; update: Update; who: Person }) {
  const week = state.dueDate ? gestation(state.dueDate).week : 0
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TaskCategory>('admin')
  const [owner, setOwner] = useState<Owner>('both')
  const [onlyMine, setOnlyMine] = useState(false)
  const [start, setStart] = useState(Math.max(week, 1))
  const [end, setEnd] = useState(Math.max(week + 2, 3))
  const [showDone, setShowDone] = useState(false)
  const ownerLabel = (o: Owner) => (o === 'both' ? 'both' : state.names[o])

  const tasks = [...state.tasks].sort((a, b) => a.startWeek - b.startWeek || a.endWeek - b.endWeek)
  const visible = tasks.filter((t) => (showDone || !t.done) && (!onlyMine || mine(t.owner, who)))

  const add = () => {
    update((s) => ({ ...s, tasks: [...s.tasks, { id: uid(), title, category, owner, startWeek: start, endWeek: end, done: false }] }))
    setTitle('')
  }

  return (
    <>
      <Card title="Add a to-do">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input placeholder="What needs doing" value={title} onChange={(e) => setTitle(e.target.value)} />
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
          <label className="inline">
            wk <input type="number" value={start} onChange={(e) => setStart(+e.target.value)} />–
            <input type="number" value={end} onChange={(e) => setEnd(+e.target.value)} />
          </label>
          <button className="btn" disabled={!title}>
            Add
          </button>
        </form>
      </Card>

      <Card
        title="Everything"
        right={
          <fieldset>
            <label>
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> just mine
            </label>
            <label>
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> show done
            </label>
          </fieldset>
        }
      >
        {groups.map((g) => {
          const items = visible.filter((t) => phase(t.startWeek) === g)
          if (items.length === 0) return null
          return (
            <Fragment key={g}>
              <h3>{g}</h3>
              <ul>
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
                    {status && <em className={status}>{status}</em>}
                  </Check>
                )
              })}
              </ul>
            </Fragment>
          )
        })}
      </Card>
    </>
  )
}
