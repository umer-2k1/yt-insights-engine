# Frontend How It Works

## User Journey

1. User lands on YT Insight Engine dashboard page.
2. User submits a channel URL through the hero input.
3. Frontend calls backend `POST /api/analyze-channel`.
4. Frontend polls `GET /api/analysis/:jobId` until complete.
5. Dashboard sections populate with recommendations and benchmark insights.

## Key UX Principles

- Insight engine first, charts second.
- Show actionable recommendations before detailed metrics.
- Keep every section answer-oriented:
  - What is working?
  - What is growing?
  - What is missing?
  - What to create next?

## Content Blocks (Landing)

- Hero: immediate value proposition with URL input.
- Status strip: job state and detected niche.
- Insight cards: top themes, growth themes, content gaps.
- Benchmark section: niche leaders and strengths.
- Recommendation section: suggested next videos.
