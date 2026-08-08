import { startStandaloneServer } from "./dist/index.mjs";

const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.log,
  trace: console.log,
  fatal: console.error,
};

startStandaloneServer(logger, undefined, "sse").then((res) => {
  if (res.isErr()) {
    console.error("Failed to start server:", res.error);
  } else {
    console.log("Web Server started on port 3000");
    console.log("Server running");
  }
}).catch(console.error);
