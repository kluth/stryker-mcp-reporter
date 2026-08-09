/* eslint-disable max-lines, complexity, no-useless-assignment */
// src/infrastructure/git/git-cli.adapter.ts
import { execFile } from "child_process";
import { promisify } from "util";
import type { Logger } from "@stryker-mutator/api/logging";
import type { GitServicePort } from "../../core/domain/git-service.port.js";

const execFileAsync = promisify(execFile);

export type ExecCommandFn = (
  command: string,
  args: string[],
) => Promise<string>;

export class GitCliAdapter implements GitServicePort {
  constructor(
    private readonly logger: Logger,
    private readonly execFn: ExecCommandFn = async (cmd, args) => {
      const { stdout } = await execFileAsync(cmd, args);
      return stdout;
    },
  ) {}

  public async getChangedFiles(revisionOrBranch?: string): Promise<string[]> {
    try {
      const isDiff =
        typeof revisionOrBranch === "string" &&
        revisionOrBranch.trim().length > 0;
      const args = isDiff
        ? ["diff", "--name-only", revisionOrBranch]
        : ["status", "--porcelain"];

      const output = await this.execFn("git", args);
      return this.parseGitOutput(output, isDiff);
    } catch (error) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      this.logger.warn("Konnte geänderte Git-Dateien nicht ermitteln:", errObj);
      return [];
    }
  }

  public async getChangedFilesBetween(
    fromRevision: string,
    toRevision: string,
  ): Promise<string[]> {
    try {
      const args = ["diff", "--name-only", `${fromRevision}..${toRevision}`];
      const output = await this.execFn("git", args);
      return this.parseGitOutput(output, true);
    } catch (error) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(
        `Konnte geänderte Git-Dateien zwischen ${fromRevision} und ${toRevision} nicht ermitteln:`,
        errObj,
      );
      return [];
    }
  }

  public async getChangedFilesForCommit(commitSha: string): Promise<string[]> {
    try {
      const args = [
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        commitSha,
      ];
      const output = await this.execFn("git", args);
      return this.parseGitOutput(output, true);
    } catch (error) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(
        `Konnte geänderte Git-Dateien für Commit ${commitSha} nicht ermitteln:`,
        errObj,
      );
      return [];
    }
  }

  public async getChangedLineRanges(revisionOrBranch?: string): Promise<string[]> {
    try {
      const isDiff =
        typeof revisionOrBranch === "string" &&
        revisionOrBranch.trim().length > 0;
      const args = isDiff
        ? ["diff", "-U0", revisionOrBranch]
        : ["diff", "-U0"];

      const output = await this.execFn("git", args);
      return this.parseDiffOutput(output);
    } catch (error) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      this.logger.warn("Konnte geänderte Zeilenbereiche nicht ermitteln:", errObj);
      return [];
    }
  }

  private parseGitOutput(output: string, isDiff: boolean): string[] {
    const lines = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const tsFiles: string[] = [];

    for (const line of lines) {
      let filePath = line;
      if (!isDiff) {
        // Format bei `git status --porcelain`: ` M src/foo.ts` oder `?? src/foo.ts`
        const statusMatch = line.match(/^[\s\S]{1,2}\s+(.+)$/);
        filePath = statusMatch ? statusMatch[1].trim() : line;
      }

      const isTsFile = filePath.endsWith(".ts");
      const isSpecFile = filePath.endsWith(".spec.ts");
      const isDeclFile = filePath.endsWith(".d.ts");

      if (isTsFile && !isSpecFile && !isDeclFile) {
        tsFiles.push(filePath);
      }
    }

    return tsFiles;
  }

  private parseDiffOutput(output: string): string[] {
    const lines = output.split("\n");
    const results: string[] = [];
    let currentFile = "";

    for (const line of lines) {
      if (line.startsWith("+++ b/")) {
        currentFile = line.substring(6).trim();
      } else if (line.startsWith("@@ ") && currentFile) {
        if (!currentFile.endsWith(".ts") || currentFile.endsWith(".spec.ts") || currentFile.endsWith(".d.ts")) {
          continue;
        }

        const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
        if (match) {
          const startLine = parseInt(match[1], 10);
          const lineCount = match[2] ? parseInt(match[2], 10) : 1;
          
          if (lineCount > 0) {
            const endLine = startLine + lineCount - 1;
            results.push(`${currentFile}:${startLine}-${endLine}`);
          } else {
            results.push(`${currentFile}:${startLine}-${startLine}`);
          }
        }
      }
    }
    
    return results;
  }
}

