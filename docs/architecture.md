# Architecture & Data Model

`stryker-mcp-reporter` is built using the principles of **Clean Architecture** and **Hexagonal Architecture**. This approach ensures maximum testability, maintainability, and decoupling of core business logic from external frameworks and interfaces.

## Hexagonal Architecture

The architecture is divided into three primary layers:

### 1. Infrastructure Layer (Adapters)
This layer handles all external communication.
- **Express Server**: Manages SSE and MCP protocol endpoints.
- **McpServerAdapter**: Translates MCP protocol requests into internal Use Case invocations.
- **StrykerCliRunnerAdapter**: Interacts with the Stryker CLI to execute mutation tests.
- **GitCliAdapter**: Executes git commands to determine changed files for targeted testing.

### 2. Application Layer (Use Cases)
This layer orchestrates the core business logic.
- **RunMutationTestsUseCase**: Coordinates a full mutation test run.
- **RunTargetedMutationTestsUseCase**: Orchestrates targeted mutation testing based on git diffs.
- **GetSurvivedMutantsUseCase**: Filters and returns survived mutants for AI analysis.
- **GetMutationSummaryUseCase**: Computes the overall score and metrics.
- **PublishReportUseCase**: Handles broadcasting the report results.

### 3. Core Domain Layer
This layer contains pure TypeScript domain entities and logic, entirely independent of external frameworks.
- **ReportStream**: Manages the flow of mutation test reports.
- **ExecutionStatusStream**: Tracks the current execution state of tests.
- **MutationInsightEntity**: The core domain entity representing an analyzed mutation.
- **Result<T, E>**: A functional programming concept used for robust error handling.

## Vector DB & Developer Skill-Gap Data Model

A key feature of `stryker-mcp-reporter` is transforming raw mutation results into enriched `MutationInsightEntity` objects. These objects are structured specifically for ingestion into Vector Databases (like Qdrant, Pinecone, ChromaDB, or Weaviate) to power Retrieval-Augmented Generation (RAG) pipelines.

The data model includes:

1. **Mutator Category**: E.g., `Arithmetic & Math`, `Equality & Logic`, `Exception Handling`.
2. **Architecture Layer**: Categorizes where the mutation occurred (e.g., `Domain`, `Application`, `Infrastructure`).
3. **Risk Score & Severity**: An automated scoring system (0 – 100) used to prioritize test gaps based on their potential impact.
4. **Embedding Payload**: A vector-DB-ready text string that describes the mutation, designed for automated AI training and deep developer analysis.
