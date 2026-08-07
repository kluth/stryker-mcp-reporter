import { describe, it, expect } from 'vitest';
import { ValidateCoverageThresholdUseCase } from './validate-coverage-threshold.use-case';

describe('ValidateCoverageThresholdUseCase', () => {
  it('should execute validate-coverage-threshold successfully', () => {
    const useCase = new ValidateCoverageThresholdUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});