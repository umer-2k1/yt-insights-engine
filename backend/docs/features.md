# Backend Features

## Core MVP Features

- Channel analysis job API
  - `POST /api/analyze-channel`
  - `GET /api/analysis/:jobId`
  - `GET /api/health`
- Latest 15 video ingestion via YouTube Data API when `YOUTUBE_API_KEY` is configured.
- Automatic fallback snapshot mode when API key is missing or external fetch fails.
- Comment sampling per video.
- Transcript-aware analysis support path (context snippet derived from title/description/comments).
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
- Additional structured insights:
  - winning formats
  - title pattern performance
  - posting cadence analysis
  - engagement-rate signals

## Data Layer Features

- Prisma ORM for model management and migrations.
- Cloud PostgreSQL via connection URI.
- Persistent analysis writes when `DATABASE_URL` is configured.
- Video, metric, comment, transcript, and analysis records persisted per run.

## Operational Features

- Async background processing with in-memory job store.
- TTL cache for channel snapshots and analysis results (24h) to reduce repeat processing.
- Error-state handling for failed analysis jobs.
- Structured analysis result payload for dashboard rendering.
