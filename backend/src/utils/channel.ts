export function extractChannelHandle(channelUrl: string): string {
  try {
    const url = new URL(channelUrl);
    const segments = url.pathname.split('/').filter(Boolean);
    const last = segments.at(-1) ?? 'channel';
    return last.replace('@', '').replaceAll('-', ' ').trim() || 'channel';
  } catch {
    return 'channel';
  }
}

export function normalizeChannelUrl(channelUrl: string): string {
  const parsed = new URL(channelUrl);
  parsed.search = '';
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();
  return parsed.toString().replace(/\/$/, '');
}

const youtubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);

export function isYouTubeUrl(channelUrl: string): boolean {
  try {
    const parsed = new URL(channelUrl);
    return youtubeHosts.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}
