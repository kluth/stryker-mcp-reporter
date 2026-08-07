import { describe, it, expect } from 'vitest';
import { GenerateChangelogUseCase } from './generate-changelog.use-case';

describe('GenerateChangelogUseCase', () => {
  it('should execute generate-changelog successfully', () => {
    const useCase = new GenerateChangelogUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});