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

export async function fetchChannelSnapshot({
  channelUrl,
  maxVideos
}: BuildSnapshotArgs): Promise<ChannelSnapshot> {
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
