# Framework Support & Recipes

After extensive framework testing, `stryker-mcp-reporter` has proven compatibility across a wide array of modern web frameworks and test runners.

## Supported Test Runners

The `stryker-mcp-reporter` supports all popular test runners seamlessly, including:
- Jest
- Vitest
- Mocha
- Tap
- Cucumber
- Karma
- Jasmine

## Tested Framework Matrix

| Framework | Default Runner  | Support Status |
|-----------|-----------------|----------------|
| React     | Vite/Jest       | ✅ Supported    |
| SolidJS   | Vitest          | ✅ Supported    |
| NestJS    | Jest            | ✅ Supported    |
| Fastify   | Tap             | ✅ Supported    |
| Koa       | Mocha           | ✅ Supported    |
| Cucumber  | Node            | ✅ Supported    |
| Angular   | Karma/Jasmine   | ✅ Supported    |
| Vue       | Vitest/Jest     | ✅ Supported    |

## Complex Frameworks & ESM Modules

For more complex architectures (such as **NestJS** or **Nx** workspaces), or when utilizing strict ESM modules, the plugin might not be auto-discovered by Stryker.

In these cases, you must explicitly list the plugins in your `stryker.config.mjs` (or equivalent configuration file):

```javascript
// stryker.config.mjs
export default {
  // ... your other config
  plugins: [
    "@stryker-mutator/*",
    "stryker-mcp-reporter"
  ]
};
```
