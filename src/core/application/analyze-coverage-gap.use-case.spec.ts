import { describe, it, expect, vi } from "vitest";
import { AnalyzeCoverageGapUseCase } from "./analyze-coverage-gap.use-case.js";
import { ReportStream } from "../domain/report-stream.js";
import type { MutationReport } from "../domain/mutation-report.js";

describe("AnalyzeCoverageGapUseCase", () => {
  it("should analyze gap correctly", () => {
    const reportStream = new ReportStream();
    const useCase = new AnalyzeCoverageGapUseCase(reportStream);

    const report: MutationReport = {
      files: {
        "file1.ts": {
          mutants: [
            { id: "1", status: "Survived", testsRan: ["test1"] },
            { id: "2", status: "Killed", testsRan: ["test1"] },
          ],
        },
      },
    };

    reportStream.publish(report);

    const result = useCase.execute();
    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.length).toBe(1);
      expect(result.value[0].filePath).toBe("file1.ts");
      expect(result.value[0].survivalRate).toBe(0.5);
    }
  });

  it("should return error if no report", () => {
    const reportStream = new ReportStream();
    const useCase = new AnalyzeCoverageGapUseCase(reportStream);

    const result = useCase.execute();
    expect(result.isOk).toBe(false);
  });
});
