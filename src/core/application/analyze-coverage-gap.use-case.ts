import { ReportStream } from "../domain/report-stream.js";
import { type Result, ok, err } from "../domain/result.js";

export interface GapAnalysisResult {
  filePath: string;
  coverageDetails: any; // We can extract coverage if available, or just say testsRan > 0
  survivalRate: number;
  gapScore: number;
}

export class AnalyzeCoverageGapUseCase {
  constructor(private readonly reportStream: ReportStream) {}

  public execute(): Result<GapAnalysisResult[], Error> {
    const report = this.reportStream.current();
    if (!report || !report.files) {
      return err(new Error("No report available"));
    }

    const gaps: GapAnalysisResult[] = [];

    for (const [filePath, fileResult] of Object.entries(report.files)) {
      if (!fileResult.mutants || fileResult.mutants.length === 0) continue;

      let totalMutants = 0;
      let survived = 0;
      let coveredMutants = 0;

      for (const mutant of fileResult.mutants) {
        totalMutants++;
        
        const hasCoverage = mutant.testsRan && mutant.testsRan.length > 0;
        if (hasCoverage || mutant.status === "Killed" || mutant.status === "Survived") {
           coveredMutants++;
        }

        if (mutant.status === "Survived") {
          survived++;
        }
      }

      if (totalMutants === 0) continue;

      const survivalRate = survived / totalMutants;
      const coverageRate = coveredMutants / totalMutants;

      // High coverage but high survival rate = Gap
      const gapScore = coverageRate * survivalRate;

      if (gapScore > 0) {
        gaps.push({
          filePath,
          survivalRate,
          coverageDetails: { coverageRate },
          gapScore,
        });
      }
    }

    // Sort by gapScore descending
    gaps.sort((a, b) => b.gapScore - a.gapScore);

    return ok(gaps);
  }
}
