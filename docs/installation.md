# Installation & Getting Started

## 1. Prerequisites

- Node.js (v18+)
- npm or pnpm
- A project that has Stryker installed and configured (`stryker.conf.json`).

## 2. Installation

Clone this repository and install dependencies:

```bash
git clone <this-repo>
cd stryker-mcp-reporter
npm install
npm run build
```

## 3. Registering the MCP Server

To use this with Claude Desktop or another MCP-compatible AI agent, add the server to your MCP configuration:

**For Claude Desktop (`claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "stryker-mcp": {
      "command": "node",
      "args": [
        "C:/path/to/stryker-mcp-reporter/dist/cli.js",
        "--stdio"
      ]
    }
  }
}
```

## 4. Run your AI

Start your AI agent. It now has access to the Stryker Mutation Testing tools and prompts!
