// src/core/domain/mutation-report.ts

export type MutantStatus =
  | "Killed"
  | "Survived"
  | "NoCoverage"
  | "CompileError"
  | "Timeout"
  | "Ignored"
  | "RuntimeError";

export interface Location {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface RawMutant {
  id: string;
  mutatorName?: string;
  replacement?: string;
  location?: Location;
  status: MutantStatus;
  coveredBy?: string[];
  killedBy?: string[];
  testsRan?: string[];
}

export interface FileResult {
  language?: string;
  source?: string;
  mutants?: RawMutant[];
}

export interface Thresholds {
  high?: number;
  low?: number;
}

export interface MutationReport {
  schemaVersion?: string;
  thresholds?: Thresholds;
  projectRoot?: string;
  files: Record<string, FileResult>;
}

export interface MutationSummary {
  totalMutants: number;
  killed: number;
  survived: number;
  noCoverage: number;
  timeout: number;
  compileError: number;
  ignored: number;
  runtimeError: number;
  mutationScore: number;
}

export interface MutantDetail {
  id: string;
  filePath: string;
  mutatorName: string;
  replacement: string;
  line: number;
  column: number;
  status: MutantStatus;
  testsRan: string[];
}

/**
 * Berechnet detaillierte Zusammenfassungsstatistiken und den Mutationsscore aus einem MutationReport.
 */
export function calculateMutationSummary(report: MutationReport): MutationSummary {
  const summary: MutationSummary = {
    totalMutants: 0,
    killed: 0,
    survived: 0,
    noCoverage: 0,
    timeout: 0,
    compileError: 0,
    ignored: 0,
    runtimeError: 0,
    mutationScore: 100,
  };

  if (!report || !report.files) {
    return summary;
  }

  for (const fileResult of Object.values(report.files)) {
    if (!fileResult || !Array.isArray(fileResult.mutants)) {
      continue;
    }

    for (const mutant of fileResult.mutants) {
      summary.totalMutants++;
      switch (mutant.status) {
        case "Killed":
          summary.killed++;
          break;
        case "Survived":
          summary.survived++;
          break;
        case "NoCoverage":
          summary.noCoverage++;
          break;
        case "Timeout":
          summary.timeout++;
          break;
        case "CompileError":
          summary.compileError++;
          break;
        case "Ignored":
          summary.ignored++;
          break;
        case "RuntimeError":
          summary.runtimeError++;
          break;
      }
    }
  }

  const detected = summary.killed + summary.timeout;
  const validMutants = summary.killed + summary.survived + summary.noCoverage + summary.timeout;

  if (validMutants > 0) {
    summary.mutationScore = Number(((detected / validMutants) * 100).toFixed(2));
  } else {
    summary.mutationScore = 100;
  }

  return summary;
}

/**
 * Extrahiert alle überlebenden Mutanten inkl. Pfad, Position und Ersetzung aus dem MutationReport.
 */
export function extractSurvivedMutants(
  report: MutationReport,
  filePathFilter?: string,
): MutantDetail[] {
  const result: MutantDetail[] = [];

  if (!report || !report.files) {
    return result;
  }

  for (const [filePath, fileResult] of Object.entries(report.files)) {
    if (filePathFilter && filePath !== filePathFilter && !filePath.endsWith(filePathFilter)) {
      continue;
    }

    if (!fileResult || !Array.isArray(fileResult.mutants)) {
      continue;
    }

    for (const mutant of fileResult.mutants) {
      if (mutant.status === "Survived") {
        const id = typeof mutant.id === "string" && mutant.id !== "" ? mutant.id : "unknown";
        const mutatorName = typeof mutant.mutatorName === "string" && mutant.mutatorName !== "" ? mutant.mutatorName : "Unknown";
        const testsRan = Array.isArray(mutant.testsRan) ? mutant.testsRan : [];

        result.push({
          id,
          filePath,
          mutatorName,
          replacement: mutant.replacement ?? "",
          line: mutant.location?.start?.line ?? 1,
          column: mutant.location?.start?.column ?? 1,
          status: "Survived",
          testsRan,
        });
      }
    }
  }

  return result;
}

/**
 * Extrahiert alle getöteten Mutanten (Killed) inkl. Pfad, Position und Ersetzung.
 */
export function extractKilledMutants(
  report: MutationReport,
  filePathFilter?: string,
): MutantDetail[] {
  const result: MutantDetail[] = [];

  if (!report || !report.files) {
    return result;
  }

  for (const [filePath, fileResult] of Object.entries(report.files)) {
    if (filePathFilter && filePath !== filePathFilter && !filePath.endsWith(filePathFilter)) {
      continue;
    }

    if (!fileResult || !Array.isArray(fileResult.mutants)) {
      continue;
    }

    for (const mutant of fileResult.mutants) {
      if (mutant.status === "Killed") {
        const id = typeof mutant.id === "string" && mutant.id !== "" ? mutant.id : "unknown";
        const mutatorName = typeof mutant.mutatorName === "string" && mutant.mutatorName !== "" ? mutant.mutatorName : "Unknown";
        const testsRan = Array.isArray(mutant.testsRan) ? mutant.testsRan : [];

        result.push({
          id,
          filePath,
          mutatorName,
          replacement: mutant.replacement ?? "",
          line: mutant.location?.start?.line ?? 1,
          column: mutant.location?.start?.column ?? 1,
          status: "Killed",
          testsRan,
        });
      }
    }
  }

  return result;
}
