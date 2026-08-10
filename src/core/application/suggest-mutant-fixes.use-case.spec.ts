import { describe, expect, it } from "vitest";
import { SuggestMutantFixesUseCase } from "./suggest-mutant-fixes.use-case.js";
import { MutantDetail } from "../domain/mutation-report.js";
import { RegexLlmAdapter } from "../../infrastructure/llm/regex.adapter.js";

describe("SuggestMutantFixesUseCase", () => {
  const useCase = new SuggestMutantFixesUseCase(
    new RegexLlmAdapter(),
    { generateFix: async () => { throw new Error(); } },
    { generateFix: async () => { throw new Error(); } }
  );

  it("should return empty array if all mutants were killed", async () => {
    const mutants: MutantDetail[] = [
      { id: "m1", status: "Killed", mutatorName: "Arithmetic" } as any,
    ];
    const results = await useCase.execute(mutants);
    expect(results).toEqual([]);
  });

  it("should generate remediation advice for survived mutants", async () => {
    const mutants: MutantDetail[] = [
      {
        id: "m1",
        status: "Survived",
        mutatorName: "Equality",
        filePath: "src/calculator.ts",
        line: 10,
        column: 5,
        replacement: "<",
      } as any,
    ];
    const results = await useCase.execute(mutants);
    expect(results).toHaveLength(1);
    expect(results[0].mutantId).toBe("m1");
    expect(results[0].fileName).toBe("src/calculator.ts");
    expect(results[0].mutatorName).toBe("Equality");
    expect(results[0].explanation).toContain("Equality/Boundary condition survived");
    expect(results[0].suggestedAssertion).toContain("toBe");
  });

  it("should generate remediation advice for NoCoverage mutants", async () => {
    const mutants: MutantDetail[] = [
      {
        id: "m2",
        status: "NoCoverage",
        mutatorName: "StringLiteral",
        filePath: "src/logger.ts",
        line: 25,
        column: 12,
        replacement: '""',
      } as any,
    ];
    const results = await useCase.execute(mutants);
    expect(results).toHaveLength(1);
    expect(results[0].mutantId).toBe("m2");
    expect(results[0].explanation).toContain("String/Literal mutation survived");
  });
});
