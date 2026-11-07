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
    <div className="space-y-4">
      <Card title="Baby">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block">
            <span>Nickname</span>
            <input className="mt-1 w-full" value={state.babyName} onChange={(e) => update((s) => ({ ...s, babyName: e.target.value }))} />
          </label>
          <label className="block">
            <span>Sex</span>
            <select className="mt-1 w-full" value={state.sex} onChange={(e) => update((s) => ({ ...s, sex: e.target.value as State['sex'] }))}>
              <option value="unknown">Not known yet</option>
              <option value="girl">Girl</option>
              <option value="boy">Boy</option>
            </select>
          </label>
          <label className="block">
            <span>Due date</span>
            <input type="date" className="mt-1 w-full" value={state.dueDate ?? ''} onChange={(e) => update((s) => ({ ...s, dueDate: e.target.value || undefined }))} />
          </label>
        </div>
      </Card>

      <Card title="Parents">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span>Birth parent</span>
            <input className="mt-1 w-full" value={state.names.birth} onChange={(e) => setName('birth', e.target.value)} />
          </label>
          <label className="block">
            <span>Partner</span>
            <input className="mt-1 w-full" value={state.names.partner} onChange={(e) => setName('partner', e.target.value)} />
          </label>
        </div>
      </Card>

      <Card title="Add a finding">
        <div className="grid gap-2 sm:grid-cols-2">
          <input placeholder="e.g. Heartbeat 160bpm, NIPT low risk, 2lb 4oz" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          <input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
          <input className="sm:col-span-2" placeholder="Details" value={draft.detail ?? ''} onChange={(e) => set({ detail: e.target.value })} />
          {who === 'birth' && (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={draft.private ?? false} onChange={(e) => set({ private: e.target.checked })} />
              only I can see this
            </label>
          )}
        </div>
        <button className="btn mt-3" disabled={!draft.title} onClick={add}>
          Add
        </button>
      </Card>

      <Card title="Findings">
        {findings.length === 0 && <Empty>Scan results, measurements, test results — anything you want to remember.</Empty>}
        {findings.map((f) => (
          <div key={f.id} className="row">
            <div>
              <div className="font-medium">
                {f.title}{' '}
                {state.dueDate && <Tag>{gestation(state.dueDate, f.date).week}w</Tag>}
                {f.private && <Tag>private</Tag>}
              </div>
              <div className="hint">
                {fmtDate(f.date)}
                {f.detail && ` · ${f.detail}`}
              </div>
            </div>
            <button className="ghost" onClick={() => update((s) => ({ ...s, findings: remove(s.findings, f.id) }))}>
              remove
            </button>
          </div>
        ))}
      </Card>
    </div>
  )
}
