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
      getChangedFilesBetween: vi.fn(),
      getChangedFilesForCommit: vi.fn(),
    };
    mockRunUseCase = {
      execute: vi.fn(),
    } as unknown as RunMutationTestsUseCase;

    useCase = new RunTargetedMutationTestsUseCase(mockGitService, mockRunUseCase);
  });

  it("ermittelt geänderte Dateien für einen einzelnen Commit und führt Mutationstests dafür aus", async () => {
    vi.mocked(mockGitService.getChangedFilesForCommit).mockResolvedValue(["src/foo.ts"]);
    vi.mocked(mockRunUseCase.execute).mockResolvedValue(ok(mockReport));

    const result = await useCase.execute({ commitSha: "a9d1206" });

    expect(result.isOk).toBe(true);
    expect(mockGitService.getChangedFilesForCommit).toHaveBeenCalledWith("a9d1206");
    expect(mockRunUseCase.execute).toHaveBeenCalledWith({ mutate: ["src/foo.ts"] });
  });

  it("ermittelt geänderte Dateien für eine Commit-Range (from/to) und führt Mutationstests dafür aus", async () => {
    vi.mocked(mockGitService.getChangedFilesBetween).mockResolvedValue(["src/bar.ts"]);
    vi.mocked(mockRunUseCase.execute).mockResolvedValue(ok(mockReport));

    const result = await useCase.execute({ fromRevision: "v1.0.0", toRevision: "v1.1.0" });

    expect(result.isOk).toBe(true);
    expect(mockGitService.getChangedFilesBetween).toHaveBeenCalledWith("v1.0.0", "v1.1.0");
    expect(mockRunUseCase.execute).toHaveBeenCalledWith({ mutate: ["src/bar.ts"] });
  });

  it("ermittelt geänderte Dateien für eine Revision (z.B. HEAD~1 oder main)", async () => {
    vi.mocked(mockGitService.getChangedFiles).mockResolvedValue(["src/baz.ts"]);
    vi.mocked(mockRunUseCase.execute).mockResolvedValue(ok(mockReport));

    const result = await useCase.execute({ revision: "HEAD~1" });

    expect(result.isOk).toBe(true);
    expect(mockGitService.getChangedFiles).toHaveBeenCalledWith("HEAD~1");
    expect(mockRunUseCase.execute).toHaveBeenCalledWith({ mutate: ["src/baz.ts"] });
  });

  it("unterstützt String-Argument als Rückwärtskompatibilität für baseBranch", async () => {
    vi.mocked(mockGitService.getChangedFiles).mockResolvedValue(["src/foo.ts"]);
    vi.mocked(mockRunUseCase.execute).mockResolvedValue(ok(mockReport));

    const result = await useCase.execute("main");

    expect(result.isOk).toBe(true);
    expect(mockGitService.getChangedFiles).toHaveBeenCalledWith("main");
  });

  it("fällt auf getChangedFiles zurück wenn nur fromRevision ohne toRevision angegeben wird", async () => {
    vi.mocked(mockGitService.getChangedFiles).mockResolvedValue(["src/fallback.ts"]);
    vi.mocked(mockRunUseCase.execute).mockResolvedValue(ok(mockReport));

    const result = await useCase.execute({ fromRevision: "v1.0.0" });

    expect(result.isOk).toBe(true);
    expect(mockGitService.getChangedFiles).toHaveBeenCalled();
  });

  it("gibt ein err-Result zurück, wenn getChangedFiles null zurückgibt", async () => {
    vi.mocked(mockGitService.getChangedFiles).mockResolvedValue(null as any);

    const result = await useCase.execute();

    expect(result.isOk).toBe(false);
    expect(result.error?.message).toBe("Keine geänderten TypeScript-Dateien für zielgerichteten Lauf gefunden.");
  });
});
