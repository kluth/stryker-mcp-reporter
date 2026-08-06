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

  /**
   * Ermittelt geänderte Dateien inkl. der exakten geänderten Zeilenbereiche.
   * Rückgabeformat z.B. ["src/foo.ts:10-15", "src/bar.ts:2-5"]
   */
  getChangedLineRanges(revisionOrBranch?: string): Promise<string[]>;
}
