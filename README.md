# PEFY-GG Experience & Media Swarm MCP

Remote, read-only MCP control plane for the PEFY-GG Experience & Media Swarm OS.

## Endpoints

- `GET /api/health`
- MCP Streamable HTTP: `/mcp`

## Tools

- `system_status`
- `search`
- `fetch`
- `experience_score`
- `release_gate`
- `media_route`
- `local_install_plan`

## Security

The server exposes no client records and no write actions. Set `MCP_API_KEY` to require `Authorization: Bearer <token>`.

## Local validation

```bash
npm ci
npm run typecheck
npm run test:logic
```

## Deploy

Deploy to Vercel and connect an MCP client to `https://<deployment>/mcp`.
