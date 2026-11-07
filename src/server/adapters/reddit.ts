import type { ReviewSource } from './types'

const SUBS = 'BabyBumps+beyondthebump+NewParents+pregnant+breastfeeding'
const UA = 'beebeetracker/0.1 (personal pregnancy planner)'

let token: { value: string; expires: number } | undefined

async function auth() {
  if (token && token.expires > Date.now()) return token.value
  const creds = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Reddit auth failed (${res.status})`)
  const data = (await res.json()) as { access_token: string; expires_in: number }
  token = { value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 }
  return token.value
}

async function api<T>(path: string) {
  const res = await fetch(`https://oauth.reddit.com${path}`, { headers: { Authorization: `Bearer ${await auth()}`, 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Reddit ${res.status}`)
  return (await res.json()) as T
}

type Post = { id: string; title: string; selftext: string; subreddit: string; score: number; num_comments: number; permalink: string }
type Listing<T> = { data: { children: { kind: string; data: T }[] } }
type Comment = { body: string; score: number }

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)

export const reddit: ReviewSource = {
  name: 'reddit',
  configured: () => Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
  async search(q) {
    const params = new URLSearchParams({ q, restrict_sr: '1', sort: 'relevance', t: 'all', limit: '10', raw_json: '1' })
    const data = await api<Listing<Post>>(`/r/${SUBS}/search?${params}`)
    return data.data.children.map(({ data: p }) => ({
      id: p.id,
      source: `r/${p.subreddit}`,
      title: p.title,
      excerpt: clip(p.selftext.replace(/\s+/g, ' ').trim(), 300),
      score: p.score,
      comments: p.num_comments,
      url: `https://www.reddit.com${p.permalink}`,
    }))
  },
  async thread(id) {
    const [post, comments] = await api<[Listing<Post>, Listing<Comment>]>(`/comments/${id}?limit=15&depth=1&sort=top&raw_json=1`)
    const p = post.data.children[0].data
    return {
      title: p.title,
      body: clip(p.selftext.trim(), 2000),
      url: `https://www.reddit.com${p.permalink}`,
      comments: comments.data.children
        .filter((c) => c.kind === 't1' && c.data.body)
        .slice(0, 12)
        .map((c) => ({ score: c.data.score, body: clip(c.data.body.trim(), 600) })),
    }
  },
}
