import { describe, expect, it } from 'vitest';

import { classifyCommentIntent } from './comment-intent.js';

describe('classifyCommentIntent', () => {
  it('classifies requests', () => {
    expect(classifyCommentIntent('Please cover MCP deployment next.')).toBe('request');
    expect(classifyCommentIntent('Can you do a tutorial on agents?')).toBe('request');
  });

  it('classifies questions', () => {
    expect(classifyCommentIntent('What editor is that?')).toBe('question');
  });

  it('classifies complaints', () => {
    expect(classifyCommentIntent('I got stuck at the config step')).toBe('complaint');
  });

  it('classifies positives', () => {
    expect(classifyCommentIntent('Great pacing, thank you')).toBe('positive');
  });

  it('classifies explicit negativity', () => {
    expect(classifyCommentIntent('This is clickbait')).toBe('negative');
  });

  it('defaults unmatched comments to neutral, not negative', () => {
    expect(classifyCommentIntent('Nice video')).toBe('neutral');
    expect(classifyCommentIntent('First')).toBe('neutral');
  });
});
