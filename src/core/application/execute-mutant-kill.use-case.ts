import { MutantDetail } from "../domain/mutation-report.js";
import { MutantContext } from "./get-mutant-context.use-case.js";

export interface MutantKillScaffold {
  mutantId: string;
  filePath: string;
  mutatorName: string;
  originalCode: string;
  mutatedCode: string;
  suggestedTestScaffold: string;
}

export class ExecuteMutantKillUseCase {
  public execute(context: MutantContext): MutantKillScaffold {
    const { filePath, originalCode, mutatedCode, mutant } = context;
    
    // Very simple heuristic to generate a test stub
    const moduleNameMatch = filePath.match(/([a-zA-Z0-9_-]+)\.ts$/);
    const moduleName = moduleNameMatch ? moduleNameMatch[1] : "UnknownModule";

    const suggestedTestScaffold = `
import { describe, it, expect } from "vitest";

// Scaffold to kill mutant ${mutant.id} in ${filePath}
// Original: ${originalCode.trim()}
// Mutated:  ${mutatedCode.trim()}
describe("${moduleName} Mutant Kill", () => {
  it("should kill mutant ${mutant.id} by failing when ${mutant.mutatorName || "Unknown"} is applied", () => {
    // 1. Arrange: Set up the state to trigger the specific branch/logic.
    // 2. Act: Call the function or method.
    // 3. Assert: Verify the outcome is strictly tied to the original code, 
    //    so the mutant (${mutatedCode.trim()}) produces a test failure.
    expect(true).toBe(false); // TODO: implement
  });
});
`.trim();

    return {
      mutantId: mutant.id,
      filePath,
      mutatorName: mutant.mutatorName || "Unknown",
      originalCode,
      mutatedCode,
      suggestedTestScaffold,
    };
  }
}
