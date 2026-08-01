export default function handler() {
  return Response.json({
    status: "ok",
    service: "PEFY-GG Experience & Media Swarm MCP",
    version: "1.0.0",
    mode: process.env.MCP_API_KEY ? "bearer-protected" : "public-read-only",
    endpoint: "/mcp"
  });
}
