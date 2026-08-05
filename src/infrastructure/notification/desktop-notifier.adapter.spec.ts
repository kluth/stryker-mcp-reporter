// src/infrastructure/notification/desktop-notifier.adapter.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DesktopNotifierAdapter } from "./desktop-notifier.adapter.js";
import type { Logger } from "@stryker-mutator/api/logging";

describe("DesktopNotifierAdapter", () => {
  let loggerMock: Logger;
  let notifierFnMock: { notify: ReturnType<typeof vi.fn> };
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

    adapter = new DesktopNotifierAdapter(loggerMock, notifierFnMock);
  });

  it("sendet Desktop-Benachrichtigung bei Statusänderungen mit Default-Titel", async () => {
    await adapter.notifyStatus("Tests gestartet");

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      {
        title: "Stryker MCP Control Server",
        message: "Tests gestartet",
        sound: true,
        wait: false,
      },
      expect.any(Function),
    );
    expect(loggerMock.debug).not.toHaveBeenCalled();
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

  it("sendet Benachrichtigung bei Fertigstellung mit Score und Zahlen", async () => {
    await adapter.notifyCompletion(88.5, 40, 5);

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "🧬 Mutationstests Beendet (88.5% Score)",
        message: "40 Mutanten getötet | 5 überlebt",
        sound: true,
      }),
      expect.any(Function),
    );
  });

  it("sendet Fehlerbenachrichtigung", async () => {
    await adapter.notifyError("Stryker CLI nicht gefunden");

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "❌ Stryker Mutationstest Fehler",
        message: "Stryker CLI nicht gefunden",
      }),
      expect.any(Function),
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
});
