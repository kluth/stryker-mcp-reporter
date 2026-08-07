// src/infrastructure/stryker/mcp-reporter.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpReporter } from "./mcp-reporter.js";
import { ok, err } from "../../core/domain/result.js";
import type { Logger } from "@stryker-mutator/api/logging";
import type { MutationTestResult } from "mutation-testing-report-schema";
import type { PublishReportUseCase } from "../../core/application/publish-report.use-case.js";
import type { McpServerAdapter } from "../mcp/mcp-server.adapter.js";

describe("McpReporter", () => {
  let originalMcpDaemon: string | undefined;

  beforeEach(() => {
    originalMcpDaemon = process.env.MCP_DAEMON;
    delete process.env.MCP_DAEMON;
  });

  afterEach(() => {
    if (originalMcpDaemon !== undefined) {
      process.env.MCP_DAEMON = originalMcpDaemon;
    } else {
      delete process.env.MCP_DAEMON;
    }
  });

  it("sollte den Report verarbeiten und beenden, wenn MCP_DAEMON inaktiv ist", async () => {
    const loggerMock = { info: vi.fn(), error: vi.fn() } as unknown as Logger;
    const useCaseMock = {
      execute: vi.fn().mockReturnValue(ok(undefined)),
    } as unknown as PublishReportUseCase;
    const adapterMock = {
      start: vi.fn().mockResolvedValue(ok(undefined)),
    } as unknown as McpServerAdapter;

    const reporter = new McpReporter(loggerMock, useCaseMock, adapterMock);
    const dummyReport = { files: {} } as MutationTestResult;

    // Act
    await reporter.onMutationTestReportReady(dummyReport);

    // Assert (Strikte String-Prüfung tötet alle String-Mutanten)
    expect(useCaseMock.execute).toHaveBeenCalledWith(dummyReport);
    expect(adapterMock.start).not.toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith(
      "Mutation Testing abgeschlossen. Bereite MCP-Server vor...",
    );
  });

  it("sollte Fehler aus dem Use Case loggen und abbrechen", async () => {
    const loggerMock = { info: vi.fn(), error: vi.fn() } as unknown as Logger;
    const useCaseMock = {
      execute: vi.fn().mockReturnValue(err(new Error("Domain Error"))),
    } as unknown as PublishReportUseCase;
    const adapterMock = { start: vi.fn() } as unknown as McpServerAdapter;

    const reporter = new McpReporter(loggerMock, useCaseMock, adapterMock);

    // Act
    await reporter.onMutationTestReportReady({} as MutationTestResult);

    // Assert
    expect(adapterMock.start).not.toHaveBeenCalled();
    expect(loggerMock.error).toHaveBeenCalledWith(
      "Fehler beim Verarbeiten des Reports: Domain Error",
    );
  });

  it("sollte Fehler beim Server-Start loggen und abbrechen (NoCoverage behoben)", async () => {
    process.env.MCP_DAEMON = "true";
    const loggerMock = { info: vi.fn(), error: vi.fn() } as unknown as Logger;
    const useCaseMock = {
      execute: vi.fn().mockReturnValue(ok(undefined)),
    } as unknown as PublishReportUseCase;
    // Hier zwingen wir den Adapter-Mock in unseren etablierten Result-Error-State
    const adapterMock = {
      start: vi.fn().mockResolvedValue(err(new Error("Port 3000 belegt"))),
    } as unknown as McpServerAdapter;

    const reporter = new McpReporter(loggerMock, useCaseMock, adapterMock);

    // Act
    await reporter.onMutationTestReportReady({} as MutationTestResult);

    // Assert
    expect(loggerMock.error).toHaveBeenCalledWith(
      "MCP-Server konnte nicht gestartet werden: Port 3000 belegt",
    );
    // Die finale Erfolgsmeldung darf niemals aufgerufen werden
    expect(loggerMock.info).not.toHaveBeenCalledWith(
      "🚀 MCP Server läuft auf Port 3000! Warte auf KI-Verbindungen (Beenden mit Strg+C).",
    );
    delete process.env.MCP_DAEMON;
  });

  it("sollte das Promise nicht auflösen, wenn MCP_DAEMON aktiv ist", async () => {
    const loggerMock = { info: vi.fn(), error: vi.fn() } as unknown as Logger;
    const useCaseMock = {
      execute: vi.fn().mockReturnValue(ok(undefined)),
    } as unknown as PublishReportUseCase;
    const adapterMock = {
      start: vi.fn().mockResolvedValue(ok(undefined)),
    } as unknown as McpServerAdapter;

    const reporter = new McpReporter(loggerMock, useCaseMock, adapterMock);
    const dummyReport = { files: {} } as MutationTestResult;

    process.env.MCP_DAEMON = "true";

    // Because it returns a promise that never resolves, we race it against a timeout
    const timeout = new Promise((resolve) => setTimeout(() => resolve("TIMEOUT"), 50));
    const result = await Promise.race([
      reporter.onMutationTestReportReady(dummyReport),
      timeout,
    ]);

    expect(result).toBe("TIMEOUT");

    expect(result).toBe("TIMEOUT");
  });
});
