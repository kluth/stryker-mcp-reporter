// src/core/application/get-survived-mutants.use-case.ts
import type { ReportStream } from "../domain/report-stream.js";
import {
  extractSurvivedMutants,
  type MutantDetail,
} from "../domain/mutation-report.js";
import { type Result, ok, err } from "../domain/result.js";

import type { GitServicePort } from "../domain/git-service.port.js";

export class GetSurvivedMutantsUseCase {
  constructor(
    private readonly reportStream: ReportStream,
    private readonly gitService?: GitServicePort
  ) {}

  public async execute(filePathFilter?: string): Promise<Result<MutantDetail[], Error>> {
    const report = this.reportStream.current();
    if (!report) {
      return err(new Error("Kein Mutation-Testing-Report verfügbar."));
    }

    const survived = extractSurvivedMutants(report, filePathFilter);
    
    if (this.gitService && this.gitService.getBlameForLine) {
      for (const mutant of survived) {
        try {
          const blame = await this.gitService.getBlameForLine(mutant.filePath, mutant.line);
          if (blame) {
            mutant.gitBlame = blame;
          }
        } catch (error) {
          // Ignore blame fetch errors per file to not block the report
        }
      }
    }

    return ok(survived);
  }
}
