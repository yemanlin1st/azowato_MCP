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
  "garrytan/gstack",
  "a6b3a57512ca6d5c6aa5b68f74f736195021f96e",
  "SWE-agent/mini-swe-agent",
  "a83fcae82d2a08f0ee0c688f9d137b3566c097f8",
  "SWE-agent/SWE-ReX",
  "f802b3e14d82aa4c13291d2fda5bd4fd48f36f91",
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