// src/core/domain/llm.port.ts
export interface LlmPort {
  generateFix(prompt: string, modelConfig?: any): Promise<{
    explanation: string;
    suggestedAssertion: string;
    boundaryTestSnippet: string;
  }>;
}
