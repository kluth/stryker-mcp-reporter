import { describe, it, expect } from 'vitest';
import { SearchExplorerUseCase } from './search-explorer.use-case';

describe('SearchExplorerUseCase', () => {
  it('should search files by name', () => {
    const useCase = new SearchExplorerUseCase();
    const files = [{ name: 'Test.ts' }, { name: 'App.ts' }];
    expect(useCase.execute(files, 'test')).toEqual([{ name: 'Test.ts' }]);
  });
});