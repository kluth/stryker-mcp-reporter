// src/core/application/run-targeted-mutation-tests.use-case.ts
import type { GitServicePort } from "../domain/git-service.port.js";
import type { RunMutationTestsUseCase } from "./run-mutation-tests.use-case.js";
import type { MutationReport } from "../domain/mutation-report.js";
import { type Result, err } from "../domain/result.js";

export interface TargetedRunOptions {
  /** Spezifischer Commit SHA (z. B. "a9d1206") */
  commitSha?: string;
  /** Revision oder Branch Name (z. B. "HEAD~1" oder "main") */
  revision?: string;
  /** Start-Revision für einen Commit-Bereich (z. B. "v1.0.0" oder "HEAD~3") */
  fromRevision?: string;
  /** Ziel-Revision für einen Commit-Bereich (z. B. "v1.1.0" oder "HEAD") */
  toRevision?: string;
}

export class RunTargetedMutationTestsUseCase {
  constructor(
    private readonly gitService: GitServicePort,
    private readonly runMutationTestsUseCase: RunMutationTestsUseCase,
  ) {}

  public async execute(options?: string | TargetedRunOptions): Promise<Result<MutationReport, Error>> {
    let changedFiles: string[] = [];

    if (typeof options === "string") {
      changedFiles = await this.gitService.getChangedFiles(options);
    } else if (options?.commitSha) {
      changedFiles = await this.gitService.getChangedFilesForCommit(options.commitSha);
    } else if (options?.fromRevision && options?.toRevision) {
      changedFiles = await this.gitService.getChangedFilesBetween(options.fromRevision, options.toRevision);
    } else {
      changedFiles = await this.gitService.getChangedFiles(options?.revision);
    }

    if (!changedFiles || changedFiles.length === 0) {
      return err(
        new Error("Keine geänderten TypeScript-Dateien für zielgerichteten Lauf gefunden."),
      );
    }

    return this.runMutationTestsUseCase.execute({ mutate: changedFiles });
  }
}
