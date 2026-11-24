# beebee

A shared pregnancy and newborn prep tracker for two parents-to-be: due date and
week-by-week timeline, appointments, to-dos split by owner, care team, baby
shopping list, pediatric questions, a resource library and an AI assistant.
All data lives in the browser's `localStorage`.

## Development

```sh
npm ci
cp .env.example .env   # optional: LLM, Google Calendar, Reddit, Walmart keys
npm run dev
npm test
```

## GitHub Pages

`.github/workflows/pages.yml` builds a static export on every push to `main`
and deploys it to `https://<owner>.github.io/<repo>/`.

- In the repo, set **Settings > Pages > Source** to **GitHub Actions**.
- Optional: add a repository variable `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to enable
  Google Calendar sync (and add the Pages URL as an authorized JavaScript origin).

To build the static site locally:

```sh
rm -rf src/app/api   # API routes can't be statically exported
STATIC_EXPORT=1 BASE_PATH=/BeeBee npm run build   # output in ./out
git checkout src/app/api
```

The static site has no server. Open the **Settings** tab in the app to connect
outside services from the browser. Settings are stored per browser.

| Feature | On the static site |
| --- | --- |
| AI assistant | Enter any OpenAI-compatible API URL, key and model. Calls go straight from the browser. |
| Parent reviews (Reddit) | Enter a Reddit "installed app" client ID (no secret). |
| Google Calendar import | Enter a Google OAuth client ID, or set the `NEXT_PUBLIC_GOOGLE_CLIENT_ID` variable. |
| Provider lookup, product search | Need an app server: these sites block browser requests. |

### App server

To unlock everything, run the full app (`npm run build && npm start`) anywhere
reachable, with `CORS_ORIGIN` set to the Pages origin, for example
`CORS_ORIGIN=https://<owner>.github.io`. Then paste that server's URL into
**Settings > App server**. Its `.env` keys (LLM, Reddit, Walmart) apply to
requests that go through it.
