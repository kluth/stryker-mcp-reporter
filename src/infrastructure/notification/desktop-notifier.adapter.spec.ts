// src/infrastructure/notification/desktop-notifier.adapter.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DesktopNotifierAdapter,
  defaultAudioPlayer,
} from "./desktop-notifier.adapter.js";
import type { Logger } from "@stryker-mutator/api/logging";

describe("DesktopNotifierAdapter", () => {
  let loggerMock: Logger;
  let notifierFnMock: { notify: ReturnType<typeof vi.fn> };
  let audioPlayerMock: ReturnType<typeof vi.fn>;
  let adapter: DesktopNotifierAdapter;

  beforeEach(() => {
    loggerMock = {
      debug: vi.fn(),
    } as unknown as Logger;

    notifierFnMock = {
      notify: vi.fn((_params, callback) => {
        if (callback) callback(null);
      }),
    };

    audioPlayerMock = vi.fn().mockResolvedValue(undefined);

    adapter = new DesktopNotifierAdapter(
      loggerMock,
      notifierFnMock,
      audioPlayerMock,
    );
  });

  it("sendet Desktop-Benachrichtigung bei Statusänderungen mit Default-Titel", async () => {
    await adapter.notifyStatus("Tests gestartet");

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Stryker MCP Control Server",
        message: "Tests gestartet",
        wait: false,
      }),
      expect.any(Function),
    );
    expect(audioPlayerMock).toHaveBeenCalledWith(
      expect.stringContaining("mutant_hunter.wav"),
    );
  });

  it("sendet Desktop-Benachrichtigung bei Statusänderungen mit benutzerdefiniertem Titel", async () => {
    await adapter.notifyStatus("Tests gestartet", "Custom Title");

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Custom Title",
        message: "Tests gestartet",
      }),
      expect.any(Function),
    );
  });

  it("sendet Benachrichtigung bei Fortschrittsaktualisierung mit und ohne Mutanten-Name", async () => {
    await adapter.notifyProgress(45);
    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "⚡ Stryker Mutationstests (45%)",
        message: "Fortschritt: 45% abgeschlossen",
        sound: false,
      }),
      expect.any(Function),
    );

    await adapter.notifyProgress(50, "ArithmeticMutator");
    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "⚡ Stryker Mutationstests (50%)",
        message: "Fortschritt: 50% | Mutieren: ArithmeticMutator",
      }),
      expect.any(Function),
    );
  });

  it("sendet Benachrichtigung bei Fertigstellung als persistenten Overlay mit Sound", async () => {
    await adapter.notifyCompletion(88.5, 40, 5);

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "🧬 Mutationstests Beendet (88.5% Score)",
        message: "40 Mutanten getötet | 5 überlebt",
        wait: true,
        timeout: false,
        sticky: true,
      }),
      expect.any(Function),
    );
    expect(audioPlayerMock).toHaveBeenCalledWith(
      expect.stringContaining("mutant_hunter.wav"),
    );
  });

  it("sendet Fehlerbenachrichtigung als persistenten Overlay mit Sound", async () => {
    await adapter.notifyError("Stryker CLI nicht gefunden");

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "❌ Stryker Mutationstest Fehler",
        message: "Stryker CLI nicht gefunden",
        wait: true,
        timeout: false,
        sticky: true,
      }),
      expect.any(Function),
    );
  });

  it("erlaubt Deaktivierung des persistenten Overlays", async () => {
    adapter.configure({ persistentOverlay: false });

    await adapter.notifyCompletion(100, 10, 0);

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        wait: false,
        timeout: undefined,
        sticky: false,
      }),
      expect.any(Function),
    );
  });

  it("unterstützt benutzerdefinierten Pfad für Mutant Hunter Sound", async () => {
    adapter.configure({ customSoundPath: "custom/sound.wav" });

    await adapter.notifyStatus("Test Custom Sound");

    expect(audioPlayerMock).toHaveBeenCalledWith(
      expect.stringContaining("custom"),
    );
  });

  it("fängt Fehler bei der Audio-Wiedergabe sicher ab und loggt sie", async () => {
    const audioErr = new Error("Audio Hardware Error");
    audioPlayerMock.mockRejectedValueOnce(audioErr);

    await adapter.notifyStatus("Audio Error Test");

    expect(loggerMock.debug).toHaveBeenCalledWith(
      "Audio-Wiedergabe fehlgeschlagen:",
      audioErr,
    );
  });

  it("blockiert Benachrichtigungen, wenn enabled false ist", async () => {
    adapter.configure({ enabled: false });

    await adapter.notifyStatus("Test");
    await adapter.notifyProgress(10);
    await adapter.notifyCompletion(100, 1, 0);
    await adapter.notifyError("Error");

    expect(notifierFnMock.notify).not.toHaveBeenCalled();
  });

  it("behält bestehende Optionen bei partieller Re-Konfiguration bei", async () => {
    adapter.configure({ sound: false, persistentOverlay: true });

    await adapter.notifyStatus("Test");

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        sound: false,
        wait: false,
      }),
      expect.any(Function),
    );
  });

  it("fängt Fehler im Notifier Callback sicher ab und loggt sie", async () => {
    const notifyError = new Error("OS Notification Failed");
    notifierFnMock.notify = vi.fn((_params, callback) => {
      if (callback) callback(notifyError);
    });

    await adapter.notifyStatus("Test Callback Failure");

    expect(loggerMock.debug).toHaveBeenCalledWith(
      "Desktop-Benachrichtigung konnte nicht gesendet werden:",
      notifyError,
    );
  });

  it("fängt synchrone Fehler im Notifier.notify Aufruf ab und loggt sie", async () => {
    const syncError = new Error("Sync Notify Throw");
    notifierFnMock.notify = vi.fn(() => {
      throw syncError;
    });

    await adapter.notifyStatus("Test Sync Failure");

    expect(loggerMock.debug).toHaveBeenCalledWith(
      "Unerwarteter Fehler beim Senden der Benachrichtigung:",
      syncError,
    );
  });

  it("nutzt den echten node-notifier Export, wenn kein Notifier übergeben wird", () => {
    const defaultAdapter = new DesktopNotifierAdapter(loggerMock);
    expect(defaultAdapter).toBeInstanceOf(DesktopNotifierAdapter);
  });

  it("prüft defaultAudioPlayer für win32, darwin und linux Plattformen", async () => {
    const execMock = vi.fn((cmd: string, args: string[], cb: Function) =>
      cb(null),
    );

    await defaultAudioPlayer("test'path.wav", "win32", execMock as any);
    expect(execMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([expect.stringContaining("test''path.wav")]),
      expect.any(Function),
    );

    await defaultAudioPlayer("testpath.wav", "darwin", execMock as any);
    expect(execMock).toHaveBeenCalledWith(
      "afplay",
      expect.arrayContaining([expect.stringContaining("testpath.wav")]),
      expect.any(Function),
    );

    await defaultAudioPlayer("testpath.wav", "linux", execMock as any);
    expect(execMock).toHaveBeenCalledWith(
      "sh",
      expect.arrayContaining([
        expect.stringContaining(
          'aplay "testpath.wav" || paplay "testpath.wav"',
        ),
      ]),
      expect.any(Function),
    );
  });
});

