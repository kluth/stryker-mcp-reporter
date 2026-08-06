import { MutantDetail } from "../domain/mutation-report.js";

export class GenerateTestingCheatSheetUseCase {
  public execute(mutants: MutantDetail[]): string {
    const survivedMutants = mutants.filter(
      (m) => m.status === "Survived" || m.status === "NoCoverage",
    );

    if (survivedMutants.length === 0) {
      return "# Mutation Testing Cheat Sheet\n\nGreat job! No survived mutants to generate anti-patterns for.";
    }

    const groupedByMutator = survivedMutants.reduce(
      (acc, mutant) => {
        const mutatorName = mutant.mutatorName || "UnknownMutator";
        if (!acc[mutatorName]) {
          acc[mutatorName] = [];
        }
        acc[mutatorName].push(mutant);
        return acc;
      },
      {} as Record<string, MutantDetail[]>,
    );

    let cheatSheet = "# Mutation Testing Cheat Sheet\n\n";
    cheatSheet += `Based on the latest analysis of ${survivedMutants.length} surviving mutants, here are the most common testing anti-patterns in this project and how to fix them:\n\n`;

    const sortedMutators = Object.keys(groupedByMutator).sort(
      (a, b) => groupedByMutator[b].length - groupedByMutator[a].length,
    );

    for (const mutator of sortedMutators) {
      const count = groupedByMutator[mutator].length;
      cheatSheet += `## ${mutator} (Survived ${count} times)\n\n`;

      if (mutator.includes("Equality") || mutator.includes("Conditional")) {
        cheatSheet += `**Anti-Pattern:** Not testing exact boundary values. Often, tests assert a general case but fail to check the exact threshold (e.g. \`x = 10\` when condition is \`x < 10\`).\n\n`;
        cheatSheet += `**Best Practice:** Always write a specific test case for the boundary value. Use strict equality (\`toBe\`, \`toEqual\`) instead of truthy assertions.\n\n`;
      } else if (mutator.includes("String") || mutator.includes("Literal")) {
        cheatSheet += `**Anti-Pattern:** Missing assertions on specific output strings or literal values. Tests might check that a function returns a string, but not the *exact* string.\n\n`;
        cheatSheet += `**Best Practice:** Assert exact formatting and string literals. If a function returns an error message, test the exact error message content.\n\n`;
      } else if (mutator.includes("Boolean") || mutator.includes("Logical")) {
        cheatSheet += `**Anti-Pattern:** Only testing the "happy path" (true branch) of logical conditions (AND/OR). The false branch remains untested.\n\n`;
        cheatSheet += `**Best Practice:** Write dedicated test cases that explicitly trigger the \`false\` condition of logical operators to ensure the branch logic is covered.\n\n`;
      } else {
        cheatSheet += `**Anti-Pattern:** Uncovered code mutations for ${mutator}.\n\n`;
        cheatSheet += `**Best Practice:** Ensure robust coverage and explicit assertions around this logic.\n\n`;
      }

      const examples = groupedByMutator[mutator].slice(0, 3);
      cheatSheet += `### Recent Examples:\n`;
      examples.forEach((ex) => {
        cheatSheet += `- \`${ex.filePath}\` at line ${ex.line || "unknown"}: mutated to \`${ex.replacement || "none"}\`\n`;
      });
      cheatSheet += `\n`;
    }

    return cheatSheet.trim();
  }
}
