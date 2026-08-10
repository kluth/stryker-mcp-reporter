# Getting Started

## What is stryker-mcp-reporter?

`stryker-mcp-reporter` is a state-of-the-art **Stryker Mutator Plugin & Standalone Control Server**. It provides mutation testing results and interactive control via the **Model Context Protocol (MCP)** (over SSE and stdio) directly to AI agents such as Antigravity, Cursor, Cline, Roo Code, and Claude Desktop.

> **"100% Code Coverage only tells you what was executed. Stryker MCP enables your AI to prove what is indestructible."**

## The Problem: The 100% Coverage Paradox

Standard code coverage measures which lines of code were executed during a test, even if your tests lack assertions. Generative AI agents often write hundreds of lines of test code quickly but suffer from "Happy Path Bias", allowing logical edge cases to slip through undetected.

## The Solution: Stryker + MCP

Stryker mutates your source code (e.g., changes `>` to `>=`, deletes return values, or inverts logic). If a mutant survives your test suite, an invisible test gap exists.

`stryker-mcp-reporter` makes these mutants visible and controllable for AI agents:
- **Analyze Gaps Autonomously**: AI pair programmers can see which mutants survived.
- **Auto-Remediation**: Agents can write precise boundary tests to eliminate surviving mutants in real-time.
- **Targeted Testing**: Test only the TypeScript files that were changed in Git, saving up to 90% execution time.

## Key Features

- ⚡ **Interactive Mutation Testing**: AI agents can trigger, observe, and evaluate mutation tests via MCP.
- 🤖 **AI Mutant Auto-Remediation**: Generates tailored unit test assertions for surviving mutants.
- 🛠️ **Hybrid Auto-Remediation Profiling**: Combines static analysis and dynamic profiling to make AI repair suggestions even more precise.
- 🔮 **Git-Diff Risk Prediction**: Analyzes changed files and predicts mutation risk in < 1s.
- 🎯 **Targeted Git-Diff Executions**: Tests only modified files.
- 💾 **SQLite Caching & History**: Saves test results, trends, and history securely in a local SQLite database.
- 📈 **Score Trend Tracking**: Access historical score trends and deltas.
- 🛡️ **48-Hour Anti-Spam Engine**: Protects developer channels from spam during frequent releases.
- ✈️ **Multi-Platform Broadcasting**: Auto-publishes releases to GitHub Discussions, DEV.to, Telegram, and Discord.

Next, check out the [Installation Guide](./installation.md) to set it up in your project.
