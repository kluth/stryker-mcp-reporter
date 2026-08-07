import { describe, it, expect } from 'vitest';
import { CreateBadgeSvgUseCase } from './create-badge-svg.use-case';

describe('CreateBadgeSvgUseCase', () => {
  it('should execute create-badge-svg successfully', () => {
    const useCase = new CreateBadgeSvgUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});