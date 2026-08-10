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

import { GetMutantContextUseCase } from "./get-mutant-context.use-case.js";
import type { LlmPort } from "../domain/llm.port.js";

export class SuggestMutantFixesUseCase {
  constructor(
    private readonly regexAdapter: LlmPort,
    private readonly localAdapter: LlmPort,
    private readonly cloudAdapter: LlmPort,
    private readonly getMutantContextUseCase?: GetMutantContextUseCase,
  ) {}

  public async execute(
    mutants: MutantDetail[],
    profile: "local" | "cloud" | "regex" = "regex"
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
    const contextResult = this.getMutantContextUseCase ? await this.getMutantContextUseCase.execute(mutant.id) : null;
    const original = contextResult?.isOk ? contextResult.value.originalCode : "Code unavailable";
    const replacement = mutant.replacement || "";
    const startLine = mutant.line || 1;
    const startColumn = mutant.column || 1;

    let explanation = `Mutant survived at line ${startLine} using mutator '${mutator}'.`;
    let suggestedAssertion = `expect(result).toBeDefined();`;
    let boundaryTestSnippet = `it('should handle boundary condition for ${mutator} at line ${startLine}', () => {\n  // Add boundary test assertion\n});`;

    let fixResult;
    const prompt = `You are an expert TS developer. Fix this surviving mutant. Mutator: ${mutator}. Original Code: ${original}. Code mutated to: ${replacement}. Suggest an assertion. Reply in short exact JSON format { "explanation": "...", "suggestedAssertion": "...", "boundaryTestSnippet": "..." } only.`;

    // Try Local LLM (Ollama) if profile is local
    if (profile === "local") {
      try {
        fixResult = await this.localAdapter.generateFix(prompt, { model: "qwen2.5-coder" });
      } catch (e) {
        // Fallthrough
      }
    }

    // Cloud LLM fallback if profile is cloud
    if (profile === "cloud") {
      try {
        fixResult = await this.cloudAdapter.generateFix(prompt, { model: "gpt-4o-mini" });
      } catch (e) {
        // Fallthrough
      }
    }

    // Regex Fallback
    if (!fixResult) {
      fixResult = await this.regexAdapter.generateFix(prompt);
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
      explanation: fixResult.explanation || explanation,
      suggestedAssertion: fixResult.suggestedAssertion || suggestedAssertion,
      boundaryTestSnippet: fixResult.boundaryTestSnippet || boundaryTestSnippet,
    };
  }
}
