import type { CommentIntent } from '../types/analysis.js';

export function classifyCommentIntent(comment: string): CommentIntent {
  const lowered = comment.toLowerCase();
  if (lowered.includes('please') || lowered.includes('can you') || lowered.includes('cover')) {
    return 'request';
  }
  if (lowered.includes('?')) {
    return 'question';
  }
  if (lowered.includes('stuck') || lowered.includes('issue') || lowered.includes('error')) {
    return 'complaint';
  }
  if (lowered.includes('great') || lowered.includes('thank')) {
    return 'positive';
  }
  return 'negative';
}
