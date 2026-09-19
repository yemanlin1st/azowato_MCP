# PEFY-GG Meta Supra Capability Mesh MCP

Remote, read-only governed MCP control plane for the PEFY-GG Meta Supra Capability Mesh and ΩDEVFABRIC.

## Endpoints

**Control-plane version:** 2.1.0


- `GET /api/health`
- MCP Streamable HTTP: `/mcp`

## Tools

- `capability_status` — governed capability inventory and risk tiers.
- `capability_catalog` — capability groups with primary/advisory allocation.
- `route_mission` — mission routing by domain, risk tier and controlled loop.
- `compile_prompt_contract` — machine-readable Master Mission Contract skeleton.
- `quality_gate` — mandatory control evaluation with GO / conditional result.
- `select_councils` — proportional counsellor/council challenge selection.
- `devfabric_status` — ΩDEVFABRIC provider registry and security posture.
- `local_install_plan` — secret-safe MCP/CLI bootstrap and qualification plan.
- `loop_catalog` — controlled execution-loop registry.

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
npm install --ignore-scripts --no-audit --no-fund
npm run qualify
python scripts/rollback_guard.py
```

## Deploy

Deploy to Vercel and connect an MCP client to `https://<deployment>/mcp`.

## Qualification note

`package-lock.json` is not yet committed. Until a qualified lockfile is generated and reviewed, dependency installation is not fully reproducible; keep ΩDEVFABRIC R0.1 behind the draft/preview gate and do not promote this branch directly to production.