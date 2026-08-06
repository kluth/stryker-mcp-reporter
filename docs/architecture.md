# Architecture

The codebase is built using a clean, hexagonal architecture principles to separate core logic from infrastructure.

## Directory Structure

- `src/core/domain`: Contains core business logic, like the `RiskScoreCalculator` and `MutationReport` interfaces.
- `src/core/application`: Contains Use Cases (e.g., `RunMutationTestsUseCase`, `GetSurvivedMutantsUseCase`) that act as orchestrators.
- `src/infrastructure/mcp`: Adapters for the Model Context Protocol. Contains the MCP server implementation.
- `src/infrastructure/stryker`: Adapters for communicating with the Stryker Mutator programmatic API and CLI.

## Flow of Data

1. **User Request**: An AI agent calls `run_mutation_tests` via MCP.
2. **MCP Controllers**: The request is routed to the appropriate controller (`McpResourceController`, `McpToolController`, or `McpPromptController`), which then calls the corresponding Use Case (e.g., `RunMutationTestsUseCase`).
3. **Stryker Adapter**: The `StrykerCliRunnerAdapter` configures Stryker to output a `mutation.json` report and runs the tests.
4. **Data Stream**: The parsed `MutationReport` is pushed to a singleton `ReportStream`.
5. **Follow-up**: When the AI agent asks for a Risk Score (`get_risk_score`) or for Mutant Insights (`why_is_this_bad`), the respective Use Cases pull the latest report from the `ReportStream` and process it using the domain logic.
