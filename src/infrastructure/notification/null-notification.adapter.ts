// src/infrastructure/notification/null-notification.adapter.ts
import type {
  NotificationServicePort,
  NotificationOptions,
} from "../../core/domain/notification-service.port.js";

export class NullNotificationAdapter implements NotificationServicePort {
  public async notifyStatus(): Promise<void> {}
  public async notifyProgress(): Promise<void> {}
  public async notifyCompletion(): Promise<void> {}
  public async notifyError(): Promise<void> {}
  public configure(_options: NotificationOptions): void {}
}
