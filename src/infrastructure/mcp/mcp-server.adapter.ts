import express from "express";
import type { Server as HttpServer } from "http";
import type { AddressInfo } from "net";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Logger } from "@stryker-mutator/api/logging";

import type { ReportStream } from "../../core/domain/report-stream.js";
import type { ExecutionStatusStream } from "../../core/domain/execution-status.js";
import type { RunMutationTestsUseCase } from "../../core/application/run-mutation-tests.use-case.js";
import type { RunTargetedMutationTestsUseCase } from "../../core/application/run-targeted-mutation-tests.use-case.js";
import type { GetSurvivedMutantsUseCase } from "../../core/application/get-survived-mutants.use-case.js";
import type { GetMutationSummaryUseCase } from "../../core/application/get-mutation-summary.use-case.js";
import type { GetKilledMutantsUseCase } from "../../core/application/get-killed-mutants.use-case.js";
import type { GetMutantContextUseCase } from "../../core/application/get-mutant-context.use-case.js";
import { SuggestMutantFixesUseCase } from "../../core/application/suggest-mutant-fixes.use-case.js";
import { PredictMutationImpactUseCase } from "../../core/application/predict-mutation-impact.use-case.js";
import { MutationTrendTracker } from "../../core/domain/mutation-trend-tracker.js";
import type { NotificationServicePort } from "../../core/domain/notification-service.port.js";
import { NullNotificationAdapter } from "../notification/null-notification.adapter.js";
import { type Result, ok, err } from "../../core/domain/result.js";

import { McpResourceController } from "./mcp-resource.controller.js";
import { McpToolController } from "./mcp-tool.controller.js";
import { McpPromptController } from "./mcp-prompt.controller.js";

export const SERVER_INFO = { name: "stryker-mcp-server", version: "1.0.0" };

export class McpServerAdapter {
  private httpServer: HttpServer | null = null;
  private readonly mcpServer: Server;
  private readonly sseTransports = new Map<string, SSEServerTransport>();

  constructor(
    private readonly logger: Logger,
    private readonly reportStream: ReportStream,
    private readonly statusStream: ExecutionStatusStream,
    private readonly runUseCase: RunMutationTestsUseCase,
    private readonly runTargetedUseCase: RunTargetedMutationTestsUseCase,
    private readonly getSurvivedUseCase: GetSurvivedMutantsUseCase,
    private readonly getSummaryUseCase: GetMutationSummaryUseCase,
    private readonly getKilledUseCase: GetKilledMutantsUseCase,
    private readonly getMutantContextUseCase: GetMutantContextUseCase,
    private readonly port: number = 3000,
    private readonly notificationService: NotificationServicePort = new NullNotificationAdapter(),
  ) {
    this.mcpServer = new Server(SERVER_INFO, {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    });

    const suggestFixesUseCase = new SuggestMutantFixesUseCase();
    const predictImpactUseCase = new PredictMutationImpactUseCase();
    const trendTracker = new MutationTrendTracker();

    const resourceController = new McpResourceController(
      this.mcpServer,
      this.logger,
      this.reportStream,
      this.statusStream,
      this.getSummaryUseCase,
      this.getSurvivedUseCase,
      this.getKilledUseCase,
      trendTracker,
    );
    resourceController.register();

    const toolController = new McpToolController(
      this.mcpServer,
      this.logger,
      this.runUseCase,
      this.runTargetedUseCase,
      this.getSummaryUseCase,
      this.getSurvivedUseCase,
      this.getKilledUseCase,
      this.getMutantContextUseCase,
      suggestFixesUseCase,
      predictImpactUseCase,
      this.notificationService,
    );
    toolController.register();

    const promptController = new McpPromptController(
      this.mcpServer,
      this.getSurvivedUseCase,
      suggestFixesUseCase,
      this.getMutantContextUseCase,
    );
    promptController.register();
  }

  public get activePort(): number {
    const address = this.httpServer?.address();
    return address ? (address as AddressInfo).port : this.port;
  }

  public async startStdio(): Promise<Result<void, Error>> {
    try {
      const transport = new StdioServerTransport();
      await this.mcpServer.connect(transport);
      this.logger.info(
        "MCP Server successfully started and listening on STDIO. Ready to receive commands.",
      );
      return ok(undefined);
    } catch (error) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      return err(errObj);
    }
  }

  public async start(): Promise<Result<void, Error>> {
    const app = express();

    app.get("/mcp/sse", async (_req, res) => {
      const transport = new SSEServerTransport("/mcp/messages", res);
      this.sseTransports.set(transport.sessionId, transport);

      transport.onclose = () => {
        this.sseTransports.delete(transport.sessionId);
      };

      await this.mcpServer.connect(transport);
    });

    app.post("/mcp/messages", async (req, res) => {
      const sessionId = req.query.sessionId as string | undefined;
      if (!sessionId) {
        res.status(400).send("Missing sessionId query parameter");
        return;
      }

      const transport = this.sseTransports.get(sessionId);
      if (!transport) {
        res.status(404).send("Session not found");
        return;
      }

      await transport.handlePostMessage(req, res);
    });

    return new Promise((resolve) => {
      this.httpServer = app.listen(this.port, () => {
        this.logger.info(`MCP Server started on port ${this.activePort}`);
        resolve(ok(undefined));
      });

      this.httpServer.on("error", (error) => {
        this.logger.error("Failed to start MCP Server", error);
        resolve(err(error));
      });
    });
  }

  public async stop(): Promise<Result<void, Error>> {
    return new Promise((resolve) => {
      if (!this.httpServer) {
        resolve(ok(undefined));
        return;
      }

      this.httpServer.close((error) => {
        if (error) {
          this.logger.error("Error stopping MCP Server", error);
          resolve(err(error));
        } else {
          this.logger.info("MCP Server stopped");
          this.httpServer = null;
          resolve(ok(undefined));
        }
      });
    });
  }
}
