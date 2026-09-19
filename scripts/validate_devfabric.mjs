import fs from "node:fs";

const source = fs.readFileSync(new URL("../api/server.ts", import.meta.url), "utf8");

const required = [
  'server.tool("devfabric_status"',
  'server.tool("local_install_plan"',
  "microsoft/playwright-mcp",
  "sentry-official/sentry-mcp",
  "firecrawl/firecrawl-mcp-server",
  "brave/brave-search-mcp-server",
  "modelcontextprotocol/servers/src/sequentialthinking",
  "amaancoderx/skillui",
  "Never place API keys",
  "versionPinned",
  "killSwitchDefined"
];

const missing = required.filter((value) => !source.includes(value));
if (missing.length) {
  console.error("DEVFABRIC contract missing:", missing);
  process.exit(1);
}

const forbiddenSecretPatterns = [
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /fc-[A-Za-z0-9_-]{20,}/,
  /postgres(?:ql)?:\/\/[^\s"'<>]+:[^\s"'<>]+@/i
];

for (const pattern of forbiddenSecretPatterns) {
  if (pattern.test(source)) {
    console.error("Potential embedded secret or credential detected:", pattern.toString());
    process.exit(1);
  }
}

console.log("ΩDEVFABRIC policy contract: PASS");
