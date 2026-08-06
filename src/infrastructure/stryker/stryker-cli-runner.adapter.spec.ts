// src/infrastructure/stryker/stryker-cli-runner.adapter.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { StrykerCliRunnerAdapter } from "./stryker-cli-runner.adapter.js";
import type { Logger } from "@stryker-mutator/api/logging";
import type { MutationReport } from "../../core/domain/mutation-report.js";
import type { PartialStrykerOptions } from "@stryker-mutator/api/core";

vi.mock("@stryker-mutator/core", () => {
  return {
    Stryker: vi.fn().mockImplementation(() => ({
      runMutationTest: vi.fn().mockResolvedValue({ files: {} }),
    })),
  };
});

describe("StrykerCliRunnerAdapter", () => {
  let mockLogger: Logger;
  let mockStrykerFactory: (config?: PartialStrykerOptions) => { runMutationTest: () => Promise<MutationReport> };

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
    } as unknown as Logger;
  });

  it("führt Stryker programmatisch aus und gibt das ok-Result mit dem Report zurück", async () => {
    const fakeReport: MutationReport = {
      files: {
        "src/app.ts": { mutants: [] },
      },
    };

    mockStrykerFactory = vi.fn().mockReturnValue({
      runMutationTest: vi.fn().mockResolvedValue(fakeReport),
    });

    const adapter = new StrykerCliRunnerAdapter(mockLogger, mockStrykerFactory);
    const result = await adapter.run({ mutate: ["src/app.ts"] });

    expect(result.isOk).toBe(true);
    expect(result.value).toEqual(fakeReport);
    expect(mockStrykerFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        mutate: ["src/app.ts"],
      }),
    );
    expect(mockLogger.info).toHaveBeenCalledWith("Starte programmatischen Stryker Mutationstest-Lauf...");
    expect(mockLogger.info).toHaveBeenCalledWith("Programmatischer Stryker Mutationstest-Lauf erfolgreich abgeschlossen.");
  });

  it("reicht alle Optionen (concurrency, reporters, testRunner, configFile) an Stryker weiter", async () => {
    const fakeReport: MutationReport = { files: {} };
    mockStrykerFactory = vi.fn().mockReturnValue({
      runMutationTest: vi.fn().mockResolvedValue(fakeReport),
    });

    const adapter = new StrykerCliRunnerAdapter(mockLogger, mockStrykerFactory);
    await adapter.run({
      mutate: ["src/app.ts"],
      concurrency: 4,
      reporters: ["json", "clear-text"],
      testRunner: "vitest",
      configFile: "stryker.config.mjs",
    });

    expect(mockStrykerFactory).toHaveBeenCalledWith({
      mutate: ["src/app.ts"],
      concurrency: 4,
      testRunner: "vitest",
      configFile: "stryker.config.mjs",
      logLevel: "off",
      reporters: ["json", "clear-text"],
    });
  });

  it("ignoriert concurrency=0 oder leere Optionseigenschaften", async () => {
    const fakeReport: MutationReport = { files: {} };
    mockStrykerFactory = vi.fn().mockReturnValue({
      runMutationTest: vi.fn().mockResolvedValue(fakeReport),
    });

    const adapter = new StrykerCliRunnerAdapter(mockLogger, mockStrykerFactory);
    await adapter.run({
      mutate: [],
      concurrency: 0,
      reporters: [],
    });

    expect(mockStrykerFactory).toHaveBeenCalledWith({
      logLevel: "off",
      reporters: [],
    });
  });

  it("nutzt den dynamischen Import von @stryker-mutator/core wenn keine Factory übergeben wird", async () => {
    const adapter = new StrykerCliRunnerAdapter(mockLogger);
    const result = await adapter.run({ mutate: ["src/dummy.ts"] });

    expect(result.isOk).toBe(true);
    expect(result.value).toEqual({ files: {} });
  });

  it("handhabt null rawResult und erzeugt ein valides MutationReport-Objekt mit files", async () => {
    mockStrykerFactory = vi.fn().mockReturnValue({
      runMutationTest: vi.fn().mockResolvedValue(null),
    });

    const adapter = new StrykerCliRunnerAdapter(mockLogger, mockStrykerFactory);
    const result = await adapter.run();

    expect(result.isOk).toBe(true);
    expect(result.value).toEqual({ files: {} });
    expect(result.value?.files).toBeDefined();
  });

  it("fängt Fehler bei der Stryker-Ausführung ab und gibt ein err-Result zurück", async () => {
    mockStrykerFactory = vi.fn().mockReturnValue({
      runMutationTest: vi.fn().mockRejectedValue(new Error("Stryker Fehler bei Ausführung")),
    });

    const adapter = new StrykerCliRunnerAdapter(mockLogger, mockStrykerFactory);
    const result = await adapter.run();

    expect(result.isOk).toBe(false);
    expect(result.error?.message).toBe("Stryker Fehler bei Ausführung");
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Fehler bei der Ausführung von Stryker Mutationstests:",
      expect.any(Error),
    );
  });

  it("verarbeitet Fehler, die keine echten Error-Objekte sind", async () => {
    mockStrykerFactory = vi.fn().mockReturnValue({
      runMutationTest: vi.fn().mockRejectedValue("Unerwarteter String-Fehler"),
    });

    const adapter = new StrykerCliRunnerAdapter(mockLogger, mockStrykerFactory);
    const result = await adapter.run();

    expect(result.isOk).toBe(false);
    expect(result.error?.message).toBe("Unerwarteter String-Fehler");
  });
});
