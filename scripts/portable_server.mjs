import http from "node:http";
import { Readable } from "node:stream";
import { GET as healthGET } from "../api/health.ts";
import * as mcp from "../api/server.ts";

function toFetchHeaders(headers) {
  const out = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) for (const item of value) out.append(key, item);
    else if (value != null) out.set(key, String(value));
  }
  return out;
}

async function sendFetchResponse(response, res) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) return res.end();
  Readable.fromWeb(response.body).pipe(res);
}

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/health" || url.pathname === "/health") {
      return sendFetchResponse(healthGET(), res);
    }

    if (url.pathname !== "/mcp") {
      res.statusCode = 404;
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ error: "Not Found" }));
    }

    const method = (req.method || "POST").toUpperCase();
    const handler = mcp[method];
    if (typeof handler !== "function") {
      res.statusCode = 405;
      res.setHeader("allow", "GET, POST, DELETE");
      return res.end();
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;

    const request = new Request(url, {
      method,
      headers: toFetchHeaders(req.headers),
      body: method === "GET" || method === "HEAD" ? undefined : body,
      duplex: body ? "half" : undefined,
    });

    return sendFetchResponse(await handler(request), res);
  } catch (error) {
    console.error("portable-runtime-error", error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
});

async function previewSelfTest() {
  if (process.env.PEFY_PREVIEW_MODE !== "provider-neutral-remote") return;
  const key = process.env.MCP_API_KEY;
  if (!key) throw new Error("preview self-test requires MCP_API_KEY");

  const base = `http://127.0.0.1:${port}/mcp`;
  const common = {
    "authorization": `Bearer ${key}`,
    "content-type": "application/json",
    "accept": "application/json, text/event-stream",
  };

  const init = await fetch(base, {
    method: "POST",
    headers: common,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "pefy-preview-selftest", version: "1.0.0" }
      }
    })
  });
  if (init.status !== 200) throw new Error(`initialize HTTP ${init.status}`);
  const session = init.headers.get("mcp-session-id");
  await init.text();

  const listHeaders = { ...common };
  if (session) listHeaders["mcp-session-id"] = session;

  const list = await fetch(base, {
    method: "POST",
    headers: listHeaders,
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })
  });
  if (list.status !== 200) throw new Error(`tools/list HTTP ${list.status}`);
  const raw = await list.text();
  const dataLines = raw.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim());
  const payload = JSON.parse(dataLines.length ? dataLines.join("") : raw);
  const names = (payload?.result?.tools || []).map((tool) => tool.name);
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
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`tools/list mismatch: ${names.join(",")}`);
  }

  console.log(JSON.stringify({
    event: "PEFY_REMOTE_SELFTEST",
    status: "PASS",
    authenticatedInitialize: 200,
    transportMode: session ? "stateful-session" : "stateless",
    sessionPresent: Boolean(session),
    toolsList: 200,
    toolCount: names.length,
    tools: names
  }));
}

server.listen(port, host, () => {
  console.log(`PEFY portable MCP runtime listening on ${host}:${port}`);
  previewSelfTest().catch((error) => {
    console.error(JSON.stringify({
      event: "PEFY_REMOTE_SELFTEST",
      status: "FAIL",
      error: String(error?.message || error)
    }));
    process.exit(1);
  });
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);