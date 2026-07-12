import type {
  AnalysisResult,
  ChannelSnapshot,
  ContentFormatInsight,
  EngagementInsight,
  LeaderBenchmark,
  PostingPatternInsight,
  ThemeGroup,
  TitlePatternInsight,
  VideoSnapshot
} from '../types/analysis.js';
import { classifyCommentIntent } from './comment-intent.js';

const knownNiches = [
  { keyword: 'agent', label: 'AI Agents' },
  { keyword: 'cursor', label: 'AI Coding Workflows' },
  { keyword: 'mcp', label: 'MCP Tooling' },
  { keyword: 'langgraph', label: 'LLM Orchestration' },
  { keyword: 'openai', label: 'OpenAI Ecosystem' },
  { keyword: 'claude', label: 'Claude Developer Ecosystem' }
];

function getDaysSinceUpload(publishedAt: string): number {
  const published = new Date(publishedAt).getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - published) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

function getVelocity(video: VideoSnapshot, channelAvgViews: number): number {
  const days = getDaysSinceUpload(video.publishedAt);
  return video.views / Math.max(channelAvgViews, 1) / days;
}

function detectNiche(videos: VideoSnapshot[]): string {
  const corpus = videos.map((video) => `${video.title} ${video.description}`).join(' ').toLowerCase();
  const matched = knownNiches.find((niche) => corpus.includes(niche.keyword));
  return matched?.label ?? 'Creator Education';
}

function topThemeGroups(videos: VideoSnapshot[], channelAvgViews: number): ThemeGroup[] {
  const buckets = new Map<string, { velocity: number; titles: string[]; count: number }>();

  for (const video of videos) {
    const title = video.title.toLowerCase();
    const bucketKey = knownNiches.find((niche) => title.includes(niche.keyword))?.label ?? 'General Strategy';
    const velocity = getVelocity(video, channelAvgViews);
    const existing = buckets.get(bucketKey) ?? { velocity: 0, titles: [], count: 0 };
    existing.velocity += velocity;
    existing.titles.push(video.title);
    existing.count += 1;
    buckets.set(bucketKey, existing);
  }

  return [...buckets.entries()]
    .map(([name, bucket]) => ({
      name,
      velocity: Number((bucket.velocity / bucket.count).toFixed(2)),
      videoTitles: bucket.titles.slice(0, 3)
    }))
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, 3);
}

function buildLeaderBenchmarks(niche: string): LeaderBenchmark[] {
  const defaults: Record<string, LeaderBenchmark[]> = {
    'AI Agents': [
      { creator: 'Agents Daily', score: 92, strengths: ['Multi-agent demos', 'Fast publishing cadence'] },
      { creator: 'Build With Agents', score: 89, strengths: ['Practical tutorials', 'High comment quality'] },
      { creator: 'Autonomy Lab', score: 86, strengths: ['Architecture explainers', 'Strong title patterns'] }
    ],
    'AI Coding Workflows': [
      { creator: 'Code Faster', score: 90, strengths: ['Developer hooks', 'Clear thumbnail system'] },
      { creator: 'Cursor Builds', score: 87, strengths: ['Weekly launches', 'Strong audience requests loop'] },
      { creator: 'Dev Velocity', score: 85, strengths: ['Hands-on series', 'Consistent engagement'] }
    ]
  };

  return (
    defaults[niche] ?? [
      { creator: 'Niche Studio', score: 88, strengths: ['Topic consistency', 'High-value formats'] },
      { creator: 'Creator Systems', score: 85, strengths: ['Posting rhythm', 'Audience-driven ideas'] },
      { creator: 'Growth Engineering', score: 83, strengths: ['Engagement loops', 'Strong hooks'] }
    ]
  );
}

function buildGaps(niche: string): string[] {
  if (niche === 'AI Agents') {
    return ['Agent monitoring', 'Memory evaluation', 'Team-grade orchestration playbooks'];
  }

  if (niche === 'AI Coding Workflows') {
    return ['Repo-level automation', 'CI agent workflows', 'Production debugging with AI'];
  }

  return ['Beginner-to-advanced content ladders', 'Series-based publishing strategy', 'Tool comparison breakdowns'];
}

