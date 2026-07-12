# YT Insight Engine — Frontend

React 19 + Vite + Tailwind 4 + shadcn/ui dashboard. Full documentation and architecture diagrams live in the [root README](../README.md).

## Quickstart

```bash
pnpm install
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:4000
pnpm dev               # http://localhost:3000
```

Requires Node ≥ 20.19 (22 recommended — `.nvmrc` at the repo root).

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | typecheck + production build |
| `pnpm test` | Playwright smoke tests (chromium; run `pnpm exec playwright install chromium` once) |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm typecheck` | tsc --noEmit |
