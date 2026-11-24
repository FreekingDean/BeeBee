import type { ReactNode } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function Md({ children }: { children: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {children}
    </Markdown>
  )
}

export function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="card">
      {title && (
        <header>
          <h2>{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}

export function Check({
  checked,
  onChange,
  children,
  onDelete,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: ReactNode
  onDelete?: () => void
}) {
  return (
    <li className="check">
      <label>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>{children}</span>
      </label>
      {onDelete && (
        <button onClick={onDelete} className="ghost">
          remove
        </button>
      )}
    </li>
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return <small className="tag">{children}</small>
}
