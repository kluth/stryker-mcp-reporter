// src/core/application/predict-mutation-impact.use-case.ts
export interface FileMutationRisk {
  filePath: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  estimatedMutantCount: number;
  reason: string;
}

export class PredictMutationImpactUseCase {
  public execute(changedFiles: string[]): FileMutationRisk[] {
    return changedFiles.map((file) => {
      let riskLevel: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      let estimatedMutantCount = 5;
      let reason = "Routine file change.";

      if (file.includes("use-case") || file.includes("domain") || file.includes("adapter")) {
        riskLevel = "HIGH";
        estimatedMutantCount = 25;
        reason = "Core business or adapter logic contains complex branching and assertions.";
      } else if (file.includes("config") || file.includes("util") || file.includes("helper")) {
        riskLevel = "MEDIUM";
        estimatedMutantCount = 12;
        reason = "Utility functions and configurations require boundary condition assertions.";
      }

      return {
        filePath: file,
        riskLevel,
        estimatedMutantCount,
        reason,
      };
    });
  }
}