function buildSuggestions(niche: string): string[] {
  if (niche === 'AI Agents') {
    return [
      'I Built an AI Agent Monitoring Stack in 1 Day',
      'Agent Memory Systems Explained with Real Examples',
      'Multi-Agent Workflow for SaaS Teams',
      'How to Evaluate Agent Reliability Before Shipping',
      'MCP + LangGraph: Production Architecture Walkthrough'
    ];
  }

  return [
    'How I Plan 30 Days of AI Content in 30 Minutes',
    'The Title Formula That Doubled My Tutorial CTR',
    'I Replaced Repetitive Dev Tasks with Agent Workflows',
    'Cursor + MCP Setup Every Team Should Have',
    'From Side Project to Productized AI Tooling'
  ];
}

function detectFormat(title: string): string {
  const lowered = title.toLowerCase();
  if (lowered.includes('how ') || lowered.includes('tutorial')) {
    return 'Tutorial';
  }
  if (lowered.includes('vs ')) {
    return 'Comparison';
  }
  if (lowered.includes('i built') || lowered.includes('i replaced')) {
    return 'Build Log';
  }
  if (lowered.includes('roadmap') || lowered.includes('plan')) {
    return 'Strategy';
  }
  return 'Explainer';
}

function detectTitlePattern(title: string): string {
  if (/^how\b/i.test(title)) {
    return 'How-to';
  }
  if (/^i\b/i.test(title)) {
    return 'Personal narrative';
  }
  if (/\bvs\b/i.test(title)) {
    return 'Comparison';
  }
  if (/\bbuild\b/i.test(title)) {
    return 'Build format';
  }
  return 'Direct statement';
}

function buildFormatInsights(videos: VideoSnapshot[], channelAvgViews: number): ContentFormatInsight[] {
  const buckets = new Map<string, { velocity: number; titles: string[]; count: number }>();

  for (const video of videos) {
    const format = detectFormat(video.title);
    const velocity = getVelocity(video, channelAvgViews);
    const existing = buckets.get(format) ?? { velocity: 0, titles: [], count: 0 };
    existing.velocity += velocity;
    existing.titles.push(video.title);
    existing.count += 1;
    buckets.set(format, existing);
  }

  return [...buckets.entries()]
    .map(([format, bucket]) => ({
      format,
      averageVelocity: Number((bucket.velocity / Math.max(bucket.count, 1)).toFixed(2)),
      examples: bucket.titles.slice(0, 2)
    }))
    .sort((a, b) => b.averageVelocity - a.averageVelocity);
}

function buildTitlePatternInsights(videos: VideoSnapshot[], channelAvgViews: number): TitlePatternInsight[] {
  const buckets = new Map<string, { velocity: number; titles: string[]; count: number }>();

  for (const video of videos) {
    const pattern = detectTitlePattern(video.title);
    const velocity = getVelocity(video, channelAvgViews);
    const existing = buckets.get(pattern) ?? { velocity: 0, titles: [], count: 0 };
    existing.velocity += velocity;
    existing.titles.push(video.title);
    existing.count += 1;
    buckets.set(pattern, existing);
  }

  return [...buckets.entries()]
    .map(([pattern, bucket]) => ({
      pattern,
      averageVelocity: Number((bucket.velocity / Math.max(bucket.count, 1)).toFixed(2)),
      examples: bucket.titles.slice(0, 2)
    }))
    .sort((a, b) => b.averageVelocity - a.averageVelocity);
}

