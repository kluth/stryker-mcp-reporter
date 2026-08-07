import { describe, it, expect } from 'vitest';
import { TriggerWebhookUseCase } from './trigger-webhook.use-case';

describe('TriggerWebhookUseCase', () => {
  it('should execute trigger-webhook successfully', () => {
    const useCase = new TriggerWebhookUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});