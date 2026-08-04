// src/core/application/run-mutation-tests.use-case.ts
import type { ReportStream } from "../domain/report-stream.js";
import type { ExecutionStatusStream } from "../domain/execution-status.js";
import type { StrykerRunnerPort, StrykerRunOptions } from "../domain/stryker-runner.port.js";
import type { MutationReport } from "../domain/mutation-report.js";
import { type Result, err, ok } from "../domain/result.js";

export class RunMutationTestsUseCase {
  constructor(
    private readonly reportStream: ReportStream,
    private readonly statusStream: ExecutionStatusStream,
    private readonly strykerRunner: StrykerRunnerPort,
  ) {}

  public async execute(
    options?: StrykerRunOptions,
  ): Promise<Result<MutationReport, Error>> {
    const currentStatus = this.statusStream.current();
    if (currentStatus.state === "running") {
      return err(new Error("Ein Mutationstest-Lauf ist bereits aktiv."));
    }

    this.statusStream.setRunning("Starte Mutationstests...", 0);

    try {
      const runResult = await this.strykerRunner.run(options);

      if (!runResult.isOk) {
        this.statusStream.setFailed(runResult.error.message);
        return err(runResult.error);
      }

      const report = runResult.value;
      this.reportStream.publish(report);
      this.statusStream.setCompleted("Mutationstests erfolgreich beendet.");

      return ok(report);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.statusStream.setFailed(errorMessage);
      return err(new Error(errorMessage));
    }
  }
}
