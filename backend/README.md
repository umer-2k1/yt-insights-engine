# YT Insight Engine Backend

Node.js + TypeScript backend for asynchronous channel analysis.

## Stack

- Express API
- Prisma ORM
- PostgreSQL (cloud URI via `DATABASE_URL`)
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
- `DATABASE_URL` - cloud PostgreSQL URI
- `YOUTUBE_API_KEY` - optional, for later real ingestion integration

## API

- `GET /api/health`
- `POST /api/analyze-channel`
- `GET /api/analysis/:jobId`

## Notes

- Current E2E flow is fully operational with mock channel snapshot generation.
- When `DATABASE_URL` is configured, completed analyses are persisted using Prisma.
