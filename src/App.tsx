'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { other, useWho } from './session'
import { useStore } from './store'
import type { Person } from './types'
import { Card } from './ui'
import { Appointments } from './views/Appointments'
import { Assistant } from './views/Assistant'
import { Baby } from './views/Baby'
import { CareTeam } from './views/CareTeam'
import { Library } from './views/Library'
import { Pediatric } from './views/Pediatric'
import { Settings } from './views/Settings'
import { Setup } from './views/Setup'
import { Shopping } from './views/Shopping'
import { Today } from './views/Today'
import { Todos } from './views/Todos'

const tabs = [
  { label: 'Today', slug: 'today' },
  { label: 'Assistant', slug: 'assistant' },
  { label: 'Appointments', slug: 'appointments' },
  { label: 'To-do', slug: 'todo' },
  { label: 'Care team', slug: 'care-team' },
  { label: 'Baby', slug: 'baby' },
  { label: 'Baby stuff', slug: 'baby-stuff' },
  { label: 'Pediatric', slug: 'pediatric' },
  { label: 'Library', slug: 'library' },
  { label: 'Settings', slug: 'settings' },
] as const

export default function App({ slug }: { slug: string }) {
  const ask = useSearchParams().get('ask') ?? undefined
  const [state, update, reset, ready] = useStore()
  const [who, setWho] = useWho()
  const router = useRouter()
  const go = (label: string) => router.push(`/${tabs.find((t) => t.label === label)?.slug ?? 'today'}`)
  const askAssistant = (prompt: string) => router.push(`/assistant?ask=${encodeURIComponent(prompt)}`)

  if (!ready) return null
  if (!state.dueDate) return <Setup state={state} update={update} />
  if (!who) return <Picker names={state.names} pick={setWho} />

  const page = {
    today: <Today state={state} update={update} go={go} ask={askAssistant} who={who} />,
    assistant: <Assistant state={state} update={update} who={who} ask={ask} />,
    appointments: <Appointments state={state} update={update} />,
    todo: <Todos state={state} update={update} who={who} />,
    'care-team': <CareTeam state={state} update={update} />,
    baby: <Baby state={state} update={update} who={who} />,
    'baby-stuff': <Shopping state={state} update={update} />,
    pediatric: <Pediatric state={state} update={update} />,
    library: <Library state={state} update={update} />,
    settings: <Settings />,
  }[slug]

  return (
    <main>
      <header className="top">
        <h1>beebee</h1>
        <p>
          <span>{state.names[who]}</span>
          <button className="ghost" onClick={() => setWho(other(who))}>
            switch to {state.names[other(who)]}
          </button>
          <button className="ghost" onClick={() => confirm('Reset all data?') && reset()}>
            reset
          </button>
        </p>
      </header>

      <nav className="tabs">
        {tabs.map((t) => (
          <Link key={t.slug} href={`/${t.slug}`} aria-current={t.slug === slug ? 'page' : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>

      {page ?? <Today state={state} update={update} go={go} ask={askAssistant} who={who} />}
    </main>
  )
}

function Picker({ names, pick }: { names: Record<Person, string>; pick: (p: Person) => void }) {
  return (
    <main className="narrow">
      <h1>beebee</h1>
      <Card title="Who's here?">
        <form className="stack" onSubmit={(e) => e.preventDefault()}>
          {(['birth', 'partner'] as Person[]).map((p) => (
            <button key={p} type="button" className="btn" onClick={() => pick(p)}>
              {names[p]}
            </button>
          ))}
        </form>
      </Card>
    </main>
  )
}
