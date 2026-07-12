import { expect, test } from '@playwright/test';

const completedResult = {
  channel: {
    id: 'demo-channel-test',
    title: 'Test Channel',
    url: 'https://www.youtube.com/@test',
    niche: 'AI Agents'
  },
  dataSource: 'demo',
  topPerformingThemes: [{ name: 'AI Agents', velocity: 0.12, videoTitles: ['Agent video'] }],
  fastestGrowingThemes: [{ name: 'MCP Tooling', velocity: 0.2, videoTitles: ['MCP video'] }],
  contentFormats: [{ format: 'Tutorial', averageVelocity: 0.1, examples: ['Agent video'] }],
  titlePatterns: [{ pattern: 'How-to', averageVelocity: 0.1, examples: ['Agent video'] }],
  postingPattern: { uploadsPerWeek: 2.5, bestPublishingDays: ['Friday'], consistencyScore: 0.8 },
  engagement: {
    averageLikeRate: 0.047,
    averageCommentRate: 0.009,
    requestCommentShare: 0.5,
    topAudienceRequests: ['Please cover monitoring next']
  },
  contentGaps: ['Agent monitoring'],
  suggestedVideos: ['I Built an Agent Monitoring Stack'],
  recommendationSource: 'heuristic',
  generatedAt: new Date().toISOString()
};

test('renders the hero and empty state before any analysis', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/YT Insight Engine/);
  await expect(
    page.getByRole('heading', { name: /Analyze your channel and know exactly what to create next/ })
  ).toBeVisible();
  await expect(page.getByText('Run your first analysis')).toBeVisible();
  await expect(page.getByText('Status: IDLE')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyze Channel' })).toBeDisabled();
});

test('submits a channel, polls, and renders the completed dashboard', async ({ page }) => {
  let pollCount = 0;

  await page.route('**/api/analyze-channel', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ jobId: 'job-1', status: 'queued' })
    });
  });

  await page.route('**/api/analysis/job-1', async (route) => {
    pollCount += 1;
    const job =
      pollCount < 2
        ? { jobId: 'job-1', status: 'running' }
        : { jobId: 'job-1', status: 'completed', result: completedResult };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(job)
    });
  });

  await page.goto('/');
  await page.getByLabel('YouTube channel URL').fill('https://www.youtube.com/@test');
  await page.getByRole('button', { name: 'Analyze Channel' }).click();

  // Processing state: skeletons and disabled submit.
  await expect(page.getByLabel('Loading analysis')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyzing...' })).toBeDisabled();

  // Completed dashboard with honest labeling.
  await expect(page.getByText('Status: COMPLETED')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Demo data', { exact: true })).toBeVisible();
  await expect(page.getByText('Niche: AI Agents')).toBeVisible();
  await expect(page.getByText('Agent monitoring', { exact: true })).toBeVisible();
  await expect(page.getByText('I Built an Agent Monitoring Stack')).toBeVisible();
  await expect(page.getByText('Rule-based').first()).toBeVisible();
});

test('shows the job error when an analysis fails', async ({ page }) => {
  await page.route('**/api/analyze-channel', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ jobId: 'job-2', status: 'queued' })
    });
  });

  await page.route('**/api/analysis/job-2', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobId: 'job-2',
        status: 'failed',
        error: 'YouTube API quota exceeded — try again later or reduce maxVideos.'
      })
    });
  });

  await page.goto('/');
  await page.getByLabel('YouTube channel URL').fill('https://www.youtube.com/@test');
  await page.getByRole('button', { name: 'Analyze Channel' }).click();

  await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/quota exceeded/)).toBeVisible();
  await expect(page.getByText('Status: FAILED')).toBeVisible();
});
