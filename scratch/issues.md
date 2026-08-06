# Detected Issues to Fix Later

## Issue: MCP `run_mutation_tests` fails with parsing error
**Description:**
When calling the `run_mutation_tests` tool via the MCP server (`stryker-mutation-testing`), it immediately fails with the following error:
```
Encountered error in step execution: calling "tools/call": invalid character '\x1b' looking for beginning of value
```

**Root Cause Analysis:**
This appears to be caused by Stryker outputting terminal color codes (ANSI escape codes like `\x1b`) in its JSON output or stdio, which the MCP SDK attempts to parse as JSON and fails. The adapter or parser needs to strip ANSI escape codes before parsing Stryker's stdout or stderr.

**Steps to Reproduce:**
1. Connect to the MCP server.
2. Invoke `call_mcp_tool` for `run_mutation_tests`.
3. Observe the parsing error.

**Expected Behavior:**
The MCP tool should correctly parse the output, ignoring ANSI escape codes, and successfully execute the mutation tests, returning the proper result structure.
