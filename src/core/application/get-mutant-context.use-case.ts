/* eslint-disable max-lines, complexity, no-useless-assignment */
import type { ReportStream } from "../domain/report-stream.js";
import { type Result, ok, err } from "../domain/result.js";
import { TestFile } from "../domain/mutation-report.js";

export interface MutantContext {
  id: string;
  mutatorName: string;
  status: string;
  originalCodeSnippet: string;
  mutatedCodeSnippet: string;
  startLine: number;
  endLine: number;
  coveredByTests?: string[];
  testFileContexts?: {
    testId: string;
    testName: string;
    filePath: string;
    sourceSnippet?: string;
  }[];
}

export class GetMutantContextUseCase {
  constructor(private readonly reportStream: ReportStream) {}

  public execute(mutantId: string): Result<MutantContext, Error> {
    const report = this.reportStream.current();

    if (!report || !report.files) {
      return err(new Error("Kein Mutationsbericht gefunden."));
    }

    for (const [filePath, fileResult] of Object.entries(report.files)) {
      if (!fileResult.mutants) continue;

      const mutant = fileResult.mutants.find(
        (m) => m.id === mutantId || m.id === String(mutantId),
      );

      if (mutant) {
        if (!fileResult.source) {
          return err(
            new Error(
              `Quellcode für Datei ${filePath} nicht im Bericht enthalten.`,
            ),
          );
        }

        const lines = fileResult.source.split("\n");
        const startLine = mutant.location?.start.line ?? 1;
        const endLine = mutant.location?.end.line ?? startLine;

        // Context lines (10 lines before, 10 lines after)
        const CONTEXT_SIZE = 10;
        const contextStart = Math.max(0, startLine - 1 - CONTEXT_SIZE);
        const contextEnd = Math.min(lines.length, endLine + CONTEXT_SIZE);

        const originalCodeLines = lines.slice(contextStart, contextEnd);

        // Create mutated code snippet by replacing the specific lines
        const mutatedCodeLines = [...originalCodeLines];
        const localStartIdx = startLine - 1 - contextStart;
        const localEndIdx = endLine - 1 - contextStart;

        if (localStartIdx >= 0 && localStartIdx < mutatedCodeLines.length) {
          mutatedCodeLines.splice(
            localStartIdx,
            localEndIdx - localStartIdx + 1,
            `// --- MUTATED CODE (${mutant.mutatorName}) ---`,
            mutant.replacement ?? "",
            "// -------------------",
          );
        }

        const testFileContexts = this.getTestContexts(
          mutant.coveredBy || mutant.testsRan || [],
          report.testFiles,
        );

        return ok({
          id: mutant.id,
          mutatorName: mutant.mutatorName ?? "Unknown",
          status: mutant.status,
          originalCodeSnippet: originalCodeLines.join("\n"),
          mutatedCodeSnippet: mutatedCodeLines.join("\n"),
          startLine: startLine,
          endLine: endLine,
          coveredByTests: mutant.coveredBy,
          testFileContexts,
        });
      }
    }

    return err(new Error(`Mutant mit ID ${mutantId} nicht gefunden.`));
  }

  private getTestContexts(
    testIds: string[],
    testFiles?: Record<string, TestFile>,
  ) {
    if (!testFiles || testIds.length === 0) return undefined;

    const contexts = [];
    for (const testId of testIds) {
      for (const [testFilePath, testFile] of Object.entries(testFiles)) {
        const foundTest = testFile.tests?.find(
          (t) => t.id === testId || t.id === String(testId),
        );
        if (foundTest) {
          let sourceSnippet = undefined;
          if (testFile.source && foundTest.location) {
            const tLines = testFile.source.split("\n");
            const tStart = foundTest.location.start.line ?? 1;
            // 5 lines before and after test
            const tContextStart = Math.max(0, tStart - 1 - 5);
            const tContextEnd = Math.min(
              tLines.length,
              (foundTest.location.end?.line ?? tStart) + 5,
            );
            sourceSnippet = tLines.slice(tContextStart, tContextEnd).join("\n");
          }

          contexts.push({
            testId,
            testName: foundTest.name,
            filePath: testFilePath,
            sourceSnippet,
          });
          break; // Stop looking for this testId in other files
        }
      }
    }
    return contexts.length > 0 ? contexts : undefined;
  }
}

