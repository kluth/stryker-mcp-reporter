import { describe, it, expect } from 'vitest';
import { GenerateCsvReportUseCase } from './generate-csv-report.use-case';

describe('GenerateCsvReportUseCase', () => {
  it('should execute generate-csv-report successfully', () => {
    const useCase = new GenerateCsvReportUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});