import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';

import { env } from '../config/env.js';
import type { AnalysisResult, ChannelSnapshot } from '../types/analysis.js';

type LlmRecommendations = {
  contentGaps: string[];
  suggestedVideos: string[];
};

const recommendationSchema = z.object({
  contentGaps: z.array(z.string()).min(1).max(3),
  suggestedVideos: z.array(z.string()).min(1).max(5)
});

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

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function toChatMessages(value: unknown): ChatMessage[] {
  const promptValue = value as { toChatMessages?: () => Array<{ _getType?: () => string; content?: unknown }> };
  const messages = promptValue.toChatMessages?.() ?? [];

  const normalized: ChatMessage[] = messages.map((message) => {
    const type = message._getType?.() ?? 'human';
    const role: ChatMessage['role'] =
      type === 'system' ? 'system' : type === 'ai' ? 'assistant' : 'user';

    const rawContent = message.content;
    const content =
      typeof rawContent === 'string'
        ? rawContent
        : Array.isArray(rawContent)
          ? JSON.stringify(rawContent)
          : String(rawContent ?? '');

    return {
      role,
      content
    };
  });

  return normalized;
}

async function callGenericLlmEndpoint(messages: ChatMessage[]): Promise<string | null> {
  if (!env.LLM_API_KEY) {
    return null;
  }

  const response = await fetch(`${env.LLM_API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.LLM_API_KEY}`
    },
    body: JSON.stringify({
      model: env.LLM_MODEL,
      temperature: env.LLM_TEMPERATURE,
      messages: [
        ...messages
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    return null;
  }

  type GenericResponse = {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  const data = (await response.json()) as GenericResponse;
  return data.choices?.[0]?.message?.content ?? null;
}

async function fetchLangChainRecommendations(
  snapshot: ChannelSnapshot,
  draft: AnalysisResult
): Promise<LlmRecommendations | null> {
  if (!env.LLM_API_KEY) {
    return null;
  }

  const parser = StructuredOutputParser.fromZodSchema(recommendationSchema);
  const promptTemplate = ChatPromptTemplate.fromMessages([
    [
      'system',
      'You refine recommendations for a YouTube strategy dashboard. Keep responses concise and practical.'
    ],
    [
      'human',
      '{analysisInput}\n\nReturn JSON matching this format:\n{formatInstructions}'
    ]
  ]);

  const chain = RunnableSequence.from([
    promptTemplate,
    RunnableLambda.from(async (value) => {
      const messages = toChatMessages(value);
      return callGenericLlmEndpoint(messages);
    }),
    RunnableLambda.from(async (text) => {
      if (!text || typeof text !== 'string') {
        return null;
      }
      try {
        const parsed = await parser.parse(text);
        return {
          contentGaps: parsed.contentGaps.slice(0, 3),
          suggestedVideos: parsed.suggestedVideos.slice(0, 5)
        };
      } catch {
        return null;
      }
    })
  ]);

  const result = await chain.invoke({
    analysisInput: buildPrompt(snapshot, draft),
    formatInstructions: parser.getFormatInstructions()
  });

  if (!result) {
    return null;
  }

  return result as LlmRecommendations;
}

export async function applyLlmRecommendationLayer(
  snapshot: ChannelSnapshot,
  draft: AnalysisResult
): Promise<AnalysisResult> {
  const llm = await fetchLangChainRecommendations(snapshot, draft);
  if (!llm) {
    return draft;
  }

  return {
    ...draft,
    contentGaps: llm.contentGaps,
    suggestedVideos: llm.suggestedVideos
  };
}
