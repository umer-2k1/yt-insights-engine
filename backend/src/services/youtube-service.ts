import { env } from '../config/env.js';
import { extractChannelHandle } from '../utils/channel.js';
import type { ChannelSnapshot, VideoSnapshot } from '../types/analysis.js';

type BuildSnapshotArgs = {
  channelUrl: string;
  maxVideos: number;
};

const titleTemplates = [
  'How I build AI agents that actually ship',
  'Cursor workflow that saved me 10 hours weekly',
  'MCP servers explained in plain English',
  'Claude Code vs GPT coding agents',
  'Multi-agent patterns for real products',
  'Agent memory systems beginners miss',
  'Build an autonomous support bot in 30 minutes',
  'Productionizing LLM apps with observability',
  'LangGraph orchestration tutorial',
  'Prompt-to-product workflow for dev creators',
  'Agentic RAG architecture breakdown',
  'OpenAI Agents SDK weekend project',
  'Async tool calling with retry patterns',
  'Best title frameworks for AI tutorials',
  'Roadmap: from prototypes to paid SaaS'
];

const commentPool = [
  'Can you do a tutorial on monitoring AI agents?',
  'This was super clear, thank you.',
  'Please cover MCP deployment next.',
  'I tried this and got stuck at tooling config.',
  'Can you compare LangGraph and LangChain in depth?',
  'Need a full project walkthrough for beginners.',
  'Great pacing, more architecture deep-dives please.'
];

type YouTubeVideoItem = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

type ResolveResult = {
  channelId: string;
  title: string;
};

function daysAgo(dayOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  return date.toISOString();
}

function buildVideo(index: number, channelSeed: number): VideoSnapshot {
  const views = 50_000 + (index + 1) * 8_500 + channelSeed * 1_500;
  const likes = Math.floor(views * 0.047);
  const commentsCount = Math.floor(views * 0.009);
  const publishedDaysAgo = Math.max(1, index * 3 + 2);
  const comments = [commentPool[index % commentPool.length], commentPool[(index + 3) % commentPool.length]];

  return {
    videoId: `video-${index + 1}`,
    title: titleTemplates[index % titleTemplates.length],
    description: 'Practical creator-focused AI workflow content for engineering audiences.',
    publishedAt: daysAgo(publishedDaysAgo),
    views,
    likes,
    commentsCount,
    sampleComments: comments,
    transcriptSnippet: 'This video explains practical workflow decisions, tooling choices, and execution tips.',
    thumbnailUrl: `https://img.youtube.com/vi/dQw4w9WgXcQ/${index % 4}.jpg`
  };
}

