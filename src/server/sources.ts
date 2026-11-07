import { reddit } from './adapters/reddit'
import type { ProductSource, ReviewSource } from './adapters/types'
import { walmart } from './adapters/walmart'

export const reviewSources: ReviewSource[] = [reddit]
export const productSources: ProductSource[] = [walmart]

export const active = <T extends { configured: () => boolean }>(list: T[]) => list.filter((s) => s.configured())

export function unavailable(kind: 'review' | 'product') {
  const hint = kind === 'review' ? 'REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET' : 'WALMART_CONSUMER_ID and WALMART_PRIVATE_KEY_PATH'
  return Response.json({ error: `No ${kind} source is configured. Set ${hint} in .env.` }, { status: 503 })
}
