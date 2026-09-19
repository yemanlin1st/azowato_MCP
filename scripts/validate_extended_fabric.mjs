import fs from "node:fs";

const pins = JSON.parse(fs.readFileSync(new URL("../config/upstream-pins.json", import.meta.url), "utf8"));
const policy = JSON.parse(fs.readFileSync(new URL("../config/egress-policy.json", import.meta.url), "utf8"));
const server = fs.readFileSync(new URL("../api/server.ts", import.meta.url), "utf8");
const overlay = fs.readFileSync(new URL("./harden_9drive.py", import.meta.url), "utf8");

const failures = [];
const expectPin = (id, expected) => {
  const p = pins.dependencies?.[id];
  if (!p) return failures.push("missing upstream pin: " + id);
  for (const [k,v] of Object.entries(expected)) if (p[k] !== v) failures.push(id + "." + k + " mismatch");
};

expectPin("mini-swe-agent", {
  commit:"a83fcae82d2a08f0ee0c688f9d137b3566c097f8",
  commitSignatureVerified:true,
  license:"MIT"
});
expectPin("swe-rex", {
  commit:"f802b3e14d82aa4c13291d2fda5bd4fd48f36f91",
  commitSignatureVerified:true,
  license:"MIT"
});
expectPin("openrag", {
  commit:"dbb6f9e442fe90b2a60414bf2eb6d4c83d1dd30d",
  commitSignatureVerified:true,
  license:"Apache-2.0"
});
expectPin("9drive", {
  commit:"811d4a2137538b73abb43d195d7bf452e01b0c58",
  commitSignatureVerified:false,
  hardeningOverlayRequired:true
});

if (policy.capabilities?.miniSWEAgent?.execution !== "sandbox-required") failures.push("mini-SWE-agent must be sandbox-required");
if (policy.capabilities?.miniSWEAgent?.hostShellDefault !== "deny") failures.push("mini-SWE-agent host shell must default deny");
if (policy.capabilities?.openrag?.documentDataEgress !== "deny-by-default") failures.push("OpenRAG document data egress must default deny");
if (policy.capabilities?.nineDrive?.runtimeSelfUpdate !== false) failures.push("9drive runtime self-update must be false");
if (policy.capabilities?.nineDrive?.systemMutationRoutes !== false) failures.push("9drive system mutation routes must be false");
if (policy.capabilities?.multiCloudPreview?.providerNeutralRequired !== true) failures.push("multi-cloud provider-neutral preview required");

for (const required of [
  'id: "mini-swe-agent"',
  'id: "swe-rex"',
  'id: "openrag"',
  'id: "9drive"',
  'id: "storage"',
  'classification: "sandboxed-coding-agent"',
  'classification: "self-hosted-rag-plane"',
  'classification: "hardened-storage-gateway"'
]) if (!server.includes(required)) failures.push("server contract missing: " + required);

for (const required of ["systemRouter.all('/update'", "systemRouter.all('/google-config'", "systemRouter.all('/restore'", "PEFY_HARDENING.json"]) {
  if (!overlay.includes(required)) failures.push("9drive overlay contract missing: " + required);
}

if (failures.length) {
  console.error("ΩDEVFABRIC extended fabric contract: FAIL");
  failures.forEach((f)=>console.error("-",f));
  process.exit(1);
}
console.log("ΩDEVFABRIC extended fabric contract: PASS");