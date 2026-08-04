// src/core/application/publish-report.use-case.ts
import type { MutationTestResult } from "mutation-testing-report-schema";
import type { ReportStream } from "../domain/report-stream.js";
import type { MutationReport } from "../domain/mutation-report.js";
import { type Result, err } from "../domain/result.js";

export class PublishReportUseCase {
  constructor(private readonly reportStream: ReportStream) {}

  /**
   * Nimmt den rohen Report von Stryker entgegen, validiert ihn
   * und publiziert ihn typsicher in den Stream.
   */
  public execute(rawReport: MutationTestResult): Result<void, Error> {
    if (!rawReport || typeof rawReport !== "object") {
      return err(new Error("Invalid raw report provided by Stryker."));
    }

    const domainReport = this.mapToDomain(rawReport);

    return this.reportStream.publish(domainReport);
  }

  /**
   * Wandelt die externe Struktur in unsere interne Domain-Struktur um.
   * Schützt die Domain vor unerwarteten API-Änderungen.
   */
  private mapToDomain(rawReport: MutationTestResult): MutationReport {
    return {
      files: rawReport.files || {},
    };
  }
}
