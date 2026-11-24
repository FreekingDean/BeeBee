import { useEffect, useState } from 'react'
import { featureStatus, hasOwnServer, saveSettings, useSettings, type Settings as S } from '../settings'
import { Card, Tag } from '../ui'

const presets = [
  { label: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  { label: 'Local (llama.cpp)', url: 'http://localhost:8080/v1', model: '' },
]

export function Settings() {
  const saved = useSettings()
  const [s, setS] = useState<S>(saved)
  const [note, setNote] = useState('')
  useEffect(() => setS(saved), [saved])

  const field = (key: keyof S, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label>
      <span>{label}</span>
      <input value={s[key]} onChange={(e) => setS({ ...s, [key]: e.target.value })} {...props} />
    </label>
  )

  const save = () => {
    saveSettings(s)
    setNote('Saved in this browser.')
  }

  return (
    <>
      <Card title="What's set up">
        <ul>
          {featureStatus(saved).map((f) => (
            <li key={f.name}>
              <span>
                {f.name} <Tag>{f.ready ? 'ready' : 'needs setup'}</Tag>
              </span>
              {!f.ready && <small>{f.how}</small>}
            </li>
          ))}
        </ul>
        <p className="hint">
          Settings are saved in this browser only. Each device needs its own setup. Keys are sent only to the service they belong to.
        </p>
      </Card>

      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Card title="AI assistant">
          <p className="hint">
            Any OpenAI-compatible chat API that accepts requests from a browser. Your key is stored in this browser and anyone using it can
            see it, so use a key with a spending limit.
          </p>
          <p className="hint">
            Fill in for:{' '}
            {presets.map((p, i) => (
              <span key={p.label}>
                {i > 0 && ' · '}
                <button type="button" className="link" onClick={() => setS({ ...s, llmUrl: p.url, llmModel: s.llmModel || p.model })}>
                  {p.label}
                </button>
              </span>
            ))}
          </p>
          {field('llmUrl', 'API base URL', { placeholder: 'https://api.openai.com/v1', type: 'url' })}
          {field('llmKey', 'API key', { type: 'password', autoComplete: 'off' })}
          {field('llmModel', 'Model', { placeholder: 'gpt-4o-mini' })}
        </Card>

        <Card title="Parent reviews">
          <p className="hint">
            Lets the assistant search Reddit parenting subs. Create an app at reddit.com/prefs/apps, choose &quot;installed app&quot;, and
            paste its client ID here. No secret is needed.
          </p>
          {field('redditClientId', 'Reddit client ID', { autoComplete: 'off' })}
        </Card>

        <Card title="Google Calendar">
          <p className="hint">
            Create an OAuth client ID (type &quot;Web application&quot;) in Google Cloud Console and add this site&apos;s address as an
            authorized JavaScript origin.
          </p>
          {field('googleClientId', 'Google OAuth client ID', { placeholder: '…apps.googleusercontent.com', autoComplete: 'off' })}
        </Card>

        <Card title="App server (optional)">
          <p className="hint">
            {hasOwnServer
              ? 'This copy of the app has its own server, so provider lookup and product search already work. You only need this to use a different server.'
              : 'Provider lookup and product search need a server, because those sites block requests from a browser. Run this app with npm start somewhere (set CORS_ORIGIN to this site) and paste its address here. It also works for the assistant and reviews.'}
          </p>
          {field('backendUrl', 'Server URL', { placeholder: 'https://beebee.example.com', type: 'url' })}
        </Card>

        <footer>
          {note && <span className="hint">{note}</span>}
          <button className="btn">Save</button>
        </footer>
      </form>
    </>
  )
}
