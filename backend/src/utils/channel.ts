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
  return parsed.toString().replace(/\/$/, '');
}
