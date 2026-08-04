// src/core/application/get-mutation-summary.use-case.ts
import type { ReportStream } from "../domain/report-stream.js";
import { calculateMutationSummary, type MutationSummary } from "../domain/mutation-report.js";
import { type Result, ok, err } from "../domain/result.js";

export class GetMutationSummaryUseCase {
  constructor(private readonly reportStream: ReportStream) {}

  public execute(): Result<MutationSummary, Error> {
    const report = this.reportStream.current();
    if (!report) {
      return err(new Error("Kein Mutation-Testing-Report verfügbar."));
    }

    const summary = calculateMutationSummary(report);
    return ok(summary);
  }
}
