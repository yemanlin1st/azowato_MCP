import assert from "node:assert/strict";
import http from "node:http";
import { Readable } from "node:stream";

process.env.MCP_API_KEY = "pefy-network-smoke-key";

const serverModule = await import("../api/server.ts");

function nodeHeadersToFetch(headers) {
  const out = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) for (const item of value) out.append(key, item);
    else if (value != null) out.set(key, String(value));
  }
  return out;
}

const httpServer = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const request = new Request(url, {
    method: req.method,
    headers: nodeHeadersToFetch(req.headers),
    body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
    duplex: body ? "half" : undefined,
  });
  const response = await serverModule[req.method || "POST"](request);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) return res.end();
  Readable.fromWeb(response.body).pipe(res);
});

await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
const address = httpServer.address();
assert(address && typeof address === "object");
const endpoint = `http://127.0.0.1:${address.port}/mcp`;

try {
  const init = await fetch(endpoint, {
    method: "POST",
    headers: {
      "authorization": "Bearer pefy-network-smoke-key",
      "content-type": "application/json",
      "accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "pefy-network-smoke", version: "1.0.0" }
      }
    })
  });
  assert.equal(init.status, 200);
  const session = init.headers.get("mcp-session-id");
  assert(session, "MCP session id missing");

  // Drain initialize body before the next request.
  await init.text();

  const list = await fetch(endpoint, {
    method: "POST",
    headers: {
      "authorization": "Bearer pefy-network-smoke-key",
      "content-type": "application/json",
      "accept": "application/json, text/event-stream",
      "mcp-session-id": session,
    },
    body: JSON.stringify({jsonrpc:"2.0",id:2,method:"tools/list",params:{}})
  });
  assert.equal(list.status, 200);
  const raw = await list.text();

  // Streamable HTTP may encode JSON as SSE data lines.
  const jsonText = raw.split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("") || raw;
  const payload = JSON.parse(jsonText);
  const tools = payload?.result?.tools || [];
  const names = tools.map((tool) => tool.name);
  const expected = [
    "capability_status","capability_catalog","route_mission","compile_prompt_contract",
    "quality_gate","select_councils","devfabric_status","local_install_plan","loop_catalog"
  ];
  assert.deepEqual(names, expected);

  console.log(JSON.stringify({networkPreview:"PASS",endpoint:"loopback-ephemeral",toolCount:names.length,tools:names},null,2));
} finally {
  await new Promise((resolve) => httpServer.close(resolve));
  process.exit(0);
}
