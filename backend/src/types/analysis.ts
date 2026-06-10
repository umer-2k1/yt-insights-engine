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

export type ContentFormatInsight = {
  format: string;
  averageVelocity: number;
  examples: string[];
};

export type TitlePatternInsight = {
  pattern: string;
  averageVelocity: number;
  examples: string[];
};

export type PostingPatternInsight = {
  uploadsPerWeek: number;
  bestPublishingDays: string[];
  consistencyScore: number;
};

export type EngagementInsight = {
  averageLikeRate: number;
  averageCommentRate: number;
  requestCommentShare: number;
  topAudienceRequests: string[];
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
  contentFormats: ContentFormatInsight[];
  titlePatterns: TitlePatternInsight[];
  postingPattern: PostingPatternInsight;
  engagement: EngagementInsight;
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
