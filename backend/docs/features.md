# Backend Features

## Core MVP Features

- Channel analysis job API
  - `POST /api/analyze-channel`
  - `GET /api/analysis/:jobId`
  - `GET /api/analysis-by-channel?channelUrl=...`
  - `GET /api/health`
- Latest 15 video ingestion via YouTube Data API when `YOUTUBE_API_KEY` is configured.
- Automatic fallback snapshot mode when API key is missing or external fetch fails.
- Comment sampling per video.
- Comment intent classification (`positive`, `negative`, `request`, `question`, `complaint`).
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

- Async background processing queue:
  - Redis-backed when `REDIS_URL` is configured
  - In-memory fallback when Redis is unavailable
- TTL cache for channel snapshots and analysis results (24h):
  - Redis-backed when available
  - In-memory fallback otherwise
- Error-state handling for failed analysis jobs.
- Structured analysis result payload for dashboard rendering.
- Optional LLM recommendation layer:
  - Uses LangChain pipeline with provider-agnostic endpoint configuration
  - Uses `LLM_API_KEY` + `LLM_API_BASE_URL` + `LLM_MODEL` when present
  - Falls back to deterministic heuristic outputs when absent
