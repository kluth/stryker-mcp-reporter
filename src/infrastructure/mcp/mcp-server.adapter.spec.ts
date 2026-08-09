/* eslint-disable max-lines, complexity, no-useless-assignment */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { McpServerAdapter, SERVER_INFO } from "./mcp-server.adapter.js";
import { ReportStream } from "../../core/domain/report-stream.js";
import { ExecutionStatusStream } from "../../core/domain/execution-status.js";
import { RunMutationTestsUseCase } from "../../core/application/run-mutation-tests.use-case.js";
import { RunTargetedMutationTestsUseCase } from "../../core/application/run-targeted-mutation-tests.use-case.js";
import { GetSurvivedMutantsUseCase } from "../../core/application/get-survived-mutants.use-case.js";
import { GetMutationSummaryUseCase } from "../../core/application/get-mutation-summary.use-case.js";
import { GetKilledMutantsUseCase } from "../../core/application/get-killed-mutants.use-case.js";
import { GetMutantContextUseCase } from "../../core/application/get-mutant-context.use-case.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Logger } from "@stryker-mutator/api/logging";
import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const mockApp = {
  get: vi.fn(),
  post: vi.fn(),
  use: vi.fn(),
  listen: vi.fn().mockReturnValue({
    address: () => ({ port: 3000 }),
    on: vi.fn(),
    close: vi.fn().mockImplementation((cb) => { if (cb) cb(); }),
  }),
};

vi.mock("express", () => {
  const expressFn = () => mockApp;
  expressFn.json = vi.fn();
  expressFn.static = vi.fn();
  return { default: expressFn };
});

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => {
  return {
    StdioServerTransport: vi.fn().mockImplementation(() => ({})),
  };
});

