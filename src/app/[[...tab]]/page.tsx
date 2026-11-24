import App from '../../App'

type Props = { params: Promise<{ tab?: string[] }>; searchParams: Promise<{ ask?: string }> }

export default async function Page({ params, searchParams }: Props) {
  const { tab } = await params
  const { ask } = await searchParams
  return <App slug={tab?.[0] ?? 'today'} ask={ask} />
}
