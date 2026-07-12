# Backend Architecture

## Stack

- Node.js + TypeScript API service.
- Prisma ORM with cloud PostgreSQL.
- Redis for cache and async queue coordination (optional; falls back to in-memory).
- Heuristic analysis engine with optional LLM recommendation refinement.

## High-Level Flow

1. Client submits channel URL.
2. API validates request and creates analysis job.
3. Queue worker fetches channel, videos, comments, and transcript-context (if available).
4. Analysis engine computes niche, themes, formats, title patterns, cadence, and engagement signals.
5. Optional LLM layer refines content gaps and suggested video recommendations.
6. Results persist in PostgreSQL and are returned through status endpoint.

## Data Strategy

- PostgreSQL is source of truth.
- Prisma schema defines domain models and relations.
- Redis/in-memory cache prevents repeated YouTube calls within TTL windows.

## Extensibility

- Add new analysis stages in the analysis engine without rewriting the whole pipeline.
- Extend recommendation modules (thumbnail intelligence, title patterns, calendar generation) as separate phases.
