import type { ReportStream } from "../domain/report-stream.js";
import { type MutantDetail, extractKilledMutants } from "../domain/mutation-report.js";
import { type Result, ok, err } from "../domain/result.js";

export class GetKilledMutantsUseCase {
  constructor(private readonly reportStream: ReportStream) {}

  public execute(filePathFilter?: string): Result<MutantDetail[], Error> {
    const report = this.reportStream.current();

    if (!report) {
      return err(new Error("Kein Mutationsbericht gefunden. Wurde Stryker bereits ausgeführt?"));
    }

    const killed = extractKilledMutants(report, filePathFilter);
    return ok(killed);
  }
}
