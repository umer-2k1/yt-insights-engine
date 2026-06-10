# Backend Architecture

## Stack

- Node.js + TypeScript API service.
- Prisma ORM with cloud PostgreSQL.
- Redis for cache and async queue coordination.
- LangGraph for orchestrated analysis steps.

## High-Level Flow

1. Client submits channel URL.
2. API validates request and creates analysis job.
3. Worker fetches channel, videos, comments, and transcripts (if available).
4. Worker detects niche and discovers top creators in that niche.
5. Worker computes comparative insights and recommendations.
6. Results persist in PostgreSQL and are returned through status endpoint.

## Data Strategy

- PostgreSQL is source of truth.
- Prisma schema defines domain models and relations.
- Redis cache prevents repeated YouTube calls within TTL windows.

## Extensibility

- Add new analysis nodes in LangGraph without rewriting the whole pipeline.
- Extend recommendation modules (thumbnail intelligence, title patterns, calendar generation) as separate phases.
