import assert from "node:assert/strict";
import fs from "node:fs";

const healthModule = await import("../api/health.ts");
const serverModule = await import("../api/server.ts");
const source = fs.readFileSync(new URL("../api/server.ts", import.meta.url), "utf8");

// 1) Fail-closed health posture with no secret configured.
delete process.env.MCP_API_KEY;
const unconfiguredHealth = healthModule.GET();
assert.equal(unconfiguredHealth.status, 200);
const unconfiguredBody = await unconfiguredHealth.json();
assert.equal(unconfiguredBody.status, "configuration_required");
assert.equal(unconfiguredBody.mode, "fail-closed");
assert.equal(unconfiguredBody.inventory?.mcpEntries, 9);

// 2) MCP auth boundary must fail closed before handler dispatch.
const rpcBody = JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/list",params:{}});
const headers = {"content-type":"application/json","accept":"application/json, text/event-stream"};
const locked = await serverModule.POST(new Request("http://localhost/mcp", {
  method:"POST", headers, body:rpcBody
}));
assert.equal(locked.status, 503);

process.env.MCP_API_KEY = "pefy-smoke-key";
const wrongKey = await serverModule.POST(new Request("http://localhost/mcp", {
  method:"POST",
  headers:{...headers,authorization:"Bearer wrong-key"},
  body:rpcBody
}));
assert.equal(wrongKey.status, 401);

// 3) Tool registration contract. Full authenticated tools/list is intentionally
// reserved for the deployed preview because Streamable HTTP may keep SSE open
// in an in-process test harness.
const toolNames = [...source.matchAll(/server\.tool\("([^"]+)"/g)].map((m)=>m[1]);
const expected = [
  "capability_status",
  "capability_catalog",
  "route_mission",
  "compile_prompt_contract",
  "quality_gate",
  "select_councils",
  "devfabric_status",
  "local_install_plan",
  "loop_catalog"
];
assert.deepEqual(toolNames, expected);

console.log(JSON.stringify({
  healthFailClosed:"PASS",
  lockedMcpBoundary:locked.status,
  wrongCredentialBoundary:wrongKey.status,
  registeredTools:toolNames,
  networkToolsList:"DEFERRED_TO_PREVIEW"
}, null, 2));

process.exit(0);
