// src/core/application/publish-report.use-case.spec.ts
import { describe, it, expect, beforeEach } from "vitest";
import { PublishReportUseCase } from "./publish-report.use-case.js";
import { ReportStream } from "../domain/report-stream.js";
describe("PublishReportUseCase", () => {
    let stream;
    let useCase;
    beforeEach(() => {
        stream = new ReportStream();
        useCase = new PublishReportUseCase(stream);
    });
    it("sollte einen validen Stryker-Report in die Domain mappen und publizieren", () => {
        const rawStrykerReport = {
            schemaVersion: "1.7",
            thresholds: { high: 80, low: 60 },
            files: {
                "src/core/domain/report-stream.ts": {
                    language: "typescript",
                    source: "...",
                    mutants: [],
                },
            },
        };
        const result = useCase.execute(rawStrykerReport);
        expect(result.isOk).toBe(true);
        expect(stream.current()).not.toBeNull();
        expect(stream.current()?.files).toEqual(rawStrykerReport.files);
    });
    it("sollte mit einem expliziten Error-Result fehlschlagen, wenn der rohe Report null ist", () => {
        const result = useCase.execute(null);
        expect(result.isOk).toBe(false);
        expect(result.error?.message).toBe("Invalid raw report provided by Stryker.");
        expect(stream.current()).toBeNull();
    });
    it("sollte mit einem expliziten Error-Result fehlschlagen, wenn der rohe Report kein Objekt ist (z.B. primitiver Typ)", () => {
        const result = useCase.execute("Ich bin kein Objekt");
        expect(result.isOk).toBe(false);
        expect(result.error?.message).toBe("Invalid raw report provided by Stryker.");
        expect(stream.current()).toBeNull();
    });
});
