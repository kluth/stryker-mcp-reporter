# stryker-mcp-reporter & Control Server

[![npm version](https://img.shields.io/npm/v/stryker-mcp-reporter)](https://www.npmjs.com/package/stryker-mcp-reporter)
![Node version](https://img.shields.io/node/v/stryker-mcp-reporter)
![Mutation Score](https://img.shields.io/badge/Mutation%20Score-83%25-brightgreen)
![Semantic Release](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

Ein umfassendes Stryker Mutator Plugin & Standalone MCP Server, das Mutation Testing Ergebnisse sowie **interaktive Steuerung per Model Context Protocol (MCP)** bereitstellt.

Dieses Plugin ermöglicht es KI-Agenten (z. B. Claude Desktop, Cursor, Cline, Roo Code, Antigravity):
1. **Mutationstests auszuführen & zu steuern** (per MCP Tool `run_mutation_tests`).
2. **Mutation-Reports & Statistiken abzurufen** (per MCP Resources & Tools).
3. **Überlebende Mutanten zu analysieren & gezielt Tests zu generieren** (per MCP Prompt `analyze_survived_mutants`).

---

## 📦 Installation

**Voraussetzungen:** Node.js >= 22.0.0 und `@stryker-mutator/core` >= 8.0.0.

Installiere das Plugin als Entwicklungsabhängigkeit in deinem Projekt:

```bash
npm install --save-dev stryker-mcp-reporter
```

---

## 🚀 Betriebsmodi

### Modus 1: Stryker Reporter Plugin

Füge das Plugin und den Reporter zu deiner `stryker.config.mjs` hinzu:

```javascript
// stryker.config.mjs
export default {
  plugins: [
    "@stryker-mutator/*",
    "stryker-mcp-reporter",
  ],
  reporters: [
    "clear-text",
    "progress",
    "mcp", // Reporter aktivieren
  ],
};
```

Beim Ausführen von `npx stryker run` startet der MCP-Server nach dem Testlauf automatisch auf `http://127.0.0.1:3000/mcp/sse`.

### Modus 2: Standalone MCP Server

Der MCP Server kann auch direkt standalone gestartet werden:

```bash
npx stryker-mcp-server
```

Damit steht der MCP Server dauerhaft für KI-Agenten bereit und erlaubt das Starten von Testläufen per Tool-Call.

---

## 🔌 MCP Client Integration & Schnittstellen

### 📦 Resources (Datenabruf)

* `stryker://report/latest`: Der vollständige JSON-Report des letzten Testlaufs.
* `stryker://report/summary`: Kompakte Zusammenfassung (Score, Killed, Survived, Timeouts).
* `stryker://status`: Aktueller Ausführungsstatus von Stryker (`idle`, `running`, `completed`, `failed`).

### 🛠️ Tools (Interaktive Steuerung)

* **`run_mutation_tests`**: Startet einen Mutationstest-Lauf (Optionen: `mutate`, `concurrency`, `testRunner`, `configFile`).
* **`get_mutation_score`**: Ruft den aktuellen Score und die Metriken ab.
* **`get_survived_mutants`**: Liefert alle überlebenden Mutanten inkl. Dateipfad, Zeile, Mutator und Ersetzungscode (optional gefiltert nach `filePath`).

### 💡 Prompts (KI-gestützte Testgenerierung)

* **`analyze_survived_mutants`**: Erzeugt eine strukturierte KI-Instruktion zur Analyse überlebender Mutanten und Generierung fehlender Unit Tests.

---

## 🏗️ Software Engineering & Architektur

* **Clean & Hexagonal Architecture:** Die Kern-Domäne (`src/core/domain/`) ist strikt von der Infrastruktur (`Express`, `MCP SDK`, `@stryker-mutator/core`) getrennt.
* **Domain-Driven Design (DDD) & Result Pattern:** Vorhersehbares Error-Handling ohne unbeabsichtigte Exceptions.
* **TDD & Mutation Testing:** Über 50 Unit Tests in Vitest sowie Absicherung durch Stryker Mutation Testing.

---

## 🛠️ Lokale Entwicklung

```bash
npm install          # Abhängigkeiten installieren
npm run test         # Unit Tests (Vitest)
npm run test:mutation# Mutation Testing (Stryker)
npm run build        # TypeScript Build
```

---

## 📝 Lizenz

MIT License © 2026 Matthias Kluth