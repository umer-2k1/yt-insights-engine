export type CommentIntent = 'positive' | 'negative' | 'request' | 'question' | 'complaint';

export type VideoSnapshot = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  views: number;
  likes: number;
  commentsCount: number;
  sampleComments: string[];
  transcriptSnippet?: string;
  thumbnailUrl?: string;
};

export type ChannelSnapshot = {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  videos: VideoSnapshot[];
};

export type ThemeGroup = {
  name: string;
  velocity: number;
  videoTitles: string[];
};

export type LeaderBenchmark = {
  creator: string;
  score: number;
  strengths: string[];
};

export type AnalysisResult = {
  channel: {
    id: string;
    title: string;
    url: string;
    niche: string;
  };
  topPerformingThemes: ThemeGroup[];
  fastestGrowingThemes: ThemeGroup[];
  contentGaps: string[];
  suggestedVideos: string[];
  leaderBenchmarks: LeaderBenchmark[];
  generatedAt: string;
};

export type AnalysisJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type AnalysisJob = {
  jobId: string;
  channelUrl: string;
  status: AnalysisJobStatus;
  error?: string;
  result?: AnalysisResult;
  createdAt: string;
  updatedAt: string;
};
