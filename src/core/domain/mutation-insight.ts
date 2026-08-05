// src/core/domain/mutation-insight.ts
import type { MutantStatus } from "./mutation-report.js";

export type MutatorCategory =
  | "Arithmetic & Math"
  | "Equality & Logic"
  | "Control Flow & Conditionals"
  | "String & Literals"
  | "Block & Structure"
  | "Exception & Error Handling"
  | "Array & Collection"
  | "Async & Promises"
  | "Unknown Category";

export type FileCategory = "Domain" | "Application" | "Infrastructure" | "UI" | "Utility" | "Unknown";

export type SeverityLevel = "Low" | "Medium" | "High" | "Critical";

export type TestCoverageState = "NoTests" | "TestsRanButFailedToAssert" | "PartialCoverage";

export interface MutantDetailMetadata {
  id: string;
  mutatorName: string;
  mutatorCategory: MutatorCategory;
  replacement: string;
  status: MutantStatus;
}

export interface CodeContextMetadata {
  filePath: string;
  moduleName: string;
  fileCategory: FileCategory;
  line: number;
  column: number;
  originalCodeSnippet: string;
  mutatedCodeSnippet: string;
  diff: string;
  cyclomaticComplexityEstimate: number;
}

export interface TestCoverageContextMetadata {
  testsRan: string[];
  testCoverageState: TestCoverageState;
  assertionFlawCategory: string;
}

export interface GitDevContextMetadata {
  authorEmail?: string;
  authorName?: string;
  commitHash?: string;
  timestamp?: string;
}

export interface RecommendedTrainingModule {
  title: string;
  summary: string;
  conceptToMaster: string;
  exampleFixCode: string;
  suggestedExercise: string;
}

export interface EducationalInsight {
  primarySkillGap: string;
  severity: SeverityLevel;
  riskScore: number; // 0 bis 100
  learningTopicTags: string[];
  aiRootCauseExplanation: string;
  recommendedTrainingModule: RecommendedTrainingModule;
}

export interface VectorEmbeddingData {
  vectorId: string;
  embeddingText: string;
  schemaVersion: string;
  createdAt: string;
}

/**
 * Die zentrale, anreicherbare Insight-Entität.
 * Diese Struktur ist optimiert für die spätere Speicherung in Vektordatenbanken
 * (z. B. Qdrant, Pinecone, Chroma, pgvector) zur KI-basierten Fortbildungsanalyse.
 */
export interface MutationInsightEntity {
  id: string;
  mutant: MutantDetailMetadata;
  codeContext: CodeContextMetadata;
  testCoverageContext: TestCoverageContextMetadata;
  gitDevContext: GitDevContextMetadata;
  educationalInsight: EducationalInsight;
  vectorEmbedding: VectorEmbeddingData;
}

export interface RawMutantInsightInput {
  mutantId: string;
  filePath: string;
  mutatorName: string;
  replacement: string;
  line: number;
  column: number;
  status: MutantStatus;
  sourceCodeSnippet?: string;
  testsRan?: string[];
  authorEmail?: string;
  authorName?: string;
  commitHash?: string;
}

/**
 * Mappt einen Mutator-Namen auf eine verständliche Kategorie.
 */
export function mapMutatorCategory(mutatorName: string): MutatorCategory {
  const name = mutatorName.toLowerCase();
  if (name.includes("arithmetic") || name.includes("math")) return "Arithmetic & Math";
  if (name.includes("equality") || name.includes("logical") || name.includes("boolean")) return "Equality & Logic";
  if (name.includes("conditional") || name.includes("if") || name.includes("switch")) return "Control Flow & Conditionals";
  if (name.includes("string") || name.includes("literal")) return "String & Literals";
  if (name.includes("exception") || name.includes("throw") || name.includes("catch")) return "Exception & Error Handling";
  if (name.includes("block") || name.includes("statement")) return "Block & Structure";
  if (name.includes("array") || name.includes("collection")) return "Array & Collection";
  if (name.includes("async") || name.includes("promise") || name.includes("await")) return "Async & Promises";
  return "Unknown Category";
}

/**
 * Mappt einen Dateipfad auf die Architekturschicht.
 */
export function mapFileCategory(filePath: string): FileCategory {
  const path = filePath.toLowerCase();
  if (path.includes("/domain/") || path.includes("\\domain\\")) return "Domain";
  if (path.includes("/application/") || path.includes("\\application\\") || path.includes("use-case")) return "Application";
  if (path.includes("/infrastructure/") || path.includes("\\infrastructure\\") || path.includes("adapter")) return "Infrastructure";
  if (path.includes("/ui/") || path.includes("/components/")) return "UI";
  if (path.includes("/util") || path.includes("/helper")) return "Utility";
  return "Unknown";
}

