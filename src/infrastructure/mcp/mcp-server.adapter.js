// src/infrastructure/mcp/mcp-server.adapter.ts
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { ok, err } from "../../core/domain/result.js";
// Extrahiert für absolute Testbarkeit der Konstanten
export const SERVER_INFO = { name: "stryker-mcp-server", version: "1.0.0" };
export class McpServerAdapter {
    reportStream;
    port;
    httpServer = null;
    mcpServer;
    constructor(reportStream, port = 3000) {
        this.reportStream = reportStream;
        this.port = port;
        this.mcpServer = new Server(SERVER_INFO, { capabilities: { resources: {} } });
        this.registerResourceHandlers();
    }
    get activePort() {
        const address = this.httpServer?.address();
        return address ? address.port : this.port;
    }
    async start() {
        const app = express();
        let transport;
        app.get("/mcp/sse", async (req, res) => {
            transport = new SSEServerTransport("/mcp/messages", res);
            await this.mcpServer.connect(transport);
        });
        app.post("/mcp/messages", async (req, res) => {
            if (transport) {
                await transport.handlePostMessage(req, res);
            }
            else {
                res.status(400).send("SSE connection not established");
            }
        });
        return new Promise((resolve) => {
            this.httpServer = app.listen(this.port);
            this.httpServer.once("listening", () => {
                resolve(ok(undefined));
            });
            this.httpServer.once("error", (error) => {
                resolve(err(error));
            });
        });
    }
    stop() {
        return new Promise((resolve) => {
            if (this.httpServer) {
                this.httpServer.close(() => resolve());
            }
            else {
                resolve();
            }
        });
    }
    registerResourceHandlers() {
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
        this.mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
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
        });
    }
}
