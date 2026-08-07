import { describe, it, expect } from 'vitest';
import { DetectDuplicateCodeUseCase } from './detect-duplicate-code.use-case';

describe('DetectDuplicateCodeUseCase', () => {
  it('should execute detect-duplicate-code successfully', () => {
    const useCase = new DetectDuplicateCodeUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});