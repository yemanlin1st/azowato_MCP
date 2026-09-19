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

const swe = policy.capabilities?.miniSWEAgent ?? {};
for (const [key, expected] of Object.entries({
  automaticRuntimeEgress: "deny",
  executionMode: "sandbox-first",
  localHostShell: "deny-by-default",
  modelProviderEgress: "mission-scoped-explicit-grant",
  modelSecrets: "secret-manager-injection-only",
  gitWrite: "feature-branch-or-disposable-worktree-only",
  productionDeploy: false,
  destructiveCommands: "human-approval-required"
})) {
  if (swe[key] !== expected) failures.push(`mini-SWE-agent ${key} must equal ${JSON.stringify(expected)}`);
}
const rexPolicy = policy.capabilities?.sweRex ?? {};
if (rexPolicy.automaticRuntimeEgress !== "deny") failures.push("SWE-ReX automatic runtime egress must be deny");
if (rexPolicy.privilegedContainers !== false) failures.push("SWE-ReX privileged containers must be false");
if (rexPolicy.hostDockerSocket !== "deny-unless-explicitly-approved") failures.push("SWE-ReX host Docker socket must be deny-by-default");

const swePin = pins.dependencies?.["mini-swe-agent"];
if (!swePin) failures.push("mini-SWE-agent pin missing");
else {
  if (swePin.repository !== "SWE-agent/mini-swe-agent") failures.push("mini-SWE-agent repository pin mismatch");
  if (swePin.version !== "2.4.6") failures.push("mini-SWE-agent version pin mismatch");
  if (swePin.commit !== "a83fcae82d2a08f0ee0c688f9d137b3566c097f8") failures.push("mini-SWE-agent commit pin mismatch");
  if (swePin.commitSignatureVerified !== true) failures.push("mini-SWE-agent signature qualification missing");
  if (swePin.license !== "MIT") failures.push("mini-SWE-agent license mismatch");
  if (swePin.autoUpgrade !== false) failures.push("mini-SWE-agent auto-upgrade must be false");
}
const rexPin = pins.dependencies?.["swe-rex"];
if (!rexPin) failures.push("SWE-ReX pin missing");
else {
  if (rexPin.repository !== "SWE-agent/SWE-ReX") failures.push("SWE-ReX repository pin mismatch");
  if (rexPin.version !== "1.4.0") failures.push("SWE-ReX version pin mismatch");
  if (rexPin.commit !== "f802b3e14d82aa4c13291d2fda5bd4fd48f36f91") failures.push("SWE-ReX commit pin mismatch");
  if (rexPin.commitSignatureVerified !== true) failures.push("SWE-ReX signature qualification missing");
  if (rexPin.license !== "MIT") failures.push("SWE-ReX license mismatch");
  if (rexPin.autoUpgrade !== false) failures.push("SWE-ReX auto-upgrade must be false");
}


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
  'designDetector: "off"',
  'id: "mini-swe-agent"',
  'hostLocalAutonomy: false',
  'modelSecretPersistence: false',
  'productionDeploy: false',
  'gitWrites: "feature-branch-or-disposable-worktree-only"',
  'id: "swe-rex"',
  'privilegedContainers: false'
]) {
  if (!source.includes(required)) failures.push(`server contract missing: ${required}`);
}

if (failures.length) {
  console.error("ΩDEVFABRIC egress/security gate: FAIL");
  for (const failure of failures) console.error("-", failure);
  process.exit(1);
}
console.log("ΩDEVFABRIC egress/security gate: PASS");