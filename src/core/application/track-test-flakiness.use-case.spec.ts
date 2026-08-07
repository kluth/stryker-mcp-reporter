import { describe, it, expect } from 'vitest';
import { TrackTestFlakinessUseCase } from './track-test-flakiness.use-case';

describe('TrackTestFlakinessUseCase', () => {
  it('should execute track-test-flakiness successfully', () => {
    const useCase = new TrackTestFlakinessUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});