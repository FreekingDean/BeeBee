import type { Product, ProductSource } from './types'

const categories: [RegExp, string][] = [
  [/pump/, 'breast-pumps'],
  [/stroller/, 'strollers'],
  [/car ?seat/, 'car-seats'],
  [/crib/, 'cribs'],
  [/bassinet/, 'bassinets'],
  [/monitor/, 'baby-monitors'],
  [/diaper bag/, 'diaper-bags'],
  [/diaper/, 'diapers'],
  [/bottle/, 'bottles'],
  [/carrier|wrap/, 'baby-carriers'],
  [/swaddle/, 'swaddles'],
  [/sleep ?sack/, 'sleep-sacks'],
  [/high ?chair/, 'high-chairs'],
  [/bouncer/, 'bouncers'],
  [/play ?mat|play ?gym/, 'play-gyms'],
  [/nursing pillow/, 'nursing-pillows'],
  [/pacifier/, 'pacifiers'],
  [/bath/, 'bath-tubs'],
  [/postpartum/, 'postpartum-care'],
]

export function categoryFor(query: string) {
  const q = query.toLowerCase()
  return categories.find(([re]) => re.test(q))?.[1] ?? q.trim().replace(/[^a-z0-9]+/g, '-')
}

type Item = {
  id: number
  brand: string
  name: string
  heroUrl: string
  pricing: { current: number }
  images: { thumbnailUrl?: string }
  onSale: boolean
  productBadge?: { title?: string } | null
}

const words = (s: string) => s.toLowerCase().split(/\s+/).filter((w) => w.length > 1)

export const babylist: ProductSource = {
  name: 'babylist',
  configured: () => true,
  async search(q) {
    const slug = categoryFor(q)
    const res = await fetch(`https://www.babylist.com/store/api/categories/${slug}/products?limit=48&offset=0`, {
      headers: { Accept: 'application/json', 'User-Agent': 'beebeetracker/0.1 (personal pregnancy planner)' },
    })
    if (!res.ok) throw new Error(`Babylist has no category "${slug}" (${res.status})`)
    const data = (await res.json()) as { products?: Item[] }
    const terms = words(q)
    const score = (p: Item) => terms.filter((w) => `${p.brand} ${p.name}`.toLowerCase().includes(w)).length
    const toProduct = (p: Item): Product => ({
      source: 'babylist',
      name: p.name,
      price: p.pricing?.current,
      url: p.heroUrl,
      image: p.images?.thumbnailUrl,
      summary: [p.brand, p.productBadge?.title, p.onSale ? 'on sale' : undefined].filter(Boolean).join(' · '),
    })
    return (data.products ?? [])
      .sort((a, b) => score(b) - score(a))
      .slice(0, 10)
      .map(toProduct)
  },
}
