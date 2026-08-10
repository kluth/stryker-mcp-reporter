# Stryker MCP Reporter - Documentation

Welcome to the **Stryker MCP Reporter** documentation! This project allows AI models (such as Claude, GPT-4, or Gemini) to run mutation tests programmatically via the **Model Context Protocol (MCP)**, analyze the risks of surviving mutants, and generate profound explanations of why those mutants might lead to production vulnerabilities.

## Documentation Index

- [Installation & Getting Started](installation.md)
- [Usage & MCP Tools](usage.md)
- [Architecture & Design](architecture.md)
- [Framework Support & Recipes](framework-recipes.md)

## Core Features

1. **MCP Server Integration**: Exposes tools for AI agents to trigger mutation tests.
2. **Context-Aware Analysis (`why_is_this_bad` prompt)**: Automatically extracts surviving mutants and shows the exact code diff (`Mutated Code vs Original Code`), prompting the AI to think deeply about potential bugs, security vulnerabilities, or performance issues.
3. **Hybrid Auto-Remediation Profiling**: Combines static analysis and dynamic test profiling to provide highly accurate, contextual remediation code for surviving mutants.
4. **Risk Scoring System**: Assigns a risk level (LOW, MEDIUM, HIGH, CRITICAL) to files based on how many mutants survived and whether the file contains sensitive keywords (like `auth`, `security`, `crypto`, etc.).
5. **SQLite Caching & History**: Persists test runs, history, and trends in a local SQLite database for fast retrieval and analytical tracking.
