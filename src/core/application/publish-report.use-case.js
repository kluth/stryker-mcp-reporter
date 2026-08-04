import { err } from "../domain/result.js";
export class PublishReportUseCase {
    reportStream;
    constructor(reportStream) {
        this.reportStream = reportStream;
    }
    /**
     * Nimmt den rohen Report von Stryker entgegen, validiert ihn
     * und publiziert ihn typsicher in den Stream.
     */
    execute(rawReport) {
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
    mapToDomain(rawReport) {
        return {
            files: rawReport.files || {},
        };
    }
}
