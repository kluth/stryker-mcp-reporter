// src/core/application/get-mutation-summary.use-case.spec.ts
import { describe, it, expect, beforeEach } from "vitest";
import { GetMutationSummaryUseCase } from "./get-mutation-summary.use-case.js";
import { ReportStream } from "../domain/report-stream.js";
import type { MutationReport } from "../domain/mutation-report.js";

describe("GetMutationSummaryUseCase", () => {
  let reportStream: ReportStream;
  let useCase: GetMutationSummaryUseCase;

  const sampleReport: MutationReport = {
    files: {
      "src/core/calculator.ts": {
        mutants: [
          { id: "1", status: "Killed" },
          { id: "2", status: "Survived" },
        ],
      },
    },
  };

  beforeEach(() => {
    reportStream = new ReportStream();
    useCase = new GetMutationSummaryUseCase(reportStream);
  });

  it("gibt ein err-Result zurück, wenn kein Report geladen ist", () => {
    const result = useCase.execute();

    expect(result.isOk).toBe(false);
    expect(result.error?.message).toBe("Kein Mutation-Testing-Report verfügbar.");
  });

  it("berechnet die Zusammenfassung für den geladenen Report", () => {
    reportStream.publish(sampleReport);

    const result = useCase.execute();

    expect(result.isOk).toBe(true);
    expect(result.value).toEqual({
      totalMutants: 2,
      killed: 1,
      survived: 1,
      noCoverage: 0,
      timeout: 0,
      compileError: 0,
      ignored: 0,
      runtimeError: 0,
      mutationScore: 50,
    });
  });
});
