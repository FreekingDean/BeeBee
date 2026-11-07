import App from '../../App'

export default async function Page({ params }: { params: Promise<{ tab?: string[] }> }) {
  const { tab } = await params
  return <App slug={tab?.[0] ?? 'today'} />
}