function toNumber(value: string | undefined, fallback = 0): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function tryGetChannelIdFromUrl(channelUrl: string): string | null {
  try {
    const url = new URL(channelUrl);
    const segments = url.pathname.split('/').filter(Boolean);
    const channelIndex = segments.findIndex((segment) => segment === 'channel');
    if (channelIndex >= 0 && segments[channelIndex + 1]) {
      return segments[channelIndex + 1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

async function requestYouTube<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const apiKey = env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured');
  }

  const query = new URLSearchParams({
    ...params,
    key: apiKey
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query.toString()}`);
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`YouTube API error (${endpoint}): ${payload}`);
  }

  return (await response.json()) as T;
}

async function resolveChannel(channelUrl: string): Promise<ResolveResult> {
  const directId = tryGetChannelIdFromUrl(channelUrl);
  if (directId) {
    type ChannelResponse = { items?: Array<{ id?: string; snippet?: { title?: string } }> };
    const response = await requestYouTube<ChannelResponse>('channels', {
      part: 'snippet',
      id: directId
    });
    const first = response.items?.[0];
    if (first?.id) {
      return {
        channelId: first.id,
        title: first.snippet?.title ?? 'YouTube Channel'
      };
    }
  }

  const handle = extractChannelHandle(channelUrl);
  type SearchResponse = {
    items?: Array<{ snippet?: { channelId?: string; channelTitle?: string } }>;
  };
  const search = await requestYouTube<SearchResponse>('search', {
    part: 'snippet',
    q: handle,
    type: 'channel',
    maxResults: '1'
  });
  const first = search.items?.[0]?.snippet;
  if (!first?.channelId) {
    throw new Error('Unable to resolve channel from URL');
  }

  return {
    channelId: first.channelId,
    title: first.channelTitle ?? `${handle} Channel`
  };
}

async function fetchLatestVideos(channelId: string, maxVideos: number): Promise<YouTubeVideoItem[]> {
  type SearchResponse = { items?: Array<{ id?: { videoId?: string } }> };
  const search = await requestYouTube<SearchResponse>('search', {
    part: 'id',
    channelId,
    maxResults: String(maxVideos),
    order: 'date',
    type: 'video'
  });

  const videoIds = (search.items ?? []).map((item) => item.id?.videoId).filter(Boolean) as string[];
  if (videoIds.length === 0) {
    return [];
  }

  type VideosResponse = { items?: YouTubeVideoItem[] };
  const videos = await requestYouTube<VideosResponse>('videos', {
    part: 'snippet,statistics',
    id: videoIds.join(',')
  });

  return videos.items ?? [];
}

async function fetchSampleComments(videoId: string): Promise<string[]> {
  type CommentsResponse = {
    items?: Array<{
      snippet?: {
        topLevelComment?: {
          snippet?: { textDisplay?: string };
        };
      };
    }>;
  };

  try {
    const comments = await requestYouTube<CommentsResponse>('commentThreads', {
      part: 'snippet',
      videoId,
      maxResults: '2',
      order: 'relevance',
      textFormat: 'plainText'
    });

    return (comments.items ?? [])
      .map((item) => item.snippet?.topLevelComment?.snippet?.textDisplay)
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

function buildFallbackChannelSnapshot(channelUrl: string, maxVideos: number): ChannelSnapshot {
  const channelHandle = extractChannelHandle(channelUrl);
  const seed = channelHandle.length % 7;
  const videos = Array.from({ length: maxVideos }, (_, index) => buildVideo(index, seed));

  return {
    channelId: `channel-${channelHandle.toLowerCase().replaceAll(' ', '-')}`,
    channelTitle: `${channelHandle} Channel`,
    channelUrl,
    videos
  };
}

export async function fetchChannelSnapshot({
  channelUrl,
  maxVideos
}: BuildSnapshotArgs): Promise<ChannelSnapshot> {
  if (!env.YOUTUBE_API_KEY) {
    return buildFallbackChannelSnapshot(channelUrl, maxVideos);
  }

  try {
    const resolved = await resolveChannel(channelUrl);
    const videosFromApi = await fetchLatestVideos(resolved.channelId, maxVideos);

    const normalizedVideos: VideoSnapshot[] = await Promise.all(
      videosFromApi.map(async (video, index) => {
        const videoId = video.id;
        const comments = await fetchSampleComments(videoId);
        const title = video.snippet?.title ?? `Video ${index + 1}`;
        const description = video.snippet?.description ?? '';
        const transcriptFallback = [title, description, ...comments].join(' ').slice(0, 500);
        const thumbnail =
          video.snippet?.thumbnails?.high?.url ??
          video.snippet?.thumbnails?.medium?.url ??
          video.snippet?.thumbnails?.default?.url;

        return {
          videoId,
          title,
          description,
          publishedAt: video.snippet?.publishedAt ?? new Date().toISOString(),
          views: toNumber(video.statistics?.viewCount, 0),
          likes: toNumber(video.statistics?.likeCount, 0),
          commentsCount: toNumber(video.statistics?.commentCount, comments.length),
          sampleComments: comments,
          transcriptSnippet: transcriptFallback,
          thumbnailUrl: thumbnail
        };
      })
    );

    if (normalizedVideos.length === 0) {
      return buildFallbackChannelSnapshot(channelUrl, maxVideos);
    }

    return {
      channelId: resolved.channelId,
      channelTitle: resolved.title,
      channelUrl: cleanUrl(channelUrl),
      videos: normalizedVideos
    };
  } catch {
    return buildFallbackChannelSnapshot(channelUrl, maxVideos);
  }
}
