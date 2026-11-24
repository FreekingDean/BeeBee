import { Suspense } from 'react'
import App from '../../App'

const slugs = ['today', 'assistant', 'appointments', 'todo', 'care-team', 'baby', 'baby-stuff', 'pediatric', 'library']

export function generateStaticParams() {
  return [{ tab: [] }, ...slugs.map((s) => ({ tab: [s] }))]
}

type Props = { params: Promise<{ tab?: string[] }> }

export default async function Page({ params }: Props) {
  const { tab } = await params
  return (
    <Suspense>
      <App slug={tab?.[0] ?? 'today'} />
    </Suspense>
  )
}
