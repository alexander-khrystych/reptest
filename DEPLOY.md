# Deployment

Two independent targets, deployed separately (the repo's two halves don't share a build):

| Part | Where | How |
| --- | --- | --- |
| Frontend (Vite SPA) | Cloudflare **Pages** | Cloudflare builds from GitHub on push to `main` |
| Relay (`party/server.ts`) | Cloudflare **Worker** `reptest-relay` | `pnpm party:deploy` |

They talk over `VITE_PARTYKIT_HOST` (set in the Pages project's env vars → the Worker's URL).

## Relay Worker

```bash
pnpm party:deploy        # = wrangler deploy (reads wrangler.jsonc)
```

Notes:
- One-time auth if the CLI isn't logged in: `pnpm exec wrangler login`.
- **No migration or config change** is needed for the current changes: `wrangler.jsonc` (Worker
  name `reptest-relay`, Durable Object `Session`, KV `RESUME`) is unchanged, and the code change was
  method-only — the observer "leave" handler was removed; no new Durable Object class and no storage
  schema change, so the existing `v1` migration still applies.
- Watch it live afterwards: `pnpm party:tail`.
- If you ever change `wrangler.jsonc` bindings, regenerate types first: `pnpm typecheck:party`
  (runs `wrangler types`).

## Frontend (Pages)

If the Pages project is connected to the GitHub repo (the setup here):

```bash
git push origin main     # Cloudflare Pages builds dist/ and publishes
```

Required Pages env var (already set from earlier deploys):
`VITE_PARTYKIT_HOST = reptest-relay.<your-subdomain>.workers.dev`

Manual alternative, only if Pages is **not** Git-connected:

```bash
pnpm build
pnpm exec wrangler pages deploy dist
```