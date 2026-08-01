export function GET() {
  const configured = Boolean(process.env.MCP_API_KEY);
  return Response.json({
    status: configured ? "ready" : "configuration_required",
    service: "PEFY-GG Meta Supra Capability Mesh MCP",
    version: "2.0.0",
    mode: configured ? "bearer-protected-read-only" : "fail-closed",
    endpoint: "/mcp",
    inventory: { connectedApps: 20, connectorFunctions: 458, skillFamilies: 20, specializedSkills: 149, mcpEntries: 7, controlledLoops: 9 }
  });
}
