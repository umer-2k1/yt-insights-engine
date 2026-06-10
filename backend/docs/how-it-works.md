# Backend How It Works

## End-to-End Pipeline

1. Accept channel URL from frontend.
2. Create job and return `jobId` immediately.
3. Enqueue analysis job and process asynchronously (`queued -> running -> completed/failed`).
4. Fetch latest 15 videos from YouTube Data API (fallback to local snapshot mode if API is unavailable).
5. Enrich each video with sampled comments and transcript-context snippet.
6. Detect channel niche from title/description/transcript-context signals.
7. Compute:
   - top themes
   - fastest-growing themes
   - format performance
   - title pattern performance
   - posting cadence
   - engagement signals
8. Build niche-leader benchmarks, gaps, and suggested next videos.
9. Persist channel, videos, metrics, comments, transcripts, and analysis result (when `DATABASE_URL` exists).
10. Optionally refine gaps/suggestions via LLM layer when `OPENAI_API_KEY` is configured.
11. Return normalized recommendation payload to frontend polling endpoint.

Output payload includes:
    - what is working
    - what is growing
    - what is missing
    - what to create next

## Design Decisions

- Caption-first transcript support keeps MVP light and fast.
- Fallback mode guarantees local E2E flow even without external API keys.
- Real YouTube API path is implemented and used when key is provided.
- Redis-backed cache/queue are optional and degrade gracefully to in-memory mode.
- Full raw video/frame/audio processing stays outside MVP scope.
- Comparison-first outputs create immediate decision value for creators.
