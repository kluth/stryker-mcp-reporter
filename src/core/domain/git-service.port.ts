// src/core/domain/git-service.port.ts

export interface GitServicePort {
  /**
   * Ermittelt geänderte Dateien bezogen auf eine Revision, einen Branch oder uncommitted Changes.
   */
  getChangedFiles(revisionOrBranch?: string): Promise<string[]>;

  /**
   * Ermittelt geänderte Dateien zwischen zwei spezifischen Git-Revisionen/Commits (z.B. v1.0.0..v1.1.0).
   */
  getChangedFilesBetween(
    fromRevision: string,
    toRevision: string,
  ): Promise<string[]>;

  /**
   * Ermittelt geänderte Dateien eines einzelnen spezifischen Commits per SHA.
   */
  getChangedFilesForCommit(commitSha: string): Promise<string[]>;
}
