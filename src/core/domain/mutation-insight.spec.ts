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

  it("mappt alle Mutator-Kategorien und Dateitypen korrekt", () => {
    const inputArray: RawMutantInsightInput = {
      mutantId: "mutant-3",
      filePath: "src/application/use-case.ts",
      mutatorName: "ArrayDeclaration",
      replacement: "[]",
      line: 1,
      column: 1,
      status: "Survived",
    };
    const insightArray = buildMutationInsightEntity(inputArray);
    expect(insightArray.mutant.mutatorCategory).toBe("Array & Collection");
    expect(insightArray.codeContext.fileCategory).toBe("Application");

    const inputAsync: RawMutantInsightInput = {
      mutantId: "mutant-4",
      filePath: "src/ui/components/button.ts",
      mutatorName: "AsyncAwait",
      replacement: "",
      line: 1,
      column: 1,
      status: "Survived",
    };
    const insightAsync = buildMutationInsightEntity(inputAsync);
    expect(insightAsync.mutant.mutatorCategory).toBe("Async & Promises");
    expect(insightAsync.codeContext.fileCategory).toBe("UI");

    const inputBlock: RawMutantInsightInput = {
      mutantId: "mutant-5",
      filePath: "src/util/helper.ts",
      mutatorName: "BlockStatement",
      replacement: "{}",
      line: 1,
      column: 1,
      status: "Survived",
    };
    const insightBlock = buildMutationInsightEntity(inputBlock);
    expect(insightBlock.mutant.mutatorCategory).toBe("Block & Structure");
    expect(insightBlock.codeContext.fileCategory).toBe("Utility");

    const inputStringMutator: RawMutantInsightInput = {
      mutantId: "mutant-8",
      filePath: "src/domain/model.ts",
      mutatorName: "string_literal_mutator",
      replacement: "foo",
      line: 1,
      column: 1,
      status: "Survived",
    };
    const insightString = buildMutationInsightEntity(inputStringMutator);
    expect(insightString.mutant.mutatorCategory).toBe("String & Literals");

    const inputConditionalMutator: RawMutantInsightInput = {
      mutantId: "mutant-9",
      filePath: "src/infrastructure/db.ts",
      mutatorName: "conditional_if_expression",
      replacement: "true",
      line: 1,
      column: 1,
      status: "Survived",
    };
    const insightConditional = buildMutationInsightEntity(inputConditionalMutator);
    expect(insightConditional.mutant.mutatorCategory).toBe("Control Flow & Conditionals");

    const inputException: RawMutantInsightInput = {
      mutantId: "mutant-7",
      filePath: "src/infrastructure/adapter.ts",
      mutatorName: "ExceptionFilter",
      replacement: "null",
      line: 10,
      column: 5,
      status: "Survived",
    };
    const insightException = buildMutationInsightEntity(inputException);
    expect(insightException.mutant.mutatorCategory).toBe("Exception & Error Handling");
    expect(insightException.educationalInsight.severity).toBe("High");
    expect(insightException.educationalInsight.riskScore).toBe(80);
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
