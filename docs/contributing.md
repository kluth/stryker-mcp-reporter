# Contributing

We welcome any support! Whether it's a bug fix, new MCP tools, or documentation improvements, your contributions are highly appreciated.

## Quickstart for Contributors

If you want to contribute to the codebase, follow these steps to get started:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kluth/stryker-mcp-reporter.git
   cd stryker-mcp-reporter
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the test suites:**
   Ensure all existing tests pass before starting your work.
   
   - Run Unit Tests (Vitest):
     ```bash
     npm test
     ```
   
   - Run Real E2E MCP SSE Protocol Verification:
     ```bash
     npm run test:e2e
     ```
   
   - Run Stryker Mutation Testing (Aiming for 100% Mutation Score):
     ```bash
     npm run test:mutation
     ```

## Submitting Pull Requests

1. Create a feature branch from `main`.
2. Ensure your code passes all linting and tests.
3. Write mutation tests for new logic if applicable.
4. Open a Pull Request detailing your changes and their motivation.

Thank you for helping make `stryker-mcp-reporter` better!
