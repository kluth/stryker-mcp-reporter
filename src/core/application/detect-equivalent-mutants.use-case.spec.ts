import { describe, it, expect } from "vitest";
import { DetectEquivalentMutantsUseCase } from "./detect-equivalent-mutants.use-case.js";
import { MutantDetail } from "../domain/mutation-report.js";

describe("DetectEquivalentMutantsUseCase", () => {
  it("should flag EqualityOperator mutated to == as likely equivalent", () => {
    const useCase = new DetectEquivalentMutantsUseCase();
    const mutants: MutantDetail[] = [
      { id: "1", status: "Survived", mutatorName: "EqualityOperator", replacement: "==", filePath: "foo.ts" }
    ];
    
    const result = useCase.execute(mutants);
    
    expect(result).toHaveLength(1);
    expect(result[0].isLikelyEquivalent).toBe(true);
    expect(result[0].reason).toContain("Loose equality");
    expect(result[0].suggestedSuppressionComment).toContain("@stryker-disable-next-line EqualityOperator");
  });

  it("should flag UpdateOperator mutated to ++x or --x as likely equivalent", () => {
    const useCase = new DetectEquivalentMutantsUseCase();
    const mutants: MutantDetail[] = [
      { id: "1", status: "Survived", mutatorName: "UpdateOperator", replacement: "++x", filePath: "foo.ts" },
      { id: "2", status: "Survived", mutatorName: "UpdateOperator", replacement: "--x", filePath: "foo.ts" }
    ];
    
    const result = useCase.execute(mutants);
    
    expect(result).toHaveLength(2);
    expect(result[0].isLikelyEquivalent).toBe(true);
    expect(result[0].reason).toContain("Pre-increment/decrement");
    expect(result[0].suggestedSuppressionComment).toContain("@stryker-disable-next-line UpdateOperator");

    expect(result[1].isLikelyEquivalent).toBe(true);
    expect(result[1].reason).toContain("Pre-increment/decrement");
    expect(result[1].suggestedSuppressionComment).toContain("@stryker-disable-next-line UpdateOperator");
  });

  it("should not flag other mutators as equivalent by default", () => {
    const useCase = new DetectEquivalentMutantsUseCase();
    const mutants: MutantDetail[] = [
      { id: "2", status: "Survived", mutatorName: "StringLiteral", replacement: "\"\"", filePath: "bar.ts" }
    ];
    
    const result = useCase.execute(mutants);
    
    expect(result).toHaveLength(1);
    expect(result[0].isLikelyEquivalent).toBe(false);
    expect(result[0].reason).toBeUndefined();
    expect(result[0].suggestedSuppressionComment).toBeUndefined();
  });

  it("should only analyze Survived and NoCoverage mutants", () => {
    const useCase = new DetectEquivalentMutantsUseCase();
    const mutants: MutantDetail[] = [
      { id: "1", status: "Killed", mutatorName: "EqualityOperator", replacement: "==", filePath: "foo.ts" },
      { id: "2", status: "NoCoverage", mutatorName: "EqualityOperator", replacement: "==", filePath: "foo.ts" }
    ];
    
    const result = useCase.execute(mutants);
    
    expect(result).toHaveLength(1);
    expect(result[0].mutantId).toBe("2");
  });

  it("should handle missing mutatorName and replacement gracefully", () => {
    const useCase = new DetectEquivalentMutantsUseCase();
    const mutants: MutantDetail[] = [
      { id: "3", status: "Survived", filePath: "baz.ts" }
    ];
    
    const result = useCase.execute(mutants);
    
    expect(result).toHaveLength(1);
    expect(result[0].mutatorName).toBe("Unknown");
    expect(result[0].isLikelyEquivalent).toBe(false);
  });
});
