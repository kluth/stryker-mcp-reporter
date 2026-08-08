import type { Reporter } from "@stryker-mutator/api/report";
import type { Logger } from "@stryker-mutator/api/logging";
import type { MutationTestResult } from "mutation-testing-report-schema";
import type { PublishReportUseCase } from "../../core/application/publish-report.use-case.js";
import type { McpServerAdapter } from "../mcp/mcp-server.adapter.js";
import type { DatabaseAdapter } from "../db/database.adapter.js";

export class McpReporter implements Reporter {
  constructor(
    private readonly log: Logger,
    private readonly publishUseCase: PublishReportUseCase,
    private readonly serverAdapter: McpServerAdapter,
    private readonly db: DatabaseAdapter | null = null,
  ) {}

  public async onMutationTestReportReady(
    report: MutationTestResult,
  ): Promise<void> {
    this.log.info("Mutation Testing abgeschlossen. Bereite MCP-Server vor...");

    // 1. Report über die Domain-Grenze validieren und mappen
    const useCaseResult = this.publishUseCase.execute(report);
    if (!useCaseResult.isOk) {
      this.log.error(
        `Fehler beim Verarbeiten des Reports: ${useCaseResult.error.message}`,
      );
      return;
    }

    if (this.db) {
      try {
        let commitMessage = "Unknown Commit";
        try {
          const { execSync } = await import("child_process");
          commitMessage = execSync("git log -1 --pretty=%B", { encoding: "utf-8" }).trim();
        } catch (e) {
          // ignore
        }
        
        let author = "Unknown Author";
        try {
          const { execSync } = await import("child_process");
          author = execSync("git log -1 --pretty=%an", { encoding: "utf-8" }).trim();
        } catch(e) {
          // ignore
        }

        const runId = `run-${Date.now()}`;
        const summary = {
          mutationScore: report.thresholds.high, // We could calculate this from the thresholds or use a dummy
          killed: 0,
          survived: 0,
          total: 0
        };
        
        const mutantsToSave: any[] = [];
        
        if (report.files) {
          for (const [filePath, fileObj] of Object.entries(report.files)) {
            if (fileObj.mutants) {
              for (const m of fileObj.mutants) {
                summary.total++;
                if (m.status === "Killed") summary.killed++;
                if (m.status === "Survived") summary.survived++;
                
                mutantsToSave.push({
                  id: m.id,
                  filePath: filePath,
                  mutatorName: m.mutatorName,
                  status: m.status,
                  blameAuthor: author
                });
              }
            }
          }
        }
        
        if (summary.total > 0) {
          summary.mutationScore = (summary.killed / summary.total) * 100;
        } else {
          summary.mutationScore = 0;
        }

        this.db.saveRun(runId, summary, mutantsToSave);
        this.log.info(`Speichere Mutation-Run ${runId} in der Datenbank mit ${mutantsToSave.length} Mutanten.`);
      } catch (e) {
        this.log.error(`Fehler beim Speichern in der Datenbank: ${e}`);
      }
    }

    // 3. Den Stryker-Lifecycle nur blockieren und Server starten, wenn Daemon-Modus aktiv ist
    if (process.env.MCP_DAEMON === "true") {
      // 2. Outbound-Adapter (Express/MCP) starten
      const serverResult = await this.serverAdapter.start();
      if (!serverResult.isOk) {
        this.log.error(
          `MCP-Server konnte nicht gestartet werden: ${serverResult.error.message}`,
        );
        return;
      }

      this.log.info(
        "🚀 MCP Server läuft auf Port 3000! Warte auf KI-Verbindungen (Beenden mit Strg+C).",
      );

      return new Promise(() => {
        // Dieses Promise wird nie resolved. Der Prozess bleibt am Leben.
      });
    }

    return Promise.resolve();
  }
}
