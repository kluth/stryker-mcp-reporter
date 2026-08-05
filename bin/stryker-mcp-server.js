#!/usr/bin/env node
import { startStandaloneServer } from "../dist/index.js";

const args = process.argv.slice(2);
const isSse = args.includes("--sse");
const mode = isSse ? "sse" : "stdio";

const stdioLogger = {
  info: (msg) => console.error(`[INFO] ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err || ""),
  warn: (msg) => console.error(`[WARN] ${msg}`),
  debug: (msg) => console.error(`[DEBUG] ${msg}`),
  trace: (msg) => console.error(`[TRACE] ${msg}`),
  fatal: (msg, err) => console.error(`[FATAL] ${msg}`, err || ""),
};

const sseLogger = {
  info: (msg) => console.log(msg),
  error: (msg, err) => console.error(msg, err || ""),
  warn: (msg) => console.warn(msg),
  debug: (msg) => console.debug(msg),
  trace: (msg) => console.trace(msg),
  fatal: (msg, err) => console.error(msg, err || ""),
};

const logger = isSse ? sseLogger : stdioLogger;

startStandaloneServer(logger, undefined, mode).catch((err) => {
  console.error("Fataler Fehler beim Start des Stryker MCP Servers:", err);
  process.exit(1);
});
