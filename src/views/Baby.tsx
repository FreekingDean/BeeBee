import { useState } from 'react'
import { fmtDate, gestation, todayIso } from '../pregnancy'
import { remove, uid, type Update } from '../store'
import type { Finding, Person, State } from '../types'
import { Card, Empty, Tag } from '../ui'

const blank = (): Finding => ({ id: uid(), date: todayIso(), title: '' })

export function Baby({ state, update, who }: { state: State; update: Update; who: Person }) {
  const [draft, setDraft] = useState<Finding>(blank)
  const set = (p: Partial<Finding>) => setDraft((d) => ({ ...d, ...p }))
  const findings = [...state.findings].filter((f) => who === 'birth' || !f.private).sort((a, b) => b.date.localeCompare(a.date))
  const setName = (p: Person, v: string) => update((s) => ({ ...s, names: { ...s.names, [p]: v } }))

  const add = () => {
    update((s) => ({ ...s, findings: [...s.findings, draft] }))
    setDraft(blank())
  }

  return (
    <>
      <Card title="Baby">
        <form onSubmit={(e) => e.preventDefault()}>
          <label>
            <span>Nickname</span>
            <input value={state.babyName} onChange={(e) => update((s) => ({ ...s, babyName: e.target.value }))} />
          </label>
          <label>
            <span>Sex</span>
            <select value={state.sex} onChange={(e) => update((s) => ({ ...s, sex: e.target.value as State['sex'] }))}>
              <option value="unknown">Not known yet</option>
              <option value="girl">Girl</option>
              <option value="boy">Boy</option>
            </select>
          </label>
          <label>
            <span>Due date</span>
            <input type="date" value={state.dueDate ?? ''} onChange={(e) => update((s) => ({ ...s, dueDate: e.target.value || undefined }))} />
          </label>
        </form>
      </Card>

      <Card title="Parents">
        <form onSubmit={(e) => e.preventDefault()}>
          <label>
            <span>Birth parent</span>
            <input value={state.names.birth} onChange={(e) => setName('birth', e.target.value)} />
          </label>
          <label>
            <span>Partner</span>
            <input value={state.names.partner} onChange={(e) => setName('partner', e.target.value)} />
          </label>
        </form>
      </Card>

      <Card title="Add a finding">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input placeholder="e.g. Heartbeat 160bpm, NIPT low risk, 2lb 4oz" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          <input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
          <input className="wide" placeholder="Details" value={draft.detail ?? ''} onChange={(e) => set({ detail: e.target.value })} />
          {who === 'birth' && (
            <label className="inline">
              <input type="checkbox" checked={draft.private ?? false} onChange={(e) => set({ private: e.target.checked })} />
              only I can see this
            </label>
          )}
          <button className="btn" disabled={!draft.title}>
            Add
          </button>
        </form>
      </Card>

      <Card title="Findings">
        {findings.length === 0 && <Empty>Scan results, measurements, test results — anything you want to remember.</Empty>}
        <ul>
          {findings.map((f) => (
            <li key={f.id}>
              <strong>
                {f.title} {state.dueDate && <Tag>{gestation(state.dueDate, f.date).week}w</Tag>}
                {f.private && <Tag>private</Tag>}
              </strong>
              <small>
                {fmtDate(f.date)}
                {f.detail && ` · ${f.detail}`}
              </small>
              <button className="ghost" onClick={() => update((s) => ({ ...s, findings: remove(s.findings, f.id) }))}>
                remove
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
