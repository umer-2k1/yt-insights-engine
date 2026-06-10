# Backend Features

## Core MVP Features

- Channel analysis job API
  - `POST /api/analyze-channel`
  - `GET /api/analysis/:jobId`
  - `GET /api/health`
- Latest 15 video ingestion (current mock snapshot service for E2E flow).
- Comment sampling per video.
- Transcript-aware analysis support path.
- Automatic niche detection.
- Top creator benchmark suggestions in the same niche.
- Comparative insight generation:
  - topics
  - formats
  - titles
  - thumbnails
  - posting cadence
  - engagement
- Actionable recommendations for next videos.

## Data Layer Features

- Prisma ORM for model management and migrations.
- Cloud PostgreSQL via connection URI.
- Persistent analysis writes when `DATABASE_URL` is configured.

## Operational Features

- Async background processing with in-memory job store.
- Error-state handling for failed analysis jobs.
- Structured analysis result payload for dashboard rendering.
