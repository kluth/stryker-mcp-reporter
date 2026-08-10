// src/infrastructure/llm/openai.adapter.ts
import type { LlmPort } from "../../core/domain/llm.port.js";

export class OpenAiLlmAdapter implements LlmPort {
  async generateFix(prompt: string, modelConfig?: any): Promise<{
    explanation: string;
    suggestedAssertion: string;
    boundaryTestSnippet: string;
  }> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set.");
    }

    const cloudRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelConfig?.model || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      }),
    });

    if (!cloudRes.ok) {
      throw new Error(`OpenAI error: ${cloudRes.statusText}`);
    }

    const data = (await cloudRes.json()) as any;
    const parsed = JSON.parse(data.choices[0].message.content);

    return {
      explanation: parsed.explanation || "No explanation provided.",
      suggestedAssertion: parsed.suggestedAssertion || "// No assertion provided",
      boundaryTestSnippet: parsed.boundaryTestSnippet || "// No snippet provided",
    };
  }
}
