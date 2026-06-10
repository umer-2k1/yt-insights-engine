import type {
  AnalysisResult,
  ChannelSnapshot,
  LeaderBenchmark,
  ThemeGroup,
  VideoSnapshot
} from '../types/analysis.js';

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
  return (video.views / Math.max(channelAvgViews, 1)) / days;
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

export async function runAnalysis(snapshot: ChannelSnapshot): Promise<AnalysisResult> {
  const totalViews = snapshot.videos.reduce((acc, video) => acc + video.views, 0);
  const channelAvgViews = totalViews / Math.max(snapshot.videos.length, 1);
  const niche = detectNiche(snapshot.videos);
  const topThemes = topThemeGroups(snapshot.videos, channelAvgViews);

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
    topPerformingThemes: topThemes,
    fastestGrowingThemes: fastestGrowing,
    contentGaps: buildGaps(niche),
    suggestedVideos: buildSuggestions(niche),
    leaderBenchmarks: buildLeaderBenchmarks(niche),
    generatedAt: new Date().toISOString()
  };
}
