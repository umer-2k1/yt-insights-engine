import { describe, expect, it } from 'vitest';

import type { ChannelSnapshot, VideoSnapshot } from '../types/analysis.js';
import { computeVelocity, getDaysSinceUpload, runAnalysis } from './analysis-engine.js';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeVideo(overrides: Partial<VideoSnapshot> = {}): VideoSnapshot {
  return {
    videoId: 'v1',
    title: 'How I build AI agents that ship',
    description: 'agent content',
    publishedAt: daysAgo(10),
    views: 10_000,
    likes: 400,
    commentsCount: 90,
    sampleComments: [
      { text: 'Please cover monitoring next', likeCount: 3 },
      { text: 'Great video, thank you', likeCount: 1 }
    ],
    ...overrides
  };
}

function makeSnapshot(videos: VideoSnapshot[]): ChannelSnapshot {
  return {
    channelId: 'chan-1',
    channelTitle: 'Test Channel',
    channelUrl: 'https://www.youtube.com/@test',
    dataSource: 'demo',
    videos
  };
}

describe('getDaysSinceUpload', () => {
  it('floors at one day so velocity never divides by zero', () => {
    expect(getDaysSinceUpload(new Date().toISOString())).toBe(1);
  });
});

describe('computeVelocity', () => {
  it('is views per day since upload', () => {
    expect(computeVelocity({ views: 1000, publishedAt: daysAgo(10) })).toBeCloseTo(100, 0);
  });
});

describe('runAnalysis', () => {
  it('produces a complete result with provenance passthrough', async () => {
    const result = await runAnalysis(makeSnapshot([makeVideo()]));

    expect(result.dataSource).toBe('demo');
    expect(result.recommendationSource).toBe('heuristic');
    expect(result.channel.niche).toBe('AI Agents');
    expect(result.topPerformingThemes.length).toBeGreaterThan(0);
    expect(result.contentGaps.length).toBeGreaterThan(0);
    expect(result.suggestedVideos.length).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('leaderBenchmarks');
  });

  it('handles a single video without crashing posting-pattern math', async () => {
    const result = await runAnalysis(makeSnapshot([makeVideo()]));
    expect(result.postingPattern.uploadsPerWeek).toBe(1);
    expect(result.postingPattern.bestPublishingDays).toEqual(['Unknown']);
  });

  it('computes engagement rates from totals', async () => {
    const result = await runAnalysis(
      makeSnapshot([makeVideo({ views: 10_000, likes: 500, commentsCount: 100 })])
    );
    expect(result.engagement.averageLikeRate).toBeCloseTo(0.05, 4);
    expect(result.engagement.averageCommentRate).toBeCloseTo(0.01, 4);
  });

  it('surfaces audience requests from comments', async () => {
    const result = await runAnalysis(makeSnapshot([makeVideo()]));
    expect(result.engagement.topAudienceRequests).toContain('Please cover monitoring next');
  });

  it('ranks genuinely accelerating themes as fastest growing', async () => {
    // Older half: agent videos with low velocity. Recent half: cursor videos
    // with high velocity — cursor should rank as growing.
    const videos = [
      makeVideo({ videoId: 'old-1', title: 'agent basics', publishedAt: daysAgo(40), views: 1000 }),
      makeVideo({ videoId: 'old-2', title: 'agent q&a', publishedAt: daysAgo(35), views: 1000 }),
      makeVideo({
        videoId: 'new-1',
        title: 'cursor workflow deep dive',
        publishedAt: daysAgo(4),
        views: 20_000
      }),
      makeVideo({
        videoId: 'new-2',
        title: 'cursor tips for teams',
        publishedAt: daysAgo(2),
        views: 25_000
      })
    ];

    const result = await runAnalysis(makeSnapshot(videos));
    expect(result.fastestGrowingThemes[0]?.name).toBe('AI Coding Workflows');
  });

  it('falls back to top themes when the window is too small to split', async () => {
    const result = await runAnalysis(makeSnapshot([makeVideo(), makeVideo({ videoId: 'v2' })]));
    expect(result.fastestGrowingThemes).toEqual(result.topPerformingThemes);
  });
});
