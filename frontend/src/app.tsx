import { BrowserRouter } from 'react-router-dom';

import RootProvider from './components/providers/root';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';

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

const dashboardCards = [
  {
    heading: 'Top Performing Themes',
    points: ['AI Agents', 'Cursor Tutorials', 'MCP Servers']
  },
  {
    heading: 'Fastest Growing',
    points: ['Claude Code', 'OpenAI Agents SDK', 'Agent Tooling']
  },
  {
    heading: 'Content Gaps',
    points: ['AI Agent Monitoring', 'Memory Systems', 'Multi-Agent Workflows']
  }
];

function App() {
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
              <Button>Get Started</Button>
            </div>
          </header>

          <main className='mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-12'>
            <section className='space-y-6'>
              <Badge className='bg-secondary text-primary hover:bg-secondary'>
                Dashboard-First YouTube Intelligence
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
                />
                <Button size='lg' className='h-12'>
                  Analyze Channel
                </Button>
              </div>
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
              {dashboardCards.map((card) => (
                <Card key={card.heading}>
                  <CardHeader>
                    <CardTitle>{card.heading}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className='text-muted-foreground space-y-2 text-sm'>
                      {card.points.map((point) => (
                        <li key={point} className='flex items-center gap-2'>
                          <span className='bg-primary size-1.5 rounded-full' />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
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
          </main>
        </div>
      </BrowserRouter>
    </RootProvider>
  );
}

export default App;
