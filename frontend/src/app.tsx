import { useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './components/ui/select';
import { Skeleton } from './components/ui/skeleton';
import env from './env';

type ThemeGroup = {
  name: string;
  velocity: number;
  videoTitles: string[];
};

type ContentFormatInsight = {
  format: string;
  averageVelocity: number;
  examples: string[];
};

type TitlePatternInsight = {
  pattern: string;
  averageVelocity: number;
  examples: string[];
};

type PostingPatternInsight = {
  uploadsPerWeek: number;
  bestPublishingDays: string[];
  consistencyScore: number;
};

type EngagementInsight = {
  averageLikeRate: number;
  averageCommentRate: number;
  requestCommentShare: number;
  topAudienceRequests: string[];
};

type AnalysisPayload = {
  channel: {
    id: string;
    title: string;
    url: string;
    niche: string;
  };
  dataSource: 'youtube' | 'demo';
  topPerformingThemes: ThemeGroup[];
  fastestGrowingThemes: ThemeGroup[];
  contentFormats: ContentFormatInsight[];
  titlePatterns: TitlePatternInsight[];
  postingPattern: PostingPatternInsight;
  engagement: EngagementInsight;
  contentGaps: string[];
  suggestedVideos: string[];
  recommendationSource: 'llm' | 'heuristic';
  generatedAt: string;
};

type AnalysisJob = {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  error?: string;
  result?: AnalysisPayload;
};

const apiBaseUrl = env.VITE_API_BASE_URL;
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_FAILURES = 5;
const maxVideosOptions = ['5', '15', '25', '50'];

const insightSections = [
  {
    title: 'What is winning now',
    description: 'Theme clusters ranked by view velocity across your recent uploads.'
  },
  {
    title: 'What is growing fast',
    description: 'Themes accelerating in your most recent videos before they saturate.'
  },
  {
    title: 'What you are missing',
    description: 'Content gaps and video ideas grounded in your titles and audience comments.'
  }
];

const featureHighlights = [
  'Analyzes your 5-50 most recent videos with sampled comments',
  'Honest provenance: every result is labeled real YouTube data or demo data',
  'AI-generated content gaps and video ideas with a rule-based fallback',
  'Posting cadence, title patterns, and engagement signal breakdowns'
];

function SourceChip({ source }: Readonly<{ source: 'llm' | 'heuristic' }>) {
  return (
    <Badge variant='outline' className='text-xs font-normal'>
      {source === 'llm' ? 'AI-generated' : 'Rule-based'}
    </Badge>
  );
}

function SkeletonCard({ lines }: Readonly<{ lines: number }>) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className='h-5 w-2/5' />
      </CardHeader>
      <CardContent className='space-y-3'>
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className='h-4 w-full' />
        ))}
      </CardContent>
    </Card>
  );
}

