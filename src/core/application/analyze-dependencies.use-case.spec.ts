import { describe, it, expect } from 'vitest';
import { AnalyzeDependenciesUseCase } from './analyze-dependencies.use-case';

describe('AnalyzeDependenciesUseCase', () => {
  it('should execute analyze-dependencies successfully', () => {
    const useCase = new AnalyzeDependenciesUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});