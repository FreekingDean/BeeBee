import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { chat, describeCall, iconFor, START } from '../assistant'
import { type Update } from '../store'
import type { ChatMsg, Person, State } from '../types'
import { Md } from '../ui'

type Props = { state: State; update: Update; who: Person; ask?: string }

export function Assistant({ state, update, who, ask }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottom = useRef<HTMLLIElement>(null)
  const kicked = useRef(false)
  const router = useRouter()

  const send = async (userText: string) => {
    if (busy || !userText.trim()) return
    setBusy(true)
    setError('')
    setText('')
    try {
      await chat(state, who, userText, update, (m, replaceLast) =>
        update((s) => ({ ...s, chat: replaceLast ? [...s.chat.slice(0, -1), m] : [...s.chat, m] })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (kicked.current || !state.dueDate) return
    if (!ask && state.chat.length > 0) return
    kicked.current = true
    const t = setTimeout(() => {
      void send(ask ?? START)
      if (ask) router.replace('/assistant')
    }, 0)
    return () => clearTimeout(t)
  })

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.chat.length, busy])

  return (
    <section className="chat">
      <ol className="chat-log">
        {state.chat.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}
        {busy && !streaming(state.chat) && <li className="hint">thinking…</li>}
        {error && <li className="hint overdue">{error}</li>}
        <li ref={bottom} />
      </ol>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault()
          void send(text)
        }}
      >
        <input placeholder="Say something…" value={text} onChange={(e) => setText(e.target.value)} disabled={busy} autoFocus />
        <button className="btn" disabled={busy || !text.trim()}>
          Send
        </button>
        <button type="button" className="ghost" onClick={() => confirm('Clear the conversation?') && update((s) => ({ ...s, chat: [] }))}>
          start over
        </button>
      </form>
    </section>
  )
}

const streaming = (c: ChatMsg[]) => c[c.length - 1]?.role === 'assistant' && Boolean(c[c.length - 1].content)

function Bubble({ m }: { m: ChatMsg }) {
  if (m.role === 'tool') return null
  if (m.role === 'user') return m.hidden ? null : <li className="bubble me">{m.content}</li>
  return (
    <>
      {m.tool_calls?.map((c) => (
        <li key={c.id} className="hint">
          {iconFor(c.function.name)} {describeCall(c)}
        </li>
      ))}
      {m.content && (
        <li className="bubble md">
          <Md>{m.content}</Md>
        </li>
      )}
    </>
  )
}
