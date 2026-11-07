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
          <label className="block">
            <span>Birth parent</span>
            <input className="mt-1 w-full" autoFocus value={names.birth} onChange={(e) => setNames({ ...names, birth: e.target.value })} />
          </label>
          <label className="block">
            <span>Partner</span>
            <input className="mt-1 w-full" value={names.partner} onChange={(e) => setNames({ ...names, partner: e.target.value })} />
          </label>
        </>
      ),
    },
    {
      title: 'What are we calling the baby for now?',
      ok: baby.trim(),
      body: (
        <label className="block">
          <span>Nickname</span>
          <input className="mt-1 w-full" autoFocus value={baby} onChange={(e) => setBaby(e.target.value)} placeholder="Beebee, Peanut, Bean…" />
        </label>
      ),
    },
    {
      title: 'When is the baby due?',
      ok: dueDate,
      body: (
        <>
          <label className="block">
            <span>Due date, if you have one</span>
            <input type="date" className="mt-1 w-full" autoFocus value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="block">
            <span>…or first day of your last period</span>
            <input type="date" className="mt-1 w-full" value={lmp} onChange={(e) => setLmp(e.target.value)} />
          </label>
          {dueDate && <p className="hint">That puts {baby || 'baby'} at {fmtDate(dueDate)}.</p>}
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
    <div className="mx-auto max-w-sm px-4 pt-16">
      <h1 className="mb-4 text-center">beebee</h1>
      <Card title={`${step + 1} of ${steps.length}`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            next()
          }}
        >
          <p className="font-medium">{cur.title}</p>
          {cur.body}
          <div className="flex items-center justify-between pt-2">
            <button type="button" className="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
              {step > 0 ? 'back' : ''}
            </button>
            <button className="btn" disabled={!cur.ok}>
              {last ? 'Start' : 'Next'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
