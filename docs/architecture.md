# Architecture

The codebase is built using a clean, hexagonal architecture principles to separate core logic from infrastructure.

## Directory Structure

- `src/core/domain`: Contains core business logic, interfaces, ports, and models (like `MutationReport`, `ReportStream`, `EventBusPort`).
- `src/core/application`: Contains Use Cases (e.g., `RunMutationTestsUseCase`, `GetSurvivedMutantsUseCase`, `PredictMutationImpactUseCase`) that act as orchestrators.
- `src/infrastructure/db`: Adapters for local SQLite storage (persisting runs and history caching).
- `src/infrastructure/event`: Adapters for the `EventBus` to emit and listen to system events.
- `src/infrastructure/git`: Adapters for Git operations.
- `src/infrastructure/llm`: Adapters for interacting with Large Language Models (OpenAI, Ollama, Regex fallbacks).
- `src/infrastructure/mcp`: Adapters for the Model Context Protocol. Contains the MCP server implementation.
- `src/infrastructure/notification`: Adapters for sending notifications.
- `src/infrastructure/stryker`: Adapters for communicating with the Stryker Mutator programmatic API and CLI.

## Flow of Data

1. **User Request**: An AI agent calls `run_mutation_tests` via MCP.
2. **MCP Controllers**: The request is routed to the appropriate controller (`McpResourceController`, `McpToolController`, or `McpPromptController`), which then calls the corresponding Use Case (e.g., `RunMutationTestsUseCase`).
3. **Stryker Adapter**: The `StrykerCliRunnerAdapter` configures Stryker to output a `mutation.json` report and runs the tests.
4. **Data Stream & Storage**: The parsed `MutationReport` is pushed to a singleton `ReportStream` and persisted to the local **SQLite database** (in `src/infrastructure/db`) for historical tracking and quick retrieval.
5. **Event Emission**: The `EventBus` (in `src/infrastructure/event`) is used to decouple components, emitting system events (like `ExecutionStatusStream` updates or report generation).
6. **Follow-up**: When the AI agent asks for a Mutant Insights (`suggest_mutant_fixes`) or targeted executions, the respective Use Cases pull the latest report from the `ReportStream` or database and process it using domain logic, potentially involving `llm` adapters for predictions or insights.
