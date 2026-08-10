/* eslint-disable max-lines, complexity, no-useless-assignment */
import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";
import { load as loadVss } from "sqlite-vss";

export class DatabaseAdapter {
  private db: Database.Database;

  constructor() {
    const dbDir = path.resolve(process.cwd(), "reports", "mutation");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, "stryker.db");
    this.db = new Database(dbPath);
    
    this.initCoreTables();

    // Check setting for vector features
    const enableVector = this.getSetting("enable_vector_features", "false") === "true";
    
    // Load VSS extension for optional local embeddings ONLY if enabled
    if (enableVector) {
      try {
        loadVss(this.db as any);
        this.initVectorTables();
      } catch(e: any) {
        console.warn("Could not load sqlite-vss extension, vector features will be disabled.", e.message);
      }
    }
    
    this.initSearchTables();
  }

  private initCoreTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        mutation_score REAL,
        killed INTEGER,
        survived INTEGER,
        total INTEGER
      );

      CREATE TABLE IF NOT EXISTS mutants (
        id TEXT,
        run_id TEXT,
        file_path TEXT,
        mutator_name TEXT,
        status TEXT,
        blame_author TEXT,
        PRIMARY KEY (id, run_id),
        FOREIGN KEY (run_id) REFERENCES runs (id)
      );

      CREATE TABLE IF NOT EXISTS ai_insights (
        mutant_id TEXT PRIMARY KEY,
        file_path TEXT,
        insight_text TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS flaky_mutants (
        mutant_id TEXT,
        file_path TEXT,
        status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private initVectorTables(): void {
    try {
      // Create VSS virtual table for 384-dimensional embeddings (all-MiniLM-L6-v2)
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS vss_insights USING vss0(
          insight_vector(384)
        );
      `);
    } catch(e: any) {
      console.warn("Could not create VSS tables", e.message);
    }
  }

  private initSearchTables(): void {

    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS fts_insights USING fts5(
          mutant_id UNINDEXED,
          file_path,
          insight_text,
          content='ai_insights',
          content_rowid='rowid'
        );

        CREATE TRIGGER IF NOT EXISTS ai_insights_ai AFTER INSERT ON ai_insights BEGIN
          INSERT INTO fts_insights(rowid, mutant_id, file_path, insight_text) VALUES (new.rowid, new.mutant_id, new.file_path, new.insight_text);
        END;
        CREATE TRIGGER IF NOT EXISTS ai_insights_ad AFTER DELETE ON ai_insights BEGIN
          INSERT INTO fts_insights(fts_insights, rowid, mutant_id, file_path, insight_text) VALUES('delete', old.rowid, old.mutant_id, old.file_path, old.insight_text);
        END;
        CREATE TRIGGER IF NOT EXISTS ai_insights_au AFTER UPDATE ON ai_insights BEGIN
          INSERT INTO fts_insights(fts_insights, rowid, mutant_id, file_path, insight_text) VALUES('delete', old.rowid, old.mutant_id, old.file_path, old.insight_text);
          INSERT INTO fts_insights(rowid, mutant_id, file_path, insight_text) VALUES (new.rowid, new.mutant_id, new.file_path, new.insight_text);
        END;
      `);
    } catch(e: any) {
      console.warn("Could not create FTS5 tables", e);
    }
  }

  public saveRun(runId: string, summary: any, mutants: any[]): void {
    const insertRun = this.db.prepare(`
      INSERT INTO runs (id, mutation_score, killed, survived, total)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMutant = this.db.prepare(`
      INSERT INTO mutants (id, run_id, file_path, mutator_name, status, blame_author)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      insertRun.run(
        runId,
        summary.mutationScore,
        summary.killed,
        summary.survived,
        summary.total
      );

      for (const mutant of mutants) {
        insertMutant.run(
          mutant.id,
          runId,
          mutant.filePath,
          mutant.mutatorName,
          mutant.status,
          mutant.blameAuthor || "Unknown"
        );
      }
    });

    transaction();
  }

  public getRuns(): any[] {
    return this.db.prepare(`SELECT * FROM runs ORDER BY timestamp DESC`).all();
  }

  public getMutantsForRun(runId: string): any[] {
    return this.db.prepare(`SELECT * FROM mutants WHERE run_id = ?`).all(runId);
  }

  public saveFlakyMutant(mutantId: string, filePath: string, status: string): void {
    this.db.prepare(`
      INSERT INTO flaky_mutants (mutant_id, file_path, status)
      VALUES (?, ?, ?)
    `).run(mutantId, filePath, status);
  }

  public getFlakyMutants(): any[] {
    return this.db.prepare(`SELECT * FROM flaky_mutants ORDER BY timestamp DESC`).all();
  }

  public saveInsight(mutantId: string, filePath: string, insightText: string, embedding?: number[]): void {
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO ai_insights (mutant_id, file_path, insight_text)
        VALUES (?, ?, ?)
      `).run(mutantId, filePath, insightText);

      if (embedding && embedding.length > 0) {
        const row = this.db.prepare(`SELECT rowid FROM ai_insights WHERE mutant_id = ?`).get(mutantId) as any;
        if (row) {
          this.db.prepare(`
            INSERT OR REPLACE INTO vss_insights(rowid, insight_vector) 
            VALUES (?, ?)
          `).run(row.rowid, JSON.stringify(embedding));
        }
      }
    } catch(e: any) {
      console.warn("Failed to save insight text or vector", e);
    }
  }

  public getInsightForMutant(mutantId: string): any {
    return this.db.prepare(`SELECT * FROM ai_insights WHERE mutant_id = ?`).get(mutantId);
  }

  public findSimilarInsights(searchText: string, limit: number = 3): any[] {
    try {
      const sanitized = searchText.replace(/[^a-zA-Z0-9_]/g, ' ').trim().split(/\s+/).join(' OR ');
      if (!sanitized) return [];

      const rows = this.db.prepare(`
        SELECT mutant_id, file_path, insight_text, rank
        FROM fts_insights
        WHERE fts_insights MATCH ?
        ORDER BY rank
        LIMIT ?
      `).all(sanitized, limit);
      return rows;
    } catch(e: any) {
      console.warn("FTS search failed", e);
      return [];
    }
  }

  public findSimilarInsightsVector(embedding: number[], limit: number = 3): any[] {
    try {
      const rows = this.db.prepare(`
        SELECT a.mutant_id, a.file_path, a.insight_text, v.distance
        FROM vss_insights v
        JOIN ai_insights a ON a.rowid = v.rowid
        WHERE vss_search(v.insight_vector, ?)
        ORDER BY v.distance ASC
        LIMIT ?
      `).all(JSON.stringify(embedding), limit);
      return rows;
    } catch(e: any) {
      console.warn("VSS search failed", e);
      return [];
    }
  }

  public getSetting(key: string, defaultValue: string = ""): string {
    const row = this.db.prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key) as any;
    return row ? row.value : defaultValue;
  }

  public setSetting(key: string, value: string): void {
    this.db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`).run(key, value);
  }
}

