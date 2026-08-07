import { describe, it, expect } from 'vitest';
import { CompareBranchesUseCase } from './compare-branches.use-case';

describe('CompareBranchesUseCase', () => {
  it('should execute compare-branches successfully', () => {
    const useCase = new CompareBranchesUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});