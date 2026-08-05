// src/infrastructure/git/git-cli.adapter.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitCliAdapter, type ExecCommandFn } from "./git-cli.adapter.js";
import type { Logger } from "@stryker-mutator/api/logging";

describe("GitCliAdapter", () => {
  let loggerMock: Logger;

  beforeEach(() => {
    loggerMock = {
      warn: vi.fn(),
    } as unknown as Logger;
  });

  it("extrahiert geänderte TS-Dateien aus git status --porcelain (ohne revision)", async () => {
    const mockExec: ExecCommandFn = vi.fn().mockResolvedValue(`
 M src/index.ts
?? src/app.ts
src/direct.ts
 M src/index.spec.ts
 M src/types.d.ts
 M README.md
    `);

    const adapter = new GitCliAdapter(loggerMock, mockExec);
    const files = await adapter.getChangedFiles();

    expect(mockExec).toHaveBeenCalledWith("git status --porcelain");
    expect(files).toEqual(["src/index.ts", "src/app.ts", "src/direct.ts"]);
  });

  it("handhabt leeren Revision-String wie den Standard git status --porcelain", async () => {
    const mockExec: ExecCommandFn = vi.fn().mockResolvedValue(" M src/foo.ts");

    const adapter = new GitCliAdapter(loggerMock, mockExec);
    const files = await adapter.getChangedFiles("   ");

    expect(mockExec).toHaveBeenCalledWith("git status --porcelain");
    expect(files).toEqual(["src/foo.ts"]);
  });

  it("nutzt git diff, wenn eine Revision übergeben wird", async () => {
    const mockExec: ExecCommandFn = vi.fn().mockResolvedValue(`
src/core/domain/mutation-report.ts
src/core/domain/mutation-report.spec.ts
package.json
    `);

    const adapter = new GitCliAdapter(loggerMock, mockExec);
    const files = await adapter.getChangedFiles("HEAD~1");

    expect(mockExec).toHaveBeenCalledWith("git diff --name-only HEAD~1");
    expect(files).toEqual(["src/core/domain/mutation-report.ts"]);
  });

  it("extrahiert geänderte Dateien zwischen zwei Revisionen via getChangedFilesBetween", async () => {
    const mockExec: ExecCommandFn = vi.fn().mockResolvedValue(`
src/a.ts
src/b.ts
src/b.spec.ts
    `);

    const adapter = new GitCliAdapter(loggerMock, mockExec);
    const files = await adapter.getChangedFilesBetween("v1.0.0", "v1.1.0");

    expect(mockExec).toHaveBeenCalledWith("git diff --name-only v1.0.0..v1.1.0");
    expect(files).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("extrahiert geänderte Dateien eines spezifischen Commits via getChangedFilesForCommit", async () => {
    const mockExec: ExecCommandFn = vi.fn().mockResolvedValue(`
src/feature.ts
    `);

    const adapter = new GitCliAdapter(loggerMock, mockExec);
    const files = await adapter.getChangedFilesForCommit("a9d1206");

    expect(mockExec).toHaveBeenCalledWith("git diff-tree --no-commit-id --name-only -r a9d1206");
    expect(files).toEqual(["src/feature.ts"]);
  });

  it("fängt Fehler in git Befehlen ab, loggt eine Warnung und gibt leeres Array zurück", async () => {
    const gitError = new Error("Git command failed");
    const mockExec: ExecCommandFn = vi.fn().mockRejectedValue(gitError);

    const adapter = new GitCliAdapter(loggerMock, mockExec);
    
    expect(await adapter.getChangedFiles()).toEqual([]);
    expect(await adapter.getChangedFilesBetween("a", "b")).toEqual([]);
    expect(await adapter.getChangedFilesForCommit("c")).toEqual([]);
    expect(loggerMock.warn).toHaveBeenCalledTimes(3);
  });

  it("nutzt die Standard execFn, wenn keine übergeben wird", async () => {
    const adapter = new GitCliAdapter(loggerMock);
    const files = await adapter.getChangedFiles();
    expect(Array.isArray(files)).toBe(true);
  });
});
