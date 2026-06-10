# YT Insight Engine

Dashboard-first YouTube creator intelligence app that answers:

**What should I create next based on what is working in my niche right now?**

## Project Structure

- `frontend/` - Vite React TypeScript app (dark-mode dashboard UI).
- `backend/` - Node.js TypeScript API with Prisma and analysis pipeline.

## Core Flow

1. Submit a YouTube channel URL.
2. Backend creates analysis job.
3. Job fetches latest videos/comments/context (YouTube API when configured, fallback otherwise).
4. Analysis engine computes:
   - winning themes
   - growing themes
   - format and title-pattern winners
   - posting and engagement signals
   - niche gap recommendations
5. Frontend polls status and renders recommendation-first dashboard output.

## Environment Setup

### Frontend

- Copy `frontend/.env.example` to `frontend/.env`
- Configure `VITE_API_BASE_URL`

### Backend

- Copy `backend/.env.example` to `backend/.env`
- Set `DATABASE_URL` for cloud PostgreSQL
- Set `YOUTUBE_API_KEY` to enable real API ingestion
- Set `REDIS_URL` to enable Redis-backed queue/cache (optional)
- Set `LLM_API_KEY` + `LLM_API_BASE_URL` + `LLM_MODEL` for LangChain LLM refinement (optional)

## Notes

- Current implementation is production-shaped but installation/runtime checks were intentionally not blocked by environment package constraints.
- If package manager or Node compatibility issues appear locally, fix tooling and run the same scripts again.
