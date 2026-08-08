import { describe, it, expect, beforeEach } from "vitest";
import { RiskScoreCalculator, RiskLevel } from "./risk-score-calculator.js";
import type { MutationReport } from "./mutation-report.js";

describe("RiskScoreCalculator", () => {
  let calculator: RiskScoreCalculator;

  beforeEach(() => {
    calculator = new RiskScoreCalculator();
  });

  it("should return score 0 and LOW risk for undefined files", () => {
    const report: MutationReport = {} as MutationReport;
    const result = calculator.calculate(report);
    expect(result.score).toBe(0);
    expect(result.level).toBe(RiskLevel.LOW);
    expect(result.highRiskFiles).toEqual([]);
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
            { id: "3", mutatorName: "C", status: "Survived" },
            { id: "4", mutatorName: "D", status: "Survived" },
            { id: "5", mutatorName: "E", status: "Killed" },
          ],
        },
        "src/no-mutants.ts": {
          source: "x",
          mutants: undefined
        },
        "src/all-killed.ts": {
          source: "x",
          mutants: [
            { id: "1", mutatorName: "A", status: "Killed" }
          ]
        }
      },
    } as unknown as MutationReport;

    const result = calculator.calculate(report);
    // 4 survived mutants * weight 1 = 4 (LOW)
    expect(result.score).toBe(4);
    expect(result.level).toBe(RiskLevel.LOW);
    expect(result.survivingMutants).toBe(4);
    expect(result.criticalFilesCount).toBe(0);
    expect(result.highRiskFiles).toEqual([]);
  });

  it("should determine MEDIUM level correctly (score 5-19)", () => {
    const report: MutationReport = {
      files: {
        "src/service/user.service.ts": { // matches "service"
          source: "x",
          mutants: Array(1).fill({ status: "Survived" }), // 1 * 5 = 5 (MEDIUM boundary)
        },
        "src/controller/auth.controller.ts": { // matches "auth" (10) and "controller" (5), returns 10
          source: "x",
          mutants: Array(1).fill({ status: "Survived" }), // 1 * 10 = 10
        }
      },
    } as unknown as MutationReport;

    const result = calculator.calculate(report);
    expect(result.score).toBe(15);
    expect(result.level).toBe(RiskLevel.MEDIUM);
    expect(result.survivingMutants).toBe(2);
    expect(result.criticalFilesCount).toBe(2);
    expect(result.highRiskFiles).toContain("src/service/user.service.ts");
    expect(result.highRiskFiles).toContain("src/controller/auth.controller.ts");
  });

  it("should determine HIGH level correctly (score 20-49)", () => {
    const report: MutationReport = {
      files: {
        "src/security/guard.ts": { // matches "security", "guard"
          source: "x",
          mutants: Array(2).fill({ status: "Survived" }), // 2 * 10 = 20 (HIGH boundary)
        },
        "src/validator/token.ts": { // matches "validator", "token"
          source: "x",
          mutants: Array(2).fill({ status: "Survived" }), // 2 * 10 = 20
        }
      },
    } as unknown as MutationReport;

    // 40 from above + 9 from below = 49
    report.files["src/app.ts"] = { source: "x", mutants: Array(9).fill({ status: "Survived" }) };
    
    const result = calculator.calculate(report);
    expect(result.score).toBe(49);
    expect(result.level).toBe(RiskLevel.HIGH);
    expect(result.survivingMutants).toBe(13);
  });

  it("should determine CRITICAL level correctly (score >= 50)", () => {
    const report: MutationReport = {
      files: {
        "src/auth/crypto.ts": {
          source: "x",
          mutants: Array(5).fill({ status: "Survived" }), // 5 * 10 = 50
        },
      },
    } as unknown as MutationReport;

    const result = calculator.calculate(report);
    expect(result.score).toBe(50);
    expect(result.level).toBe(RiskLevel.CRITICAL);
  });

  it("should cover all remaining keywords", () => {
    const report: MutationReport = {
      files: {
        "src/use-case/test.ts": { mutants: Array(1).fill({ status: "Survived" }) },
        "src/handler/test.ts": { mutants: Array(1).fill({ status: "Survived" }) },
      }
    } as unknown as MutationReport;
    const result = calculator.calculate(report);
    expect(result.score).toBe(10); // 5 + 5
  });
});
