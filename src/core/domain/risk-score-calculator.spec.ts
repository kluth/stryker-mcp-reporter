import { describe, it, expect, beforeEach } from "vitest";
import { RiskScoreCalculator, RiskLevel } from "./risk-score-calculator.js";
import type { MutationReport } from "./mutation-report.js";

describe("RiskScoreCalculator", () => {
  let calculator: RiskScoreCalculator;

  beforeEach(() => {
    calculator = new RiskScoreCalculator();
  });

  it("should return score 0 and LOW risk for empty report", () => {
    const report: MutationReport = { files: {} };
    const result = calculator.calculate(report);
    expect(result.score).toBe(0);
    expect(result.level).toBe(RiskLevel.LOW);
    expect(result.survivingMutants).toBe(0);
    expect(result.criticalFilesCount).toBe(0);
  });

  it("should calculate score correctly for normal files", () => {
    const report: MutationReport = {
      files: {
        "src/app.ts": {
          source: "const x = 1;",
          mutants: [
            { id: "1", mutatorName: "A", status: "Survived" },
            { id: "2", mutatorName: "B", status: "Survived" },
            { id: "3", mutatorName: "B", status: "Killed" },
          ],
        },
      },
    } as unknown as MutationReport;

    const result = calculator.calculate(report);
    // 2 survived mutants * weight 1 = 2
    expect(result.score).toBe(2);
    expect(result.level).toBe(RiskLevel.LOW);
    expect(result.survivingMutants).toBe(2);
    expect(result.criticalFilesCount).toBe(0);
  });

  it("should give higher weight to files with keywords", () => {
    const report: MutationReport = {
      files: {
        "src/auth/login.ts": {
          source: "const x = 1;",
          mutants: [
            { id: "1", mutatorName: "A", status: "Survived" },
            { id: "2", mutatorName: "B", status: "Killed" },
          ],
        },
      },
    } as unknown as MutationReport;

    const result = calculator.calculate(report);
    // 1 survived mutant * weight 10 = 10
    expect(result.score).toBe(10);
    expect(result.level).toBe(RiskLevel.MEDIUM);
    expect(result.survivingMutants).toBe(1);
    expect(result.criticalFilesCount).toBe(1);
  });

  it("should determine HIGH and CRITICAL correctly", () => {
    const report: MutationReport = {
      files: {
        "src/auth/crypto.ts": {
          // high risk (10x)
          source: "x",
          mutants: Array(5).fill({ status: "Survived" }), // 5 * 10 = 50
        },
      },
    } as unknown as MutationReport;

    const result = calculator.calculate(report);
    expect(result.score).toBe(50);
    expect(result.level).toBe(RiskLevel.CRITICAL);
    expect(result.survivingMutants).toBe(5);
    expect(result.criticalFilesCount).toBe(1);
  });
});
