# Backend Features

## Core MVP Features

- Channel analysis job API
  - `POST /analyze-channel`
  - `GET /analysis/:jobId`
- Latest 15 video ingestion.
- Comment sampling per video.
- Transcript-aware analysis when captions are available.
- Automatic niche detection.
- Top creator discovery in the same niche.
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
- Redis cache for quota protection and repeated-request efficiency.

## Operational Features

- Async processing through queue workers.
- Retry and error state handling.
- Structured analysis result payload for dashboard rendering.
