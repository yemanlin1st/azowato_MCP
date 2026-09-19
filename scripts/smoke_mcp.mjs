import assert from "node:assert/strict";

process.env.MCP_API_KEY = "pefy-smoke-key";

const healthModule = await import("../api/health.ts");
const serverModule = await import("../api/server.ts");

const health = healthModule.GET();
assert.equal(health.status, 200, "health endpoint must return 200");
const healthBody = await health.json();
assert.equal(healthBody.service, "PEFY-GG Meta Supra Capability Mesh MCP");
assert.equal(healthBody.status, "ready");
assert.equal(healthBody.mode, "bearer-protected-read-only");
assert.equal(healthBody.inventory?.mcpEntries, 9);

const initializeBody = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "pefy-smoke", version: "1.0.0" }
  }
});

const baseHeaders = {
  "content-type": "application/json",
  "accept": "application/json, text/event-stream"
};

const unauthorized = await serverModule.POST(new Request("http://localhost/mcp", {
  method: "POST",
  headers: baseHeaders,
  body: initializeBody
}));
assert.equal(unauthorized.status, 401, "unauthenticated MCP call must be rejected");

const authorized = await serverModule.POST(new Request("http://localhost/mcp", {
  method: "POST",
  headers: { ...baseHeaders, authorization: "Bearer pefy-smoke-key" },
  body: initializeBody
}));
assert.notEqual(authorized.status, 401, "authorized MCP call must pass auth boundary");
assert.notEqual(authorized.status, 503, "authorized MCP call must not fail closed");
assert.ok(authorized.status >= 200 && authorized.status < 500, `unexpected MCP status ${authorized.status}`);

console.log(JSON.stringify({
  health: "PASS",
  unauthenticatedBoundary: unauthorized.status,
  authenticatedHandlerStatus: authorized.status,
  mcpEntries: healthBody.inventory.mcpEntries
}, null, 2));
