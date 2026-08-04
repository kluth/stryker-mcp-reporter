// src/infrastructure/stryker/mcp-reporter.spec.ts
import { describe, it, expect, vi } from "vitest";
import { McpReporter } from "./mcp-reporter.js";
import { ok, err } from "../../core/domain/result.js";
describe("McpReporter", () => {
    it("sollte den Report verarbeiten, den Server starten und den Prozess offen halten", async () => {
        const loggerMock = { info: vi.fn(), error: vi.fn() };
        const useCaseMock = {
            execute: vi.fn().mockReturnValue(ok(undefined)),
        };
        const adapterMock = {
            start: vi.fn().mockResolvedValue(ok(undefined)),
        };
        const reporter = new McpReporter(loggerMock, useCaseMock, adapterMock);
        const dummyReport = { files: {} };
        // Act ohne await (da Promise absichtlich blockiert)
        reporter.onMutationTestReportReady(dummyReport);
        await new Promise((resolve) => process.nextTick(resolve));
        expect(useCaseMock.execute).toHaveBeenCalledWith(dummyReport);
        expect(adapterMock.start).toHaveBeenCalledTimes(1);
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining("Warte auf KI-Verbindungen"));
    });
    it("sollte Fehler aus dem Use Case loggen und abbrechen", async () => {
        const loggerMock = { info: vi.fn(), error: vi.fn() };
        const useCaseMock = {
            execute: vi.fn().mockReturnValue(err(new Error("Domain Error"))),
        };
        const adapterMock = { start: vi.fn() };
        const reporter = new McpReporter(loggerMock, useCaseMock, adapterMock);
        reporter.onMutationTestReportReady({});
        await new Promise((resolve) => process.nextTick(resolve));
        expect(adapterMock.start).not.toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining("Domain Error"));
    });
});
