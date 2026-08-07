import { describe, it, expect } from 'vitest';
import { ExportPdfReportUseCase } from './export-pdf-report.use-case';

describe('ExportPdfReportUseCase', () => {
  it('should execute export-pdf-report successfully', () => {
    const useCase = new ExportPdfReportUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});