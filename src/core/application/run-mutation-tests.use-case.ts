// src/core/application/run-mutation-tests.use-case.ts
import type { ReportStream } from "../domain/report-stream.js";
import type { ExecutionStatusStream } from "../domain/execution-status.js";
import type { StrykerRunnerPort, StrykerRunOptions } from "../domain/stryker-runner.port.js";
import type { NotificationServicePort } from "../domain/notification-service.port.js";
import { NullNotificationAdapter } from "../../infrastructure/notification/null-notification.adapter.js";
import { calculateMutationSummary, type MutationReport } from "../domain/mutation-report.js";
import { type Result, err, ok } from "../domain/result.js";

export class RunMutationTestsUseCase {
  constructor(
    private readonly reportStream: ReportStream,
    private readonly statusStream: ExecutionStatusStream,
    private readonly strykerRunner: StrykerRunnerPort,
    private readonly notificationService: NotificationServicePort = new NullNotificationAdapter(),
  ) {}

  public async execute(
    options?: StrykerRunOptions,
  ): Promise<Result<MutationReport, Error>> {
    const currentStatus = this.statusStream.current();
    if (currentStatus.state === "running") {
      return err(new Error("Ein Mutationstest-Lauf ist bereits aktiv."));
    }

    const startMsg = "Starte Mutationstests...";
    this.statusStream.setRunning(startMsg, 0);
    await this.notificationService.notifyStatus(startMsg);

    try {
      const runResult = await this.strykerRunner.run(options);

      if (!runResult.isOk) {
        this.statusStream.setFailed(runResult.error.message);
        await this.notificationService.notifyError(runResult.error.message);
        return err(runResult.error);
      }

      const report = runResult.value;
      this.reportStream.publish(report);
      this.statusStream.setCompleted("Mutationstests erfolgreich beendet.");

      const summary = calculateMutationSummary(report);
      await this.notificationService.notifyCompletion(
        summary.mutationScore,
        summary.killed,
        summary.survived,
      );

      return ok(report);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.statusStream.setFailed(errorMessage);
      await this.notificationService.notifyError(errorMessage);
      return err(new Error(errorMessage));
    }
  }
}
