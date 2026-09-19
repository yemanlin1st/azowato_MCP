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

server.listen(port, host, () => {
  console.log(`PEFY portable MCP runtime listening on ${host}:${port}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
