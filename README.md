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

## Automated Rollbacks Guard

The repository includes a governed Vercel rollback guard:

- workflow: `.github/workflows/automated-rollback.yml`;
- policy: `config/rollback-policy.json`;
- engine: `scripts/rollback_guard.py`;
- runbook: `docs/AUTOMATED_ROLLBACK_RUNBOOK.md`.

It monitors every ten minutes and after successful deployment-status events. The default mode is `observe`, so it records a rollback decision without changing production.

Production activation requires:

- repository variable `PEFY_AUTOMATED_ROLLBACKS_MODE=execute`;
- secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`;
- optional variable `PEFY_HEALTH_URL`;
- kill switch `PEFY_AUTOMATED_ROLLBACKS_DISABLED=true` when required.

The guard stops and escalates instead of performing a blind application rollback when migration or schema files changed.

## Local validation

```bash
npm ci
npm run typecheck
npm run test:logic
python scripts/rollback_guard.py
```

## Deploy

Deploy to Vercel and connect an MCP client to `https://<deployment>/mcp`.
