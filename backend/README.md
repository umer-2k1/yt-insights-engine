# YT Insight Engine Backend

Node.js + TypeScript backend for asynchronous channel analysis.

## Stack

- Express API
- Prisma ORM
- PostgreSQL (cloud URI via `DATABASE_URL`)
- Redis queue/cache (optional via `REDIS_URL`)
- LangChain-based recommendation refinement (optional via generic LLM endpoint env vars)
- pnpm

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm dev
```

## Environment

- `PORT` - backend port (default `4000`)
- `FRONTEND_ORIGIN` - allowed CORS origin
- `REDIS_URL` - optional Redis connection URL
- `DATABASE_URL` - cloud PostgreSQL URI
- `YOUTUBE_API_KEY` - optional, enables real YouTube API ingestion
- `LLM_API_KEY` - optional, enables LLM recommendation refinement
- `LLM_API_BASE_URL` - LLM endpoint base URL (Groq-compatible default provided)
- `LLM_MODEL` - model name for LLM refinement
- `LLM_TEMPERATURE` - generation temperature for LLM refinement

## API

- `GET /api/health`
- `POST /api/analyze-channel`
- `GET /api/analysis/:jobId`
- `GET /api/analysis-by-channel?channelUrl=...`

## Notes

- E2E flow works in fallback mode even without external API keys.
- Real YouTube API ingestion activates automatically when `YOUTUBE_API_KEY` is provided.
- When `DATABASE_URL` is configured, completed analyses are persisted using Prisma.
- Redis queue/cache is used when available and falls back to in-memory mode when not.
