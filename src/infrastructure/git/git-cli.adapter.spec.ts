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

  it("gibt geänderte TypeScript-Dateien aus `git diff` zurück", async () => {
    const execCommand = vi.fn().mockResolvedValue("src/foo.ts\nsrc/bar.ts\nREADME.md\nsrc/test.spec.ts\n");
    const adapter = new GitCliAdapter(loggerMock, execCommand);

    const files = await adapter.getChangedFiles("main");

    expect(files).toEqual(["src/foo.ts", "src/bar.ts"]);
    expect(execCommand).toHaveBeenCalledWith("git diff --name-only main");
  });

  it("fällt auf `git status --porcelain` zurück, wenn kein Branch übergeben wird", async () => {
    const execCommand = vi.fn().mockResolvedValue(" M src/calculator.ts\n?? src/new-file.ts\n M package.json\n");
    const adapter = new GitCliAdapter(loggerMock, execCommand);

    const files = await adapter.getChangedFiles();

    expect(files).toEqual(["src/calculator.ts", "src/new-file.ts"]);
    expect(execCommand).toHaveBeenCalledWith("git status --porcelain");
  });

  it("fängt Fehler bei Befehlsausführung ab und gibt leeres Array zurück", async () => {
    const execCommand = vi.fn().mockRejectedValue(new Error("Git fatal error"));
    const adapter = new GitCliAdapter(loggerMock, execCommand);

    const files = await adapter.getChangedFiles("main");

    expect(files).toEqual([]);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining("Konnte geänderte Git-Dateien nicht ermitteln"),
      expect.any(Error),
    );
  });
});
