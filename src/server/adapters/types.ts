export type Review = {
  id: string
  source: string
  title: string
  excerpt: string
  score: number
  comments: number
  url: string
}

export type Thread = {
  title: string
  body: string
  url: string
  comments: { score: number; body: string }[]
}

export type Product = {
  source: string
  name: string
  price?: number
  rating?: number
  reviews?: number
  url: string
  image?: string
  summary?: string
}

export type ReviewSource = {
  name: string
  configured: () => boolean
  search: (q: string) => Promise<Review[]>
  thread: (id: string) => Promise<Thread>
}

export type ProductSource = {
  name: string
  configured: () => boolean
  search: (q: string) => Promise<Product[]>
}
