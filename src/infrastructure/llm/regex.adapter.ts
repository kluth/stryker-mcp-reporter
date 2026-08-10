// src/infrastructure/llm/regex.adapter.ts
import type { LlmPort } from "../../core/domain/llm.port.js";

export class RegexLlmAdapter implements LlmPort {
  async generateFix(prompt: string, modelConfig?: any): Promise<{
    explanation: string;
    suggestedAssertion: string;
    boundaryTestSnippet: string;
  }> {
    // Basic regex-based heuristics based on the prompt content
    const mutatorMatch = prompt.match(/Mutator:\s*(.*?)\./);
    const originalMatch = prompt.match(/Original Code:\s*(.*?)\./);
    const replacementMatch = prompt.match(/Code mutated to:\s*(.*?)\./);

    const mutator = mutatorMatch ? mutatorMatch[1] : "Unknown";
    const original = originalMatch ? originalMatch[1] : "";
    const replacement = replacementMatch ? replacementMatch[1] : "";

    let explanation = `Mutant survived. Code changed from '${original}' to '${replacement}'.`;
    let suggestedAssertion = `expect(result).toBeDefined();`;
    let boundaryTestSnippet = `it('should handle boundary condition for ${mutator}', () => {\n  // Add boundary test assertion\n});`;

    if (mutator.includes("Equality") || mutator.includes("Conditional")) {
      explanation = `Equality/Boundary condition survived. Code changed from '${original}' to '${replacement}'.`;
      suggestedAssertion = `expect(result).toBe(exactExpectedBoundaryValue);`;
      boundaryTestSnippet = `it('should test exact boundary value', () => {\n  const result = testSubject(boundaryInput);\n  expect(result).toEqual(expectedBoundaryValue);\n});`;
    } else if (mutator.includes("String") || mutator.includes("Literal")) {
      explanation = `String/Literal mutation survived. Code mutated to '${replacement}'.`;
      suggestedAssertion = `expect(outputString).toContain(expectedSubstring);`;
      boundaryTestSnippet = `it('should assert literal output formatting', () => {\n  expect(output).toBe(expectedLiteral);\n});`;
    } else if (mutator.includes("Boolean") || mutator.includes("Logical")) {
      explanation = `Logical operator condition survived. Branch condition was not exercised in both true/false states.`;
      suggestedAssertion = `expect(conditionResult).toBe(false); // test false branch explicitly`;
      boundaryTestSnippet = `it('should test false branch condition', () => {\n  expect(testSubject(falseInput)).toBe(false);\n});`;
    }

    return { explanation, suggestedAssertion, boundaryTestSnippet };
  }
}
