import type { ReviewSource } from './types'

const SUBS = 'BabyBumps+beyondthebump+NewParents+pregnant+breastfeeding'
const UA = 'beebeetracker/0.1 (personal pregnancy planner)'

// Works on the server (script app: id + secret) and in the browser
// (installed app: id only, no secret). Reddit's OAuth endpoints allow CORS.
export type RedditCreds = { id: string; secret?: string }

const tokens = new Map<string, { value: string; expires: number }>()

async function auth({ id, secret }: RedditCreds) {
  const cached = tokens.get(id)
  if (cached && cached.expires > Date.now()) return cached.value
  const body = secret
    ? 'grant_type=client_credentials'
    : `grant_type=${encodeURIComponent('https://oauth.reddit.com/grants/installed_client')}&device_id=DO_NOT_TRACK_THIS_DEVICE`
  const headers: Record<string, string> = { Authorization: `Basic ${btoa(`${id}:${secret ?? ''}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }
  // Browsers refuse to set User-Agent; only send it from the server.
  if (secret) headers['User-Agent'] = UA
  const res = await fetch('https://www.reddit.com/api/v1/access_token', { method: 'POST', headers, body })
  if (!res.ok) throw new Error(`Reddit auth failed (${res.status})`)
  const data = (await res.json()) as { access_token: string; expires_in: number }
  tokens.set(id, { value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 })
  return data.access_token
}

async function api<T>(creds: RedditCreds, path: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${await auth(creds)}` }
  if (creds.secret) headers['User-Agent'] = UA
  const res = await fetch(`https://oauth.reddit.com${path}`, { headers })
  if (!res.ok) throw new Error(`Reddit ${res.status}`)
  return (await res.json()) as T
}

type Post = { id: string; title: string; selftext: string; subreddit: string; score: number; num_comments: number; permalink: string }
type Listing<T> = { data: { children: { kind: string; data: T }[] } }
type Comment = { body: string; score: number }

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)

export const redditWith = (creds: () => RedditCreds | undefined): ReviewSource => ({
  name: 'reddit',
  configured: () => Boolean(creds()),
  async search(q) {
    const params = new URLSearchParams({ q, restrict_sr: '1', sort: 'relevance', t: 'all', limit: '10', raw_json: '1' })
    const data = await api<Listing<Post>>(creds()!, `/r/${SUBS}/search?${params}`)
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
    const [post, comments] = await api<[Listing<Post>, Listing<Comment>]>(creds()!, `/comments/${id}?limit=15&depth=1&sort=top&raw_json=1`)
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
})

const fromEnv = () => {
  const id = process.env.REDDIT_CLIENT_ID
  const secret = process.env.REDDIT_CLIENT_SECRET
  return id && secret ? { id, secret } : undefined
}

export const reddit = redditWith(fromEnv)
