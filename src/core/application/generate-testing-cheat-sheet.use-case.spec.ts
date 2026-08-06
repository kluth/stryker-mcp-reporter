import { describe, it, expect } from "vitest";
import { GenerateTestingCheatSheetUseCase } from "./generate-testing-cheat-sheet.use-case.js";
import { MutantDetail } from "../domain/mutation-report.js";

describe("GenerateTestingCheatSheetUseCase", () => {
  it("should return a positive message when there are no survived mutants", () => {
    const useCase = new GenerateTestingCheatSheetUseCase();
    const result = useCase.execute([]);
    expect(result).toContain("Great job!");
  });

  it("should ignore killed mutants", () => {
    const useCase = new GenerateTestingCheatSheetUseCase();
    const mutants: MutantDetail[] = [
      { id: "1", mutatorName: "Equality", status: "Killed", filePath: "file.ts", replacement: "foo" }
    ];
    const result = useCase.execute(mutants);
    expect(result).toContain("Great job!");
  });

  it("should generate cheat sheet for Equality mutator", () => {
    const useCase = new GenerateTestingCheatSheetUseCase();
    const mutants: MutantDetail[] = [
      { id: "1", mutatorName: "EqualityOperator", status: "Survived", filePath: "file1.ts", replacement: "<=", line: 10 }
    ];
    const result = useCase.execute(mutants);
    expect(result).toContain("## EqualityOperator (Survived 1 times)");
    expect(result).toContain("Not testing exact boundary values.");
    expect(result).toContain("file1.ts");
    expect(result).toContain("line 10");
  });

  it("should generate cheat sheet for String mutator", () => {
    const useCase = new GenerateTestingCheatSheetUseCase();
    const mutants: MutantDetail[] = [
      { id: "1", mutatorName: "StringLiteral", status: "NoCoverage", filePath: "file2.ts", replacement: "\"\"" }
    ];
    const result = useCase.execute(mutants);
    expect(result).toContain("## StringLiteral (Survived 1 times)");
    expect(result).toContain("Missing assertions on specific output strings");
  });

  it("should generate cheat sheet for Boolean mutator", () => {
    const useCase = new GenerateTestingCheatSheetUseCase();
    const mutants: MutantDetail[] = [
      { id: "1", mutatorName: "BooleanSubstitution", status: "Survived", filePath: "file3.ts", replacement: "false" }
    ];
    const result = useCase.execute(mutants);
    expect(result).toContain("## BooleanSubstitution (Survived 1 times)");
    expect(result).toContain("Only testing the \"happy path\"");
  });

  it("should handle unknown mutator type", () => {
    const useCase = new GenerateTestingCheatSheetUseCase();
    const mutants: MutantDetail[] = [
      { id: "1", mutatorName: "WeirdMutator", status: "Survived", filePath: "file4.ts", replacement: "foo" }
    ];
    const result = useCase.execute(mutants);
    expect(result).toContain("## WeirdMutator (Survived 1 times)");
    expect(result).toContain("Uncovered code mutations for WeirdMutator");
  });

  it("should handle undefined mutator name", () => {
    const useCase = new GenerateTestingCheatSheetUseCase();
    const mutants: MutantDetail[] = [
      { id: "1", mutatorName: undefined, status: "Survived", filePath: "file5.ts", replacement: "bar" }
    ];
    const result = useCase.execute(mutants);
    expect(result).toContain("## UnknownMutator (Survived 1 times)");
  });

  it("should sort mutators by frequency", () => {
    const useCase = new GenerateTestingCheatSheetUseCase();
    const mutants: MutantDetail[] = [
      { id: "1", mutatorName: "A", status: "Survived", filePath: "f.ts" },
      { id: "2", mutatorName: "B", status: "Survived", filePath: "f.ts" },
      { id: "3", mutatorName: "B", status: "Survived", filePath: "f.ts" }
    ];
    const result = useCase.execute(mutants);
    const indexA = result.indexOf("## A");
    const indexB = result.indexOf("## B");
    expect(indexB).toBeLessThan(indexA);
  });
});
