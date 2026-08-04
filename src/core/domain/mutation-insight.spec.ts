// src/core/domain/mutation-insight.spec.ts
import { describe, it, expect } from "vitest";
import {
  buildMutationInsightEntity,
  type RawMutantInsightInput,
} from "./mutation-insight.js";

describe("MutationInsight Entity Domain Model", () => {
  it("erzeugt eine hochstrukturierte, Vector-DB-bereite Insight-Entität aus rohen Mutanten-Daten", () => {
    const input: RawMutantInsightInput = {
      mutantId: "mutant-101",
      filePath: "src/core/domain/calculator.ts",
      mutatorName: "ArithmeticOperator",
      replacement: "-",
      line: 42,
      column: 15,
      status: "Survived",
      sourceCodeSnippet: "return a + b;",
      testsRan: ["should calculate sum"],
      authorEmail: "dev@example.com",
      authorName: "Alex Dev",
      commitHash: "abc1234",
    };

    const insight = buildMutationInsightEntity(input);

    expect(insight.id).toBe("insight-mutant-101");
    expect(insight.mutant.id).toBe("mutant-101");
    expect(insight.mutant.mutatorCategory).toBe("Arithmetic & Math");

    expect(insight.codeContext.filePath).toBe("src/core/domain/calculator.ts");
    expect(insight.codeContext.fileCategory).toBe("Domain");

    expect(insight.testCoverageContext.assertionFlawCategory).toBe("OverMocking / Weak Assertions");

    expect(insight.educationalInsight.primarySkillGap).toBe("Arithmetic & Math Assertions");
    expect(insight.educationalInsight.severity).toBe("Critical");
    expect(insight.educationalInsight.riskScore).toBe(95);
    expect(insight.educationalInsight.learningTopicTags).toContain("arithmeticoperator");

    expect(insight.vectorEmbedding.embeddingText).toContain("Mutator: ArithmeticOperator");
    expect(insight.vectorEmbedding.embeddingText).toContain("src/core/domain/calculator.ts");
    expect(insight.vectorEmbedding.vectorId).toBe("insight-mutant-101");
  });

  it("kategorisiert NoCoverage Mutanten korrekt mit hohem Risiko", () => {
    const input: RawMutantInsightInput = {
      mutantId: "mutant-202",
      filePath: "src/infrastructure/db/adapter.ts",
      mutatorName: "EqualityOperator",
      replacement: "!=",
      line: 100,
      column: 8,
      status: "NoCoverage",
      sourceCodeSnippet: "if (user.id === targetId)",
      testsRan: [],
    };

    const insight = buildMutationInsightEntity(input);

    expect(insight.testCoverageContext.testCoverageState).toBe("NoTests");
    expect(insight.educationalInsight.severity).toBe("High");
    expect(insight.educationalInsight.riskScore).toBe(85);
    expect(insight.codeContext.fileCategory).toBe("Infrastructure");
  });
});
