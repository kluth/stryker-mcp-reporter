// src/core/application/run-targeted-mutation-tests.use-case.ts
import type { GitServicePort } from "../domain/git-service.port.js";
import type { RunMutationTestsUseCase } from "./run-mutation-tests.use-case.js";
import type { MutationReport } from "../domain/mutation-report.js";
import { type Result, err } from "../domain/result.js";

export class RunTargetedMutationTestsUseCase {
  constructor(
    private readonly gitService: GitServicePort,
    private readonly runMutationTestsUseCase: RunMutationTestsUseCase,
  ) {}

  public async execute(baseBranch?: string): Promise<Result<MutationReport, Error>> {
    const changedFiles = await this.gitService.getChangedFiles(baseBranch);

    if (!changedFiles || changedFiles.length === 0) {
      return err(
        new Error("Keine geänderten TypeScript-Dateien für zielgerichteten Lauf gefunden."),
      );
    }

    return this.runMutationTestsUseCase.execute({ mutate: changedFiles });
  }
}
