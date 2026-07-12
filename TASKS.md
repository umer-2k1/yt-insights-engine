# YT Insight Engine — Task Board

Last updated: 2026-07-12

## Completed — production-readiness overhaul (July 2026)

- Repo hygiene: gitignores, Node pinning, lockfiles, license/branding cleanup.
- Local infra: docker-compose (Postgres + Redis) and a full-stack `app` profile with one-shot migrations.
- Schema integrity: per-channel video uniqueness, provenance columns, dead models removed, committed initial migration.
- Backend restructure: routes/worker/repository split, pino structured logging with request ids, graceful shutdown.
- Reliability: storage mode pinned at startup, job-store merge semantics + eviction, per-job timeout, worker backoff.
- Data honesty: explicit labeled demo mode, typed YouTube API errors surfaced to users, atomic transactional persistence, fabricated niche-leader benchmarks removed, real growth computation, LLM-primary recommendations with labeled heuristic fallback.
- Hardening: helmet, global + per-endpoint rate limits, YouTube-domain URL validation, request dedup, inline cache-hit results.
- Frontend: template dead code and 12 unused dependencies removed; form submission, empty/skeleton/error states, demo banner, provenance chips, maxVideos selector, a11y.
- Tests: 34 backend vitest tests + 3 Playwright smoke tests; root CI workflow for both apps.
- Docs: root README with six Mermaid architecture diagrams; product evaluation in `docs/PRODUCT_EVALUATION.md`.

## Next up (ranked — see docs/PRODUCT_EVALUATION.md for rationale)

1. Longitudinal channel tracking with week-over-week deltas.
2. User-supplied competitor sets with real side-by-side benchmarks.
3. Accounts, saved analyses, and a billing boundary.
4. Ideation depth: title variants, hooks, thumbnail briefs + outcome tracking.
5. Shareable public report links.

## Explicitly deferred

- Frame/audio-level video processing.
- Multi-platform (TikTok/Shorts) expansion.
- Team/agency features.
