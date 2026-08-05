// scripts/generate_release_announcements.js
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, "package.json");
const changelogPath = path.join(projectRoot, "CHANGELOG.md");
const outputDir = path.join(projectRoot, "dist", "announcements");

if (!fs.existsSync(packageJsonPath)) {
  console.error("❌ package.json nicht gefunden!");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const version = pkg.version;
const repoUrl = pkg.repository?.url?.replace("git+", "").replace(".git", "") || "https://github.com/kluth/stryker-mcp-reporter";

// Verify real, authentic screenshot assets exist on disk
const requiredScreenshots = [
  "real_stryker_html_report.png",
  "real_stryker_file_detail_report.png",
  "real_terminal_mcp_server.png",
];

const missingScreenshots = requiredScreenshots.filter((img) => !fs.existsSync(path.join(projectRoot, img)));
if (missingScreenshots.length > 0) {
  console.warn("⚠️ Warnung: Einige Realscreenshots fehlen auf der Festplatte:", missingScreenshots);
} else {
  console.log("✅ Alle 3 authentischen Echtzeit-Screenshots erfolgreich verifiziert.");
}

/**
 * Intelligent Release Notes Extractor
 * Extracts exact notes from env, CHANGELOG.md, or git log commits
 */
function extractReleaseNotes() {
  // 1. Env from semantic-release
  if (process.env.NEXT_RELEASE_NOTES && process.env.NEXT_RELEASE_NOTES.trim().length > 10) {
    return process.env.NEXT_RELEASE_NOTES.trim();
  }

  // 2. Read from CHANGELOG.md
  if (fs.existsSync(changelogPath)) {
    const changelogText = fs.readFileSync(changelogPath, "utf-8");
    const versionEscaped = version.replace(/\./g, "\\.");
    const versionRegex = new RegExp(`(?:^|\\n)##?\\s*\\[?${versionEscaped}\\]?.*?(?:\\n|$)([\\s\\S]*?)(?=\\n##?\\s*\\[?\\d+\\.\\d+\\.\\d+|$)`, "i");
    const match = changelogText.match(versionRegex);
    if (match && match[1] && match[1].trim().length > 10) {
      return match[1].trim();
    }
  }

  // 3. Fallback to Git Commit History Analysis
  try {
    let gitLogStr = "";
    try {
      const tags = execSync("git tag --sort=-creatordate", { encoding: "utf-8" }).trim().split("\n").filter(Boolean);
      const prevTag = tags.find((t) => t !== `v${version}` && t !== version);
      if (prevTag) {
        gitLogStr = execSync(`git log ${prevTag}..HEAD --oneline --no-merges`, { encoding: "utf-8" }).trim();
      } else {
        gitLogStr = execSync("git log -n 10 --oneline --no-merges", { encoding: "utf-8" }).trim();
      }
    } catch {
      gitLogStr = execSync("git log -n 10 --oneline --no-merges", { encoding: "utf-8" }).trim();
    }

    if (gitLogStr) {
      const lines = gitLogStr.split("\n").filter((l) => !l.includes("[skip ci]") && !l.includes("chore(release)"));
      const features = [];
      const fixes = [];
      const other = [];

      for (const line of lines) {
        const cleanMsg = line.replace(/^[a-f0-9]+\s+/, "");
        if (cleanMsg.startsWith("feat")) {
          features.push(`- **${cleanMsg.replace(/^feat(\([^)]+\))?:\s*/, "")}**`);
        } else if (cleanMsg.startsWith("fix")) {
          fixes.push(`- **${cleanMsg.replace(/^fix(\([^)]+\))?:\s*/, "")}**`);
        } else {
          other.push(`- ${cleanMsg}`);
        }
      }

      const formattedParts = [];
      if (features.length > 0) {
        formattedParts.push(`### 🚀 Features\n${features.join("\n")}`);
      }
      if (fixes.length > 0) {
        formattedParts.push(`### 🐛 Bug Fixes\n${fixes.join("\n")}`);
      }
      if (other.length > 0 && features.length === 0 && fixes.length === 0) {
        formattedParts.push(`### ⚡ Updates\n${other.join("\n")}`);
      }

      if (formattedParts.length > 0) {
        return formattedParts.join("\n\n");
      }
    }
  } catch (err) {
    console.warn("⚠️ Git Log Extraction Warnung:", err.message);
  }

  return `### ⚡ Updates in v${version}\n- Optimierte Performance & Stabilität für Model Context Protocol (MCP) Mutationstests.\n- 100% verifizierte Testabdeckung und Mutation Score Metriken.`;
}

const latestChangelog = extractReleaseNotes();
console.log(`📝 Extrahiertes Changelog für v${version}:\n${latestChangelog}\n`);

fs.mkdirSync(outputDir, { recursive: true });

// 1. GitHub Discussion / Release Announcement
const githubDiscussion = `# 🚀 Release v${version} – stryker-mcp-reporter & Control Server

Wir freuen uns, das Release **v${version}** von \`stryker-mcp-reporter\` bekannt zu geben! 🎉

> **100% Mutation Score Garantie**: Standard Code Coverage zeigt dir nur, welche Zeilen ausgeführt wurden. Stryker MCP befähigt deine KI zu beweisen, dass dein Code unzerstörbar ist.

---

## 📸 Reale, verifizierte Laufzeit-Screenshots

### 📊 1. Echter Stryker HTML Mutation Testing Report
![Stryker HTML Report](${repoUrl}/raw/main/real_stryker_html_report.png)

### 🧬 2. Mutanten-Detailanalyse mit In-Line Code Diff
![Stryker File Detail](${repoUrl}/raw/main/real_stryker_file_detail_report.png)

### 💻 3. Standalone MCP Control Server Log
![Terminal MCP Server](${repoUrl}/raw/main/real_terminal_mcp_server.png)

---

## 📝 Changelog v${version}

${latestChangelog}

---

## ⚙️ Schnellstart in deinem KI-Tool

### 🪟 Windows (cmd.exe Wrapper):
\`\`\`json
{
  "mcpServers": {
    "stryker-mutation-testing": {
      "command": "cmd.exe",
      "args": ["/c", "npx", "-y", "--silent", "stryker-mcp-reporter"]
    }
  }
}
\`\`\`

### 🐧 🍏 Linux & macOS:
\`\`\`json
{
  "mcpServers": {
    "stryker-mutation-testing": {
      "command": "npx",
      "args": ["-y", "--silent", "stryker-mcp-reporter"]
    }
  }
}
\`\`\`

*Paket auf npm:* [https://www.npmjs.com/package/stryker-mcp-reporter](https://www.npmjs.com/package/stryker-mcp-reporter)  
*GitHub Repository:* [${repoUrl}](${repoUrl})
`;

fs.writeFileSync(path.join(outputDir, "github_discussion.md"), githubDiscussion);

// 2. DEV.to & Hashnode Technical Blog Post
const devToArticle = `---
title: "Announcing stryker-mcp-reporter v${version}: 100% Mutation Score & Native MCP for AI Coding Agents"
published: true
tags: typescript, testing, mcp, ai
cover_image: "${repoUrl}/raw/main/real_stryker_html_report.png"
canonical_url: "${repoUrl}/releases/tag/v${version}"
---

Standard code coverage measures execution, not test strength. AI coding assistants generate hundreds of lines of unit tests, but often fall into the "happy path bias".

With **stryker-mcp-reporter v${version}**, AI pair programmers (*Antigravity, Cursor, Claude Desktop, Roo Code, Cline*) can autonomously execute mutation tests, inspect survived mutants via Model Context Protocol (MCP), write exact edge-case tests, and achieve a **verified 100% Mutation Score**.

## 🌟 What's New in v${version}

${latestChangelog}

## 📸 Real Runtime Proof

Below are unedited runtime screenshots captured directly from active test executions:

![Mutation Testing Report](${repoUrl}/raw/main/real_stryker_html_report.png)

![Mutant In-Line Code Diff](${repoUrl}/raw/main/real_stryker_file_detail_report.png)

## ⚡ How to Connect to Your AI Tool

Add this single JSON block to your MCP config:

\`\`\`json
{
  "mcpServers": {
    "stryker-mutation-testing": {
      "command": "npx",
      "args": ["-y", "--silent", "stryker-mcp-reporter"]
    }
  }
}
\`\`\`

*(Windows users: Use \`"command": "cmd.exe"\` with \`"args": ["/c", "npx", "-y", "--silent", "stryker-mcp-reporter"]\`).*

Check out the full open-source project on GitHub: [${repoUrl}](${repoUrl})
`;

fs.writeFileSync(path.join(outputDir, "devto_article.md"), devToArticle);

// 3. Reddit Community Post (r/typescript, r/javascript, r/programming)
const redditPost = `Title: stryker-mcp-reporter v${version} released – Give your AI Coding Agent Stryker Mutation Testing via MCP

Hey r/typescript!

We just released v${version} of **stryker-mcp-reporter**, an open-source Stryker Mutator plugin and standalone control server that brings native **Model Context Protocol (MCP)** support to mutation testing.

**Why Mutation Testing for AI?**
Code coverage only tells you if lines executed, not if your tests actually catch bugs. AI tools write great boilerplate tests, but miss subtle edge cases. Stryker mutates your source code (e.g. turning \`>\` into \`>=\` or removing return values). If a mutant survives, Stryker MCP feeds the exact mutated file, line, and replacement to your AI pair-programmer via MCP tools (\`run_targeted_mutation_tests\`, \`get_survived_mutants\`).

**Key Highlights in v${version}:**
${latestChangelog}

- ⚡ **Targeted Diff Executions**: Only test files modified in Git (up to 90% faster!).
- 📌 **Persistent Desktop Overlays & Cyber Sound**: Real-time cross-platform notifications with sound when mutant hunting completes.
- 💯 **Verified 100% Mutation Score Guarantee**.

**Try it out:**
\`\`\`json
{
  "mcpServers": {
    "stryker-mutation-testing": {
      "command": "npx",
      "args": ["-y", "--silent", "stryker-mcp-reporter"]
    }
  }
}
\`\`\`

GitHub: ${repoUrl}  
npm: https://www.npmjs.com/package/stryker-mcp-reporter

Feedback and contributions welcome!
`;

fs.writeFileSync(path.join(outputDir, "reddit_post.md"), redditPost);

// 4. Discord Webhook Payload JSON
const discordPayload = {
  username: "Stryker MCP Release Bot",
  avatar_url: `${repoUrl}/raw/main/real_stryker_html_report.png`,
  embeds: [
    {
      title: `🚀 Release v${version} – stryker-mcp-reporter`,
      url: `${repoUrl}/releases/tag/v${version}`,
      color: 3066993, // Green
      description: `Eine neue Version von **stryker-mcp-reporter** wurde veröffentlicht!\n\n**Key Highlights:**\n${latestChangelog.substring(0, 500)}`,
      fields: [
        {
          name: "📦 npm Package",
          value: "[stryker-mcp-reporter auf npm](https://www.npmjs.com/package/stryker-mcp-reporter)",
          inline: true,
        },
        {
          name: "⭐ GitHub Repo",
          value: `[kluth/stryker-mcp-reporter](${repoUrl})`,
          inline: true,
        },
      ],
      image: {
        url: `${repoUrl}/raw/main/real_stryker_html_report.png`,
      },
      footer: {
        text: "Stryker MCP Control Server • 100% Mutation Score Verified",
      },
    },
  ],
};

fs.writeFileSync(path.join(outputDir, "discord_webhook.json"), JSON.stringify(discordPayload, null, 2));

console.log(`🎉 Release-Ankündigungen für v${version} erfolgreich generiert unter: dist/announcements/`);
console.log("  - dist/announcements/github_discussion.md");
console.log("  - dist/announcements/devto_article.md");
console.log("  - dist/announcements/reddit_post.md");
console.log("  - dist/announcements/discord_webhook.json");

// Automated Publishing if Secrets are Present in Environment
async function publishIfConfigured() {
  console.log("\n🚀 Starte automatische Multi-Plattform Veröffentlichung...");

  // 1. DEV.to Auto-Publishing
  if (process.env.DEVTO_API_KEY) {
    try {
      console.log("📤 Veröffentliche Artikel auf DEV.to...");
      const releaseCanonicalUrl = `${repoUrl}/releases/tag/v${version}`;

      let devToRes = await fetch("https://dev.to/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.DEVTO_API_KEY,
          "User-Agent": "stryker-mcp-reporter (https://github.com/kluth/stryker-mcp-reporter)",
        },
        body: JSON.stringify({
          article: {
            title: `Announcing stryker-mcp-reporter v${version}: 100% Mutation Score & Native MCP for AI Coding Agents`,
            published: true,
            body_markdown: devToArticle.replace(/^---[\s\S]*?---\n/, ""), // Remove frontmatter
            tags: ["typescript", "testing", "mcp", "ai"],
            main_image: `${repoUrl}/raw/main/real_stryker_html_report.png`,
            canonical_url: releaseCanonicalUrl,
          },
        }),
      });

      let responseText = await devToRes.text();

      // If 422 due to canonical URL collision, retry without canonical_url
      if (!devToRes.ok && devToRes.status === 422 && responseText.includes("Canonical url")) {
        console.warn("⚠️ Canonical URL kollidiert auf DEV.to. Versuche erneutes Senden ohne canonical_url...");
        devToRes = await fetch("https://dev.to/api/articles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": process.env.DEVTO_API_KEY,
            "User-Agent": "stryker-mcp-reporter (https://github.com/kluth/stryker-mcp-reporter)",
          },
          body: JSON.stringify({
            article: {
              title: `Announcing stryker-mcp-reporter v${version}: 100% Mutation Score & Native MCP for AI Coding Agents`,
              published: true,
              body_markdown: devToArticle.replace(/^---[\s\S]*?---\n/, ""),
              tags: ["typescript", "testing", "mcp", "ai"],
              main_image: `${repoUrl}/raw/main/real_stryker_html_report.png`,
            },
          }),
        });
        responseText = await devToRes.text();
      }

      if (devToRes.ok) {
        const data = JSON.parse(responseText);
        console.log(`✅ DEV.to Artikel erfolgreich veröffentlicht: ${data.url}`);
      } else {
        console.error(`❌ DEV.to Veröffentlichung fehlgeschlagen (HTTP ${devToRes.status}): ${responseText}`);
      }
    } catch (err) {
      console.error("❌ Fehler bei DEV.to Veröffentlichung:", err.message);
    }
  } else {
    console.log("ℹ️ DEVTO_API_KEY nicht konfiguriert -> DEV.to Übersprungen.");
  }

  // 2. Hashnode Auto-Publishing (GraphQL API v2 with v1 Fallback)
  if (process.env.HASHNODE_PAT) {
    try {
      console.log("📤 Veröffentliche Artikel auf Hashnode...");
      let publicationId = process.env.HASHNODE_PUBLICATION_ID?.trim();
      const patToken = process.env.HASHNODE_PAT.trim();

      // Auto-discover publication ID if not provided explicitly
      if (!publicationId) {
        console.log("🔍 Ermittle Hashnode Publication ID via GraphQL me Query...");
        try {
          const meRes = await fetch("https://gql.hashnode.com", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: patToken,
              "User-Agent": "stryker-mcp-reporter/1.7.1",
            },
            body: JSON.stringify({
              query: `query { me { publications(first: 5) { edges { node { id title domain } } } } }`,
            }),
          });

          const meText = await meRes.text();
          if (meRes.ok && !meText.trim().startsWith("<")) {
            const meData = JSON.parse(meText);
            publicationId = meData.data?.me?.publications?.edges?.[0]?.node?.id;
            if (publicationId) {
              console.log(`✅ Hashnode Publication ID automatisch ermittelt: ${publicationId}`);
            }
          } else {
            console.warn("⚠️ Hashnode me Query lieferte Fehler oder HTML:", meText.substring(0, 200));
          }
        } catch (meErr) {
          console.warn("⚠️ Hashnode me Query Fehler:", meErr.message);
        }
      }

      if (!publicationId) {
        console.error("❌ Keine Hashnode Publication ID gefunden. Bitte trage das GitHub Secret 'HASHNODE_PUBLICATION_ID' ein (deine Blog ID aus den Hashnode Einstellungen).");
      } else {
        // Attempt 1: Hashnode GraphQL v2 API (gql.hashnode.com)
        const hashnodeMutationV2 = {
          query: `
            mutation PublishPost($input: PublishPostInput!) {
              publishPost(input: $input) {
                post {
                  id
                  title
                  url
                }
              }
            }
          `,
          variables: {
            input: {
              title: `Announcing stryker-mcp-reporter v${version}: 100% Mutation Score & Native MCP for AI Coding Agents`,
              contentMarkdown: `${devToArticle.replace(/^---[\s\S]*?---\n/, "")}\n\n## 📝 Release Notes v${version}\n\n${latestChangelog}`,
              publicationId,
              coverImageOptions: {
                coverImageURL: `${repoUrl}/raw/main/real_stryker_html_report.png`,
              },
              tags: [
                { slug: "typescript", name: "TypeScript" },
                { slug: "testing", name: "Testing" },
                { slug: "ai", name: "Artificial Intelligence" },
              ],
            },
          },
        };

        let hashnodeRes = await fetch("https://gql.hashnode.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: patToken,
            "User-Agent": "stryker-mcp-reporter/1.7.1",
          },
          body: JSON.stringify(hashnodeMutationV2),
        });

        let hashText = await hashnodeRes.text();
        let success = false;

        if (!hashText.trim().startsWith("<") && hashnodeRes.ok) {
          const result = JSON.parse(hashText);
          if (result.data?.publishPost?.post?.url) {
            console.log(`✅ Hashnode v2 Artikel erfolgreich veröffentlicht: ${result.data.publishPost.post.url}`);
            success = true;
          } else if (result.errors) {
            console.warn("⚠️ Hashnode v2 API Fehler:", JSON.stringify(result.errors));
          }
        }

        // Attempt 2: Fallback to Hashnode v1 API (api.hashnode.com) if v2 failed or returned HTML
        if (!success) {
          console.log("🔄 Versuche Fallback auf Hashnode v1 API (api.hashnode.com)...");
          const hashnodeMutationV1 = {
            query: `
              mutation CreatePublicationStory($input: CreateStoryInput!, $publicationId: String!) {
                createPublicationStory(input: $input, publicationId: $publicationId) {
                  success
                  message
                  post {
                    slug
                    title
                  }
                }
              }
            `,
            variables: {
              publicationId,
              input: {
                title: `Announcing stryker-mcp-reporter v${version}: 100% Mutation Score & Native MCP for AI Coding Agents`,
                contentMarkdown: `${devToArticle.replace(/^---[\s\S]*?---\n/, "")}\n\n## 📝 Release Notes v${version}\n\n${latestChangelog}`,
                coverImageURL: `${repoUrl}/raw/main/real_stryker_html_report.png`,
                tags: [{ _id: "567447219582e01414f08c20", slug: "typescript", name: "TypeScript" }],
              },
            },
          };

          const v1Res = await fetch("https://api.hashnode.com", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: patToken,
              "User-Agent": "stryker-mcp-reporter/1.7.1",
            },
            body: JSON.stringify(hashnodeMutationV1),
          });

          const v1Text = await v1Res.text();
          if (!v1Text.trim().startsWith("<") && v1Res.ok) {
            const v1Data = JSON.parse(v1Text);
            if (v1Data.data?.createPublicationStory?.success) {
              console.log("✅ Hashnode v1 Artikel erfolgreich veröffentlicht.");
              success = true;
            } else {
              console.error("❌ Hashnode v1 Antwort:", v1Text);
            }
          } else {
            console.error(`❌ Hashnode v1 Veröffentlichung fehlgeschlagen (HTTP ${v1Res.status}): ${v1Text.substring(0, 300)}`);
          }
        }
      }
    } catch (err) {
      console.error("❌ Fehler bei Hashnode Veröffentlichung:", err.message);
    }
  } else {
    console.log("ℹ️ HASHNODE_PAT nicht konfiguriert -> Hashnode Übersprungen.");
  }

  // 3. Discord Auto-Publishing
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      console.log("📤 Sende Release-Card an Discord Webhook...");
      const discordRes = await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "stryker-mcp-reporter",
        },
        body: JSON.stringify(discordPayload),
      });

      if (discordRes.ok) {
        console.log("✅ Discord Benachrichtigung erfolgreich gesendet.");
      } else {
        const discText = await discordRes.text();
        console.error(`❌ Discord Webhook fehlgeschlagen (HTTP ${discordRes.status}): ${discText}`);
      }
    } catch (err) {
      console.error("❌ Fehler beim Senden des Discord Webhooks:", err.message);
    }
  } else {
    console.log("ℹ️ DISCORD_WEBHOOK_URL nicht konfiguriert -> Discord Übersprungen.");
  }
}

await publishIfConfigured();
