import { describe, it, expect } from 'vitest';
import { CalculateCodeSmellsUseCase } from './calculate-code-smells.use-case';

describe('CalculateCodeSmellsUseCase', () => {
  it('should execute calculate-code-smells successfully', () => {
    const useCase = new CalculateCodeSmellsUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});