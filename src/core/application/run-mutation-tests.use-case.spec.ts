// src/core/application/run-mutation-tests.use-case.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { RunMutationTestsUseCase } from "./run-mutation-tests.use-case.js";
import { ReportStream } from "../domain/report-stream.js";
import { ExecutionStatusStream } from "../domain/execution-status.js";
import type { StrykerRunnerPort } from "../domain/stryker-runner.port.js";
import type { NotificationServicePort } from "../domain/notification-service.port.js";
import type { MutationReport } from "../domain/mutation-report.js";
import { ok, err } from "../domain/result.js";

describe("RunMutationTestsUseCase", () => {
  let reportStream: ReportStream;
  let statusStream: ExecutionStatusStream;
  let mockRunner: StrykerRunnerPort;
  let mockNotifier: NotificationServicePort;
  let useCase: RunMutationTestsUseCase;

  const mockReport: MutationReport = {
    files: {
      "src/foo.ts": {
        mutants: [
          {
            id: "1",
            status: "Killed",
          },
        ],
      },
    },
  };

  beforeEach(() => {
    reportStream = new ReportStream();
    statusStream = new ExecutionStatusStream();
    mockRunner = {
      run: vi.fn(),
    };
    mockNotifier = {
      notifyStatus: vi.fn(),
      notifyProgress: vi.fn(),
      notifyCompletion: vi.fn(),
      notifyError: vi.fn(),
      configure: vi.fn(),
    };
    useCase = new RunMutationTestsUseCase(reportStream, statusStream, mockRunner, mockNotifier);
  });

  it("führt Mutationstests erfolgreich aus, aktualisiert Status, publiziert Report und benachrichtigt Desktop", async () => {
    vi.mocked(mockRunner.run).mockResolvedValue(ok(mockReport));

    const result = await useCase.execute({ mutate: ["src/foo.ts"] });

    expect(result.isOk).toBe(true);
    expect(result.value).toEqual(mockReport);
    expect(mockRunner.run).toHaveBeenCalledWith({ mutate: ["src/foo.ts"] });

    expect(reportStream.current()).toEqual(mockReport);
    expect(statusStream.current().state).toBe("completed");
    expect(statusStream.current().error).toBeNull();

    expect(mockNotifier.notifyStatus).toHaveBeenCalledWith("Starte Mutationstests...");
    expect(mockNotifier.notifyCompletion).toHaveBeenCalledWith(100, 1, 0);
  });

  it("setzt den Status auf 'failed', gibt ein err-Result zurück und benachrichtigt Desktop bei Fehler", async () => {
    const runnerError = new Error("Stryker build failed");
    vi.mocked(mockRunner.run).mockResolvedValue(err(runnerError));

    const result = await useCase.execute();

    expect(result.isOk).toBe(false);
    expect(result.error?.message).toBe("Stryker build failed");
    expect(statusStream.current().state).toBe("failed");
    expect(mockNotifier.notifyError).toHaveBeenCalledWith("Stryker build failed");
  });

  it("fängt unerwartete Exceptions in der Ausführung ab", async () => {
    vi.mocked(mockRunner.run).mockRejectedValue("Unerwarteter Absturz");

    const result = await useCase.execute();

    expect(result.isOk).toBe(false);
    expect(result.error?.message).toBe("Unerwarteter Absturz");
    expect(statusStream.current().state).toBe("failed");
  });

  it("verhindert parallele Läufe, wenn bereits ein Lauf aktiv ist", async () => {
    statusStream.setRunning("Aktiv");

    const result = await useCase.execute();

    expect(result.isOk).toBe(false);
    expect(result.error?.message).toBe("Ein Mutationstest-Lauf ist bereits aktiv.");
    expect(mockRunner.run).not.toHaveBeenCalled();
  });
});
