// src/core/application/suggest-mutant-fixes.use-case.ts
import { MutantDetail } from "../domain/mutation-report.js";

export interface MutantRemediationAdvice {
  mutantId: string;
  fileName: string;
  mutatorName: string;
  originalCode: string;
  mutatedCode: string;
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  explanation: string;
  suggestedAssertion: string;
  boundaryTestSnippet: string;
}

export class SuggestMutantFixesUseCase {
  public execute(mutants: MutantDetail[]): MutantRemediationAdvice[] {
    const survivedOrNoCoverage = mutants.filter(
      (m) => m.status === "Survived" || m.status === "NoCoverage",
    );

    return survivedOrNoCoverage.map((m) => this.generateRemediation(m));
  }

  private generateRemediation(mutant: MutantDetail): MutantRemediationAdvice {
    const mutator = mutant.mutatorName || "UnknownMutator";
    const original = mutant.replacement ? "original code" : "";
    const replacement = mutant.replacement || "";
    const startLine = mutant.line || 1;
    const startColumn = mutant.column || 1;

    let explanation = `Mutant survived at line ${startLine} using mutator '${mutator}'.`;
    let suggestedAssertion = `expect(result).toBeDefined();`;
    let boundaryTestSnippet = `it('should handle boundary condition for ${mutator} at line ${startLine}', () => {\n  // Add boundary test assertion\n});`;

    if (mutator.includes("Equality") || mutator.includes("Conditional")) {
      explanation = `Equality/Boundary condition survived at line ${startLine}. Code changed from '${original}' to '${replacement}'.`;
      suggestedAssertion = `expect(result).toBe(exactExpectedBoundaryValue);`;
      boundaryTestSnippet = `it('should test exact boundary value at line ${startLine}', () => {\n  const result = testSubject(boundaryInput);\n  expect(result).toEqual(expectedBoundaryValue);\n});`;
    } else if (mutator.includes("String") || mutator.includes("Literal")) {
      explanation = `String/Literal mutation survived at line ${startLine}. Code mutated to '${replacement}'.`;
      suggestedAssertion = `expect(outputString).toContain(expectedSubstring);`;
      boundaryTestSnippet = `it('should assert literal output formatting at line ${startLine}', () => {\n  expect(output).toBe(expectedLiteral);\n});`;
    } else if (mutator.includes("Boolean") || mutator.includes("Logical")) {
      explanation = `Logical operator condition survived at line ${startLine}. Branch condition was not exercised in both true/false states.`;
      suggestedAssertion = `expect(conditionResult).toBe(false); // test false branch explicitly`;
      boundaryTestSnippet = `it('should test false branch condition at line ${startLine}', () => {\n  expect(testSubject(falseInput)).toBe(false);\n});`;
    }

    return {
      mutantId: mutant.id,
      fileName: mutant.filePath,
      mutatorName: mutator,
      originalCode: original,
      mutatedCode: replacement,
      location: {
        start: { line: startLine, column: startColumn },
        end: { line: startLine, column: startColumn },
      },
      explanation,
      suggestedAssertion,
      boundaryTestSnippet,
    };
  }
}
