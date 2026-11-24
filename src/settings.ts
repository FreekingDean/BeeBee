import { useEffect, useState } from 'react'

// Per-browser connection settings. These let the app reach outside services
// when it runs as a static site (GitHub Pages) with no server of its own.
// They are stored in this browser only and never leave it except in requests
// to the services they configure.
export type Settings = {
  /** OpenAI-compatible base URL, e.g. https://api.openai.com/v1 */
  llmUrl: string
  llmKey: string
  llmModel: string
  /** URL of a running copy of this app with its server (npm start), e.g. https://beebee.example.com */
  backendUrl: string
  /** Reddit "installed app" client ID, used for review search straight from the browser */
  redditClientId: string
  googleClientId: string
}

const KEY = 'beebee:settings'
const EVENT = 'beebee:settings'

export const emptySettings: Settings = { llmUrl: '', llmKey: '', llmModel: '', backendUrl: '', redditClientId: '', googleClientId: '' }

/** True when this build ships its own /api routes (anything but the static export). */
export const hasOwnServer = process.env.NEXT_PUBLIC_STATIC_EXPORT !== '1'

export function loadSettings(): Settings {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY)
    return raw ? { ...emptySettings, ...JSON.parse(raw) } : emptySettings
  } catch {
    return emptySettings
  }
}

export function saveSettings(s: Settings) {
  const clean = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, String(v ?? '').trim()])) as Settings
  localStorage.setItem(KEY, JSON.stringify(clean))
  window.dispatchEvent(new Event(EVENT))
}

export function useSettings() {
  const [s, set] = useState<Settings>(emptySettings)
  useEffect(() => {
    const sync = () => set(loadSettings())
    sync()
    window.addEventListener(EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return s
}

const trim = (u: string) => u.trim().replace(/\/+$/, '')

/** Where this app's /api routes live: the configured backend, this site's own server, or nowhere. */
export function apiBase(s = loadSettings()): string | null {
  if (s.backendUrl) return trim(s.backendUrl)
  return hasOwnServer ? '' : null
}

/** How to reach the chat model: directly with the user's key, or through an app server's proxy. */
export function llmEndpoint(s = loadSettings()): { url: string; headers: Record<string, string>; model?: string } | null {
  const model = s.llmModel || undefined
  if (s.llmUrl) {
    const headers: Record<string, string> = s.llmKey ? { Authorization: `Bearer ${s.llmKey}` } : {}
    return { url: `${trim(s.llmUrl)}/chat/completions`, headers, model }
  }
  const base = apiBase(s)
  return base === null ? null : { url: `${base}/api/llm/v1/chat/completions`, headers: {}, model }
}

export const googleClientId = (s = loadSettings()) => s.googleClientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

export type Feature = { name: string; ready: boolean; how: string }

export function featureStatus(s: Settings): Feature[] {
  const api = apiBase(s) !== null
  return [
    { name: 'AI assistant', ready: llmEndpoint(s) !== null, how: 'Add an AI provider below, or an app server.' },
    { name: 'Provider lookup (Care team)', ready: api, how: 'Needs an app server. The provider registry does not allow browser requests.' },
    { name: 'Parent reviews (assistant)', ready: api || Boolean(s.redditClientId), how: 'Add a Reddit client ID, or an app server.' },
    { name: 'Product search (assistant)', ready: api, how: 'Needs an app server. The stores do not allow browser requests.' },
    { name: 'Google Calendar import', ready: Boolean(googleClientId(s)), how: 'Add a Google OAuth client ID.' },
  ]
}

export class NotConfigured extends Error {}

export const needsServer = (what: string) =>
  new NotConfigured(`${what} needs an app server. Add one in Settings.`)