/**
 * Erstellt eine strukturierte, vollvektorisierbare Insight-Entität aus rohen Mutanten-Daten.
 */
export function buildMutationInsightEntity(input: RawMutantInsightInput): MutationInsightEntity {
  const mutatorCategory = mapMutatorCategory(input.mutatorName);
  const fileCategory = mapFileCategory(input.filePath);
  const testsRan = input.testsRan || [];

  const coverageState: TestCoverageState =
    input.status === "NoCoverage" || testsRan.length === 0
      ? "NoTests"
      : "TestsRanButFailedToAssert";

  const flawCategory =
    coverageState === "NoTests"
      ? "Uncovered Execution Path"
      : "OverMocking / Weak Assertions";

  let severity: SeverityLevel = "Medium";
  let riskScore = 50;

  if (input.status === "NoCoverage") {
    severity = "High";
    riskScore = 85;
  } else if (fileCategory === "Domain" && input.status === "Survived") {
    severity = "Critical";
    riskScore = 95;
  } else if (mutatorCategory === "Exception & Error Handling") {
    severity = "High";
    riskScore = 80;
  }

  const primarySkillGap = `${mutatorCategory} Assertions`;
  const originalCode = input.sourceCodeSnippet || "// Quellcode-Zeile nicht direkt verfügbar";
  const diff = `- ${originalCode}\n+ ${originalCode} [Mutated: ${input.replacement}]`;

  const embeddingText = `
[MUTANT INSIGHT RECORD]
ID: ${input.mutantId}
File: ${input.filePath} (Layer: ${fileCategory})
Position: Line ${input.line}, Column ${input.column}
Mutator: ${input.mutatorName} (Category: ${mutatorCategory})
Status: ${input.status}
Replacement: ${input.replacement}
Original Code: ${originalCode}
Tests Ran: ${testsRan.join(", ") || "None"}
Coverage Flaw: ${flawCategory}
Primary Skill Gap: ${primarySkillGap}
Severity: ${severity} (Risk Score: ${riskScore})
Author: ${input.authorName || "Unknown"} <${input.authorEmail || "unknown@example.com"}>
`.trim();

  return {
    id: `insight-${input.mutantId}`,
    mutant: {
      id: input.mutantId,
      mutatorName: input.mutatorName,
      mutatorCategory,
      replacement: input.replacement,
      status: input.status,
    },
    codeContext: {
      filePath: input.filePath,
      moduleName: input.filePath.split("/").pop() || input.filePath,
      fileCategory,
      line: input.line,
      column: input.column,
      originalCodeSnippet: originalCode,
      mutatedCodeSnippet: `${originalCode} -> ${input.replacement}`,
      diff,
      cyclomaticComplexityEstimate: 3,
    },
    testCoverageContext: {
      testsRan,
      testCoverageState: coverageState,
      assertionFlawCategory: flawCategory,
    },
    gitDevContext: {
      authorEmail: input.authorEmail,
      authorName: input.authorName,
      commitHash: input.commitHash,
      timestamp: new Date().toISOString(),
    },
    educationalInsight: {
      primarySkillGap,
      severity,
      riskScore,
      learningTopicTags: [
        mutatorCategory.toLowerCase().replace(/\s+/g, "-"),
        input.mutatorName.toLowerCase(),
        fileCategory.toLowerCase(),
        "tdd-testing",
      ],
      aiRootCauseExplanation: `Der Mutant '${input.mutatorName}' in '${input.filePath}' hat überlebt, weil die bestehende Testsuite (${testsRan.length} Tests) die genaue Bedingung/Verzweigung in Zeile ${input.line} nicht strikt abprüft.`,
      recommendedTrainingModule: {
        title: `Meistere ${primarySkillGap} in ${fileCategory}-Komponenten`,
        summary: `Lerne, wie du seltene Randfälle und Modifikationen von ${input.mutatorName} mit präzisen Assertions absicherst.`,
        conceptToMaster: `Verifizierung von ${mutatorCategory}`,
        exampleFixCode: `expect(result).toBe(expectedValue); // Statt schwachem expect(result).toBeDefined()`,
        suggestedExercise: `Schreibe einen spezifischen Testfall in ${input.filePath.replace(".ts", ".spec.ts")}, der den Wert '${input.replacement}' explizit ausschließt.`,
      },
    },
    vectorEmbedding: {
      vectorId: `insight-${input.mutantId}`,
      embeddingText,
      schemaVersion: "1.0.0",
      createdAt: new Date().toISOString(),
    },
  };
}
