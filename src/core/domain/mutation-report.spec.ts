/* eslint-disable max-lines, complexity, no-useless-assignment */
// src/core/domain/mutation-report.spec.ts
import { describe, it, expect } from "vitest";
import {
  MutationReport,
  calculateMutationSummary,
  extractSurvivedMutants,
} from "./mutation-report.js";

describe("MutationReport Domain Model", () => {
  const sampleReport: MutationReport = {
    schemaVersion: "1.0",
    thresholds: { high: 80, low: 60 },
    files: {
      "src/calculator.ts": {
        language: "typescript",
        source: "export function add(a, b) { return a + b; }",
        mutants: [
          {
            id: "1",
            mutatorName: "ArithmeticOperator",
            replacement: "-",
            location: {
              start: { line: 1, column: 35 },
              end: { line: 1, column: 36 },
            },
            status: "Killed",
            killedBy: ["add tests"],
          },
          {
            id: "2",
            mutatorName: "EqualityOperator",
            replacement: "==",
            location: {
              start: { line: 1, column: 10 },
              end: { line: 1, column: 12 },
            },
            status: "Survived",
            testsRan: ["unit test 1"],
          },
          {
            id: "3",
            mutatorName: "ConditionalExpression",
            replacement: "false",
            location: {
              start: { line: 2, column: 5 },
              end: { line: 2, column: 9 },
            },
            status: "NoCoverage",
          },
          {
            id: "4",
            mutatorName: "BlockStatement",
            replacement: "{}",
            location: {
              start: { line: 3, column: 1 },
              end: { line: 3, column: 2 },
            },
            status: "Timeout",
          },
        ],
      },
      "src/helper.ts": {
        language: "typescript",
        source: "export function help() {}",
        mutants: [
          {
            id: "5",
            mutatorName: "StringLiteral",
            replacement: '""',
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 5 },
            },
            status: "Survived",
          },
          {
            id: "6",
            mutatorName: "TypeCheck",
            status: "CompileError",
          },
          {
            id: "7",
            mutatorName: "IgnoreRule",
            status: "Ignored",
          },
          {
            id: "8",
            mutatorName: "CrashRule",
            status: "RuntimeError",
          },
        ],
      },
    },
  };

  describe("calculateMutationSummary", () => {
    it("berechnet die Mutationsstatistiken und den Score korrekt für alle Statusfälle", () => {
      const summary = calculateMutationSummary(sampleReport);

      expect(summary.totalMutants).toBe(8);
      expect(summary.killed).toBe(1);
      expect(summary.survived).toBe(2);
      expect(summary.noCoverage).toBe(1);
      expect(summary.timeout).toBe(1);
      expect(summary.compileError).toBe(1);
      expect(summary.ignored).toBe(1);
      expect(summary.runtimeError).toBe(1);
      expect(summary.mutationScore).toBe(40);
    });

    it("gibt 100% Score zurück, wenn keine Mutanten vorhanden sind oder null/undefined report übergeben wird", () => {
      expect(calculateMutationSummary(null as any).mutationScore).toBe(100);
      expect(calculateMutationSummary({ files: {} }).mutationScore).toBe(100);
      expect(
        calculateMutationSummary({ files: { "a.ts": { mutants: undefined } } })
          .mutationScore,
      ).toBe(100);
    });
  });

  describe("extractSurvivedMutants", () => {
    it("extrahiert alle überlebenden Mutanten aus allen Dateien", () => {
      const survived = extractSurvivedMutants(sampleReport);

      expect(survived).toHaveLength(2);
      expect(survived[0].id).toBe("2");
      expect(survived[1].id).toBe("5");
    });

    it("filtert überlebende Mutanten nach spezifischem Dateipfad oder Suffix", () => {
      const survivedExact = extractSurvivedMutants(
        sampleReport,
        "src/calculator.ts",
      );
      expect(survivedExact).toHaveLength(1);
      expect(survivedExact[0].id).toBe("2");

      const survivedSuffix = extractSurvivedMutants(sampleReport, "helper.ts");
      expect(survivedSuffix).toHaveLength(1);
      expect(survivedSuffix[0].id).toBe("5");
    });

    it("handhabt null/undefined Reports oder fehlende mutants-Arrays sicher", () => {
      expect(extractSurvivedMutants(null as any)).toEqual([]);
      expect(extractSurvivedMutants({ files: {} })).toEqual([]);
      expect(extractSurvivedMutants({ files: { "a.ts": {} as any } })).toEqual(
        [],
      );
    });

    it("handhabt mutant ohne ID fallback", () => {
      const report: MutationReport = {
        files: {
          "src/invalid.ts": {
            mutants: [
              {
                status: "Survived",
                mutatorName: "Unknown",
              } as any,
            ],
          },
        },
      };

      const survived = extractSurvivedMutants(report);

      expect(survived).toHaveLength(1);
      expect(survived[0].id).toBe("unknown");
      expect(survived[0].line).toBe(1);
      expect(survived[0].column).toBe(1);
    });

    it("handhabt fehlerhafte oder unvollständige Mutanten-Objekte gracefully", () => {
      const malformedReport: MutationReport = {
        files: {
          "src/bad.ts": {
            mutants: [
              {
                id: "99",
                status: "Survived",
              } as any,
            ],
          },
        },
      };

      const survived = extractSurvivedMutants(malformedReport);
      expect(survived).toHaveLength(1);
      expect(survived[0].line).toBe(1);
      expect(survived[0].column).toBe(1);
      expect(survived[0].mutatorName).toBe("Unknown");
      expect(survived[0].replacement).toBe("");
    });
  });
});

