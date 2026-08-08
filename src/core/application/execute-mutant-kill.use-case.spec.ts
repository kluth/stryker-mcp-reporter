import { describe, it, expect } from "vitest";
import { ExecuteMutantKillUseCase } from "./execute-mutant-kill.use-case.js";
import { MutantContext } from "./get-mutant-context.use-case.js";

describe("ExecuteMutantKillUseCase", () => {
  it("should generate a scaffold for a valid mutant", () => {
    const useCase = new ExecuteMutantKillUseCase();
    const context: MutantContext = {
      mutantId: "1",
      filePath: "src/app.ts",
      originalCode: "const y = 2;",
      mutatedCode: "-",
      mutant: {
        id: "1",
        status: "Survived",
        mutatorName: "ArithmeticOperator",
        replacement: "-"
      }
    };
    
    const result = useCase.execute(context);
    expect(result).not.toBeNull();
    expect(result.mutantId).toBe("1");
    expect(result.filePath).toBe("src/app.ts");
    expect(result.mutatorName).toBe("ArithmeticOperator");
    expect(result.originalCode).toBe("const y = 2;");
    expect(result.mutatedCode).toBe("-");
    expect(result.suggestedTestScaffold).toContain("describe(\"app Mutant Kill\"");
    expect(result.suggestedTestScaffold).toContain("should kill mutant 1");
  });
  
  it("should handle missing mutatorName", () => {
    const useCase = new ExecuteMutantKillUseCase();
    const context: MutantContext = {
      mutantId: "1",
      filePath: "src/unknown.ts",
      originalCode: "/* line unknown */",
      mutatedCode: "/* unknown */",
      mutant: {
        id: "1",
        status: "Survived"
      }
    };
    
    const result = useCase.execute(context);
    expect(result).not.toBeNull();
    expect(result.mutatorName).toBe("Unknown");
  });
  
  it("should handle files without extensions nicely", () => {
    const useCase = new ExecuteMutantKillUseCase();
    const context: MutantContext = {
      mutantId: "1",
      filePath: "Dockerfile",
      originalCode: "FROM node:18",
      mutatedCode: "FROM node:19",
      mutant: {
        id: "1",
        status: "Survived"
      }
    };
    
    const result = useCase.execute(context);
    expect(result.suggestedTestScaffold).toContain("describe(\"UnknownModule Mutant Kill\"");
  });
});
