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

  public async getChangedFiles(baseBranch?: string): Promise<string[]> {
    try {
      let command: string;
      if (baseBranch) {
        command = `git diff --name-only ${baseBranch}`;
      } else {
        command = "git status --porcelain";
      }

      const output = await this.execFn(command);
      return this.parseGitOutput(output, !!baseBranch);
    } catch (error) {
      this.logger.warn("Konnte geänderte Git-Dateien nicht ermitteln:", error as Error);
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
