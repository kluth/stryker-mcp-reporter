import { describe, it, expect } from 'vitest';
import { FilterByStatusUseCase } from './filter-by-status.use-case';

describe('FilterByStatusUseCase', () => {
  it('should filter history by status', () => {
    const useCase = new FilterByStatusUseCase();
    const history = [
      { report: { status: 'improved' } },
      { report: { status: 'regressed' } }
    ];
    expect(useCase.execute(history, 'improved')).toEqual([{ report: { status: 'improved' } }]);
  });
});