import { describe, expect, it } from 'vitest';

import { extractChannelHandle, isYouTubeUrl, normalizeChannelUrl } from './channel.js';

describe('normalizeChannelUrl', () => {
  it('strips query, hash, and trailing slash', () => {
    expect(normalizeChannelUrl('https://www.youtube.com/@creator/?utm=x#tab')).toBe(
      'https://www.youtube.com/@creator'
    );
  });

  it('lowercases the hostname for stable cache keys', () => {
    expect(normalizeChannelUrl('https://WWW.YouTube.COM/@Creator')).toBe(
      'https://www.youtube.com/@Creator'
    );
  });
});

describe('extractChannelHandle', () => {
  it('extracts the @handle segment', () => {
    expect(extractChannelHandle('https://www.youtube.com/@some-creator')).toBe('some creator');
  });

  it('falls back to "channel" for unparseable input', () => {
    expect(extractChannelHandle('not a url')).toBe('channel');
  });
});

describe('isYouTubeUrl', () => {
  it.each([
    'https://www.youtube.com/@creator',
    'https://youtube.com/channel/UC123',
    'https://m.youtube.com/@creator',
    'https://youtu.be/abc'
  ])('accepts %s', (url) => {
    expect(isYouTubeUrl(url)).toBe(true);
  });

  it.each([
    'https://evil.com/@creator',
    'https://youtube.com.evil.com/@creator',
    'https://vimeo.com/creator',
    'not a url'
  ])('rejects %s', (url) => {
    expect(isYouTubeUrl(url)).toBe(false);
  });
});
