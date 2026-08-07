import { describe, it, expect } from 'vitest';
import { SendSlackNotificationUseCase } from './send-slack-notification.use-case';

describe('SendSlackNotificationUseCase', () => {
  it('should execute send-slack-notification successfully', () => {
    const useCase = new SendSlackNotificationUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});