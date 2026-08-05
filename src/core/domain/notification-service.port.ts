// src/core/domain/notification-service.port.ts

export interface NotificationOptions {
  enabled?: boolean;
  persistentOverlay?: boolean;
  sound?: boolean;
}

export interface NotificationServicePort {
  notifyStatus(message: string, title?: string): Promise<void>;
  notifyProgress(progressPercent: number, currentMutant?: string): Promise<void>;
  notifyCompletion(score: number, killed: number, survived: number): Promise<void>;
  notifyError(errorMessage: string): Promise<void>;
  configure(options: NotificationOptions): void;
}
