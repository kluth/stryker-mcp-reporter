import type { ReportStream } from "../domain/report-stream.js";
import { type Result, ok, err } from "../domain/result.js";

export interface MutantContext {
  id: string;
  mutatorName: string;
  status: string;
  originalCodeSnippet: string;
  mutatedCodeSnippet: string;
  startLine: number;
  endLine: number;
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

      const mutant = fileResult.mutants.find(m => m.id === mutantId || m.id === String(mutantId));
      
      if (mutant) {
        if (!fileResult.source) {
          return err(new Error(`Quellcode für Datei ${filePath} nicht im Bericht enthalten.`));
        }

        const lines = fileResult.source.split("\n");
        const startLine = mutant.location?.start.line ?? 1;
        const endLine = mutant.location?.end.line ?? startLine;
        
        // Context lines (3 lines before, 3 lines after)
        const contextStart = Math.max(0, startLine - 1 - 3);
        const contextEnd = Math.min(lines.length, endLine + 3);
        
        const originalCodeLines = lines.slice(contextStart, contextEnd);
        
        // Create mutated code snippet by replacing the specific lines
        const mutatedCodeLines = [...originalCodeLines];
        const localStartIdx = (startLine - 1) - contextStart;
        const localEndIdx = (endLine - 1) - contextStart;
        
        if (localStartIdx >= 0 && localStartIdx < mutatedCodeLines.length) {
          // A very naive replacement: we just replace the whole lines involved
          // A better approach would replace exactly by column, but this is sufficient for context
          mutatedCodeLines.splice(localStartIdx, localEndIdx - localStartIdx + 1, `// --- MUTATED CODE (${mutant.mutatorName}) ---`, mutant.replacement ?? "", "// -------------------");
        }

        return ok({
          id: mutant.id,
          mutatorName: mutant.mutatorName ?? "Unknown",
          status: mutant.status,
          originalCodeSnippet: originalCodeLines.join("\n"),
          mutatedCodeSnippet: mutatedCodeLines.join("\n"),
          startLine: startLine,
          endLine: endLine
        });
      }
    }

    return err(new Error(`Mutant mit ID ${mutantId} nicht gefunden.`));
  }
}
