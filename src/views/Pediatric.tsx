import { useState } from 'react'
import { patch, remove, uid, type Update } from '../store'
import type { State } from '../types'
import { Card, Empty } from '../ui'

const visits = [
  ['3–5 days', 'First newborn visit: weight, jaundice, feeding'],
  ['1 month', 'Weight check, hepatitis B dose 2'],
  ['2 months', 'First major round of vaccines'],
  ['4 months', 'Vaccines, development check'],
  ['6 months', 'Vaccines, starting solids'],
  ['9 months', 'Development screening'],
  ['12 months', 'Vaccines, lead/anemia screen'],
]

export function Pediatric({ state, update }: { state: State; update: Update }) {
  const peds = state.providers.filter((p) => p.role === 'Pediatrician')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Record<string, string>>({})

  const addQ = () => {
    update((s) => ({ ...s, pediatricQuestions: [...s.pediatricQuestions, { id: uid(), text: q }] }))
    setQ('')
  }

  return (
    <div className="space-y-4">
      <Card title="Pediatrician">
        {peds.length === 0 && <Empty>None picked yet. Add candidates under Care team with the Pediatrician role.</Empty>}
        {peds.map((p) => (
          <div key={p.id} className="py-1 text-sm">
            {p.url ? (
              <a href={p.url} target="_blank" rel="noreferrer" className="font-medium">
                {p.name}
              </a>
            ) : (
              <span className="font-medium">{p.name}</span>
            )}
            {p.practice && <span className="text-faint"> · {p.practice}</span>}
            {p.phone && <span className="text-faint"> · {p.phone}</span>}
          </div>
        ))}
      </Card>

      <Card title="Questions for the prenatal visit">
        <div className="mb-3 flex gap-2">
          <input className="flex-1" placeholder="e.g. After-hours policy? Hospital privileges?" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && q && addQ()} />
          <button className="btn" disabled={!q} onClick={addQ}>
            Add
          </button>
        </div>
        {state.pediatricQuestions.length === 0 && <Empty>Jot down what you want to ask.</Empty>}
        {state.pediatricQuestions.map((x) => (
          <div key={x.id} className="row flex-col items-stretch">
            <div className="flex justify-between">
              <span>{x.text}</span>
              <button className="ghost" onClick={() => update((s) => ({ ...s, pediatricQuestions: remove(s.pediatricQuestions, x.id) }))}>
                remove
              </button>
            </div>
            <input
              className="inline-note"
              placeholder="answer…"
              value={editing[x.id] ?? x.answer ?? ''}
              onChange={(e) => setEditing({ ...editing, [x.id]: e.target.value })}
              onBlur={() => update((s) => ({ ...s, pediatricQuestions: patch(s.pediatricQuestions, x.id, { answer: editing[x.id] }) }))}
            />
          </div>
        ))}
      </Card>

      <Card title="Typical first-year visits">
        {visits.map(([when, what]) => (
          <div key={when} className="flex gap-3 py-1 text-sm">
            <span className="w-20 shrink-0 font-medium text-muted">{when}</span>
            <span>{what}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
