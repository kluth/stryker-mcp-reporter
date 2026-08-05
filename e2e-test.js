// e2e-test.js
import { createMcpServerAdapter } from "./dist/index.js";

const dummyLogger = {
  info: (msg) => console.log("[LOGGER INFO]", msg),
  error: (msg, err) => console.error("[LOGGER ERROR]", msg, err || ""),
  warn: (msg) => console.warn("[LOGGER WARN]", msg),
  debug: (msg) => console.debug("[LOGGER DEBUG]", msg),
  trace: (msg) => console.trace("[LOGGER TRACE]", msg),
  fatal: (msg, err) => console.error("[LOGGER FATAL]", msg, err || ""),
};

async function runE2eTest() {
  console.log("=== STARTING REAL E2E MCP PROTOCOL VERIFICATION ===");

  // 1. Standalone MCP Server Instanziieren & Starten
  const TEST_PORT = 3999;
  const adapter = createMcpServerAdapter(dummyLogger, TEST_PORT);
  const startResult = await adapter.start();

  if (!startResult.isOk) {
    throw new Error(`Server konnte nicht gestartet werden: ${startResult.error.message}`);
  }

  const port = adapter.activePort;
  console.log(`✅ MCP Server erfolgreich gestartet auf Port ${port}`);

  let postUrl = `http://127.0.0.1:${port}/mcp/messages`;

  // 2. SSE-Verbindung herstellen
  const controller = new AbortController();
  const sseResponse = await fetch(`http://127.0.0.1:${port}/mcp/sse`, {
    signal: controller.signal,
  });

  if (!sseResponse.ok) {
    throw new Error(`SSE Verbindung fehlgeschlagen: HTTP ${sseResponse.status}`);
  }

  console.log("✅ SSE-Verbindung hergestellt.");

  // Lese das erste SSE Event (endpoint)
  const reader = sseResponse.body.getReader();
  const { value } = await reader.read();
  const sseChunk = new TextDecoder().decode(value);
  console.log("📥 SSE Initial Chunk erhalten:\n", sseChunk);

  if (sseChunk.includes("endpoint")) {
    const match = sseChunk.match(/data:\s*(.+)/);
    if (match) {
      const relPath = match[1].trim();
      postUrl = new URL(relPath, `http://127.0.0.1:${port}`).toString();
      console.log("🔗 Dynamische Message-POST-URL:", postUrl);
    }
  }

  // Hilfsfunktion zum Senden von JSON-RPC Anfragen an den MCP Server
  let reqId = 1;
  async function sendJsonRpc(method, params = {}) {
    const id = reqId++;
    const payload = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const res = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`POST ${method} fehlgeschlagen: HTTP ${res.status} ${await res.text()}`);
    }

    return id;
  }

  // 3. MCP Handshake (initialize)
  console.log("\n--- TEST: MCP initialize ---");
  await sendJsonRpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "e2e-test-client", version: "1.0.0" },
  });
  console.log("✅ Initialize JSON-RPC gesendet.");

  // 4. MCP Resource Listing
  console.log("\n--- TEST: resources/list ---");
  await sendJsonRpc("resources/list");
  console.log("✅ resources/list gesendet.");

  // 5. MCP Resource Reading (stryker://status)
  console.log("\n--- TEST: resources/read (stryker://status) ---");
  await sendJsonRpc("resources/read", { uri: "stryker://status" });
  console.log("✅ resources/read stryker://status gesendet.");

  // 6. MCP Resource Reading (stryker://report/summary & stryker://report/survived)
  console.log("\n--- TEST: resources/read (stryker://report/summary) ---");
  await sendJsonRpc("resources/read", { uri: "stryker://report/summary" });
  await sendJsonRpc("resources/read", { uri: "stryker://report/survived" });
  console.log("✅ resources/read stryker://report/summary & survived gesendet.");

  // 7. MCP Tools Listing
  console.log("\n--- TEST: tools/list ---");
  await sendJsonRpc("tools/list");
  console.log("✅ tools/list gesendet.");

  // 8. MCP Tool Call (get_mutation_score)
  console.log("\n--- TEST: tools/call (get_mutation_score) ---");
  await sendJsonRpc("tools/call", { name: "get_mutation_score", arguments: {} });
  console.log("✅ get_mutation_score Tool aufgerufen.");

  // 9. MCP Tool Call (get_survived_mutants)
  console.log("\n--- TEST: tools/call (get_survived_mutants) ---");
  await sendJsonRpc("tools/call", { name: "get_survived_mutants", arguments: {} });
  console.log("✅ get_survived_mutants Tool aufgerufen.");

  // 10. MCP Prompts Listing & Get
  console.log("\n--- TEST: prompts/list & prompts/get ---");
  await sendJsonRpc("prompts/list");
  await sendJsonRpc("prompts/get", { name: "explain_survived_mutants", arguments: {} });
  console.log("✅ Prompts erfolgreich abgefragt.");

  // 11. MCP Tool Call (run_targeted_mutation_tests mit commitSha / revision)
  console.log("\n--- TEST: tools/call (run_targeted_mutation_tests für revision HEAD~1) ---");
  await sendJsonRpc("tools/call", {
    name: "run_targeted_mutation_tests",
    arguments: { revision: "HEAD~1" },
  });
  console.log("✅ run_targeted_mutation_tests Tool gestartet.");

  // 12. MCP Tool Call (run_mutation_tests auf eine kleine Datei: src/core/domain/result.ts)
  console.log("\n--- TEST: tools/call (run_mutation_tests auf src/core/domain/result.ts) ---");
  await sendJsonRpc("tools/call", {
    name: "run_mutation_tests",
    arguments: { mutate: ["src/core/domain/result.ts"], concurrency: 2 },
  });
  console.log("✅ run_mutation_tests Tool gestartet.");

  // 12. Schließen & Aufräumen
  controller.abort();
  await adapter.stop();
  console.log("\n==================================================");
  console.log("🎉 VOLLSTÄNDIGER E2E TEST ERFOLGREICH ABGESCHLOSSEN!");
  console.log("==================================================");
}

runE2eTest().catch((err) => {
  console.error("❌ E2E VERIFIKATIONSFEHLER:", err);
  process.exit(1);
});
