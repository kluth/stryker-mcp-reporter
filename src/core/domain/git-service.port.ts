// src/core/domain/git-service.port.ts

export interface GitServicePort {
  getChangedFiles(baseBranch?: string): Promise<string[]>;
}
