import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('fetchChannelSnapshot in demo mode (no API key)', () => {
  it('returns a labeled demo snapshot', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '');
    const { fetchChannelSnapshot } = await import('./youtube-service.js');

    const snapshot = await fetchChannelSnapshot({
      channelUrl: 'https://www.youtube.com/@alpha',
      maxVideos: 5
    });

    expect(snapshot.dataSource).toBe('demo');
    expect(snapshot.videos).toHaveLength(5);
    expect(snapshot.videos.every((video) => video.sampleComments.length > 0)).toBe(true);
  });

  it('scopes demo video ids per channel so two channels never collide', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '');
    const { fetchChannelSnapshot } = await import('./youtube-service.js');

    const alpha = await fetchChannelSnapshot({
      channelUrl: 'https://www.youtube.com/@alpha',
      maxVideos: 3
    });
    const beta = await fetchChannelSnapshot({
      channelUrl: 'https://www.youtube.com/@beta',
      maxVideos: 3
    });

    const alphaIds = new Set(alpha.videos.map((video) => video.videoId));
    for (const video of beta.videos) {
      expect(alphaIds.has(video.videoId)).toBe(false);
    }
  });
});

describe('fetchChannelSnapshot with an API key', () => {
  it('maps quota exhaustion to a readable typed error instead of fake data', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('{"error":{"errors":[{"reason":"quotaExceeded"}]}}', { status: 403 })
      )
    );

    const { fetchChannelSnapshot, YouTubeApiError } = await import('./youtube-service.js');

    const attempt = fetchChannelSnapshot({
      channelUrl: 'https://www.youtube.com/@alpha',
      maxVideos: 5
    });

    await expect(attempt).rejects.toBeInstanceOf(YouTubeApiError);
    await expect(
      fetchChannelSnapshot({ channelUrl: 'https://www.youtube.com/@alpha', maxVideos: 5 })
    ).rejects.toMatchObject({ kind: 'quota_exceeded' });
  });

  it('maps an unresolvable channel to channel_not_found', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"items":[]}', { status: 200 }))
    );

    const { fetchChannelSnapshot } = await import('./youtube-service.js');

    await expect(
      fetchChannelSnapshot({ channelUrl: 'https://www.youtube.com/@ghost', maxVideos: 5 })
    ).rejects.toMatchObject({ kind: 'channel_not_found' });
  });
});
