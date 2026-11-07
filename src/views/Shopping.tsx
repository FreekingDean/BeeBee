import { useState } from 'react'
import { dateForWeek, fmtDate, gestation, todayIso } from '../pregnancy'
import { patch, remove, uid, type Update } from '../store'
import type { Purchase, ShoppingCategory, ShoppingItem, State } from '../types'
import { Card, Check, Empty, Tag } from '../ui'

const categories: ShoppingCategory[] = ['for mom', 'hospital bag', 'nursery', 'gear', 'diapering', 'feeding', 'clothing', 'bath & health', 'other']

const blurb: Record<ShoppingCategory, string> = {
  'for mom': 'Recovery and feeding supplies. Have these home before week 37.',
  'hospital bag': 'Packed and by the door by week 36.',
  nursery: 'Big items first so delivery lead times don\'t bite.',
  gear: 'Car seat must be installed before you leave the hospital.',
  diapering: 'Don\'t overbuy newborn size; babies outgrow it in weeks.',
  feeding: 'Check insurance for the pump around week 30.',
  clothing: 'Mostly newborn and 0-3m. Washed before baby arrives.',
  'bath & health': 'Small stuff that\'s annoying to not have at 2am.',
  other: '',
}

export function Shopping({ state, update }: { state: State; update: Update }) {
  const week = state.dueDate ? gestation(state.dueDate).week : 0
  const [item, setItem] = useState('')
  const [category, setCategory] = useState<ShoppingCategory>('other')
  const [by, setBy] = useState(36)
  const [p, setP] = useState<Purchase>({ id: uid(), item: '', cost: 0, date: todayIso() })

  const total = state.purchases.reduce((n, x) => n + x.cost, 0)
  const remaining = state.shopping.filter((s) => !s.bought).length

  const addItem = () => {
    update((s) => ({ ...s, shopping: [...s.shopping, { id: uid(), item, category, buyByWeek: by, bought: false }] }))
    setItem('')
  }
  const addPurchase = () => {
    update((s) => ({ ...s, purchases: [...s.purchases, p] }))
    setP({ id: uid(), item: '', cost: 0, date: todayIso() })
  }
  const toggle = (s: ShoppingItem, bought: boolean) => update((st) => ({ ...st, shopping: patch(st.shopping, s.id, { bought }) }))
  const when = (w: number) => (w <= week ? 'now' : state.dueDate ? `by ${fmtDate(dateForWeek(state.dueDate, w))}` : `by wk ${w}`)

  return (
    <div className="space-y-4">
      <Card title="Add an item">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <input placeholder="What" value={item} onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && item && addItem()} />
          <select value={category} onChange={(e) => setCategory(e.target.value as ShoppingCategory)}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs">
            by wk <input type="number" className="w-16" value={by} onChange={(e) => setBy(+e.target.value)} />
          </label>
          <button className="btn" disabled={!item} onClick={addItem}>
            Add
          </button>
        </div>
      </Card>

      <div className="hint">{remaining} things left to get</div>

      {categories.map((c) => {
        const items = state.shopping.filter((s) => s.category === c)
        if (items.length === 0) return null
        const todo = items.filter((s) => !s.bought).sort((a, b) => a.buyByWeek - b.buyByWeek)
        const done = items.filter((s) => s.bought)
        return (
          <Card key={c} title={c} right={<span className="hint">{done.length}/{items.length}</span>}>
            {blurb[c] && <p className="hint mb-2">{blurb[c]}</p>}
            {todo.length === 0 && <Empty>All set.</Empty>}
            {todo.map((s) => (
              <Check key={s.id} checked={s.bought} onChange={(v) => toggle(s, v)} onDelete={() => update((st) => ({ ...st, shopping: remove(st.shopping, s.id) }))}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.item}
                  </a>
                ) : (
                  s.item
                )}{' '}
                <Tag>{when(s.buyByWeek)}</Tag>
              </Check>
            ))}
            {done.length > 0 && (
              <details className="mt-1">
                <summary>{done.length} bought</summary>
                {done.map((s) => (
                  <Check key={s.id} checked={s.bought} onChange={(v) => toggle(s, v)}>
                    {s.item}
                  </Check>
                ))}
              </details>
            )}
          </Card>
        )
      })}

      <Card title="Spent" right={<span className="text-sm font-medium">${total.toFixed(2)}</span>}>
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <input placeholder="Item" value={p.item} onChange={(e) => setP({ ...p, item: e.target.value })} />
          <input type="number" placeholder="Cost" value={p.cost || ''} onChange={(e) => setP({ ...p, cost: +e.target.value })} />
          <input placeholder="Store" value={p.store ?? ''} onChange={(e) => setP({ ...p, store: e.target.value })} />
          <div className="flex gap-2">
            <input type="date" className="flex-1" value={p.date} onChange={(e) => setP({ ...p, date: e.target.value })} />
            <button className="btn" disabled={!p.item} onClick={addPurchase}>
              Add
            </button>
          </div>
        </div>
        {state.purchases.length === 0 && <Empty>Log what you actually spent.</Empty>}
        {[...state.purchases].reverse().map((x) => (
          <div key={x.id} className="row">
            <span>
              {x.item}
              <span className="text-faint">
                {x.store && ` · ${x.store}`} · {fmtDate(x.date)}
              </span>
            </span>
            <span className="flex gap-3">
              ${x.cost.toFixed(2)}
              <button className="ghost" onClick={() => update((s) => ({ ...s, purchases: remove(s.purchases, x.id) }))}>
                remove
              </button>
            </span>
          </div>
        ))}
      </Card>
    </div>
  )
}
