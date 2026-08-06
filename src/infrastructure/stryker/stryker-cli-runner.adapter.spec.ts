// src/infrastructure/stryker/stryker-cli-runner.adapter.spec.ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { StrykerCliRunnerAdapter } from "./stryker-cli-runner.adapter.js";
import type { Logger } from "@stryker-mutator/api/logging";
import type { MutationReport } from "../../core/domain/mutation-report.js";
import type { PartialStrykerOptions } from "@stryker-mutator/api/core";

vi.mock("@stryker-mutator/core", () => {
  return {
    Stryker: vi.fn().mockImplementation(() => ({
      runMutationTest: vi.fn().mockResolvedValue([]),
    })),
  };
});

vi.mock("fs", () => {
  return {
    readFileSync: vi
      .fn()
      .mockImplementation(() =>
        JSON.stringify({ files: { "src/app.ts": { mutants: [] } } }),
      ),
    promises: {
      readFile: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify({ files: { "src/app.ts": { mutants: [] } } }),
        ),
    },
  };
});

describe("StrykerCliRunnerAdapter", () => {
  let mockLogger: Logger;
  let mockStrykerFactory: (config?: PartialStrykerOptions) => {
    runMutationTest: () => Promise<any>;
  };

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

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("führt Stryker programmatisch aus und gibt das ok-Result mit dem Report zurück", async () => {
    mockStrykerFactory = vi.fn().mockReturnValue({
      runMutationTest: vi.fn().mockResolvedValue([]),
    });

    const adapter = new StrykerCliRunnerAdapter(mockLogger, mockStrykerFactory);
    const result = await adapter.run({ mutate: ["src/app.ts"] });

    expect(result.isOk).toBe(true);
    expect(result.value.files).toHaveProperty("src/app.ts");
    expect(mockStrykerFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        mutate: ["src/app.ts"],
        reporters: ["json"],
      }),
    );
  });

  it("reicht alle Optionen (concurrency, reporters, testRunner, configFile) an Stryker weiter", async () => {
    mockStrykerFactory = vi.fn().mockReturnValue({
      runMutationTest: vi.fn().mockResolvedValue([]),
    });

    const adapter = new StrykerCliRunnerAdapter(mockLogger, mockStrykerFactory);
    await adapter.run({
      mutate: ["src/app.ts"],
      concurrency: 4,
      reporters: ["clear-text"],
      testRunner: "vitest",
      configFile: "stryker.config.mjs",
    });

    expect(mockStrykerFactory).toHaveBeenCalledWith({
      mutate: ["src/app.ts"],
      concurrency: 4,
      testRunner: "vitest",
      configFile: "stryker.config.mjs",
      logLevel: "off",
      reporters: ["json"],
    });
  });

  it("ignoriert concurrency=0 oder leere Optionseigenschaften", async () => {
    mockStrykerFactory = vi.fn().mockReturnValue({
      runMutationTest: vi.fn().mockResolvedValue([]),
    });

    const adapter = new StrykerCliRunnerAdapter(mockLogger, mockStrykerFactory);
    await adapter.run({
      concurrency: 0,
      mutate: [],
    });

    expect(mockStrykerFactory).toHaveBeenCalledWith({
      logLevel: "off",
      reporters: ["json"],
    });
  });

  it("nutzt den dynamischen Import von @stryker-mutator/core wenn keine Factory übergeben wird", async () => {
    const adapter = new StrykerCliRunnerAdapter(mockLogger);
    const result = await adapter.run();

    expect(result.isOk).toBe(true);
    expect(result.value.files).toHaveProperty("src/app.ts");
  });

  it("handhabt null rawResult und erzeugt ein valides MutationReport-Objekt mit files", async () => {
    mockStrykerFactory = vi.fn().mockReturnValue({
      runMutationTest: vi.fn().mockResolvedValue(null),
    });

    const adapter = new StrykerCliRunnerAdapter(mockLogger, mockStrykerFactory);
    const result = await adapter.run();

    expect(result.isOk).toBe(true);
    expect(result.value.files).toHaveProperty("src/app.ts");
    expect(result.value?.files).toBeDefined();
  });

  it("fängt Fehler bei der Stryker-Ausführung ab und gibt ein err-Result zurück", async () => {
    mockStrykerFactory = vi.fn().mockReturnValue({
      runMutationTest: vi
        .fn()
        .mockRejectedValue(new Error("Stryker Fehler bei Ausführung")),
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
