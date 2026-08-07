import { describe, it, expect } from 'vitest';
import { IntegrateGithubIssuesUseCase } from './integrate-github-issues.use-case';

describe('IntegrateGithubIssuesUseCase', () => {
  it('should execute integrate-github-issues successfully', () => {
    const useCase = new IntegrateGithubIssuesUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});