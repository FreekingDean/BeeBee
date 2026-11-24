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

The static site has no server, so features backed by `src/app/api` (the
assistant's LLM proxy, NPI provider lookup, product and review search) are
unavailable there. Everything else works fully in the browser.
