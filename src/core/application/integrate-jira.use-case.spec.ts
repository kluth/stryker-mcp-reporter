import { describe, it, expect } from 'vitest';
import { IntegrateJiraUseCase } from './integrate-jira.use-case';

describe('IntegrateJiraUseCase', () => {
  it('should execute integrate-jira successfully', () => {
    const useCase = new IntegrateJiraUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});