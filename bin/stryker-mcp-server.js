#!/usr/bin/env node
import { startStandaloneServer } from "../dist/index.js";

const dummyLogger = {
  info: (msg) => console.log(msg),
  error: (msg, err) => console.error(msg, err || ""),
  warn: (msg) => console.warn(msg),
  debug: (msg) => console.debug(msg),
  trace: (msg) => console.trace(msg),
  fatal: (msg, err) => console.error(msg, err || ""),
};

startStandaloneServer(dummyLogger).catch((err) => {
  console.error("Fataler Fehler beim Start des Stryker MCP Servers:", err);
  process.exit(1);
});
