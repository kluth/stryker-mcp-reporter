import { describe, it, expect } from 'vitest';
import { UploadToS3UseCase } from './upload-to-s3.use-case';

describe('UploadToS3UseCase', () => {
  it('should execute upload-to-s3 successfully', () => {
    const useCase = new UploadToS3UseCase();
    expect(useCase.execute({})).toBe(true);
  });
});