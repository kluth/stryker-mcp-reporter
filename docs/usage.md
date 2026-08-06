# Usage & AI Agent Integration

This guide explains how to connect `stryker-mcp-reporter` to your favorite AI development tools and details the tools and resources available via the MCP protocol.

## Connecting AI Agents

You can connect your preferred AI development environment to `stryker-mcp-reporter` using either **STDIO** (direct spawning via CLI, recommended) or **SSE** (Server-Sent Events via HTTP).

### Option A: STDIO Transport (Recommended)

This is the recommended approach for local IDEs and AI tools.

#### 🐧 🍏 Linux & macOS (`npx`):
```json
{
  "mcpServers": {
    "stryker-mutation-testing": {
      "command": "npx",
      "args": ["-y", "--silent", "stryker-mcp-reporter"]
    }
  }
}
```

#### 🪟 Windows (`cmd.exe` Wrapper):
*Note: On Windows, `npx` is a batch script (`npx.cmd`). Many AI tools start processes without a shell context, so wrapping it in `cmd.exe /c` ensures a clean startup and prevents `stdout` pollution.*

```json
{
  "mcpServers": {
    "stryker-mutation-testing": {
      "command": "cmd.exe",
      "args": [
        "/c",
        "npx",
        "-y",
        "--silent",
        "stryker-mcp-reporter"
      ]
    }
  }
}
```

### IDE Specific Configurations

- **Google Antigravity**: `.antigravity/mcp.json`
- **Cursor IDE**: `.cursor/mcp.json`
- **Cline**: `cline_mcp_settings.json`
- **Roo Code**: `.roo/mcp.json`
- **Windsurf IDE**: `mcp_config.json`
- **Claude Desktop**: `claude_desktop_config.json`

Add the JSON payload shown above into the respective configuration file for your tool.

---

## MCP Interfaces

The server exposes both Resources (for data retrieval) and Tools (for interactive execution).

### 📦 Resources (Data Retrieval)

| Resource URI | MimeType | Description |
| :--- | :--- | :--- |
| `stryker://report/latest` | `application/json` | The full Stryker Mutation Testing Report. |
| `stryker://report/summary` | `application/json` | Compact summary of mutation metrics (Score, Killed, Survived). |
| `stryker://report/survived` | `application/json` | List of all survived mutants, including path, line, mutator, and replacement code. |
| `stryker://report/killed` | `application/json` | List of all successfully killed mutants (positive feedback). |
| `stryker://analytics/trends` | `application/json` | Historical trend analysis of mutation scores. |
| `stryker://status` | `application/json` | Current execution status (`idle`, `running`, `completed`, `failed`). |

### 🛠️ Tools (Interactive Control)

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `run_mutation_tests` | `mutate`, `concurrency`, `testRunner`, `configFile` | Starts a full or targeted mutation testing run. |
| `run_targeted_mutation_tests` | `commitSha`, `revision`, `fromRevision`, `toRevision` | Detects changed TypeScript files via Git diff and tests only those files. |
| `suggest_mutant_fixes` | `filePath` | Generates AI-assisted remediation advice and specific code assertions for survived mutants. |
| `predict_mutation_impact` | `changedFiles` | Analyzes changed files and predicts mutant survival risk (`HIGH`, `MEDIUM`, `LOW`) in < 1s. |
| `get_mutation_score` | - | Retrieves the current mutation score and summary. |
| `get_survived_mutants` | `filePath` | Retrieves all survived mutants, including context and replacement code. |
| `get_killed_mutants` | `filePath` | Retrieves all successfully killed mutants. |
| `get_mutant_context` | `mutantId` | Retrieves the full source code context for a given mutant, including a side-by-side view of the original and mutated code. |
| `configure_desktop_notifications` | `enabled`, `persistentOverlay`, `sound` | Configures native desktop notifications. |

### 💡 AI Prompts

- **`analyze_survived_mutants`**: Generates a structured AI instruction for detailed root-cause analysis of survived mutants and auto-generates missing unit tests following TDD standards.
