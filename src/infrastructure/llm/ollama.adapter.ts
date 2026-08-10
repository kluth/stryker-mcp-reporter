// src/infrastructure/llm/ollama.adapter.ts
import type { LlmPort } from "../../core/domain/llm.port.js";

export class OllamaLlmAdapter implements LlmPort {
  async generateFix(prompt: string, modelConfig?: any): Promise<{
    explanation: string;
    suggestedAssertion: string;
    boundaryTestSnippet: string;
  }> {
    const ollamaRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelConfig?.model || "qwen2.5-coder",
        prompt: prompt,
        stream: false,
        format: "json"
      }),
    });

    if (!ollamaRes.ok) {
      throw new Error(`Ollama error: ${ollamaRes.statusText}`);
    }

    const data = (await ollamaRes.json()) as any;
    const parsed = JSON.parse(data.response);
    
    return {
      explanation: parsed.explanation || "No explanation provided.",
      suggestedAssertion: parsed.suggestedAssertion || "// No assertion provided",
      boundaryTestSnippet: parsed.boundaryTestSnippet || "// No snippet provided",
    };
  }
}
