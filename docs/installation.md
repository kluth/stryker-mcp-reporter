# Installation

## Prerequisites

- **Node.js**: `>= 22.0.0`
- **@stryker-mutator/core**: `>= 8.0.0`

## Installation

Install the plugin in your project as a dev dependency:

```bash
npm install --save-dev stryker-mcp-reporter
```

## Setup Options

The reporter can be run in two different modes. 

### Mode 1: Stryker Reporter Plugin

Add the plugin and the reporter to your `stryker.config.mjs` (or equivalent configuration file):

```javascript
// stryker.config.mjs
export default {
  plugins: [
    "@stryker-mutator/*",
    "stryker-mcp-reporter",
  ],
  reporters: [
    "clear-text",
    "progress",
    "mcp", // Enable the MCP reporter
  ],
};
```

When you run `npx stryker run`, the MCP server will automatically start on `http://127.0.0.1:3000/mcp/sse` after the test run finishes.

### Mode 2: Standalone MCP Control Server

Start the MCP Server directly via the CLI without running a full Stryker pipeline first.

**STDIO Mode** (Recommended for local AI tools and direct spawning):
```bash
npx stryker-mcp-server --stdio
```

**SSE Mode** (Server-Sent Events via HTTP Port 3000):
```bash
npx stryker-mcp-server --sse
```

The server remains persistently available, allowing AI agents to dynamically execute mutation tests via MCP Tool Calls.

Next, see the [Usage Guide](./usage.md) on how to integrate the server with your favorite AI IDEs and agents.
