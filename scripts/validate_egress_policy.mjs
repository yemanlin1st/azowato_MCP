import fs from "node:fs";

const policy = JSON.parse(fs.readFileSync(new URL("../config/egress-policy.json", import.meta.url), "utf8"));
const pins = JSON.parse(fs.readFileSync(new URL("../config/upstream-pins.json", import.meta.url), "utf8"));
const source = fs.readFileSync(new URL("../api/server.ts", import.meta.url), "utf8");

const failures = [];
if (policy.mode !== "default-deny") failures.push("egress mode must be default-deny");
const g = policy.capabilities?.gstack ?? {};
for (const [key, expected] of Object.entries({
  automaticRuntimeEgress: "deny",
  telemetry: "off",
  updateCheck: false,
  autoUpgrade: false,
  codexReviews: "disabled",
  artifactsSyncMode: "off",
  pairAgent: "off",
  memorableRecall: "off",
  transcriptIngestMode: "off"
})) {
  if (g[key] !== expected) failures.push(`gstack ${key} must equal ${JSON.stringify(expected)}`);
}
if (policy.capabilities?.previewQualification?.productionAliasMutation !== false) failures.push("preview must not mutate production alias");

const pin = pins.dependencies?.gstack;
if (!pin) failures.push("gstack pin missing");
else {
  if (pin.repository !== "garrytan/gstack") failures.push("gstack repository pin mismatch");
  if (pin.version !== "1.87.4.0") failures.push("gstack version pin mismatch");
  if (pin.commit !== "a6b3a57512ca6d5c6aa5b68f74f736195021f96e") failures.push("gstack commit pin mismatch");
  if (pin.commitSignatureVerified !== true) failures.push("gstack signature qualification missing");
  if (pin.license !== "MIT") failures.push("gstack license qualification mismatch");
  if (pin.autoUpgrade !== false) failures.push("gstack auto-upgrade must be false");
}

for (const required of [
  'id: "gstack"',
  'telemetry: "off"',
  'proactive: false',
  'autoUpgrade: false',
  'updateCheck: false',
  'codexReviews: "disabled"',
  'artifactsSyncMode: "off"',
  'pairAgent: "off"',
  'memorableRecall: "off"',
  'checkpointPush: false',
  'designDetector: "off"'
]) {
  if (!source.includes(required)) failures.push(`server contract missing: ${required}`);
}

if (failures.length) {
  console.error("ΩDEVFABRIC egress/security gate: FAIL");
  for (const failure of failures) console.error("-", failure);
  process.exit(1);
}
console.log("ΩDEVFABRIC egress/security gate: PASS");