function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [maxVideos, setMaxVideos] = useState('15');
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusLabel = useMemo(() => job?.status ?? 'idle', [job]);
  const result = job?.result;
  const jobId = job?.jobId;
  const jobStatus = job?.status;
  const isProcessing = isSubmitting || jobStatus === 'queued' || jobStatus === 'running';

  useEffect(() => {
    if (jobId == null || (jobStatus !== 'queued' && jobStatus !== 'running')) {
      return undefined;
    }

    let consecutiveFailures = 0;
    const interval = globalThis.setInterval(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/analysis/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to load analysis status');
        }

        const nextJob = (await response.json()) as AnalysisJob;
        consecutiveFailures = 0;
        setError(null);
        setJob(nextJob);
      } catch (pollError) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_POLL_FAILURES) {
          globalThis.clearInterval(interval);
          setError(
            pollError instanceof Error
              ? `${pollError.message} — stopped checking. Is the backend still running?`
              : 'Polling failed repeatedly — stopped checking.'
          );
          setJob((current) => (current ? { ...current, status: 'failed' } : current));
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      globalThis.clearInterval(interval);
    };
  }, [jobId, jobStatus]);

  async function handleAnalyze(): Promise<void> {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/analyze-channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelUrl,
          maxVideos: Number(maxVideos)
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? 'Unable to start analysis');
      }

      // Cache hits return the completed job with the result inline; fresh
      // submissions return a queued job that the polling effect follows.
      const createdJob = (await response.json()) as AnalysisJob;
      setJob(createdJob);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Request failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeError = error ?? (jobStatus === 'failed' ? (job?.error ?? 'Analysis failed') : null);

  return (
    <div className='bg-background text-foreground min-h-dvh'>
      <header className='border-border bg-background/95 border-b backdrop-blur'>
        <div className='mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4'>
          <div className='flex items-center gap-3'>
            <div className='bg-primary size-2 rounded-full' />
            <p className='text-muted-foreground text-sm tracking-widest uppercase'>
              YT Insight Engine
            </p>
          </div>
          <Badge className='bg-secondary text-primary hover:bg-secondary'>
            Creator intelligence dashboard
          </Badge>
        </div>
      </header>

      <main className='mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-12'>
        <section className='space-y-6'>
          <Badge className='bg-secondary text-primary hover:bg-secondary'>
            Channel intelligence + publish-ready recommendations
          </Badge>
          <h1 className='max-w-4xl text-4xl leading-tight font-semibold md:text-6xl'>
            Analyze your channel and know exactly what to create next.
          </h1>
          <p className='text-muted-foreground max-w-3xl text-lg'>
            YT Insight Engine fetches your latest videos, maps what is working now, and turns
            audience signals into recommendations you can publish this week.
          </p>

          <form
            className='grid gap-4 md:grid-cols-[1fr_auto_auto]'
            onSubmit={(event) => {
              event.preventDefault();
              void handleAnalyze();
            }}
          >
            <div className='space-y-2'>
              <Label htmlFor='channel-url'>YouTube channel URL</Label>
              <Input
                id='channel-url'
                type='url'
                placeholder='https://www.youtube.com/@yourchannel'
                className='text-foreground placeholder:text-muted-foreground h-12'
                value={channelUrl}
                onChange={(event) => {
                  setChannelUrl(event.target.value);
                }}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='max-videos'>Videos</Label>
              <Select value={maxVideos} onValueChange={setMaxVideos}>
                <SelectTrigger id='max-videos' className='h-12 min-w-24'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {maxVideosOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option} videos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label className='invisible hidden md:block'>Run</Label>
              <Button
                type='submit'
                size='lg'
                className='h-12 w-full md:w-auto'
                disabled={isProcessing || channelUrl.trim().length === 0}
              >
                {isProcessing ? 'Analyzing...' : 'Analyze Channel'}
              </Button>
            </div>
          </form>

          <div className='flex flex-wrap items-center gap-3' aria-live='polite'>
            <Badge className='bg-secondary text-primary hover:bg-secondary'>
              Status: {statusLabel.toUpperCase()}
            </Badge>
            {result ? <Badge variant='outline'>Niche: {result.channel.niche}</Badge> : null}
          </div>

          {result?.dataSource === 'demo' ? (
            <Alert>
              <AlertTitle>Demo data</AlertTitle>
              <AlertDescription>
                This analysis was generated from labeled sample data because the backend has no
                YouTube API key configured. Set YOUTUBE_API_KEY to analyze real channels.
              </AlertDescription>
            </Alert>
          ) : null}

          {activeError == null ? null : (
            <Alert variant='destructive' role='alert'>
              <AlertTitle>Analysis failed</AlertTitle>
              <AlertDescription>{activeError}</AlertDescription>
            </Alert>
          )}
        </section>

        {result == null && !isProcessing ? (
          <>
            <section className='grid gap-4 md:grid-cols-3'>
              {insightSections.map((item) => (
                <Card key={item.title}>
                  <CardHeader>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </section>
            <section className='bg-card rounded-xl border p-10 text-center'>
              <h2 className='text-xl font-semibold'>Run your first analysis</h2>
              <p className='text-muted-foreground mx-auto mt-2 max-w-xl text-sm'>
                Paste a YouTube channel URL above and the dashboard fills with winning themes,
                growth signals, content gaps, and suggested videos. Works out of the box in demo
                mode — no API keys required.
              </p>
            </section>
          </>
        ) : null}

        {isProcessing && result == null ? (
          <section
            className='grid gap-5 lg:grid-cols-3'
            aria-busy='true'
            aria-label='Loading analysis'
          >
            {Array.from({ length: 6 }, (_, index) => (
              <SkeletonCard key={index} lines={index % 2 === 0 ? 4 : 3} />
            ))}
          </section>
        ) : null}

        {result ? (
          <>
            <section className='grid gap-5 lg:grid-cols-3'>
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Themes</CardTitle>
                  <CardDescription>Average view velocity vs channel baseline</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className='text-muted-foreground space-y-2 text-sm'>
                    {result.topPerformingThemes.map((theme) => (
                      <li key={theme.name} className='flex items-center gap-2'>
                        <span className='bg-primary size-1.5 rounded-full' />
                        {theme.name} (v{theme.velocity})
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fastest Growing</CardTitle>
                  <CardDescription>Recent uploads accelerating vs older ones</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className='text-muted-foreground space-y-2 text-sm'>
                    {result.fastestGrowingThemes.map((theme) => (
                      <li key={theme.name} className='flex items-center gap-2'>
                        <span className='bg-primary size-1.5 rounded-full' />
                        {theme.name} (v{theme.velocity})
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center justify-between gap-2'>
                    Content Gaps
                    <SourceChip source={result.recommendationSource} />
                  </CardTitle>
                  <CardDescription>Topics your audience wants that you skip</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className='text-muted-foreground space-y-2 text-sm'>
                    {result.contentGaps.map((gap) => (
                      <li key={gap} className='flex items-center gap-2'>
                        <span className='bg-primary size-1.5 rounded-full' />
                        {gap}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section className='grid gap-5 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center justify-between gap-2'>
                    Suggested Videos
                    <SourceChip source={result.recommendationSource} />
                  </CardTitle>
                  <CardDescription>Publish-ready ideas for your next uploads</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className='text-muted-foreground list-inside list-decimal space-y-2 text-sm'>
                    {result.suggestedVideos.map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Winning Formats</CardTitle>
                  <CardDescription>Formats ranked by average velocity</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className='space-y-4 text-sm'>
                    {result.contentFormats.map((format) => (
                      <li key={format.format} className='space-y-1 rounded-md border p-3'>
                        <p className='font-medium'>
                          {format.format}{' '}
                          <span className='text-primary'>(v{format.averageVelocity})</span>
                        </p>
                        <p className='text-muted-foreground'>{format.examples.join(' • ')}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section className='grid gap-5 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Title Patterns</CardTitle>
                  <CardDescription>Which title structures outperform</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className='space-y-4 text-sm'>
                    {result.titlePatterns.map((pattern) => (
                      <li key={pattern.pattern} className='space-y-1 rounded-md border p-3'>
                        <p className='font-medium'>
                          {pattern.pattern}{' '}
                          <span className='text-primary'>(v{pattern.averageVelocity})</span>
                        </p>
                        <p className='text-muted-foreground'>{pattern.examples.join(' • ')}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Posting Pattern</CardTitle>
                  <CardDescription>Cadence and consistency signals</CardDescription>
                </CardHeader>
                <CardContent className='space-y-2 text-sm'>
                  <p>
                    Uploads per week:{' '}
                    <span className='text-primary'>{result.postingPattern.uploadsPerWeek}</span>
                  </p>
                  <p>
                    Best publishing days:{' '}
                    <span className='text-muted-foreground'>
                      {result.postingPattern.bestPublishingDays.join(', ') || '-'}
                    </span>
                  </p>
                  <p>
                    Consistency score:{' '}
                    <span className='text-primary'>{result.postingPattern.consistencyScore}</span>
                  </p>
                </CardContent>
              </Card>
            </section>

            <section className='grid gap-5 lg:grid-cols-1'>
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Signals</CardTitle>
                  <CardDescription>
                    How your audience responds and what they ask for
                  </CardDescription>
                </CardHeader>
                <CardContent className='grid gap-6 text-sm md:grid-cols-2'>
                  <div className='space-y-2'>
                    <p>
                      Like rate:{' '}
                      <span className='text-primary'>
                        {(result.engagement.averageLikeRate * 100).toFixed(2)}%
                      </span>
                    </p>
                    <p>
                      Comment rate:{' '}
                      <span className='text-primary'>
                        {(result.engagement.averageCommentRate * 100).toFixed(2)}%
                      </span>
                    </p>
                    <p>
                      Request comment share:{' '}
                      <span className='text-primary'>
                        {(result.engagement.requestCommentShare * 100).toFixed(2)}%
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground mb-2 font-medium'>Top audience requests</p>
                    <ul className='text-muted-foreground list-inside list-disc space-y-1'>
                      {result.engagement.topAudienceRequests.length > 0 ? (
                        result.engagement.topAudienceRequests.map((requestText) => (
                          <li key={requestText}>{requestText}</li>
                        ))
                      ) : (
                        <li>No explicit requests detected in sampled comments</li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        ) : null}

        <section className='bg-card grid gap-6 rounded-xl border p-6 lg:grid-cols-2'>
          <div className='space-y-3'>
            <h2 className='text-2xl font-semibold'>Key Features</h2>
            <p className='text-muted-foreground'>
              Built for creators who want decisions, not raw charts. Every analysis answers what is
              working, what is rising, and what to publish next.
            </p>
          </div>
          <ul className='text-muted-foreground space-y-3 text-sm'>
            {featureHighlights.map((feature) => (
              <li key={feature} className='flex items-start gap-2'>
                <span className='bg-primary mt-1.5 size-1.5 rounded-full' />
                {feature}
              </li>
            ))}
          </ul>
        </section>

        {result ? (
          <section className='bg-card rounded-xl border p-6'>
            <h3 className='text-xl font-semibold'>Latest Analysis</h3>
            <p className='text-muted-foreground mt-2 text-sm'>
              {result.channel.title} • {new Date(result.generatedAt).toLocaleString()}
            </p>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;
