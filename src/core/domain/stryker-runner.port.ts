// src/core/domain/stryker-runner.port.ts
import type { Result } from "./result.js";
import type { MutationReport } from "./mutation-report.js";

export interface StrykerRunOptions {
  mutate?: string[];
  concurrency?: number;
  reporters?: string[];
  testRunner?: string;
  configFile?: string;
}

export interface StrykerRunnerPort {
  run(options?: StrykerRunOptions): Promise<Result<MutationReport, Error>>;
}
