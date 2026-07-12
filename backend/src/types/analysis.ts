export type CommentIntent = 'positive' | 'negative' | 'neutral' | 'request' | 'question' | 'complaint';

/** Provenance of ingested channel data: real YouTube API or labeled demo data. */
export type DataSource = 'youtube' | 'demo';

export type CommentSnapshot = {
  commentId?: string;
  text: string;
  likeCount: number;
  publishedAt?: string;
};

export type VideoSnapshot = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  views: number;
  likes: number;
  commentsCount: number;
  sampleComments: CommentSnapshot[];
  transcriptSnippet?: string;
  thumbnailUrl?: string;
};

export type ChannelSnapshot = {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
  dataSource: DataSource;
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

/** How contentGaps/suggestedVideos were produced. */
export type RecommendationSource = 'llm' | 'heuristic';

export type AnalysisResult = {
  channel: {
    id: string;
    title: string;
    url: string;
    niche: string;
  };
  dataSource: DataSource;
  topPerformingThemes: ThemeGroup[];
  fastestGrowingThemes: ThemeGroup[];
  contentFormats: ContentFormatInsight[];
  titlePatterns: TitlePatternInsight[];
  postingPattern: PostingPatternInsight;
  engagement: EngagementInsight;
  contentGaps: string[];
  suggestedVideos: string[];
  recommendationSource: RecommendationSource;
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
