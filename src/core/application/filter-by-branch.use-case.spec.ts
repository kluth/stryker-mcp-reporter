import { describe, it, expect } from 'vitest';
import { FilterByBranchUseCase } from './filter-by-branch.use-case';

describe('FilterByBranchUseCase', () => {
  it('should filter history by branch', () => {
    const useCase = new FilterByBranchUseCase();
    const history = [
      { report: { branch: 'main' } },
      { report: { branch: 'feat/test' } }
    ];
    expect(useCase.execute(history, 'feat/test')).toEqual([{ report: { branch: 'feat/test' } }]);
  });
  
  it('should return all if no branch', () => {
    const useCase = new FilterByBranchUseCase();
    expect(useCase.execute([{ id: 1 }], '')).toEqual([{ id: 1 }]);
  });
});