// src/core/application/get-survived-mutants.use-case.spec.ts
import { describe, it, expect, beforeEach } from "vitest";
import { GetSurvivedMutantsUseCase } from "./get-survived-mutants.use-case.js";
import { ReportStream } from "../domain/report-stream.js";
import type { MutationReport } from "../domain/mutation-report.js";

describe("GetSurvivedMutantsUseCase", () => {
  let reportStream: ReportStream;
  let useCase: GetSurvivedMutantsUseCase;

  const sampleReport: MutationReport = {
    files: {
      "src/foo.ts": {
        mutants: [
          {
            id: "1",
            mutatorName: "Arithmetic",
            replacement: "-",
            location: {
              start: { line: 5, column: 10 },
              end: { line: 5, column: 11 },
            },
            status: "Survived",
            testsRan: ["test1"],
          },
          {
            id: "2",
            mutatorName: "Equality",
            status: "Killed",
          },
        ],
      },
    },
  };

  beforeEach(() => {
    reportStream = new ReportStream();
    useCase = new GetSurvivedMutantsUseCase(reportStream);
  });

  it("gibt ein err-Result zurück, wenn kein Report im Stream liegt", async () => {
    const result = await useCase.execute();

    expect(result.isOk).toBe(false);
    expect(result.error?.message).toBe(
      "Kein Mutation-Testing-Report verfügbar.",
    );
  });

  it("extrahiert alle überlebenden Mutanten aus dem aktuellen Report", async () => {
    reportStream.publish(sampleReport);

    const result = await useCase.execute();

    expect(result.isOk).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(result.value![0].id).toBe("1");
    expect(result.value![0].filePath).toBe("src/foo.ts");
    expect(result.value![0].mutatorName).toBe("Arithmetic");
  });

  it("unterstützt das Filtern nach Dateipfad", async () => {
    reportStream.publish(sampleReport);

    const resultMatch = await useCase.execute("src/foo.ts");
    expect(resultMatch.isOk).toBe(true);
    expect(resultMatch.value).toHaveLength(1);

    const resultNoMatch = await useCase.execute("src/bar.ts");
    expect(resultNoMatch.isOk).toBe(true);
    expect(resultNoMatch.value).toHaveLength(0);
  });
});
