// src/infrastructure/notification/desktop-notifier.adapter.ts
import notifier from "node-notifier";
import type { Logger } from "@stryker-mutator/api/logging";
import type {
  NotificationServicePort,
  NotificationOptions,
} from "../../core/domain/notification-service.port.js";

export class DesktopNotifierAdapter implements NotificationServicePort {
  private options: NotificationOptions = {
    enabled: true,
    persistentOverlay: false,
    sound: true,
  };

  constructor(
    private readonly logger: Logger,
    private readonly notifierService: any = notifier,
  ) {}

  public configure(options: NotificationOptions): void {
    this.options = { ...this.options, ...options };
  }

  public async notifyStatus(message: string, title: string = "Stryker MCP Control Server"): Promise<void> {
    if (!this.options.enabled) return;

    await this.sendNotification({
      title,
      message,
      sound: this.options.sound,
      wait: false,
    });
  }

  public async notifyProgress(progressPercent: number, currentMutant?: string): Promise<void> {
    if (!this.options.enabled) return;

    const message = currentMutant
      ? `Fortschritt: ${progressPercent}% | Mutieren: ${currentMutant}`
      : `Fortschritt: ${progressPercent}% abgeschlossen`;

    await this.sendNotification({
      title: `⚡ Stryker Mutationstests (${progressPercent}%)`,
      message,
      sound: false,
      wait: false,
    });
  }

  public async notifyCompletion(score: number, killed: number, survived: number): Promise<void> {
    if (!this.options.enabled) return;

    const title = `🧬 Mutationstests Beendet (${score}% Score)`;
    const message = `${killed} Mutanten getötet | ${survived} überlebt`;

    await this.sendNotification({
      title,
      message,
      sound: this.options.sound,
      wait: false,
    });
  }

  public async notifyError(errorMessage: string): Promise<void> {
    if (!this.options.enabled) return;

    await this.sendNotification({
      title: "❌ Stryker Mutationstest Fehler",
      message: errorMessage,
      sound: this.options.sound,
      wait: false,
    });
  }

  private sendNotification(params: { title: string; message: string; sound?: boolean; wait?: boolean }): Promise<void> {
    return new Promise((resolve) => {
      try {
        this.notifierService.notify(params, (err: Error | null) => {
          if (err) {
            this.logger.debug("Desktop-Benachrichtigung konnte nicht gesendet werden:", err);
          }
          resolve();
        });
      } catch (err) {
        this.logger.debug("Unerwarteter Fehler beim Senden der Benachrichtigung:", err as Error);
        resolve();
      }
    });
  }
}
