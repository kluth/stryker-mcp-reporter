// src/infrastructure/mcp/mcp-server.adapter.ts
import express from "express";
import type { Server as HttpServer } from "http";
import type { AddressInfo } from "net";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "@stryker-mutator/api/logging";
import type { ReportStream } from "../../core/domain/report-stream.js";
import { type Result, ok, err } from "../../core/domain/result.js";

// Extrahiert für absolute Testbarkeit der Konstanten
export const SERVER_INFO = { name: "stryker-mcp-server", version: "1.0.0" };

export class McpServerAdapter {
  private httpServer: HttpServer | null = null;
  private readonly mcpServer: Server;

  // WICHTIG: Die Reihenfolge muss Logger -> Stream -> Port sein
  constructor(
    private readonly logger: Logger,
    private readonly reportStream: ReportStream,
    private readonly port: number = 3000,
  ) {
    this.mcpServer = new Server(
      SERVER_INFO,
      { capabilities: { resources: {} } },
    );
    this.registerResourceHandlers();
  }

  public get activePort(): number {
    const address = this.httpServer?.address();
    return address ? (address as AddressInfo).port : this.port;
  }

  public async start(): Promise<Result<void, Error>> {
    const app = express();
    let transport: SSEServerTransport | undefined;

    app.get("/mcp/sse", async (_req, res) => {
      transport = new SSEServerTransport("/mcp/messages", res);
      await this.mcpServer.connect(transport);
    });

    app.post("/mcp/messages", async (req, res) => {
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).send("SSE connection not established");
      }
    });

    return new Promise((resolve) => {
      this.httpServer = app.listen(this.port);

      this.httpServer.once("listening", () => {
        this.logConnectionInstructions();
        resolve(ok(undefined));
      });

      this.httpServer.once("error", (error) => {
        resolve(err(error));
      });
    });
  }

  private logConnectionInstructions(): void {
    const sseUrl = `http://127.0.0.1:${this.port}/mcp/sse`;

    this.logger.info('🚀 Stryker MCP Server läuft!');
    this.logger.info(`🔗 SSE URL: ${sseUrl}`);
    this.logger.info('💡 Um KI-Agenten (wie Cline, Cursor oder Roo Code) zu verbinden, nutze dieses Snippet:');
    this.logger.info(`
{
  "mcpServers": {
    "stryker-mutation-testing": {
      "url": "${sseUrl}"
    }
  }
}
`);
    this.logger.info('🛑 Drücke Strg+C, um den Server zu beenden.');
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private registerResourceHandlers(): void {
    this.mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "stryker://report/latest",
          name: "Latest Mutation Testing Report",
          mimeType: "application/json",
          description: "Der vollständige Stryker Mutation Testing Report.",
        },
      ],
    }));

    this.mcpServer.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        if (request.params.uri === "stryker://report/latest") {
          const report = this.reportStream.current();
          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify(report ?? { files: {} }),
              },
            ],
          };
        }
        throw new Error("Ressource nicht gefunden");
      },
    );
  }
}
