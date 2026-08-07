import { describe, it, expect } from 'vitest';
import { SendTeamsNotificationUseCase } from './send-teams-notification.use-case';

describe('SendTeamsNotificationUseCase', () => {
  it('should execute send-teams-notification successfully', () => {
    const useCase = new SendTeamsNotificationUseCase();
    expect(useCase.execute({})).toBe(true);
  });
});