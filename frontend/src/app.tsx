import { BrowserRouter } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import RootProvider from './components/providers/root';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import env from './env';

type ThemeGroup = {
  name: string;
  velocity: number;
  videoTitles: string[];
};

type LeaderBenchmark = {
  creator: string;
  score: number;
  strengths: string[];
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

type AnalysisJob = {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  error?: string;
  result?: AnalysisPayload;
};

const apiBaseUrl = env.VITE_API_BASE_URL;

const insightSections = [
  {
    title: 'What is winning now',
    description: 'Theme clusters ranked by velocity, engagement quality, and recency.'
  },
  {
    title: 'What is growing fast',
    description: 'Emerging topics before they saturate in your niche.'
  },
  {
    title: 'What you are missing',
    description: 'Gap detection against top creators in the same niche.'
  }
];

const featureHighlights = [
  'Latest 15-video analysis with sampled comments',
  'Transcript-aware topic discovery when captions exist',
  'Niche leader comparison for content and posting patterns',
  'Actionable title suggestions for your next uploads'
];

function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusLabel = useMemo(() => job?.status ?? 'idle', [job]);
  const result = job?.result;

  useEffect(() => {
    if (!job?.jobId || (job.status !== 'queued' && job.status !== 'running')) {
      return undefined;
    }

    const interval = globalThis.setInterval(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/analysis/${job.jobId}`);
        if (!response.ok) {
          throw new Error('Failed to load analysis status');
        }

        const nextJob = (await response.json()) as AnalysisJob;
        setJob(nextJob);
      } catch (pollError) {
        setError(pollError instanceof Error ? pollError.message : 'Polling failed');
      }
    }, 2000);

    return () => {
      globalThis.clearInterval(interval);
    };
  }, [job?.jobId, job?.status]);

  async function handleAnalyze(): Promise<void> {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/analyze-channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelUrl,
          maxVideos: 15
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? 'Unable to start analysis');
      }

      const createdJob = (await response.json()) as AnalysisJob;
      setJob(createdJob);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Request failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RootProvider>
      <BrowserRouter>
        <div className='min-h-dvh bg-background text-foreground'>
          <header className='border-b border-border bg-background/95 backdrop-blur'>
            <div className='mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4'>
              <div className='flex items-center gap-3'>
                <div className='bg-primary size-2 rounded-full' />
                <p className='text-muted-foreground text-sm tracking-widest uppercase'>YT Insight Engine</p>
              </div>
              <Badge className='bg-secondary text-primary hover:bg-secondary'>Dashboard-first product</Badge>
            </div>
          </header>

          <main className='mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-12'>
            <section className='space-y-6'>
              <Badge className='bg-secondary text-primary hover:bg-secondary'>
                Channel intelligence + niche benchmark recommendations
              </Badge>
              <h1 className='max-w-4xl text-4xl leading-tight font-semibold md:text-6xl'>
                Analyze your channel, benchmark niche leaders, and know exactly what to create next.
              </h1>
              <p className='text-muted-foreground max-w-3xl text-lg'>
                YT Insight Engine fetches your latest videos, maps what is working now, compares you against
                high-performing creators, and turns that into recommendations you can publish this week.
              </p>
              <div className='grid gap-4 md:grid-cols-[1fr_auto]'>
                <Input
                  placeholder='Paste YouTube channel URL'
                  className='text-foreground placeholder:text-muted-foreground h-12'
                  value={channelUrl}
                  onChange={(event) => {
                    setChannelUrl(event.target.value);
                  }}
                />
                <Button
                  size='lg'
                  className='h-12'
                  onClick={() => {
                    void handleAnalyze();
                  }}
                  disabled={isSubmitting || channelUrl.trim().length === 0}
                >
                  {isSubmitting ? 'Starting...' : 'Analyze Channel'}
                </Button>
              </div>
              <div className='flex flex-wrap items-center gap-3'>
                <Badge className='bg-secondary text-primary hover:bg-secondary'>
                  Status: {statusLabel.toUpperCase()}
                </Badge>
                {result?.channel.niche ? <Badge variant='outline'>Niche: {result.channel.niche}</Badge> : null}
              </div>
              {error ? <p className='text-sm text-red-400'>{error}</p> : null}
            </section>

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

            <section className='grid gap-5 lg:grid-cols-3'>
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Themes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className='text-muted-foreground space-y-2 text-sm'>
                    {(result?.topPerformingThemes ?? []).map((theme) => (
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
                </CardHeader>
                <CardContent>
                  <ul className='text-muted-foreground space-y-2 text-sm'>
                    {(result?.fastestGrowingThemes ?? []).map((theme) => (
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
                  <CardTitle>Content Gaps</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className='text-muted-foreground space-y-2 text-sm'>
                    {(result?.contentGaps ?? []).map((gap) => (
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
                  <CardTitle>Niche Leaders</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className='space-y-4 text-sm'>
                    {(result?.leaderBenchmarks ?? []).map((leader) => (
                      <li key={leader.creator} className='space-y-1 rounded-md border p-3'>
                        <p className='font-medium'>
                          {leader.creator} <span className='text-primary'>({leader.score})</span>
                        </p>
                        <p className='text-muted-foreground'>{leader.strengths.join(' • ')}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Suggested Videos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className='text-muted-foreground list-inside list-decimal space-y-2 text-sm'>
                    {(result?.suggestedVideos ?? []).map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </section>

            <section className='grid gap-5 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Winning Formats</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className='space-y-4 text-sm'>
                    {(result?.contentFormats ?? []).map((format) => (
                      <li key={format.format} className='space-y-1 rounded-md border p-3'>
                        <p className='font-medium'>
                          {format.format} <span className='text-primary'>(v{format.averageVelocity})</span>
                        </p>
                        <p className='text-muted-foreground'>{format.examples.join(' • ')}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Title Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className='space-y-4 text-sm'>
                    {(result?.titlePatterns ?? []).map((pattern) => (
                      <li key={pattern.pattern} className='space-y-1 rounded-md border p-3'>
                        <p className='font-medium'>
                          {pattern.pattern} <span className='text-primary'>(v{pattern.averageVelocity})</span>
                        </p>
                        <p className='text-muted-foreground'>{pattern.examples.join(' • ')}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section className='grid gap-5 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Posting Pattern</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2 text-sm'>
                  <p>
                    Uploads per week: <span className='text-primary'>{result?.postingPattern.uploadsPerWeek ?? '-'}</span>
                  </p>
                  <p>
                    Best publishing days:{' '}
                    <span className='text-muted-foreground'>
                      {(result?.postingPattern.bestPublishingDays ?? []).join(', ') || '-'}
                    </span>
                  </p>
                  <p>
                    Consistency score:{' '}
                    <span className='text-primary'>{result?.postingPattern.consistencyScore ?? '-'}</span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement Signals</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2 text-sm'>
                  <p>
                    Like rate:{' '}
                    <span className='text-primary'>
                      {result?.engagement.averageLikeRate != undefined
                        ? `${(result.engagement.averageLikeRate * 100).toFixed(2)}%`
                        : '-'}
                    </span>
                  </p>
                  <p>
                    Comment rate:{' '}
                    <span className='text-primary'>
                      {result?.engagement.averageCommentRate != undefined
                        ? `${(result.engagement.averageCommentRate * 100).toFixed(2)}%`
                        : '-'}
                    </span>
                  </p>
                  <p>
                    Request comment share:{' '}
                    <span className='text-primary'>
                      {result?.engagement.requestCommentShare != undefined
                        ? `${(result.engagement.requestCommentShare * 100).toFixed(2)}%`
                        : '-'}
                    </span>
                  </p>
                  <ul className='text-muted-foreground mt-3 list-inside list-disc space-y-1'>
                    {(result?.engagement.topAudienceRequests ?? []).map((requestText) => (
                      <li key={requestText}>{requestText}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>

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
      </BrowserRouter>
    </RootProvider>
  );
}

export default App;
