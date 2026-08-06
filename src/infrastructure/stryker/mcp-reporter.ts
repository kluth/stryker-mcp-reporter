// src/infrastructure/stryker/mcp-reporter.ts
import type { Reporter } from "@stryker-mutator/api/report";
import type { Logger } from "@stryker-mutator/api/logging";
import type { MutationTestResult } from "mutation-testing-report-schema";
import type { PublishReportUseCase } from "../../core/application/publish-report.use-case.js";
import type { McpServerAdapter } from "../mcp/mcp-server.adapter.js";

export class McpReporter implements Reporter {
  constructor(
    private readonly log: Logger,
    private readonly publishUseCase: PublishReportUseCase,
    private readonly serverAdapter: McpServerAdapter,
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

    // 3. Den Stryker-Lifecycle nur blockieren, wenn Daemon-Modus aktiv ist
    if (process.env.MCP_DAEMON === "true") {
      return new Promise(() => {
        // Dieses Promise wird nie resolved. Der Prozess bleibt am Leben.
      });
    }
    return Promise.resolve();
  }
}
