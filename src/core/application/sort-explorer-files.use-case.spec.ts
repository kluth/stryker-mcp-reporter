import { describe, it, expect } from 'vitest';
import { SortExplorerFilesUseCase } from './sort-explorer-files.use-case';

describe('SortExplorerFilesUseCase', () => {
  it('should sort files by coverage', () => {
    const useCase = new SortExplorerFilesUseCase();
    const files = [{ id: 1, metrics: { coverage: 50 } }, { id: 2, metrics: { coverage: 90 } }];
    expect(useCase.execute(files, 'coverage')[0].id).toBe(2);
  });
});