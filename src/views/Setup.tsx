import { useState } from 'react'
import { dueDateFromLmp, fmtDate } from '../pregnancy'
import type { Update } from '../store'
import type { State } from '../types'
import { Card } from '../ui'

export function Setup({ state, update }: { state: State; update: Update }) {
  const [step, setStep] = useState(0)
  const [names, setNames] = useState(state.names)
  const [baby, setBaby] = useState(state.babyName)
  const [due, setDue] = useState('')
  const [lmp, setLmp] = useState('')
  const dueDate = due || (lmp && dueDateFromLmp(lmp))

  const steps = [
    {
      title: 'Who are you two?',
      ok: names.birth.trim() && names.partner.trim(),
      body: (
        <>
          <label>
            <span>Birth parent</span>
            <input autoFocus value={names.birth} onChange={(e) => setNames({ ...names, birth: e.target.value })} />
          </label>
          <label>
            <span>Partner</span>
            <input value={names.partner} onChange={(e) => setNames({ ...names, partner: e.target.value })} />
          </label>
        </>
      ),
    },
    {
      title: 'What are we calling the baby for now?',
      ok: baby.trim(),
      body: (
        <label>
          <span>Nickname</span>
          <input autoFocus value={baby} onChange={(e) => setBaby(e.target.value)} placeholder="Beebee, Peanut, Bean…" />
        </label>
      ),
    },
    {
      title: 'When is the baby due?',
      ok: dueDate,
      body: (
        <>
          <label>
            <span>Due date, if you have one</span>
            <input type="date" autoFocus value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label>
            <span>…or first day of your last period</span>
            <input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} />
          </label>
          {dueDate && (
            <p className="hint">
              That puts {baby || 'baby'} at {fmtDate(dueDate)}.
            </p>
          )}
        </>
      ),
    },
  ]
  const cur = steps[step]
  const last = step === steps.length - 1

  const next = () => {
    if (!cur.ok) return
    if (!last) return setStep(step + 1)
    update((s) => ({ ...s, names, babyName: baby.trim(), dueDate: dueDate || undefined }))
  }

  return (
    <main className="narrow">
      <h1>beebee</h1>
      <Card title={`${step + 1} of ${steps.length}`}>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
        >
          <p>
            <strong>{cur.title}</strong>
          </p>
          {cur.body}
          <footer>
            <button type="button" className="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
              {step > 0 ? 'back' : ''}
            </button>
            <button className="btn" disabled={!cur.ok}>
              {last ? 'Start' : 'Next'}
            </button>
          </footer>
        </form>
      </Card>
    </main>
  )
}
