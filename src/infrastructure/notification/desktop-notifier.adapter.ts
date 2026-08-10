// src/infrastructure/notification/desktop-notifier.adapter.ts
import path from "path";
import { execFile } from "child_process";
import notifier from "node-notifier";
import type { Logger } from "@stryker-mutator/api/logging";
import type {
  NotificationServicePort,
  NotificationOptions,
} from "../../core/domain/notification-service.port.js";

export type AudioPlayerFn = (soundPath: string) => Promise<void>;

export function defaultAudioPlayer(
  soundPath: string,
  platform: string = process.platform,
  execFn: (
    file: string,
    args: string[],
    cb: (error: Error | null) => void,
  ) => void = execFile,
): Promise<void> {
  return new Promise((resolve) => {
    let file: string;
    let args: string[];

    if (platform === "win32") {
      file = "powershell";
      const escapedPath = soundPath.replace(/'/g, "''");
      args = [
        "-c",
        `(New-Object System.Media.SoundPlayer '${escapedPath}').Play()`,
      ];
    } else if (platform === "darwin") {
      file = "afplay";
      args = [soundPath];
    } else {
      file = "sh";
      args = ["-c", `aplay "${soundPath}" || paplay "${soundPath}"`];
    }

    execFn(file, args, () => {
      resolve();
    });
  });
}

export class DesktopNotifierAdapter implements NotificationServicePort {
  private options: NotificationOptions = {
    enabled: true,
    sound: true,
    persistentOverlay: true,
  };

  constructor(
    private readonly logger: Logger,
    private readonly notifierService: typeof notifier = notifier,
    private readonly audioPlayer: AudioPlayerFn = defaultAudioPlayer,
  ) {}

  public configure(options: NotificationOptions): void {
    this.options = { ...this.options, ...options };
  }

  public async notifyStatus(
    message: string,
    title: string = "Stryker MCP Control Server",
  ): Promise<void> {
    if (!this.options.enabled) return;

    await this.sendNotification({
      title,
      message,
      sound: this.options.sound,
      wait: false,
    });
  }

  public async notifyProgress(
    progressPercent: number,
    currentMutant?: string,
  ): Promise<void> {
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

  public async notifyCompletion(
    score: number,
    killed: number,
    survived: number,
  ): Promise<void> {
    if (!this.options.enabled) return;

    const title = `🧬 Mutationstests Beendet (${score}% Score)`;
    const message = `${killed} Mutanten getötet | ${survived} überlebt`;
    const isPersistent = this.options.persistentOverlay !== false;

    await this.sendNotification({
      title,
      message,
      sound: this.options.sound,
      wait: isPersistent,
      timeout: isPersistent ? false : undefined,
      sticky: isPersistent,
    });
  }

  public async notifyError(errorMessage: string): Promise<void> {
    if (!this.options.enabled) return;

    const isPersistent = this.options.persistentOverlay !== false;

    await this.sendNotification({
      title: "❌ Stryker Mutationstest Fehler",
      message: errorMessage,
      sound: this.options.sound,
      wait: isPersistent,
      timeout: isPersistent ? false : undefined,
      sticky: isPersistent,
    });
  }

  private async sendNotification(params: {
    title: string;
    message: string;
    sound?: boolean;
    wait?: boolean;
    timeout?: number | false;
    sticky?: boolean;
  }): Promise<void> {
    const playSound = Boolean(params.sound);
    const soundPath = this.getSoundPath();

    if (playSound) {
      try {
        await this.audioPlayer(soundPath);
      } catch (audioErr) {
        const errObj =
          audioErr instanceof Error ? audioErr : new Error(String(audioErr));
        this.logger.debug("Audio-Wiedergabe fehlgeschlagen:", errObj);
      }
    }

    return new Promise((resolve) => {
      try {
        const notificationPayload = {
          ...params,
          sound: playSound ? soundPath : false,
        };

        this.notifierService.notify(
          notificationPayload as any,
          (err: Error | null) => {
            if (err) {
              this.logger.debug(
                "Desktop-Benachrichtigung konnte nicht gesendet werden:",
                err,
              );
            }
            resolve();
          },
        );
      } catch (err) {
        const errObj = err instanceof Error ? err : new Error(String(err));
        this.logger.debug(
          "Unerwarteter Fehler beim Senden der Benachrichtigung:",
          errObj,
        );
        resolve();
      }
    });
  }

  private getSoundPath(): string {
    if (this.options.customSoundPath) {
      return path.resolve(this.options.customSoundPath);
    }
    return path.resolve(process.cwd(), "assets", "sounds", "mutant_hunter.wav");
  }
}

