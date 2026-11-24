import { Fragment, useState } from 'react'
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
    <>
      <Card title="Pediatrician">
        {peds.length === 0 && <Empty>None picked yet. Add candidates under Care team with the Pediatrician role.</Empty>}
        <ul>
          {peds.map((p) => (
            <li key={p.id}>
              <strong>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {p.name}
                  </a>
                ) : (
                  p.name
                )}
                {p.practice && <small> · {p.practice}</small>}
                {p.phone && <small> · {p.phone}</small>}
              </strong>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Questions for the prenatal visit">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addQ()
          }}
        >
          <input placeholder="e.g. After-hours policy? Hospital privileges?" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" disabled={!q}>
            Add
          </button>
        </form>
        {state.pediatricQuestions.length === 0 && <Empty>Jot down what you want to ask.</Empty>}
        <ul>
          {state.pediatricQuestions.map((x) => (
            <li key={x.id}>
              <strong>{x.text}</strong>
              <input
                className="inline-note"
                placeholder="answer…"
                value={editing[x.id] ?? x.answer ?? ''}
                onChange={(e) => setEditing({ ...editing, [x.id]: e.target.value })}
                onBlur={() => update((s) => ({ ...s, pediatricQuestions: patch(s.pediatricQuestions, x.id, { answer: editing[x.id] }) }))}
              />
              <button className="ghost" onClick={() => update((s) => ({ ...s, pediatricQuestions: remove(s.pediatricQuestions, x.id) }))}>
                remove
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Typical first-year visits">
        <dl>
          {visits.map(([when, what]) => (
            <Fragment key={when}>
              <dt>{when}</dt>
              <dd>{what}</dd>
            </Fragment>
          ))}
        </dl>
      </Card>
    </>
  )
}
