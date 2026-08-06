import { describe, it, expect } from "vitest";
import { GetKilledMutantsUseCase } from "./get-killed-mutants.use-case.js";
import { ReportStream } from "../domain/report-stream.js";
import type { MutationReport } from "../domain/mutation-report.js";

describe("GetKilledMutantsUseCase", () => {
  it("sollte getötete Mutanten zurückgeben, wenn ein Bericht vorliegt", () => {
    const stream = new ReportStream();
    const mockReport: MutationReport = {
      files: {
        "src/test.ts": {
          mutants: [
            {
              id: "1",
              status: "Killed",
              mutatorName: "ArithmeticOperator",
              location: {
                start: { line: 1, column: 1 },
                end: { line: 1, column: 5 },
              },
            },
            {
              id: "2",
              status: "Survived",
              mutatorName: "StringLiteral",
              location: {
                start: { line: 2, column: 1 },
                end: { line: 2, column: 5 },
              },
            },
          ],
        },
      },
    };
    stream.publish(mockReport);

    const useCase = new GetKilledMutantsUseCase(stream);
    const result = useCase.execute();

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.length).toBe(1);
      expect(result.value[0].id).toBe("1");
      expect(result.value[0].status).toBe("Killed");
    }
  });

  it("sollte einen Fehler zurückgeben, wenn kein Bericht existiert", () => {
    const stream = new ReportStream();
    const useCase = new GetKilledMutantsUseCase(stream);
    const result = useCase.execute();

    expect(result.isOk).toBe(false);
    if (!result.isOk) {
      expect(result.error.message).toContain("Kein Mutationsbericht");
    }
  });
});
