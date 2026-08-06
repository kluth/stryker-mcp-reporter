// src/core/application/suggest-mutant-fixes.use-case.spec.ts
import { describe, it, expect } from "vitest";
import { SuggestMutantFixesUseCase } from "./suggest-mutant-fixes.use-case.js";
import { MutantDetail } from "../domain/mutation-report.js";

describe("SuggestMutantFixesUseCase", () => {
  const useCase = new SuggestMutantFixesUseCase();

  it("should return empty array if all mutants were killed", () => {
    const mutants: MutantDetail[] = [
      {
        id: "1",
        filePath: "src/foo.ts",
        status: "Killed",
        mutatorName: "EqualityOperator",
        replacement: "==",
        line: 10,
        column: 1,
        testsRan: [],
      },
    ];
    const results = useCase.execute(mutants);
    expect(results).toEqual([]);
  });

  it("should generate remediation advice for survived mutants", () => {
    const mutants: MutantDetail[] = [
      {
        id: "m1",
        filePath: "src/calculator.ts",
        status: "Survived",
        mutatorName: "EqualityOperator",
        replacement: "<=",
        line: 15,
        column: 5,
        testsRan: ["test1"],
      },
    ];
    const results = useCase.execute(mutants);
    expect(results).toHaveLength(1);
    expect(results[0].mutantId).toBe("m1");
    expect(results[0].fileName).toBe("src/calculator.ts");
    expect(results[0].explanation).toContain(
      "Equality/Boundary condition survived",
    );
    expect(results[0].boundaryTestSnippet).toContain(
      "should test exact boundary value",
    );
  });

  it("should generate remediation advice for NoCoverage mutants", () => {
    const mutants: MutantDetail[] = [
      {
        id: "m2",
        filePath: "src/logger.ts",
        status: "NoCoverage",
        mutatorName: "StringLiteral",
        replacement: '""',
        line: 22,
        column: 8,
        testsRan: [],
      },
    ];
    const results = useCase.execute(mutants);
    expect(results).toHaveLength(1);
    expect(results[0].mutantId).toBe("m2");
    expect(results[0].explanation).toContain(
      "String/Literal mutation survived",
    );
    expect(results[0].suggestedAssertion).toContain("toContain");
  });
});