describe("McpServerAdapter", () => {
  let mockLogger: Logger;
  let reportStream: ReportStream;
  let statusStream: ExecutionStatusStream;
  let runUseCase: RunMutationTestsUseCase;
  let runTargetedUseCase: RunTargetedMutationTestsUseCase;
  let getSurvivedUseCase: GetSurvivedMutantsUseCase;
  let getSummaryUseCase: GetMutationSummaryUseCase;
  let getKilledUseCase: GetKilledMutantsUseCase;
  let getMutantContextUseCase: GetMutantContextUseCase;
  let adapter: McpServerAdapter;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
    } as unknown as Logger;

    reportStream = new ReportStream();
    statusStream = new ExecutionStatusStream();
    runUseCase = { execute: vi.fn() } as unknown as RunMutationTestsUseCase;
    runTargetedUseCase = { execute: vi.fn() } as unknown as RunTargetedMutationTestsUseCase;
    getSurvivedUseCase = new GetSurvivedMutantsUseCase(reportStream);
    getSummaryUseCase = new GetMutationSummaryUseCase(reportStream);
    getKilledUseCase = new GetKilledMutantsUseCase(reportStream);
    getMutantContextUseCase = new GetMutantContextUseCase(reportStream);

    adapter = new McpServerAdapter(
      mockLogger,
      reportStream,
      statusStream,
      runUseCase,
      runTargetedUseCase,
      getSurvivedUseCase,
      getSummaryUseCase,
      getKilledUseCase,
      getMutantContextUseCase,
      0,
    );
  });

  afterEach(async () => {
    await adapter.stop();
    vi.restoreAllMocks();
  });

  it("sollte die korrekten Server-Metadaten bereitstellen", () => {
    expect(SERVER_INFO.name).toBe("stryker-mcp-server");
    expect(SERVER_INFO.version).toBe("1.0.0");
  });

  it("sollte den initialen konfigurierten Port zurückgeben, wenn der Server offline ist", () => {
    expect(adapter.activePort).toBe(0);
  });

  it("sollte den Server via start() erfolgreich starten und ein ok-Result zurückgeben", async () => {
    mockApp.listen.mockImplementationOnce((port, cb) => {
      if (cb) cb();
      return { address: () => ({ port: 3000 }), on: vi.fn(), close: vi.fn().mockImplementation((cb) => { if (cb) cb(); }) };
    });
    const result = await adapter.start();
    expect(result.isOk).toBe(true);
    expect(adapter.activePort).toBe(3000);
  });

  it("sollte Fehler beim HTTP-Server Start abfangen", async () => {
    mockApp.listen.mockImplementationOnce((port, cb) => {
      const server = { address: () => ({ port: 3000 }), on: vi.fn(), close: vi.fn().mockImplementation((cb) => { if (cb) cb(); }) };
      return server;
    });
    const promise = adapter.start();
    const onCall = mockApp.listen.mock.results[0].value.on.mock.calls.find((c: any) => c[0] === "error");
    onCall[1](new Error("listen error"));
    const result = await promise;
    expect(result.isOk).toBe(false);
    expect(result.error?.message).toBe("listen error");
  });

  it("schließt den aktiven HTTP-Server während des Shutdowns", async () => {
    mockApp.listen.mockImplementationOnce((port, cb) => {
      if (cb) cb();
      return { address: () => ({ port: 3000 }), on: vi.fn(), close: vi.fn((cb: any) => cb()) };
    });
    await adapter.start();
    const closeSpy = vi.spyOn(adapter["httpServer"] as any, "close");
    await adapter.stop();
    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it("sollte Fehler beim Schließen des HTTP-Servers abfangen", async () => {
    mockApp.listen.mockImplementationOnce((port, cb) => {
      if (cb) cb();
      return { address: () => ({ port: 3000 }), on: vi.fn(), close: vi.fn((cb: any) => cb(new Error("close err"))) };
    });
    await adapter.start();
    const result = await adapter.stop();
    expect(result.isOk).toBe(false);
    expect(result.error?.message).toBe("close err");
  });

  describe("HTTP Routes", () => {
    let appGet: Function;
    let appPost: Function;

    beforeEach(async () => {
      mockApp.listen.mockImplementationOnce((port, cb) => {
        if (cb) cb();
        return { address: () => ({ port: 3000 }), on: vi.fn(), close: vi.fn().mockImplementation((cb) => { if (cb) cb(); }) };
      });
      await adapter.start();
      appGet = mockApp.get.mock.calls.find((c) => c[0] === "/mcp/sse")[1];
      appPost = mockApp.post.mock.calls.find((c) => c[0] === "/mcp/messages")[1];
    });

    it("handles /mcp/sse", async () => {
      const req = {};
      const res = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
      vi.spyOn(Server.prototype, "connect").mockResolvedValueOnce(undefined);
      
      await appGet(req, res);
      expect(Server.prototype.connect).toHaveBeenCalled();

      // Test onclose
      const transport = adapter["sseTransports"].values().next().value;
      expect(adapter["sseTransports"].size).toBe(1);
      transport.onclose();
      expect(adapter["sseTransports"].size).toBe(0);
    });

    it("handles /mcp/messages successfully", async () => {
      // populate a session first
      const sseReq = {};
      const sseRes = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
      vi.spyOn(Server.prototype, "connect").mockResolvedValueOnce(undefined);
      await appGet(sseReq, sseRes);

      const transport = adapter["sseTransports"].values().next().value;
      const sessionId = transport.sessionId;

      const req = { query: { sessionId } };
      const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      
      vi.spyOn(transport, "handlePostMessage").mockResolvedValueOnce(undefined);
      await appPost(req, res);
      
      expect(transport.handlePostMessage).toHaveBeenCalledWith(req, res);
    });

    it("handles /mcp/messages without sessionId", async () => {
      const req = { query: {} };
      const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      await appPost(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Missing sessionId query parameter");
    });

    it("handles /mcp/messages with invalid sessionId", async () => {
      const req = { query: { sessionId: "invalid" } };
      const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      await appPost(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("Session not found");
    });
  });

  it("sollte sofort ok zurückgeben, wenn stop() aufgerufen wird ohne vorher start()", async () => {
    const result = await adapter.stop();
    expect(result.isOk).toBe(true);
  });

  describe("startStdio", () => {
    it("sollte den Server via startStdio() erfolgreich starten", async () => {
      vi.spyOn(Server.prototype, "connect").mockResolvedValueOnce();
      const result = await adapter.startStdio();
      expect(result.isOk).toBe(true);
      expect(Server.prototype.connect).toHaveBeenCalled();
    });

    it("sollte Fehler abfangen und ein err-Result zurückgeben", async () => {
      vi.spyOn(Server.prototype, "connect").mockRejectedValueOnce(new Error("connect fail"));
      const result = await adapter.startStdio();
      expect(result.isOk).toBe(false);
      expect(result.error?.message).toBe("connect fail");
    });
    
    it("sollte Nicht-Error Objekte bei startStdio wrappen", async () => {
      vi.spyOn(Server.prototype, "connect").mockRejectedValueOnce("String error");
      const result = await adapter.startStdio();
      expect(result.isOk).toBe(false);
      expect(result.error?.message).toBe("String error");
    });
  });
});

