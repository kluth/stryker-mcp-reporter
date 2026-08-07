import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchHistoryUseCase } from './search-history.use-case';

describe('SearchHistoryUseCase', () => {
  it('should filter history items by query matching commit message', () => {
    const history = [
      { filename: 'run1.json', report: { commitMessage: 'feat: add login' } },
      { filename: 'run2.json', report: { commitMessage: 'fix: typo in login' } },
      { filename: 'run3.json', report: { commitMessage: 'docs: update readme' } },
    ];
    const useCase = new SearchHistoryUseCase();
    const result = useCase.execute(history, 'login');
    expect(result.length).toBe(2);
    expect(result[0].filename).toBe('run1.json');
    expect(result[1].filename).toBe('run2.json');
  });

  it('should return empty array if no match', () => {
    const history = [
      { filename: 'run1.json', report: { commitMessage: 'feat: add login' } }
    ];
    const useCase = new SearchHistoryUseCase();
    const result = useCase.execute(history, 'xyz');
    expect(result.length).toBe(0);
  });
});
