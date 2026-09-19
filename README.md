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

Disposable installation qualification is complete: the exact pinned gstack commit installs successfully into an isolated Codex home on GitHub Actions, preserves the sovereign configuration, passes egress-grant verification and targeted upstream security/config tests, and publishes evidence. Permanent workstation/Codex activation remains pending until an authorized machine or authenticated Codex Tasks environment is reachable. The `local_install_plan` MCP tool returns the pinned permanent-install sequence.

## R0.1 gate status

- Core qualification: **GREEN** in GitHub Actions, including TypeScript, dependency audit, reproducibility and rollback fail-closed checks.
- MCP boundary + real network `initialize/tools-list` smoke: **GREEN**; both sessionful and stateless Streamable HTTP transport are accepted while the exact nine-tool registry is enforced.
- Security/egress qualification: **GREEN** under the default-deny policy.
- gstack pinned-install qualification: **GREEN** on a disposable Codex home at upstream v`1.87.4.0` / `a6b3a575...`.
- Provider-neutral remote preview: **GREEN** on a private Railway preview deployment. Health returned HTTP 200/ready; authenticated initialize returned 200; stateless tools/list returned 200 with all nine governed tools.
- Vercel target-provider preview: **BLOCKED** because repository deployment credentials are not configured and the connected direct-deploy operation is currently unavailable server-side.
- Permanent local gstack activation: **BLOCKED** only by runtime reachability/authentication (no authorized Remote Desktop device online; Codex Tasks not authenticated).
- Production promotion: **BLOCKED intentionally** until the Vercel-specific preview gate is green. Production has not been changed.

Machine-readable qualification evidence is stored in `config/r01-qualification-evidence.json`.