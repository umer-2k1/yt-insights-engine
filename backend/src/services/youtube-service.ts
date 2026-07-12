import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import type { ChannelSnapshot, CommentSnapshot, VideoSnapshot } from '../types/analysis.js';
import { extractChannelHandle } from '../utils/channel.js';

type BuildSnapshotArgs = {
  channelUrl: string;
  maxVideos: number;
};

export type YouTubeApiErrorKind = 'quota_exceeded' | 'channel_not_found' | 'no_videos' | 'api_error';

/**
 * Typed failure from the YouTube ingestion path. These propagate to the worker and
 * become user-visible job failures — real API errors are never silently replaced
 * with demo data.
 */
export class YouTubeApiError extends Error {
  readonly kind: YouTubeApiErrorKind;

  constructor(kind: YouTubeApiErrorKind, message: string) {
    super(message);
    this.name = 'YouTubeApiError';
    this.kind = kind;
  }
}

const demoTitleTemplates = [
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

const demoCommentPool = [
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

function buildDemoVideo(index: number, channelSlug: string, channelSeed: number): VideoSnapshot {
  const views = 50_000 + (index + 1) * 8_500 + channelSeed * 1_500;
  const likes = Math.floor(views * 0.047);
  const commentsCount = Math.floor(views * 0.009);
  const publishedDaysAgo = Math.max(1, index * 3 + 2);
  const comments: CommentSnapshot[] = [
    demoCommentPool[index % demoCommentPool.length],
    demoCommentPool[(index + 3) % demoCommentPool.length]
  ]
    .filter((text): text is string => Boolean(text))
    .map((text, commentIndex) => ({
      text,
      likeCount: 12 + ((index + commentIndex) % 5) * 7
    }));

  return {
    // Demo ids are scoped to the channel slug; the DB enforces uniqueness per
    // channel, so two demo channels must never share raw ids like "video-1".
    videoId: `demo-${channelSlug}-${index + 1}`,
    title: demoTitleTemplates[index % demoTitleTemplates.length] ?? 'Untitled video',
    description: 'Practical creator-focused AI workflow content for engineering audiences.',
    publishedAt: daysAgo(publishedDaysAgo),
    views,
    likes,
    commentsCount,
    sampleComments: comments,
    transcriptSnippet:
      'This video explains practical workflow decisions, tooling choices, and execution tips.'
  };
}

function buildDemoChannelSnapshot(channelUrl: string, maxVideos: number): ChannelSnapshot {
  const channelHandle = extractChannelHandle(channelUrl);
  const channelSlug = channelHandle.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
  const seed = channelHandle.length % 7;
  const videos = Array.from({ length: maxVideos }, (_, index) =>
    buildDemoVideo(index, channelSlug, seed)
  );

  return {
    channelId: `demo-channel-${channelSlug}`,
    channelTitle: `${channelHandle} Channel`,
    channelUrl,
    dataSource: 'demo',
    videos
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
    throw new YouTubeApiError('api_error', 'YOUTUBE_API_KEY is not configured');
  }

  const query = new URLSearchParams({
    ...params,
    key: apiKey
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${query.toString()}`);
  if (!response.ok) {
    const payload = await response.text();
    if (response.status === 403 && /quota/i.test(payload)) {
      throw new YouTubeApiError(
        'quota_exceeded',
        'YouTube API quota exceeded — try again later or reduce maxVideos.'
      );
    }
    logger.error({ endpoint, status: response.status, payload: payload.slice(0, 500) }, 'youtube api error');
    throw new YouTubeApiError(
      'api_error',
      `YouTube API request failed (${endpoint}, HTTP ${response.status}).`
    );
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
    throw new YouTubeApiError(
      'channel_not_found',
      `Could not find a YouTube channel for "${channelUrl}". Check the URL and try again.`
    );
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

  const videoIds = (search.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((videoId): videoId is string => Boolean(videoId));
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

async function fetchSampleComments(videoId: string): Promise<CommentSnapshot[]> {
  type CommentsResponse = {
    items?: Array<{
      snippet?: {
        topLevelComment?: {
          id?: string;
          snippet?: {
            textDisplay?: string;
            likeCount?: number;
            publishedAt?: string;
          };
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
      .map((item): CommentSnapshot | null => {
        const topLevel = item.snippet?.topLevelComment;
        const text = topLevel?.snippet?.textDisplay;
        if (!text) {
          return null;
        }
        return {
          commentId: topLevel?.id,
          text,
          likeCount: topLevel?.snippet?.likeCount ?? 0,
          publishedAt: topLevel?.snippet?.publishedAt
        };
      })
      .filter((comment): comment is CommentSnapshot => comment !== null);
  } catch (error) {
    // Comments are optional enrichment: they are disabled on many videos, and a
    // failure here should not fail the whole analysis.
    logger.warn(
      { videoId, error: error instanceof Error ? error.message : error },
      'skipping comments for video'
    );
    return [];
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += limit) {
    const chunk = items.slice(index, index + limit);
    results.push(...(await Promise.all(chunk.map(mapper))));
  }
  return results;
}

export async function fetchChannelSnapshot({
  channelUrl,
  maxVideos
}: BuildSnapshotArgs): Promise<ChannelSnapshot> {
  // Demo mode is an explicit configuration state (no API key), never a silent
  // fallback for a failed real fetch.
  if (!env.YOUTUBE_API_KEY) {
    return buildDemoChannelSnapshot(channelUrl, maxVideos);
  }

  const resolved = await resolveChannel(channelUrl);
  const videosFromApi = await fetchLatestVideos(resolved.channelId, maxVideos);
  if (videosFromApi.length === 0) {
    throw new YouTubeApiError(
      'no_videos',
      `Channel "${resolved.title}" has no public videos to analyze.`
    );
  }

  const normalizedVideos: VideoSnapshot[] = await mapWithConcurrency(
    videosFromApi,
    5,
    async (video) => {
      const comments = await fetchSampleComments(video.id);
      const title = video.snippet?.title ?? 'Untitled video';
      const description = video.snippet?.description ?? '';
      const transcriptFallback = [title, description, ...comments.map((comment) => comment.text)]
        .join(' ')
        .slice(0, 500);
      const thumbnail =
        video.snippet?.thumbnails?.high?.url ??
        video.snippet?.thumbnails?.medium?.url ??
        video.snippet?.thumbnails?.default?.url;

      return {
        videoId: video.id,
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
    }
  );

  return {
    channelId: resolved.channelId,
    channelTitle: resolved.title,
    channelUrl: cleanUrl(channelUrl),
    dataSource: 'youtube',
    videos: normalizedVideos
  };
}
