// src/infrastructure/notification/desktop-notifier.adapter.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DesktopNotifierAdapter } from "./desktop-notifier.adapter.js";
import type { Logger } from "@stryker-mutator/api/logging";

describe("DesktopNotifierAdapter", () => {
  let loggerMock: Logger;
  let notifierFnMock: any;
  let adapter: DesktopNotifierAdapter;

  beforeEach(() => {
    loggerMock = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    notifierFnMock = {
      notify: vi.fn((_opts, cb) => {
        if (cb) cb(null, "ok");
      }),
    };

    adapter = new DesktopNotifierAdapter(loggerMock, notifierFnMock);
  });

  it("sendet Desktop-Benachrichtigung bei Statusänderungen mit Default-Titel", async () => {
    await adapter.notifyStatus("Test gestartet");

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      {
        title: "Stryker MCP Control Server",
        message: "Test gestartet",
        sound: true,
        wait: false,
      },
      expect.any(Function),
    );
  });

  it("sendet Desktop-Benachrichtigung bei Statusänderungen mit benutzerdefiniertem Titel", async () => {
    await adapter.notifyStatus("Custom Message", "Custom Title");

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      {
        title: "Custom Title",
        message: "Custom Message",
        sound: true,
        wait: false,
      },
      expect.any(Function),
    );
  });

  it("sendet Benachrichtigung bei Fortschrittsaktualisierung mit und ohne Mutanten-Name", async () => {
    await adapter.notifyProgress(50, "src/calculator.ts");
    expect(notifierFnMock.notify).toHaveBeenLastCalledWith(
      {
        title: "⚡ Stryker Mutationstests (50%)",
        message: "Fortschritt: 50% | Mutieren: src/calculator.ts",
        sound: false,
        wait: false,
      },
      expect.any(Function),
    );

    await adapter.notifyProgress(75);
    expect(notifierFnMock.notify).toHaveBeenLastCalledWith(
      {
        title: "⚡ Stryker Mutationstests (75%)",
        message: "Fortschritt: 75% abgeschlossen",
        sound: false,
        wait: false,
      },
      expect.any(Function),
    );
  });

  it("sendet Benachrichtigung bei erfolgreichem Abschluss mit Score", async () => {
    await adapter.notifyCompletion(100, 390, 0);

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      {
        title: "🧬 Mutationstests Beendet (100% Score)",
        message: "390 Mutanten getötet | 0 überlebt",
        sound: true,
        wait: false,
      },
      expect.any(Function),
    );
  });

  it("sendet Benachrichtigung bei Fehlern", async () => {
    await adapter.notifyError("Vitest Test Runner ist abgestürzt");

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      {
        title: "❌ Stryker Mutationstest Fehler",
        message: "Vitest Test Runner ist abgestürzt",
        sound: true,
        wait: false,
      },
      expect.any(Function),
    );
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

  it("respektiert das Deaktivieren von Benachrichtigungen in allen Benachrichtigungsmethoden", async () => {
    adapter.configure({ enabled: false });

    await adapter.notifyStatus("Test");
    await adapter.notifyProgress(10);
    await adapter.notifyCompletion(100, 1, 0);
    await adapter.notifyError("Fehler");

    expect(notifierFnMock.notify).not.toHaveBeenCalled();
  });

  it("loggt Fehler bei Asynchronem Fehler im Callback von node-notifier", async () => {
    const cbError = new Error("Async callback error");
    notifierFnMock.notify = vi.fn((_opts, cb) => cb(cbError));

    await adapter.notifyStatus("Test Notification");

    expect(loggerMock.debug).toHaveBeenCalledWith(
      "Desktop-Benachrichtigung konnte nicht gesendet werden:",
      cbError,
    );
  });

  it("fängt synchrone Fehler von node-notifier ab ohne abzustürzen", async () => {
    const syncError = new Error("Synchronous notification crash");
    notifierFnMock.notify = vi.fn().mockImplementation(() => {
      throw syncError;
    });

    await adapter.notifyStatus("Test Notification");

    expect(loggerMock.debug).toHaveBeenCalledWith(
      "Unerwarteter Fehler beim Senden der Benachrichtigung:",
      syncError,
    );
  });
});
