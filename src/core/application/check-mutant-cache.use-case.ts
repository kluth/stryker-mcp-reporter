import type { DatabaseAdapter } from "../../infrastructure/db/database.adapter.js";
import { type Result, ok, err } from "../domain/result.js";
import crypto from "crypto";

export class CheckMutantCacheUseCase {
  constructor(private readonly db: DatabaseAdapter) {}

  public execute(mutantContent: string, filePath: string): Result<{ cached: boolean; status?: string; mutantId?: string }, Error> {
    try {
      // Create a hash of the mutant content (representing AST/file hash)
      const hash = crypto.createHash("sha256").update(`${filePath}:${mutantContent}`).digest("hex");
      
      const cached = this.db.getFromMutantCache(hash);
      
      if (cached) {
        return ok({
          cached: true,
          status: cached.status,
          mutantId: cached.mutant_id
        });
      }

      return ok({ cached: false });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  public save(mutantContent: string, filePath: string, mutantId: string, status: string): void {
    const hash = crypto.createHash("sha256").update(`${filePath}:${mutantContent}`).digest("hex");
    this.db.saveToMutantCache(hash, mutantId, filePath, status);
  }
}
