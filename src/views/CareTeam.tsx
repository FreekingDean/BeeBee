import { useState } from 'react'
import { searchableRoles, searchProviders } from '../npi'
import { patch, remove, uid, type Update } from '../store'
import type { Provider, ProviderRole, State } from '../types'
import { Card, Empty, Tag } from '../ui'

const roles: ProviderRole[] = ['OB', 'GYN', 'MFM', 'Genetic Counselor', 'Labor Hospital', 'Practice', 'Pediatrician', 'Doula', 'Other']

const blank = (): Provider => ({ id: uid(), role: 'OB', name: '' })

export function CareTeam({ state, update }: { state: State; update: Update }) {
  const [draft, setDraft] = useState<Provider>(blank)
  const set = (p: Partial<Provider>) => setDraft((d) => ({ ...d, ...p }))

  const add = () => {
    update((s) => ({ ...s, providers: [...s.providers, draft] }))
    setDraft(blank())
  }

  return (
    <div className="space-y-4">
      <Card title="Care team">
        {state.providers.length === 0 && <Empty>No one yet. Add your OB, hospital, and anyone else below.</Empty>}
        {roles
          .filter((r) => state.providers.some((p) => p.role === r))
          .map((r) => (
            <div key={r} className="py-2">
              <h3>{r}</h3>
              {state.providers
                .filter((p) => p.role === r)
                .map((p) => (
                  <ProviderRow key={p.id} p={p} update={update} />
                ))}
            </div>
          ))}
      </Card>

      <Finder state={state} update={update} />

      <Card title="Add by hand">
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={draft.role} onChange={(e) => set({ role: e.target.value as ProviderRole })}>
            {roles.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <input placeholder="Name" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          <input placeholder="Practice / group" value={draft.practice ?? ''} onChange={(e) => set({ practice: e.target.value })} />
          <input placeholder="Phone" value={draft.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
          <input placeholder="Website / portal URL" value={draft.url ?? ''} onChange={(e) => set({ url: e.target.value })} />
          <input placeholder="Address" value={draft.address ?? ''} onChange={(e) => set({ address: e.target.value })} />
        </div>
        <button className="btn mt-3" disabled={!draft.name} onClick={add}>
          Add
        </button>
      </Card>
    </div>
  )
}

const states = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ')

function Finder({ state, update }: { state: State; update: Update }) {
  const [role, setRole] = useState<ProviderRole>('OB')
  const [st, setSt] = useState('NJ')
  const [city, setCity] = useState('')
  const [name, setName] = useState('')
  const [results, setResults] = useState<Provider[]>([])
  const [status, setStatus] = useState('')

  const search = async () => {
    setStatus('searching…')
    try {
      const r = await searchProviders({ role, state: st, city, name })
      setResults(r)
      setStatus(r.length ? '' : 'No matches. Try fewer filters.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Search failed. Is the dev server running?')
    }
  }

  const added = (npi?: string) => state.providers.some((p) => p.npi && p.npi === npi)

  return (
    <Card title="Find in the national provider registry">
      <div className="grid gap-2 sm:grid-cols-[auto_auto_1fr_1fr_auto]">
        <select value={role} onChange={(e) => setRole(e.target.value as ProviderRole)}>
          {searchableRoles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select value={st} onChange={(e) => setSt(e.target.value)}>
          {states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input
          placeholder={role === 'Labor Hospital' ? 'Hospital name' : 'Doctor name'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button className="btn" onClick={search}>
          Search
        </button>
      </div>
      {status && <p className="hint mt-2">{status}</p>}
      <div className="mt-2">
        {results.map((r) => (
          <div key={r.id} className="row items-center">
            <div>
              <div className="font-medium">
                {r.name} {r.specialty && <Tag>{r.specialty}</Tag>}
              </div>
              <div className="hint">
                {r.address}
                {r.phone && ` · ${r.phone}`}
              </div>
            </div>
            <button
              className="btn shrink-0"
              disabled={added(r.npi)}
              onClick={() => update((s) => ({ ...s, providers: [...s.providers, r] }))}
            >
              {added(r.npi) ? 'Added' : 'Add'}
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ProviderRow({ p, update }: { p: Provider; update: Update }) {
  const [notes, setNotes] = useState(p.notes ?? '')
  return (
    <div className="row flex-col items-stretch">
      <div className="flex items-baseline justify-between">
        <div>
          {p.url ? (
            <a href={p.url} target="_blank" rel="noreferrer" className="font-medium">
              {p.name}
            </a>
          ) : (
            <span className="font-medium">{p.name}</span>
          )}
          {p.practice && <span className="text-faint"> · {p.practice}</span>}
        </div>
        <button
          className="ghost"
          onClick={() => update((s) => ({ ...s, providers: remove(s.providers, p.id) }))}
        >
          remove
        </button>
      </div>
      <div className="hint">
        {p.phone && <a href={`tel:${p.phone}`} className="mr-3">{p.phone}</a>}
        {p.address && <span>{p.address}</span>}
      </div>
      <input
        className="inline-note"
        placeholder="notes…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => update((s) => ({ ...s, providers: patch(s.providers, p.id, { notes }) }))}
      />
    </div>
  )
}
