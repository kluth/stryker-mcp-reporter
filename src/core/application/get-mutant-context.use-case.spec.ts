import { describe, it, expect } from "vitest";
import { GetMutantContextUseCase } from "./get-mutant-context.use-case.js";
import { ReportStream } from "../domain/report-stream.js";
import type { MutationReport } from "../domain/mutation-report.js";

describe("GetMutantContextUseCase", () => {
  it("sollte den Code-Kontext für einen Mutanten zurückgeben", () => {
    const stream = new ReportStream();
    const sourceCode = "function add(a, b) {\n  return a + b;\n}\n";
    const mockReport: MutationReport = {
      files: {
        "src/test.ts": {
          source: sourceCode,
          mutants: [
            {
              id: "42",
              status: "Survived",
              mutatorName: "ArithmeticOperator",
              replacement: "return a - b;",
              location: {
                start: { line: 2, column: 10 },
                end: { line: 2, column: 15 },
              },
            },
          ],
        },
      },
    };
    stream.publish(mockReport);

    const useCase = new GetMutantContextUseCase(stream);
    const result = useCase.execute("42");

    expect(result.isOk).toBe(true);
    if (result.isOk) {
      expect(result.value.id).toBe("42");
      expect(result.value.originalCodeSnippet).toContain("return a + b;");
      expect(result.value.mutatedCodeSnippet).toContain("return a - b;");
      expect(result.value.mutatedCodeSnippet).toContain(
        "MUTATED CODE (ArithmeticOperator)",
      );
    }
  });

  it("sollte einen Fehler zurückgeben, wenn Mutant nicht gefunden", () => {
    const stream = new ReportStream();
    const mockReport: MutationReport = {
      files: {
        "src/test.ts": {
          mutants: [],
        },
      },
    };
    stream.publish(mockReport);

    const useCase = new GetMutantContextUseCase(stream);
    const result = useCase.execute("999");

    expect(result.isOk).toBe(false);
    if (!result.isOk) {
      expect(result.error.message).toContain("nicht gefunden");
    }
  });
});
