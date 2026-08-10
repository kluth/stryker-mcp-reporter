// src/core/domain/mutation-insight.spec.ts
import { describe, it, expect } from "vitest";
import {
  buildMutationInsightEntity,
  mapMutatorCategory,
  mapFileCategory,
  type RawMutantInsightInput,
} from "./mutation-insight.js";

describe("MutationInsight Entity Domain Model", () => {
  it("mappt alle Mutator-Kategorien exakt", () => {
    expect(mapMutatorCategory("ArithmeticOperator")).toBe("Arithmetic & Math");
    expect(mapMutatorCategory("math_operation")).toBe("Arithmetic & Math");
    expect(mapMutatorCategory("EqualityOperator")).toBe("Equality & Logic");
    expect(mapMutatorCategory("logical_and")).toBe("Equality & Logic");
    expect(mapMutatorCategory("boolean_literal")).toBe("Equality & Logic");
    expect(mapMutatorCategory("ConditionalExpression")).toBe(
      "Control Flow & Conditionals",
    );
    expect(mapMutatorCategory("if_statement")).toBe(
      "Control Flow & Conditionals",
    );
    expect(mapMutatorCategory("switch_case")).toBe(
      "Control Flow & Conditionals",
    );
    expect(mapMutatorCategory("StringLiteral")).toBe("String & Literals");
    expect(mapMutatorCategory("literal_value")).toBe("String & Literals");
    expect(mapMutatorCategory("BlockStatement")).toBe("Block & Structure");
    expect(mapMutatorCategory("statement_block")).toBe("Block & Structure");
    expect(mapMutatorCategory("ExceptionFilter")).toBe(
      "Exception & Error Handling",
    );
    expect(mapMutatorCategory("throw_error")).toBe(
      "Exception & Error Handling",
    );
    expect(mapMutatorCategory("catch_block")).toBe(
      "Exception & Error Handling",
    );
    expect(mapMutatorCategory("ArrayDeclaration")).toBe("Array & Collection");
    expect(mapMutatorCategory("collection_items")).toBe("Array & Collection");
    expect(mapMutatorCategory("AsyncAwait")).toBe("Async & Promises");
    expect(mapMutatorCategory("promise_all")).toBe("Async & Promises");
    expect(mapMutatorCategory("await_expression")).toBe("Async & Promises");
    expect(mapMutatorCategory("CustomMutator")).toBe("Unknown Category");
  });

  it("mappt alle Dateipfad-Kategorien (Slashes und Backslashes) exakt", () => {
    expect(mapFileCategory("src/domain/entity.ts")).toBe("Domain");
    expect(mapFileCategory("src\\domain\\entity.ts")).toBe("Domain");
    expect(mapFileCategory("src/application/service.ts")).toBe("Application");
    expect(mapFileCategory("src\\application\\service.ts")).toBe("Application");
    expect(mapFileCategory("src/use-case.ts")).toBe("Application");
    expect(mapFileCategory("src/infrastructure/repo.ts")).toBe(
      "Infrastructure",
    );
    expect(mapFileCategory("src\\infrastructure\\repo.ts")).toBe(
      "Infrastructure",
    );
    expect(mapFileCategory("src/git-adapter.ts")).toBe("Infrastructure");
    expect(mapFileCategory("src/ui/component.ts")).toBe("UI");
    expect(mapFileCategory("src/components/button.ts")).toBe("UI");
    expect(mapFileCategory("src/util/format.ts")).toBe("Utility");
    expect(mapFileCategory("src/helper/math.ts")).toBe("Utility");
    expect(mapFileCategory("custom-file.ts")).toBe("Unknown");
  });

  it("erzeugt eine hochstrukturierte, Vector-DB-bereite Insight-Entität", () => {
    const input: RawMutantInsightInput = {
      mutantId: "mutant-101",
      filePath: "src/core/domain/calculator.ts",
      mutatorName: "ArithmeticOperator",
      replacement: "-",
      line: 42,
      column: 15,
      status: "Survived",
      sourceCodeSnippet: "return a + b;",
      testsRan: ["CalculatorTest.shouldAddNumbers"],
      authorEmail: "dev@example.com",
      authorName: "Alice Developer",
      commitHash: "abc1234",
    };

    const insight = buildMutationInsightEntity(input);

    expect(insight.id).toBe("insight-mutant-101");
    expect(insight.mutant.mutatorCategory).toBe("Arithmetic & Math");
    expect(insight.codeContext.fileCategory).toBe("Domain");
    expect(insight.codeContext.moduleName).toBe("calculator.ts");
    expect(insight.testCoverageContext.testCoverageState).toBe(
      "TestsRanButFailedToAssert",
    );
    expect(insight.testCoverageContext.assertionFlawCategory).toBe(
      "OverMocking / Weak Assertions",
    );
    expect(insight.educationalInsight.severity).toBe("Critical");
    expect(insight.educationalInsight.riskScore).toBe(95);
    expect(insight.gitDevContext.authorName).toBe("Alice Developer");
    expect(insight.vectorEmbedding.embeddingText).toContain(
      "Author: Alice Developer <dev@example.com>",
    );
  });

  it("handhabt fehlende optionale Felder (sourceCodeSnippet, author, testsRan) mit Fallbacks", () => {
    const input: RawMutantInsightInput = {
      mutantId: "mutant-102",
      filePath: "simple.ts",
      mutatorName: "CustomMutator",
      replacement: "null",
      line: 1,
      column: 1,
      status: "Survived",
    };

    const insight = buildMutationInsightEntity(input);

    expect(insight.codeContext.originalCodeSnippet).toBe(
      "// Quellcode-Zeile nicht direkt verfügbar",
    );
    expect(insight.codeContext.moduleName).toBe("simple.ts");
    expect(insight.testCoverageContext.testCoverageState).toBe("NoTests");
    expect(insight.testCoverageContext.assertionFlawCategory).toBe(
      "Uncovered Execution Path",
    );
    expect(insight.educationalInsight.severity).toBe("Medium");
    expect(insight.educationalInsight.riskScore).toBe(50);
    expect(insight.vectorEmbedding.embeddingText).toContain(
      "Author: Unknown <unknown@example.com>",
    );
  });

  it("kategorisiert NoCoverage Mutanten korrekt mit Risikoscore 85", () => {
    const input: RawMutantInsightInput = {
      mutantId: "mutant-202",
      filePath: "src/infrastructure/db.ts",
      mutatorName: "EqualityOperator",
      replacement: "!==",
      line: 10,
      column: 5,
      status: "NoCoverage",
    };

    const insight = buildMutationInsightEntity(input);

    expect(insight.testCoverageContext.testCoverageState).toBe("NoTests");
    expect(insight.educationalInsight.severity).toBe("High");
    expect(insight.educationalInsight.riskScore).toBe(85);
  });

  it("kategorisiert Exception & Error Handling Mutanten mit Risikoscore 80", () => {
    const input: RawMutantInsightInput = {
      mutantId: "mutant-303",
      filePath: "src/infrastructure/logger.ts",
      mutatorName: "ExceptionFilter",
      replacement: "null",
      line: 5,
      column: 2,
      status: "Survived",
      testsRan: ["LoggerTest"],
    };

    const insight = buildMutationInsightEntity(input);

    expect(insight.educationalInsight.severity).toBe("High");
    expect(insight.educationalInsight.riskScore).toBe(80);
  });
});

