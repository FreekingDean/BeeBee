import { useEffect, useRef, useState } from 'react'
import { chat, describeCall, START } from '../assistant'
import { type Update } from '../store'
import type { ChatMsg, Person, State } from '../types'

export function Assistant({ state, update, who }: { state: State; update: Update; who: Person }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottom = useRef<HTMLDivElement>(null)
  const kicked = useRef(false)

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
    if (kicked.current || state.chat.length > 0 || !state.dueDate) return
    kicked.current = true
    const t = setTimeout(() => send(START), 0)
    return () => clearTimeout(t)
  })

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.chat.length, busy])

  return (
    <div className="chat">
      <div className="chat-log">
        {state.chat.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}
        {busy && !streaming(state.chat) && <div className="hint">thinking…</div>}
        {error && <div className="hint text-amber-600">{error}</div>}
        <div ref={bottom} />
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault()
          void send(text)
        }}
      >
        <input placeholder={state.dueDate ? 'Say something…' : 'Set a due date on Today first'} value={text} onChange={(e) => setText(e.target.value)} disabled={busy || !state.dueDate} autoFocus />
        <button className="btn" disabled={busy || !text.trim()}>
          Send
        </button>
        <button type="button" className="ghost" onClick={() => confirm('Clear the conversation?') && update((s) => ({ ...s, chat: [] }))}>
          start over
        </button>
      </form>
    </div>
  )
}

const streaming = (c: ChatMsg[]) => c[c.length - 1]?.role === 'assistant' && Boolean(c[c.length - 1].content)

function Bubble({ m }: { m: ChatMsg }) {
  if (m.role === 'tool') return null
  if (m.role === 'user') return m.hidden ? null : <div className="bubble me">{m.content}</div>
  return (
    <>
      {m.tool_calls?.map((c) => (
        <div key={c.id} className="hint">
          ⚙ {describeCall(c)}
        </div>
      ))}
      {m.content && <div className="bubble">{m.content}</div>}
    </>
  )
}
