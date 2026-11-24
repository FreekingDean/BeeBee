import { useState } from 'react'
import { gestation } from '../pregnancy'
import { patch, remove, uid, type Update } from '../store'
import type { ResourceType, State } from '../types'
import { Card, Check, Tag } from '../ui'

const types: ResourceType[] = ['book', 'podcast', 'site']

export function Library({ state, update }: { state: State; update: Update }) {
  const week = state.dueDate ? gestation(state.dueDate).week : 0
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState<ResourceType>('book')
  const [fromWeek, setFromWeek] = useState(Math.max(week, 1))

  const add = () => {
    update((s) => ({ ...s, resources: [...s.resources, { id: uid(), type, title, author, url: url || undefined, fromWeek, done: false }] }))
    setTitle('')
    setAuthor('')
    setUrl('')
  }

  return (
    <>
      <Card title="Add">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <select value={type} onChange={(e) => setType(e.target.value as ResourceType)}>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input placeholder="Author / host" value={author} onChange={(e) => setAuthor(e.target.value)} />
          <input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <label className="inline">
            from wk <input type="number" value={fromWeek} onChange={(e) => setFromWeek(+e.target.value)} />
          </label>
          <button className="btn" disabled={!title}>
            Add
          </button>
        </form>
      </Card>

      {types.map((t) => {
        const items = state.resources.filter((r) => r.type === t).sort((a, b) => a.fromWeek - b.fromWeek)
        if (items.length === 0) return null
        return (
          <Card key={t} title={`${t}s`}>
            <ul>
              {items.map((r) => (
                <Check
                  key={r.id}
                  checked={r.done}
                  onChange={(v) => update((s) => ({ ...s, resources: patch(s.resources, r.id, { done: v }) }))}
                  onDelete={() => update((s) => ({ ...s, resources: remove(s.resources, r.id) }))}
                >
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.title}
                    </a>
                  ) : (
                    r.title
                  )}
                  {r.author && <small> · {r.author}</small>} <Tag>{r.fromWeek <= week ? 'now' : `from wk ${r.fromWeek}`}</Tag>
                </Check>
              ))}
            </ul>
          </Card>
        )
      })}
    </>
  )
}
