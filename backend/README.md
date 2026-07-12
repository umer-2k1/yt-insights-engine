# YT Insight Engine — Backend

Express + TypeScript (ESM) API with an async analysis pipeline. Full documentation, architecture diagrams, and API reference live in the [root README](../README.md).

## Quickstart

```bash
pnpm install
pnpm prisma:generate
cp .env.example .env   # works as-is (demo mode, in-memory storage)
pnpm dev               # http://localhost:4000
```

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | tsx watch mode |
| `pnpm build` / `pnpm start` | compile / run `dist/` |
| `pnpm test` | vitest unit suite |
| `pnpm prisma:generate` | generate the Prisma client |
| `pnpm prisma:migrate` | create/apply dev migrations |
| `pnpm prisma:deploy` | apply committed migrations (prod/CI) |

Postgres + Redis for local development: `docker compose up -d` at the repo root (Postgres on host port **5433**).
