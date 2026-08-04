// src/core/application/run-targeted-mutation-tests.use-case.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { RunTargetedMutationTestsUseCase } from "./run-targeted-mutation-tests.use-case.js";
import { RunMutationTestsUseCase } from "./run-mutation-tests.use-case.js";
import type { GitServicePort } from "../domain/git-service.port.js";
import { ok, err } from "../domain/result.js";
import type { MutationReport } from "../domain/mutation-report.js";

describe("RunTargetedMutationTestsUseCase", () => {
  let mockGitService: GitServicePort;
  let mockRunUseCase: RunMutationTestsUseCase;
  let useCase: RunTargetedMutationTestsUseCase;

  const mockReport: MutationReport = { files: {} };

  beforeEach(() => {
    mockGitService = {
      getChangedFiles: vi.fn(),
    };
    mockRunUseCase = {
      execute: vi.fn(),
    } as unknown as RunMutationTestsUseCase;

    useCase = new RunTargetedMutationTestsUseCase(mockGitService, mockRunUseCase);
  });

  it("ermittelt geänderte Dateien und führt Mutationstests zielgerichtet dafür aus", async () => {
    vi.mocked(mockGitService.getChangedFiles).mockResolvedValue(["src/foo.ts", "src/bar.ts"]);
    vi.mocked(mockRunUseCase.execute).mockResolvedValue(ok(mockReport));

    const result = await useCase.execute("main");

    expect(result.isOk).toBe(true);
    expect(mockGitService.getChangedFiles).toHaveBeenCalledWith("main");
    expect(mockRunUseCase.execute).toHaveBeenCalledWith({ mutate: ["src/foo.ts", "src/bar.ts"] });
  });

  it("gibt ein err-Result zurück, wenn keine geänderten Dateien gefunden wurden", async () => {
    vi.mocked(mockGitService.getChangedFiles).mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.isOk).toBe(false);
    expect(result.error?.message).toBe("Keine geänderten TypeScript-Dateien für zielgerichteten Lauf gefunden.");
    expect(mockRunUseCase.execute).not.toHaveBeenCalled();
  });

  it("reicht Fehler aus dem Run-Use-Case durch", async () => {
    vi.mocked(mockGitService.getChangedFiles).mockResolvedValue(["src/foo.ts"]);
    vi.mocked(mockRunUseCase.execute).mockResolvedValue(err(new Error("Lauf fehlgeschlagen")));

    const result = await useCase.execute();

    expect(result.isOk).toBe(false);
    expect(result.error?.message).toBe("Lauf fehlgeschlagen");
  });
});
