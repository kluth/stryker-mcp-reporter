import { describe, it, expect } from 'vitest';
import { UploadToGcsUseCase } from './upload-to-gcs.use-case';

describe('UploadToGcsUseCase', () => {
  it('should execute upload-to-gcs successfully', () => {
    const useCase = new UploadToGcsUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});