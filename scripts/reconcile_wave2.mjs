import fs from "node:fs";

const pins = JSON.parse(fs.readFileSync("config/upstream-pins.json","utf8"));
const wave = JSON.parse(fs.readFileSync("config/devfabric-wave2.json","utf8"));
const egress = JSON.parse(fs.readFileSync("config/egress-policy.json","utf8"));
const source = fs.readFileSync("api/server.ts","utf8");

const failures = [];
const requiredPins = {
  "mini-swe-agent":"a83fcae82d2a08f0ee0c688f9d137b3566c097f8",
  "swe-rex":"f802b3e14d82aa4c13291d2fda5bd4fd48f36f91",
  "openrag":"dbb6f9e442fe90b2a60414bf2eb6d4c83d1dd30d",
  "9drive":"811d4a2137538b73abb43d195d7bf452e01b0c58",
  "continue":"03b05ef60c378ff06f9e39ada2e22c95fe9ef6ad",
  "aider":"a4be6ccd87ebaa59b361f3f028d116ce1761b626",
  "tabby":"d4c033a138646524c545a0ead22690ef8ec05175",
  "ollama":"dfabde4539e42ba1e1eab50a3a50b88aea7958a0",
  "codex-cli":"be2951ea34f0d295ed0becf97079f92fa5f6950e"
};
for (const [id, commit] of Object.entries(requiredPins)) {
  const item = pins.dependencies?.[id];
  if (!item) failures.push(`missing pin: ${id}`);
  else if (item.commit !== commit) failures.push(`pin mismatch: ${id}`);
  if (item?.autoUpgrade !== false) failures.push(`autoUpgrade must be false: ${id}`);
}

if (wave.orchestration?.pattern !== "sequence-synchronize-parallel-reconcile") failures.push("workgraph pattern mismatch");
if (!String(wave.orchestration?.singleWriterRule||"").startsWith("Only the selected primary coding agent")) failures.push("single writer rule missing");
if (wave.planes?.multicloud?.preview?.[0] !== "Railway") failures.push("Railway preview role missing");
if (wave.planes?.multicloud?.targetProduction?.[0] !== "Vercel") failures.push("Vercel target role missing");
if (wave.planes?.knowledgeRag?.primary !== "openrag") failures.push("OpenRAG primary knowledge plane missing");
if (wave.planes?.modelRuntime?.local !== "ollama") failures.push("Ollama local model role missing");
if (wave.planes?.storage?.gateway !== "9drive") failures.push("9drive gateway role missing");

if (egress.mode !== "default-deny") failures.push("egress must remain default-deny");
if (egress.capabilities?.agenticCoding?.autonomousShell !== "sandbox-required") failures.push("autonomous shell must be sandbox-required");
if (egress.capabilities?.modelRuntime?.tabby?.usageCollection !== "disabled") failures.push("Tabby usage collection must be disabled");
if (egress.capabilities?.storageGateway?.nineDrive?.defaultPasswords !== "forbidden") failures.push("9drive default passwords must be forbidden");
if (egress.capabilities?.telephony?.threeCX?.writes !== "human-approved T4") failures.push("3CX writes must remain T4");

for (const id of ["mini-swe-agent","swe-rex","codex-cli","aider","continue","openrag","9drive","ollama","tabby","three-cx"]) {
  if (!source.includes(`id: "${id}"`)) failures.push(`server registry missing: ${id}`);
}

const forbidden = [
  "change-this-database-password",
  "change-this-jwt-secret-at-least-32-chars",
  "change-this-encryption-key-32bytes!",
  "your-secret-key-change-in-production"
];
for (const value of forbidden) {
  for (const file of ["config/upstream-pins.json","config/devfabric-wave2.json","config/egress-policy.json"]) {
    if (fs.readFileSync(file,"utf8").includes(value)) failures.push(`forbidden default secret in ${file}`);
  }
}

if (failures.length) {
  console.error("ΩDEVFABRIC Wave 2 reconciliation: FAIL");
  failures.forEach((x)=>console.error("-",x));
  process.exit(1);
}
console.log("ΩDEVFABRIC Wave 2 reconciliation: PASS");