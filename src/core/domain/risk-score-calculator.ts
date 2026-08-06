import type { MutationReport } from "./mutation-report.js";

export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface RiskAnalysis {
  score: number;
  level: RiskLevel;
  highRiskFiles: string[];
  survivingMutants: number;
  criticalFilesCount: number;
}

export class RiskScoreCalculator {
  private static readonly HIGH_RISK_KEYWORDS = [
    "auth",
    "security",
    "crypto",
    "validator",
    "guard",
    "token",
    "password",
  ];
  private static readonly MEDIUM_RISK_KEYWORDS = [
    "service",
    "controller",
    "use-case",
    "handler",
  ];

  public calculate(report: MutationReport): RiskAnalysis {
    if (!report.files) {
      return {
        score: 0,
        level: RiskLevel.LOW,
        highRiskFiles: [],
        survivingMutants: 0,
        criticalFilesCount: 0,
      };
    }

    let totalScore = 0;
    let totalSurviving = 0;
    const highRiskFiles = new Set<string>();

    for (const [filePath, fileResult] of Object.entries(report.files)) {
      if (!fileResult.mutants) continue;

      const survivedMutants = fileResult.mutants.filter(
        (m) => m.status === "Survived",
      );
      if (survivedMutants.length === 0) continue;

      totalSurviving += survivedMutants.length;
      const fileWeight = this.getFileWeight(filePath);
      const fileRiskScore = survivedMutants.length * fileWeight;

      totalScore += fileRiskScore;

      if (fileWeight >= 5) {
        highRiskFiles.add(filePath);
      }
    }

    return {
      score: totalScore,
      level: this.determineLevel(totalScore),
      highRiskFiles: Array.from(highRiskFiles),
      survivingMutants: totalSurviving,
      criticalFilesCount: highRiskFiles.size,
    };
  }

  private getFileWeight(filePath: string): number {
    const lowerPath = filePath.toLowerCase();

    for (const keyword of RiskScoreCalculator.HIGH_RISK_KEYWORDS) {
      if (lowerPath.includes(keyword)) {
        return 10;
      }
    }

    for (const keyword of RiskScoreCalculator.MEDIUM_RISK_KEYWORDS) {
      if (lowerPath.includes(keyword)) {
        return 5;
      }
    }

    return 1;
  }

  private determineLevel(score: number): RiskLevel {
    if (score >= 50) return RiskLevel.CRITICAL;
    if (score >= 20) return RiskLevel.HIGH;
    if (score >= 5) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }
}
