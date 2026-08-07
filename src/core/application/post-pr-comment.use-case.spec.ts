import { describe, it, expect } from 'vitest';
import { PostPrCommentUseCase } from './post-pr-comment.use-case';

describe('PostPrCommentUseCase', () => {
  it('should execute post-pr-comment successfully', () => {
    const useCase = new PostPrCommentUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});