# stryker-mcp-reporter

![npm version](https://img.shields.io/npm/v/stryker-mcp-reporter)
![Node version](https://img.shields.io/node/v/stryker-mcp-reporter)
![Mutation Score](https://img.shields.io/badge/Mutation%20Score-100%25-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

Ein Stryker Reporter Plugin, das Mutation Testing Ergebnisse nativ über das **Model Context Protocol (MCP)** bereitstellt.

Dieses Plugin ermöglicht es KI-Agenten und LLM-Tools, direkt auf die Ergebnisse eines Stryker-Laufs zuzugreifen, indem es einen lokalen MCP-Server bereitstellt, der den kompletten Mutations-Report ausliefert.

---

## 📦 Installation

**Voraussetzungen:** Node.js >= 18.0.0 und `@stryker-mutator/core` >= 8.0.0.

Installiere das Plugin als Entwicklungsabhängigkeit in deinem Projekt:

```bash
npm install --save-dev stryker-mcp-reporter

```

## ⚙️ Stryker Konfiguration

Füge das Plugin und den Reporter zu deiner Stryker-Konfigurationsdatei hinzu (z. B. `stryker.config.mjs`):

```javascript
// stryker.config.mjs
export default {
  // ... deine bestehende Konfiguration
  plugins: [
    "@stryker-mutator/*",
    "stryker-mcp-reporter", // Plugin registrieren
  ],
  reporters: [
    "clear-text",
    "progress",
    "mcp", // Reporter aktivieren
  ],
};
```

## 🔌 MCP Client Integration

Da dieser Reporter einen lokalen Server-Sent Events (SSE) Server aufbaut, müssen MCP-Clients (wie die Claude Desktop App oder andere Agenten) angewiesen werden, sich mit diesem zu verbinden.

Sobald Stryker den Testlauf beendet hat, bleibt der Prozess offen und der Server lauscht standardmäßig auf:
`http://127.0.0.1:3000/mcp/sse`

### Bereitgestellte MCP-Ressourcen

Der Server exponiert aktuell folgende Ressourcen, die von KIs gelesen werden können:

- **Name:** `Latest Mutation Testing Report`
- **URI:** `stryker://report/latest`
- **MIME-Type:** `application/json`
- **Beschreibung:** Der vollständige JSON-Baum des letzten Stryker Mutation Testing Laufs (Schema-konform).

Um den Server nach der Analyse zu beenden, genügt ein einfaches `Strg+C` (SIGINT) im Terminal, in dem Stryker ausgeführt wurde.

## 🏗️ Software Engineering & Architektur

Dieses Plugin wurde unter strikter Einhaltung von Clean Code Prinzipien und Software Engineering Excellence entwickelt:

- **Hexagonale Architektur:** Die Fachlichkeit (Core Domain) ist vollständig von der Infrastruktur (Stryker-API, Express, MCP SDK) entkoppelt.
- **Domain-Driven Design (DDD):** Die Geschäftsregeln werden über eine Ubiquitäre Sprache, ausdrucksstarke Typen und striktes Error-Handling (Result Pattern) abgebildet.
- **100% Mutation Score:** Die Codebasis wurde rigoros per Test-Driven Development (TDD) aufgebaut. Jeder Branch und jede Fallback-Logik ist durch Vitest abgesichert. Es gibt keine überlebenden Mutanten.
- **Minimale Komplexität:** Die zyklomatische Komplexität nach McCabe wird durch kleine Inkremente strikt unter 10 gehalten.

## 🛠️ Lokale Entwicklung (Contributing)

Wenn du an diesem Plugin mitarbeiten möchtest, gelten strikte Qualitätsvorgaben:

1. **Abhängigkeiten installieren:** `npm install`
2. **Tests ausführen:** `npm run test` (Vitest im TDD Red-Green-Refactor Zyklus)
3. **Mutation Testing:** `npm run test:mutation` (Stryker)
4. **Build:** `npm run build` (TypeScript Kompilierung)

_Hinweis: Neue Features oder Bugfixes werden nur akzeptiert, wenn der Mutation Score bei 100% bleibt und ein Architecture Decision Record (ADR) für architektonische Änderungen vorliegt._

## 📝 Lizenz

MIT License © 2026 Matthias Kluth
