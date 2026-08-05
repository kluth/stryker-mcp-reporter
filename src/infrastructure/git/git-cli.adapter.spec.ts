// src/infrastructure/git/git-cli.adapter.spec.ts
import { describe, it, expect, vi } from "vitest";
import { GitCliAdapter } from "./git-cli.adapter.js";
import type { Logger } from "@stryker-mutator/api/logging";

describe("GitCliAdapter", () => {
  const loggerMock = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;

  it("gibt geänderte TypeScript-Dateien aus `git diff` für eine Revision zurück", async () => {
    const execCommand = vi.fn().mockResolvedValue("src/foo.ts\nsrc/bar.ts\nREADME.md\nsrc/test.spec.ts\n");
    const adapter = new GitCliAdapter(loggerMock, execCommand);

    const files = await adapter.getChangedFiles("HEAD~2");

    expect(files).toEqual(["src/foo.ts", "src/bar.ts"]);
    expect(execCommand).toHaveBeenCalledWith("git diff --name-only HEAD~2");
  });

  it("gibt geänderte TypeScript-Dateien zwischen zwei Reversionen/Commits zurück", async () => {
    const execCommand = vi.fn().mockResolvedValue("src/core/domain/user.ts\nsrc/index.ts\n");
    const adapter = new GitCliAdapter(loggerMock, execCommand);

    const files = await adapter.getChangedFilesBetween("v1.0.0", "v1.1.0");

    expect(files).toEqual(["src/core/domain/user.ts", "src/index.ts"]);
    expect(execCommand).toHaveBeenCalledWith("git diff --name-only v1.0.0..v1.1.0");
  });

  it("gibt geänderte TypeScript-Dateien eines einzelnen spezifischen Commits zurück", async () => {
    const execCommand = vi.fn().mockResolvedValue("src/infrastructure/mcp/adapter.ts\n");
    const adapter = new GitCliAdapter(loggerMock, execCommand);

    const files = await adapter.getChangedFilesForCommit("a9d1206");

    expect(files).toEqual(["src/infrastructure/mcp/adapter.ts"]);
    expect(execCommand).toHaveBeenCalledWith("git diff-tree --no-commit-id --name-only -r a9d1206");
  });

  it("fällt auf `git status --porcelain` zurück, wenn kein Argument übergeben wird", async () => {
    const execCommand = vi.fn().mockResolvedValue(" M src/calculator.ts\n?? src/new-file.ts\n M package.json\n");
    const adapter = new GitCliAdapter(loggerMock, execCommand);

    const files = await adapter.getChangedFiles();

    expect(files).toEqual(["src/calculator.ts", "src/new-file.ts"]);
    expect(execCommand).toHaveBeenCalledWith("git status --porcelain");
  });

  it("nutzt die Standard execFn, wenn keine übergeben wird", async () => {
    const adapter = new GitCliAdapter(loggerMock);
    const files = await adapter.getChangedFiles();
    expect(Array.isArray(files)).toBe(true);
  });

  it("fängt Fehler bei getChangedFiles, getChangedFilesBetween und getChangedFilesForCommit ab", async () => {
    const execCommand = vi.fn().mockRejectedValue(new Error("Git range error"));
    const adapter = new GitCliAdapter(loggerMock, execCommand);

    const mainFiles = await adapter.getChangedFiles("main");
    const betweenFiles = await adapter.getChangedFilesBetween("v1", "v2");
    const commitFiles = await adapter.getChangedFilesForCommit("invalid");

    expect(mainFiles).toEqual([]);
    expect(betweenFiles).toEqual([]);
    expect(commitFiles).toEqual([]);
    expect(loggerMock.warn).toHaveBeenCalledTimes(3);
  });
});
