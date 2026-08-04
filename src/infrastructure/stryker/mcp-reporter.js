export class McpReporter {
    log;
    publishUseCase;
    serverAdapter;
    constructor(log, publishUseCase, serverAdapter) {
        this.log = log;
        this.publishUseCase = publishUseCase;
        this.serverAdapter = serverAdapter;
    }
    async onMutationTestReportReady(report) {
        this.log.info("Mutation Testing abgeschlossen. Bereite MCP-Server vor...");
        // 1. Report über die Domain-Grenze validieren und mappen
        const useCaseResult = this.publishUseCase.execute(report);
        if (!useCaseResult.isOk) {
            this.log.error(`Fehler beim Verarbeiten des Reports: ${useCaseResult.error.message}`);
            return;
        }
        // 2. Outbound-Adapter (Express/MCP) starten
        const serverResult = await this.serverAdapter.start();
        if (!serverResult.isOk) {
            this.log.error(`MCP-Server konnte nicht gestartet werden: ${serverResult.error.message}`);
            return;
        }
        this.log.info("🚀 MCP Server läuft auf Port 3000! Warte auf KI-Verbindungen (Beenden mit Strg+C).");
        // 3. Den Stryker-Lifecycle blockieren, damit der Server offen bleibt
        return new Promise(() => {
            // Dieses Promise wird nie resolved. Der Prozess bleibt am Leben.
        });
    }
}
