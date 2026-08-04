// src/infrastructure/stryker/stryker-cli-runner.adapter.ts
import type { Logger } from "@stryker-mutator/api/logging";
import type { PartialStrykerOptions } from "@stryker-mutator/api/core";
import type { StrykerRunnerPort, StrykerRunOptions } from "../../core/domain/stryker-runner.port.js";
import type { MutationReport } from "../../core/domain/mutation-report.js";
import { type Result, ok, err } from "../../core/domain/result.js";

// Type-Declaration für @stryker-mutator/core falls keine separaten Types exportiert sind
interface StrykerInstance {
  runMutationTest(): Promise<unknown>;
}

export type StrykerFactory = (config?: PartialStrykerOptions) => StrykerInstance;

export class StrykerCliRunnerAdapter implements StrykerRunnerPort {
  constructor(
    private readonly logger: Logger,
    private readonly strykerFactory?: StrykerFactory,
  ) {}

  public async run(options?: StrykerRunOptions): Promise<Result<MutationReport, Error>> {
    this.logger.info("Starte programmatischen Stryker Mutationstest-Lauf...");

    const strykerConfig: PartialStrykerOptions = {};

    if (options?.mutate && options.mutate.length > 0) {
      strykerConfig.mutate = options.mutate;
    }
    if (options?.concurrency && options.concurrency > 0) {
      strykerConfig.concurrency = options.concurrency;
    }
    if (options?.reporters && options.reporters.length > 0) {
      strykerConfig.reporters = options.reporters;
    }
    if (options?.testRunner) {
      strykerConfig.testRunner = options.testRunner;
    }
    if (options?.configFile) {
      strykerConfig.configFile = options.configFile;
    }

    try {
      let strykerInstance: StrykerInstance;

      if (this.strykerFactory) {
        strykerInstance = this.strykerFactory(strykerConfig);
      } else {
        const { Stryker } = await import("@stryker-mutator/core");
        strykerInstance = new (Stryker as any)(strykerConfig);
      }

      const rawResult = await strykerInstance.runMutationTest();

      this.logger.info("Programmatischer Stryker Mutationstest-Lauf erfolgreich abgeschlossen.");

      const report: MutationReport = (rawResult as MutationReport) || { files: {} };
      return ok(report);
    } catch (error) {
      this.logger.error("Fehler bei der Ausführung von Stryker Mutationstests:", error as Error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return err(new Error(errorMessage));
    }
  }
}
