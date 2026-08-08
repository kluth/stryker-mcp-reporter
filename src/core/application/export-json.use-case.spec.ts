import { describe, it, expect } from 'vitest';
import { ExportJsonUseCase } from './export-json.use-case';

describe('ExportJsonUseCase', () => {
  it('should export history as JSON string', () => {
    const useCase = new ExportJsonUseCase();
    const history = [{ id: 1 }];
    expect(useCase.execute(history)).toBe(`[
  {
    "id": 1
  }
]`);
  });
});