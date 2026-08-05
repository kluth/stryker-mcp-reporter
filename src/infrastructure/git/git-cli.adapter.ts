// src/infrastructure/git/git-cli.adapter.ts
import { exec } from "child_process";
import { promisify } from "util";
import type { Logger } from "@stryker-mutator/api/logging";
import type { GitServicePort } from "../../core/domain/git-service.port.js";

const execAsync = promisify(exec);

export type ExecCommandFn = (command: string) => Promise<string>;

export class GitCliAdapter implements GitServicePort {
  constructor(
    private readonly logger: Logger,
    private readonly execFn: ExecCommandFn = async (cmd) => {
      const { stdout } = await execAsync(cmd);
      return stdout;
    },
  ) {}

  public async getChangedFiles(revisionOrBranch?: string): Promise<string[]> {
    try {
      const command = revisionOrBranch
        ? `git diff --name-only ${revisionOrBranch}`
        : "git status --porcelain";

      const output = await this.execFn(command);
      return this.parseGitOutput(output, !!revisionOrBranch);
    } catch (error) {
      this.logger.warn("Konnte geänderte Git-Dateien nicht ermitteln:", error as Error);
      return [];
    }
  }

  public async getChangedFilesBetween(fromRevision: string, toRevision: string): Promise<string[]> {
    try {
      const command = `git diff --name-only ${fromRevision}..${toRevision}`;
      const output = await this.execFn(command);
      return this.parseGitOutput(output, true);
    } catch (error) {
      this.logger.warn(
        `Konnte geänderte Git-Dateien zwischen ${fromRevision} und ${toRevision} nicht ermitteln:`,
        error as Error,
      );
      return [];
    }
  }

  public async getChangedFilesForCommit(commitSha: string): Promise<string[]> {
    try {
      const command = `git diff-tree --no-commit-id --name-only -r ${commitSha}`;
      const output = await this.execFn(command);
      return this.parseGitOutput(output, true);
    } catch (error) {
      this.logger.warn(`Konnte geänderte Git-Dateien für Commit ${commitSha} nicht ermitteln:`, error as Error);
      return [];
    }
  }

  private parseGitOutput(output: string, isDiff: boolean): string[] {
    const lines = output.split("\n").map((line) => line.trim()).filter(Boolean);
    const tsFiles: string[] = [];

    for (const line of lines) {
      let filePath = line;
      if (!isDiff) {
        // Format bei `git status --porcelain`: ` M src/foo.ts` oder `?? src/foo.ts`
        filePath = line.replace(/^[\s\S]{1,2}\s+/, "").trim();
      }

      if (filePath.endsWith(".ts") && !filePath.endsWith(".spec.ts") && !filePath.endsWith(".d.ts")) {
        tsFiles.push(filePath);
      }
    }

    return tsFiles;
  }
}
