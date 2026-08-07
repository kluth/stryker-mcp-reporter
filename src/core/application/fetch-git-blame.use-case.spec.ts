import { describe, it, expect } from 'vitest';
import { FetchGitBlameUseCase } from './fetch-git-blame.use-case';

describe('FetchGitBlameUseCase', () => {
  it('should execute fetch-git-blame successfully', () => {
    const useCase = new FetchGitBlameUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});