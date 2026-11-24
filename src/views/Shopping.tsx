import { useState } from 'react'
import { dateForWeek, fmtDate, gestation, todayIso } from '../pregnancy'
import { patch, remove, uid, type Update } from '../store'
import type { Purchase, ShoppingCategory, ShoppingItem, State } from '../types'
import { Card, Check, Empty, Tag } from '../ui'

const categories: ShoppingCategory[] = ['for mom', 'hospital bag', 'nursery', 'gear', 'diapering', 'feeding', 'clothing', 'bath & health', 'other']

const blurb: Record<ShoppingCategory, string> = {
  'for mom': 'Recovery and feeding supplies. Have these home before week 37.',
  'hospital bag': 'Packed and by the door by week 36.',
  nursery: "Big items first so delivery lead times don't bite.",
  gear: 'Car seat must be installed before you leave the hospital.',
  diapering: "Don't overbuy newborn size; babies outgrow it in weeks.",
  feeding: 'Check insurance for the pump around week 30.',
  clothing: 'Mostly newborn and 0-3m. Washed before baby arrives.',
  'bath & health': "Small stuff that's annoying to not have at 2am.",
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
    <>
      <Card title="Add an item">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addItem()
          }}
        >
          <input placeholder="What" value={item} onChange={(e) => setItem(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value as ShoppingCategory)}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label className="inline">
            by wk <input type="number" value={by} onChange={(e) => setBy(+e.target.value)} />
          </label>
          <button className="btn" disabled={!item}>
            Add
          </button>
        </form>
      </Card>

      <p className="hint">{remaining} things left to get</p>

      {categories.map((c) => {
        const items = state.shopping.filter((s) => s.category === c)
        if (items.length === 0) return null
        const todo = items.filter((s) => !s.bought).sort((a, b) => a.buyByWeek - b.buyByWeek)
        const done = items.filter((s) => s.bought)
        return (
          <Card
            key={c}
            title={c}
            right={
              <small>
                {done.length}/{items.length}
              </small>
            }
          >
            {blurb[c] && <p className="hint">{blurb[c]}</p>}
            {todo.length === 0 && <Empty>All set.</Empty>}
            <ul>
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
            </ul>
            {done.length > 0 && (
              <details>
                <summary>{done.length} bought</summary>
                <ul>
                  {done.map((s) => (
                    <Check key={s.id} checked={s.bought} onChange={(v) => toggle(s, v)}>
                      {s.item}
                    </Check>
                  ))}
                </ul>
              </details>
            )}
          </Card>
        )
      })}

      <Card title="Spent" right={<data value={total}>${total.toFixed(2)}</data>}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addPurchase()
          }}
        >
          <input placeholder="Item" value={p.item} onChange={(e) => setP({ ...p, item: e.target.value })} />
          <input type="number" placeholder="Cost" value={p.cost || ''} onChange={(e) => setP({ ...p, cost: +e.target.value })} />
          <input placeholder="Store" value={p.store ?? ''} onChange={(e) => setP({ ...p, store: e.target.value })} />
          <input type="date" value={p.date} onChange={(e) => setP({ ...p, date: e.target.value })} />
          <button className="btn" disabled={!p.item}>
            Add
          </button>
        </form>
        {state.purchases.length === 0 && <Empty>Log what you actually spent.</Empty>}
        <ul>
          {[...state.purchases].reverse().map((x) => (
            <li key={x.id}>
              <strong>{x.item}</strong>
              <small>
                {x.store && `${x.store} · `}
                {fmtDate(x.date)}
              </small>
              <data value={x.cost}>${x.cost.toFixed(2)}</data>
              <button className="ghost" onClick={() => update((s) => ({ ...s, purchases: remove(s.purchases, x.id) }))}>
                remove
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
