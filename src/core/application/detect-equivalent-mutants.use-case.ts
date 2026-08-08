import { MutantDetail } from "../domain/mutation-report.js";

export interface EquivalentMutantDetection {
  mutantId: string;
  filePath: string;
  line?: number;
  mutatorName: string;
  isLikelyEquivalent: boolean;
  reason?: string;
  suggestedSuppressionComment?: string;
}

export class DetectEquivalentMutantsUseCase {
  public execute(mutants: MutantDetail[]): EquivalentMutantDetection[] {
    const survivedMutants = mutants.filter(
      (m) => m.status === "Survived" || m.status === "NoCoverage",
    );

    return survivedMutants.map((mutant) => this.analyzeMutant(mutant));
  }

  private analyzeMutant(mutant: MutantDetail): EquivalentMutantDetection {
    const mutatorName = mutant.mutatorName || "Unknown";
    const replacement = mutant.replacement || "";

    let isLikelyEquivalent = false;
    let reason: string | undefined = undefined;
    let suggestedSuppressionComment: string | undefined = undefined;

    if (mutatorName === "EqualityOperator" && replacement === "==") {
      isLikelyEquivalent = true;
      reason = "Loose equality (==) is often functionally equivalent to strict equality (===) when the operands are type-checked by TypeScript.";
      suggestedSuppressionComment = "// @stryker-disable-next-line EqualityOperator: TypeScript already enforces type safety here, so == is equivalent to ===";
    }

    // Update Operator (i++ to ++i)
    if (mutatorName === "UpdateOperator" && (replacement === "++x" || replacement === "--x")) {
      isLikelyEquivalent = true;
      reason = "Pre-increment/decrement is often equivalent to post-increment/decrement if the return value of the expression is not used.";
      suggestedSuppressionComment = "// @stryker-disable-next-line UpdateOperator: The return value of this update operation is unused, making pre/post equivalent";
    }

    return {
      mutantId: mutant.id,
      filePath: mutant.filePath,
      line: mutant.line,
      mutatorName,
      isLikelyEquivalent,
      reason,
      suggestedSuppressionComment,
    };
  }
}