function buildPostingPattern(videos: VideoSnapshot[]): PostingPatternInsight {
  const sorted = [...videos].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );

  if (sorted.length < 2) {
    return {
      uploadsPerWeek: sorted.length,
      bestPublishingDays: ['Unknown'],
      consistencyScore: 0.4
    };
  }

  const first = new Date(sorted[0]?.publishedAt ?? new Date().toISOString());
  const last = new Date(sorted.at(-1)?.publishedAt ?? new Date().toISOString());
  const totalDays = Math.max(1, Math.round((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)));
  const uploadsPerWeek = Number(((sorted.length / totalDays) * 7).toFixed(2));

  const dayBuckets = new Map<string, number>();
  for (const video of sorted) {
    const day = new Date(video.publishedAt).toLocaleDateString('en-US', { weekday: 'long' });
    dayBuckets.set(day, (dayBuckets.get(day) ?? 0) + 1);
  }

  const bestPublishingDays = [...dayBuckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([day]) => day);

  const intervals: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(sorted[index - 1]?.publishedAt ?? new Date().toISOString()).getTime();
    const current = new Date(sorted[index]?.publishedAt ?? new Date().toISOString()).getTime();
    intervals.push(Math.max(1, Math.round((current - previous) / (1000 * 60 * 60 * 24))));
  }

  const averageInterval = intervals.reduce((acc, value) => acc + value, 0) / Math.max(intervals.length, 1);
  const avgVariance =
    intervals.reduce((acc, value) => acc + Math.abs(value - averageInterval), 0) / Math.max(intervals.length, 1);
  const consistencyScore = Number(Math.max(0, Math.min(1, 1 - avgVariance / Math.max(averageInterval, 1))).toFixed(2));

  return {
    uploadsPerWeek,
    bestPublishingDays: bestPublishingDays.length ? bestPublishingDays : ['Unknown'],
    consistencyScore
  };
}

function buildEngagementInsight(videos: VideoSnapshot[]): EngagementInsight {
  const totals = videos.reduce(
    (acc, video) => {
      acc.views += video.views;
      acc.likes += video.likes;
      acc.comments += video.commentsCount;
      return acc;
    },
    { views: 0, likes: 0, comments: 0 }
  );

  const comments = videos.flatMap((video) => video.sampleComments);
  const classified = comments.map((comment) => ({
    text: comment.text,
    intent: classifyCommentIntent(comment.text)
  }));
  const requests = classified.filter((entry) => entry.intent === 'request');

  const topAudienceRequests = requests.slice(0, 3).map((entry) => entry.text);

  return {
    averageLikeRate: Number((totals.likes / Math.max(totals.views, 1)).toFixed(4)),
    averageCommentRate: Number((totals.comments / Math.max(totals.views, 1)).toFixed(4)),
    requestCommentShare: Number((requests.length / Math.max(comments.length, 1)).toFixed(4)),
    topAudienceRequests
  };
}

export async function runAnalysis(snapshot: ChannelSnapshot): Promise<AnalysisResult> {
  const totalViews = snapshot.videos.reduce((acc, video) => acc + video.views, 0);
  const channelAvgViews = totalViews / Math.max(snapshot.videos.length, 1);
  const niche = detectNiche(snapshot.videos);
  const topThemes = topThemeGroups(snapshot.videos, channelAvgViews);
  const contentFormats = buildFormatInsights(snapshot.videos, channelAvgViews).slice(0, 4);
  const titlePatterns = buildTitlePatternInsights(snapshot.videos, channelAvgViews).slice(0, 4);
  const postingPattern = buildPostingPattern(snapshot.videos);
  const engagement = buildEngagementInsight(snapshot.videos);

  const fastestGrowing = [...topThemes]
    .map((theme, index) => ({ ...theme, velocity: Number((theme.velocity + 0.25 * (2 - index)).toFixed(2)) }))
    .sort((a, b) => b.velocity - a.velocity);

  return {
    channel: {
      id: snapshot.channelId,
      title: snapshot.channelTitle,
      url: snapshot.channelUrl,
      niche
    },
    dataSource: snapshot.dataSource,
    topPerformingThemes: topThemes,
    fastestGrowingThemes: fastestGrowing,
    contentFormats,
    titlePatterns,
    postingPattern,
    engagement,
    contentGaps: buildGaps(niche),
    suggestedVideos: buildSuggestions(niche),
    leaderBenchmarks: buildLeaderBenchmarks(niche),
    generatedAt: new Date().toISOString()
  };
}
