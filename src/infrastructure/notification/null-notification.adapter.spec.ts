// src/infrastructure/notification/null-notification.adapter.spec.ts
import { describe, it, expect } from "vitest";
import { NullNotificationAdapter } from "./null-notification.adapter.js";

describe("NullNotificationAdapter", () => {
  it("führt alle Notification-Methoden ohne Fehler aus (No-Op)", async () => {
    const adapter = new NullNotificationAdapter();

    await expect(adapter.notifyStatus("test")).resolves.toBeUndefined();
    await expect(adapter.notifyProgress(50)).resolves.toBeUndefined();
    await expect(adapter.notifyCompletion(100, 10, 0)).resolves.toBeUndefined();
    await expect(adapter.notifyError("error")).resolves.toBeUndefined();
    expect(() => adapter.configure({ enabled: true })).not.toThrow();
  });
});
