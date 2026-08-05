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

  it("sendet Desktop-Benachrichtigung bei Statusänderungen", async () => {
    await adapter.notifyStatus("Stryker Mutationstests gestartet", "Stryker MCP Server");

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Stryker MCP Server",
        message: "Stryker Mutationstests gestartet",
        sound: true,
        wait: false,
      }),
      expect.any(Function),
    );
  });

  it("sendet Benachrichtigung bei erfolgreichem Abschluss mit Score", async () => {
    await adapter.notifyCompletion(100, 390, 0);

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "🧬 Mutationstests Beendet (100% Score)",
        message: "390 Mutanten getötet | 0 überlebt",
        sound: true,
      }),
      expect.any(Function),
    );
  });

  it("sendet Benachrichtigung bei Fehlern", async () => {
    await adapter.notifyError("Vitest Test Runner ist abgestürzt");

    expect(notifierFnMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "❌ Stryker Mutationstest Fehler",
        message: "Vitest Test Runner ist abgestürzt",
      }),
      expect.any(Function),
    );
  });

  it("respektiert das Deaktivieren von Benachrichtigungen", async () => {
    adapter.configure({ enabled: false });
    await adapter.notifyStatus("Test");

    expect(notifierFnMock.notify).not.toHaveBeenCalled();
  });

  it("fängt Fehler von node-notifier ab ohne abzustürzen", async () => {
    notifierFnMock.notify = vi.fn((_opts, cb) => cb(new Error("Notification system error")));
    await adapter.notifyStatus("Test Notification");

    expect(loggerMock.debug).toHaveBeenCalledWith(
      expect.stringContaining("Desktop-Benachrichtigung konnte nicht gesendet werden"),
      expect.any(Error),
    );
  });
});
