import Link from 'next/link'
import { Fragment, useState } from 'react'
import { searchableRoles, searchProviders } from '../npi'
import { apiBase, useSettings } from '../settings'
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
    <>
      <Card title="Care team">
        {state.providers.length === 0 && <Empty>No one yet. Add your OB, hospital, and anyone else below.</Empty>}
        {roles
          .filter((r) => state.providers.some((p) => p.role === r))
          .map((r) => (
            <Fragment key={r}>
              <h3>{r}</h3>
              <ul>
                {state.providers
                  .filter((p) => p.role === r)
                  .map((p) => (
                    <ProviderRow key={p.id} p={p} update={update} />
                  ))}
              </ul>
            </Fragment>
          ))}
      </Card>

      <Finder state={state} update={update} />

      <Card title="Add by hand">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
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
          <button className="btn" disabled={!draft.name}>
            Add
          </button>
        </form>
      </Card>
    </>
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
      setStatus(e instanceof Error ? e.message : 'Search failed.')
    }
  }

  const added = (npi?: string) => state.providers.some((p) => p.npi && p.npi === npi)
  const settings = useSettings()

  if (apiBase(settings) === null)
    return (
      <Card title="Find in the national provider registry">
        <p className="hint">
          Provider lookup needs an app server, because the registry does not accept requests from a browser. Add one in{' '}
          <Link href="/settings">Settings</Link>, or add providers by hand above.
        </p>
      </Card>
    )

  return (
    <Card title="Find in the national provider registry">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void search()
        }}
      >
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
        <input placeholder={role === 'Labor Hospital' ? 'Hospital name' : 'Doctor name'} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn">Search</button>
      </form>
      {status && <p className="hint">{status}</p>}
      <ul>
        {results.map((r) => (
          <li key={r.id}>
            <strong>
              {r.name} {r.specialty && <Tag>{r.specialty}</Tag>}
            </strong>
            <small>
              {r.address}
              {r.phone && ` · ${r.phone}`}
            </small>
            <button className="btn" disabled={added(r.npi)} onClick={() => update((s) => ({ ...s, providers: [...s.providers, r] }))}>
              {added(r.npi) ? 'Added' : 'Add'}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ProviderRow({ p, update }: { p: Provider; update: Update }) {
  const [notes, setNotes] = useState(p.notes ?? '')
  return (
    <li>
      <strong>
        {p.url ? (
          <a href={p.url} target="_blank" rel="noreferrer">
            {p.name}
          </a>
        ) : (
          p.name
        )}
        {p.practice && <small> · {p.practice}</small>}
      </strong>
      {(p.phone || p.address) && (
        <small>
          {p.phone && <a href={`tel:${p.phone}`}>{p.phone}</a>}
          {p.phone && p.address && ' · '}
          {p.address}
        </small>
      )}
      <input
        className="inline-note"
        placeholder="notes…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => update((s) => ({ ...s, providers: patch(s.providers, p.id, { notes }) }))}
      />
      <button className="ghost" onClick={() => update((s) => ({ ...s, providers: remove(s.providers, p.id) }))}>
        remove
      </button>
    </li>
  )
}
