import { env } from '../config/env.js';
import type { AnalysisResult, ChannelSnapshot } from '../types/analysis.js';

type LlmRecommendations = {
  contentGaps: string[];
  suggestedVideos: string[];
};

function buildPrompt(snapshot: ChannelSnapshot, draft: AnalysisResult): string {
  const compactVideos = snapshot.videos.slice(0, 12).map((video) => ({
    title: video.title,
    views: video.views,
    comments: video.sampleComments.slice(0, 2)
  }));

  return JSON.stringify(
    {
      task: 'Refine recommendations for a YouTube creator dashboard.',
      rules: [
        'Return JSON only.',
        'Provide exactly 3 contentGaps and 5 suggestedVideos.',
        'Use concrete creator-friendly wording.'
      ],
      channel: draft.channel,
      topPerformingThemes: draft.topPerformingThemes,
      fastestGrowingThemes: draft.fastestGrowingThemes,
      engagement: draft.engagement,
      sampleVideos: compactVideos
    },
    null,
    2
  );
}

async function fetchOpenAiRecommendations(
  snapshot: ChannelSnapshot,
  draft: AnalysisResult
): Promise<LlmRecommendations | null> {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You are a YouTube content strategist. Return strict JSON with keys: contentGaps (3 strings), suggestedVideos (5 strings).'
        },
        {
          role: 'user',
          content: buildPrompt(snapshot, draft)
        }
      ]
    })
  });

  if (!response.ok) {
    return null;
  }

  type OpenAiResponse = {
    output_text?: string;
  };
  const data = (await response.json()) as OpenAiResponse;
  const text = data.output_text;
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as LlmRecommendations;
    if (
      !Array.isArray(parsed.contentGaps) ||
      !Array.isArray(parsed.suggestedVideos) ||
      parsed.contentGaps.length < 1 ||
      parsed.suggestedVideos.length < 1
    ) {
      return null;
    }

    return {
      contentGaps: parsed.contentGaps.slice(0, 3),
      suggestedVideos: parsed.suggestedVideos.slice(0, 5)
    };
  } catch {
    return null;
  }
}

export async function applyLlmRecommendationLayer(
  snapshot: ChannelSnapshot,
  draft: AnalysisResult
): Promise<AnalysisResult> {
  const llm = await fetchOpenAiRecommendations(snapshot, draft);
  if (!llm) {
    return draft;
  }

  return {
    ...draft,
    contentGaps: llm.contentGaps,
    suggestedVideos: llm.suggestedVideos
  };
}
