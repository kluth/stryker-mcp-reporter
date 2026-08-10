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
  public async execute(
    mutants: MutantDetail[],
    profile?: "local" | "cloud" | "regex"
  ): Promise<MutantRemediationAdvice[]> {
    const survivedOrNoCoverage = mutants.filter(
      (m) => m.status === "Survived" || m.status === "NoCoverage",
    );

    const results: MutantRemediationAdvice[] = [];
    for (const m of survivedOrNoCoverage) {
      results.push(await this.generateRemediation(m, profile));
    }
    return results;
  }

  private async generateRemediation(
    mutant: MutantDetail,
    profile?: "local" | "cloud" | "regex"
  ): Promise<MutantRemediationAdvice> {
    const mutator = mutant.mutatorName || "UnknownMutator";
    const original = mutant.replacement ? "original code" : "";
    const replacement = mutant.replacement || "";
    const startLine = mutant.line || 1;
    const startColumn = mutant.column || 1;

    let explanation = `Mutant survived at line ${startLine} using mutator '${mutator}'.`;
    let suggestedAssertion = `expect(result).toBeDefined();`;
    let boundaryTestSnippet = `it('should handle boundary condition for ${mutator} at line ${startLine}', () => {\n  // Add boundary test assertion\n});`;

    // Try Local LLM (Ollama) if profile is local or undefined (fallback chain)
    if (profile === "local" || profile === undefined) {
      try {
        const ollamaRes = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "qwen2.5-coder", // Defaulting to a good local coder model
            prompt: `You are an expert TS developer. Fix this surviving mutant. Mutator: ${mutator}. Code mutated to: ${replacement}. Suggest an assertion. Reply in short exact JSON format { "explanation": "...", "suggestedAssertion": "...", "boundaryTestSnippet": "..." } only.`,
            stream: false,
            format: "json"
          }),
        });
        if (ollamaRes.ok) {
          const data = await ollamaRes.json();
          const parsed = JSON.parse(data.response);
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
            explanation: parsed.explanation || explanation,
            suggestedAssertion: parsed.suggestedAssertion || suggestedAssertion,
            boundaryTestSnippet: parsed.boundaryTestSnippet || boundaryTestSnippet,
          };
        }
      } catch (e) {
        // Fallthrough if Ollama is not running or fails
      }
    }

    // Cloud LLM fallback if profile is cloud or local failed
    if (profile === "cloud" || profile === undefined) {
      if (process.env.OPENAI_API_KEY) {
        try {
          const cloudRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: `You are an expert TS developer. Fix this surviving mutant. Mutator: ${mutator}. Code mutated to: ${replacement}. Suggest an assertion. Reply in short exact JSON format { "explanation": "...", "suggestedAssertion": "...", "boundaryTestSnippet": "..." } only.` }],
              response_format: { type: "json_object" }
            }),
          });
          if (cloudRes.ok) {
            const data = await cloudRes.json();
            const parsed = JSON.parse(data.choices[0].message.content);
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
              explanation: parsed.explanation || explanation,
              suggestedAssertion: parsed.suggestedAssertion || suggestedAssertion,
              boundaryTestSnippet: parsed.boundaryTestSnippet || boundaryTestSnippet,
            };
          }
        } catch (e) {
          // Fallthrough
        }
      }
    }

    // Regex Fallback
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
