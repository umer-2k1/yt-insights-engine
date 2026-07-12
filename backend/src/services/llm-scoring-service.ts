import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';

import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import type { AnalysisResult, ChannelSnapshot } from '../types/analysis.js';

const recommendationSchema = z.object({
  contentGaps: z.array(z.string()).min(1).max(3),
  suggestedVideos: z.array(z.string()).min(1).max(5)
});

type LlmRecommendations = z.infer<typeof recommendationSchema>;

const parser = StructuredOutputParser.fromZodSchema(recommendationSchema);

function buildAnalysisInput(snapshot: ChannelSnapshot, draft: AnalysisResult): string {
  const compactVideos = snapshot.videos.slice(0, 12).map((video) => ({
    title: video.title,
    views: video.views,
    comments: video.sampleComments.slice(0, 2).map((comment) => comment.text)
  }));

  return JSON.stringify(
    {
      task: 'Generate recommendations for a YouTube creator dashboard.',
      rules: [
        'Return JSON only.',
        'Provide exactly 3 contentGaps and 5 suggestedVideos.',
        'Ground every recommendation in the provided titles, themes, and audience comments.',
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

async function callChatCompletions(messages: Array<SystemMessage | HumanMessage>): Promise<string | null> {
  const response = await fetch(`${env.LLM_API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.LLM_API_KEY ?? ''}`
    },
    body: JSON.stringify({
      model: env.LLM_MODEL,
      temperature: env.LLM_TEMPERATURE,
      messages: messages.map((message) => ({
        role: message instanceof SystemMessage ? 'system' : 'user',
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
      })),
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    logger.warn({ status: response.status, payload: payload.slice(0, 300) }, 'llm request failed');
    return null;
  }

  type ChatResponse = {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const data = (await response.json()) as ChatResponse;
  return data.choices?.[0]?.message?.content ?? null;
}

async function fetchLlmRecommendations(
  snapshot: ChannelSnapshot,
  draft: AnalysisResult
): Promise<LlmRecommendations | null> {
  const messages = [
    new SystemMessage(
      'You generate recommendations for a YouTube strategy dashboard. Keep responses concise and practical.'
    ),
    new HumanMessage(
      `${buildAnalysisInput(snapshot, draft)}\n\nReturn JSON matching this format:\n${parser.getFormatInstructions()}`
    )
  ];

  const text = await callChatCompletions(messages);
  if (!text) {
    return null;
  }

  try {
    const parsed = await parser.parse(text);
    return {
      contentGaps: parsed.contentGaps.slice(0, 3),
      suggestedVideos: parsed.suggestedVideos.slice(0, 5)
    };
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : error },
      'llm output failed schema validation; using heuristic recommendations'
    );
    return null;
  }
}

/**
 * The LLM is the primary source for contentGaps/suggestedVideos when configured.
 * On any failure the heuristic draft passes through unchanged, labeled
 * recommendationSource: 'heuristic' so the client can tell them apart.
 */
export async function applyLlmRecommendationLayer(
  snapshot: ChannelSnapshot,
  draft: AnalysisResult
): Promise<AnalysisResult> {
  if (!env.LLM_API_KEY) {
    return draft;
  }

  const llm = await fetchLlmRecommendations(snapshot, draft);
  if (!llm) {
    return draft;
  }

  return {
    ...draft,
    contentGaps: llm.contentGaps,
    suggestedVideos: llm.suggestedVideos,
    recommendationSource: 'llm'
  };
}
