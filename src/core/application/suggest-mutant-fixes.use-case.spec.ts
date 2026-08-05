// src/core/application/suggest-mutant-fixes.use-case.spec.ts
import { describe, it, expect } from "vitest";
import { SuggestMutantFixesUseCase } from "./suggest-mutant-fixes.use-case.js";
import { MutantResult } from "stryker-mutator/api/core";

describe("SuggestMutantFixesUseCase", () => {
  const useCase = new SuggestMutantFixesUseCase();

  it("should return empty array if all mutants were killed", () => {
    const mutants: MutantResult[] = [
      { id: "1", fileName: "src/foo.ts", status: "Killed", mutatorName: "EqualityOperator", location: { start: { line: 10, column: 1 }, end: { line: 10, column: 10 } } },
    ];
    const results = useCase.execute(mutants);
    expect(results).toEqual([]);
  });

  it("should generate remediation advice for survived mutants", () => {
    const mutants: MutantResult[] = [
      {
        id: "m1",
        fileName: "src/calculator.ts",
        status: "Survived",
        mutatorName: "EqualityOperator",
        replacement: "<=",
        location: { start: { line: 15, column: 5 }, end: { line: 15, column: 10 } },
      },
    ];
    const results = useCase.execute(mutants);
    expect(results).toHaveLength(1);
    expect(results[0].mutantId).toBe("m1");
    expect(results[0].fileName).toBe("src/calculator.ts");
    expect(results[0].explanation).toContain("Equality/Boundary condition survived");
    expect(results[0].boundaryTestSnippet).toContain("should test exact boundary value");
  });

  it("should generate remediation advice for NoCoverage mutants", () => {
    const mutants: MutantResult[] = [
      {
        id: "m2",
        fileName: "src/logger.ts",
        status: "NoCoverage",
        mutatorName: "StringLiteral",
        replacement: '""',
        location: { start: { line: 22, column: 8 }, end: { line: 22, column: 20 } },
      },
    ];
    const results = useCase.execute(mutants);
    expect(results).toHaveLength(1);
    expect(results[0].mutantId).toBe("m2");
    expect(results[0].explanation).toContain("String/Literal mutation survived");
    expect(results[0].suggestedAssertion).toContain("toContain");
  });
});
