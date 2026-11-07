import { createSign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { ProductSource } from './types'

const env = () => ({
  consumerId: process.env.WALMART_CONSUMER_ID,
  keyVersion: process.env.WALMART_KEY_VERSION ?? '1',
  keyPath: process.env.WALMART_PRIVATE_KEY_PATH,
})

function headers() {
  const { consumerId, keyVersion, keyPath } = env()
  const timestamp = Date.now().toString()
  const signer = createSign('RSA-SHA256')
  signer.update(`${consumerId}\n${timestamp}\n${keyVersion}\n`)
  const signature = signer.sign(readFileSync(keyPath!, 'utf8'), 'base64')
  return {
    'WM_CONSUMER.ID': consumerId!,
    'WM_CONSUMER.INTIMESTAMP': timestamp,
    'WM_SEC.KEY_VERSION': keyVersion,
    'WM_SEC.AUTH_SIGNATURE': signature,
    Accept: 'application/json',
  }
}

type Item = {
  name: string
  salePrice?: number
  customerRating?: string
  numReviews?: number
  productUrl: string
  thumbnailImage?: string
  shortDescription?: string
}

export const walmart: ProductSource = {
  name: 'walmart',
  configured: () => Boolean(env().consumerId && env().keyPath),
  async search(q) {
    const params = new URLSearchParams({ query: q, numItems: '10' })
    const res = await fetch(`https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search?${params}`, { headers: headers() })
    if (!res.ok) throw new Error(`Walmart ${res.status}`)
    const data = (await res.json()) as { items?: Item[] }
    return (data.items ?? []).map((i) => ({
      source: 'walmart',
      name: i.name,
      price: i.salePrice,
      rating: i.customerRating ? Number(i.customerRating) : undefined,
      reviews: i.numReviews,
      url: i.productUrl,
      image: i.thumbnailImage,
      summary: i.shortDescription?.replace(/<[^>]+>/g, '').slice(0, 300),
    }))
  },
}
