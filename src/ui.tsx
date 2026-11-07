import type { ReactNode } from 'react'

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
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
      {onDelete && (
        <button onClick={onDelete} className="ghost">
          remove
        </button>
      )}
    </label>
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag">{children}</span>
}
