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
npm ci --ignore-scripts --no-audit --no-fund
npm run qualify

# Expected fail-closed contract when no health URL is supplied:
python scripts/rollback_guard.py || test $? -eq 2

# Operational observe-mode health check:
PEFY_HEALTH_URL=https://<preview-or-production-host>/api/health python scripts/rollback_guard.py
```

## Deploy

Deploy to Vercel and connect an MCP client to `https://<deployment>/mcp`.

## Qualification note

`package-lock.json` is committed and CI uses deterministic `npm ci` with lifecycle scripts disabled. ΩDEVFABRIC R0.1 remains behind the review/preview gate until final CI and deployment-preview evidence are green.

## gstack governed integration

ΩDEVFABRIC qualifies `garrytan/gstack` as an advisory skill suite pinned to version `1.87.4.0`, commit `a6b3a57512ca6d5c6aa5b68f74f736195021f96e` (verified commit signature, MIT license).

The PEFY activation profile is deliberately conservative:

- skills are namespaced with the `gstack-` prefix;
- solo mode only; team auto-update mode is disabled;
- telemetry, update checks and auto-upgrade are disabled;
- proactive auto-routing is disabled;
- external Codex/Claude review dispatch is disabled by default;
- artifact sync, pair-agent tunnels, Memorable recall and transcript ingestion are disabled;
- checkpoint pushes and plan-tune hooks are disabled;
- runtime browser targets require mission-scoped authorization.

Local installation remains pending until an authorized machine or coding-agent runtime is reachable. The `local_install_plan` MCP tool returns the pinned Codex installation sequence.

## R0.1 gate status

- Core qualification: enforced in GitHub Actions.
- MCP handler/auth smoke test: enforced in GitHub Actions.
- Security/egress qualification: default-deny policy enforced in GitHub Actions.
- Vercel preview: connector/credential gate required. GitHub currently has no Vercel deployment secrets, and the connected Vercel deploy operation is unavailable server-side.
- Production promotion: blocked until a real preview deployment passes health and MCP boundary validation.
