import type { CommentIntent } from '../types/analysis.js';

const negativeMarkers = ['bad', 'worst', 'dislike', 'clickbait', 'boring', 'waste of time', 'misleading'];

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
  if (negativeMarkers.some((marker) => lowered.includes(marker))) {
    return 'negative';
  }
  // A comment that matches no rule is unknown, not negative.
  return 'neutral';
}
