# Backend How It Works

## End-to-End Pipeline

1. Accept channel URL from frontend.
2. Resolve channel metadata and uploads source.
3. Fetch latest 15 videos and metadata.
4. Fetch sample comments for each video.
5. Fetch transcripts/captions when available.
6. Persist normalized records in PostgreSQL through Prisma.
7. Detect channel niche from metadata + transcript/context signals.
8. Discover top-performing creators in same niche.
9. Compare channel against niche leaders across content and engagement dimensions.
10. Produce recommendation payload:
    - what is working
    - what is growing
    - what is missing
    - what to create next

## Design Decisions

- Caption-first transcript support keeps MVP light and fast.
- Full raw video/frame/audio processing stays outside MVP scope.
- Comparison-first outputs create immediate decision value for creators.
