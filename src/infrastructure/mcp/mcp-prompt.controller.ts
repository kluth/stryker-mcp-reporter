/* eslint-disable max-lines, complexity, no-useless-assignment */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { GetSurvivedMutantsUseCase } from "../../core/application/get-survived-mutants.use-case.js";
import type { SuggestMutantFixesUseCase } from "../../core/application/suggest-mutant-fixes.use-case.js";
import type { GetMutantContextUseCase } from "../../core/application/get-mutant-context.use-case.js";

export class McpPromptController {
  constructor(
    private readonly mcpServer: Server,
    private readonly getSurvivedUseCase: GetSurvivedMutantsUseCase,
    private readonly suggestFixesUseCase: SuggestMutantFixesUseCase,
    private readonly getMutantContextUseCase: GetMutantContextUseCase,
  ) {}

  public register(): void {
    this.mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: "explain_survived_mutants",
          description:
            "Formatiert alle überlebenden Mutanten als verständliche Prompt-Anweisung zur KI-Testgenerierung.",
        },
        {
          name: "remediate_mutants",
          description:
            "Generiert konkreten Test-Code und Randwertprüfungen für überlebte Mutanten.",
        },
        {
          name: "why_is_this_bad",
          description:
            "Analyzes surviving mutants and explains potential real-world security or performance risks they introduce.",
          arguments: [
            {
              name: "mutantId",
              description:
                "The ID of a specific surviving mutant to analyze (optional). If omitted, analyzes all surviving mutants.",
              required: false,
            },
          ],
        },
      ],
    }));

    this.mcpServer.setRequestHandler(
      GetPromptRequestSchema,
      async (request) => {
        const { name } = request.params;

        if (
          name === "explain_survived_mutants" ||
          name === "remediate_mutants"
        ) {
          const survivedResult = this.getSurvivedUseCase.execute();
          const survived = survivedResult.isOk ? survivedResult.value : [];
          const advice = await this.suggestFixesUseCase.execute(survived);

          if (survived.length === 0) {
            return {
              description: "Keine überlebenden Mutanten vorhanden.",
              messages: [
                {
                  role: "user",
                  content: {
                    type: "text",
                    text: "🎉 Perfekt! Es gibt aktuell keine überlebenden Mutanten. Der Mutation Score liegt bei 100%!",
                  },
                },
              ],
            };
          }

          const formattedMutants = advice
            .map(
              (m) =>
                `- **Datei**: \`${m.fileName}:${m.location.start.line}\`\n  - Mutator: \`${m.mutatorName}\`\n  - Erklärung: ${m.explanation}\n  - Vorab-Assertion: \`${m.suggestedAssertion}\`\n  - Test-Snippet:\n\`\`\`typescript\n${m.boundaryTestSnippet}\n\`\`\``,
            )
            .join("\n\n");

          return {
            description: "Aufforderung zur KI-Behebung überlebender Mutanten.",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Bitte erstelle Unit-Tests, um die folgenden überlebenden Mutanten zu beheben und einen 100% Mutation Score zu erreichen:\n\n${formattedMutants}`,
                },
              },
            ],
          };
        }

        if (name === "why_is_this_bad") {
          const mutantId = request.params.arguments?.mutantId;
          let mutantDetails = "";

          if (mutantId) {
            const contextResult =
              this.getMutantContextUseCase.execute(mutantId);
            if (contextResult.isOk) {
              mutantDetails = `Mutant ID: ${mutantId}\n\nContext:\n${JSON.stringify(contextResult.value, null, 2)}`;
            } else {
              mutantDetails = `Fehler beim Abrufen des Mutanten ${mutantId}: ${contextResult.error.message}`;
            }
          } else {
            const survivedResult = this.getSurvivedUseCase.execute();
            const survived = survivedResult.isOk ? survivedResult.value : [];
            if (survived.length === 0) {
              return {
                description: "No surviving mutants to analyze.",
                messages: [
                  {
                    role: "user",
                    content: {
                      type: "text",
                      text: "Es gibt aktuell keine überlebenden Mutanten. Kein Risiko vorhanden!",
                    },
                  },
                ],
              };
            }

            let fullContextDetails = "";
            for (const mutant of survived) {
              const contextResult = this.getMutantContextUseCase.execute(
                mutant.id,
              );
              if (contextResult.isOk) {
                fullContextDetails += `\n--- Mutant ID: ${mutant.id} an Ort: ${mutant.filePath}:${mutant.line}:${mutant.column} ---\n`;
                fullContextDetails += `Mutator: ${mutant.mutatorName}\n`;
                fullContextDetails += `Code Context (Vorher/Nachher):\n`;
                fullContextDetails += `Original:\n\`\`\`typescript\n${contextResult.value.originalCodeSnippet}\n\`\`\`\n`;
                fullContextDetails += `Mutiert:\n\`\`\`typescript\n${contextResult.value.mutatedCodeSnippet}\n\`\`\`\n`;
              } else {
                fullContextDetails += `\n--- Mutant ID: ${mutant.id} ---\nFehler beim Abrufen des Context: ${contextResult.error.message}\n`;
              }
            }

            mutantDetails = `All Surviving Mutants Context:\n\n${fullContextDetails}`;
          }

          return {
            description:
              "Aufforderung zur Analyse von realen Risiken eines Mutanten.",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Hier sind Informationen über überlebende Mutanten:\n\n${mutantDetails}\n\nBitte analysiere diese Mutanten aus einer realen Perspektive. "Why is this bad?" \n- Denke an Sicherheitsrisiken, Performance-Probleme oder Datenverlust.\n- Erkläre der KI, was der überlebende Mutant in einer Produktionsumgebung verursachen KÖNNTE.\n- Sei kreativ, aber bleibe realistisch und präzise.`,
                },
              },
            ],
          };
        }

        throw new Error(`Unbekannter Prompt: ${name}`);
      },
    );
  }
}

