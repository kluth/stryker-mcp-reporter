# AI Development Workflow

Um eine sinnvolle, detaillierte Historie für die Analyse aufzubauen, gelten ab sofort folgende strikte Git-Workflow-Regeln für die Entwicklung neuer Features durch die AI:

## 1. Branching
- Jedes neue Feature (oder jeder Bugfix) muss in einem isolierten, sprechend benannten Branch erfolgen.
- **Format:** `feat/<feature-name>` oder `fix/<bug-name>`
- Beispiel: `git checkout -b feat/advanced-history-filtering`

## 2. Commit-Strategie
Es wird nicht mehr "einmal am Ende" committed. Jeder signifikante Zwischenschritt wird sauber mit einer aussagekräftigen Commit-Message dokumentiert:
- **TDD Setup:** Nach dem Schreiben der initialen Tests (`test(feature): add initial tests for...`).
- **Implementierung:** Nach der fachlichen Umsetzung (`feat(feature): implement core logic...`).
- **Refactoring:** Nach Aufräumarbeiten oder Optimierungen (`refactor(feature): optimize...`).
- **Mutation Testing:** Wenn Stryker-Läufe durchgeführt werden, wird dies idealerweise am Ende des Branches getan, um die Mutation-Reports (History-Einträge) direkt an den Branch und Commit zu binden.

## 3. History Generation (Stryker)
- Der Befehl `npx vitest run && npx stryker run` wird explizit ausgeführt, **nachdem** ein Commit in dem entsprechenden Branch gesetzt wurde. 
- Dadurch greift der MCP-Reporter automatisch den korrekten Branch (`git rev-parse --abbrev-ref HEAD`) und die korrekte Commit-Message (`git log -1 --pretty=%B`) ab.
- Die `public/history.html` kann diese Daten anschließend nahtlos gruppieren.

## 4. Merge
- Sobald das Feature fertiggestellt und durch Mutation Testing verifiziert wurde, wird der Branch via `git merge --no-ff` (oder regulärem Merge) in den `main` integriert.
- Damit bleibt die Historie auch strukturell gut nachvollziehbar.
