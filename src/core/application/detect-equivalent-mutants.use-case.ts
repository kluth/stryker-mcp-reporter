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

    // Heuristic 1: ObjectLiteral mutates to empty object {}
    // If it's a DTO or data class, often {} is functionally equivalent if the properties are optional
    if (mutatorName === "ObjectLiteral" && replacement === "{}") {
      // Very weak heuristic, so we don't flag as strictly equivalent, but maybe?
      // Actually let's look for more concrete ones.
    }

    // Heuristic 2: StringLiteral mutating to "" in a log statement
    // We cannot read the original line easily without the file content here,
    // but we can check if it's a string literal and assume it might be a logging string if we had AST.
    // Since we only have the mutant detail, we use the mutator type.
    
    // Let's rely on standard equivalents:
    // e.g. x === y mutated to x == y (EqualityOperator)
    if (mutatorName === "EqualityOperator" && replacement === "==") {
      isLikelyEquivalent = true;
      reason = "Loose equality (==) is often functionally equivalent to strict equality (===) when the operands are type-checked by TypeScript.";
      suggestedSuppressionComment = "// @stryker-disable-next-line EqualityOperator: TypeScript already enforces type safety here, so == is equivalent to ===";
    }

    // Unary plus
    if (mutatorName === "UnaryOperator" && replacement === "-") {
      // Not necessarily equivalent
    }

    // Math/Arithmetic
    if (mutatorName === "ArithmeticOperator" && (replacement === "-" || replacement === "+")) {
      // i++ / i-- ?
    }
    
    // BlockStatement mutating to {}
    // Often happens in void functions
    if (mutatorName === "BlockStatement" && replacement === "{}") {
        // Not automatically equivalent, usually means a void function is emptied.
    }

    // Try to flag Performance equivalents: Array.map(() => ...) mutated?
    
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
