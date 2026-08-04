// src/core/application/get-survived-mutants.use-case.ts
import type { ReportStream } from "../domain/report-stream.js";
import { extractSurvivedMutants, type MutantDetail } from "../domain/mutation-report.js";
import { type Result, ok, err } from "../domain/result.js";

export class GetSurvivedMutantsUseCase {
  constructor(private readonly reportStream: ReportStream) {}

  public execute(filePathFilter?: string): Result<MutantDetail[], Error> {
    const report = this.reportStream.current();
    if (!report) {
      return err(new Error("Kein Mutation-Testing-Report verfügbar."));
    }

    const survived = extractSurvivedMutants(report, filePathFilter);
    return ok(survived);
  }
}
