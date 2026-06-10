# Backend How It Works

## End-to-End Pipeline

1. Accept channel URL from frontend.
2. Create job and return `jobId` immediately.
3. Process analysis asynchronously (`queued -> running -> completed/failed`).
4. Build latest 15 video snapshot with metadata, comments, and transcript snippets.
5. Detect channel niche from title/description signals.
6. Compute top performing themes and fastest growing themes by velocity.
7. Build niche-leader benchmark and content gap recommendations.
8. Persist results to PostgreSQL through Prisma when `DATABASE_URL` is configured.
9. Return normalized recommendation payload to frontend polling endpoint.

Output payload includes:
    - what is working
    - what is growing
    - what is missing
    - what to create next

## Design Decisions

- Caption-first transcript support keeps MVP light and fast.
- Current ingestion is mock-backed to keep local E2E flow fully runnable without external API keys.
- Full raw video/frame/audio processing stays outside MVP scope.
- Comparison-first outputs create immediate decision value for creators.
