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

## mini-SWE-agent + SWE-ReX governed integration

ΩDEVFABRIC uses **mini-SWE-agent** as the default bounded software-engineering execution adapter rather than the larger original SWE-agent scaffold. Upstream itself recommends mini-SWE-agent as the default for simpler, faster and more stable workflows.

Qualified pins:

- mini-SWE-agent: v`2.4.6`, commit `a83fcae82d2a08f0ee0c688f9d137b3566c097f8`, verified signature, MIT;
- SWE-ReX: v`1.4.0`, commit `f802b3e14d82aa4c13291d2fda5bd4fd48f36f91`, verified signature, MIT.

Governed execution posture:

- sandbox-first; `SwerexDockerEnvironment` is the preferred adapter;
- autonomous host-local shell execution is denied by default;
- model-provider credentials are mission-scoped and injected from a secret manager only;
- no standing model credential is stored in repository, prompts, global config or qualification evidence;
- code writes are limited to feature branches/disposable worktrees;
- destructive commands, production deployment, merge and external communication remain human-gated;
- step/cost/time limits and trajectory evidence are required for live autonomous runs.

Qualification is **GREEN**: exact-source install, dependency consistency, CLI/import checks, a deterministic two-step `DefaultAgent` execution loop, trajectory verification, sandbox-adapter resolution and source compilation all passed with **0 external model calls**.

The remote provider-neutral preview also exposes the pinned mini-SWE-agent/SWE-ReX capability through `devfabric_status` and passed its authenticated startup self-test.

Permanent workstation activation remains access-dependent. Once an authorized Remote Desktop machine or authenticated Codex Tasks runtime is reachable, `local_install_plan` provides the exact pinned installation sequence.

## R0.1 gate status

- Core qualification: **GREEN** in GitHub Actions, including TypeScript, dependency audit, reproducibility and rollback fail-closed checks.
- MCP boundary + real network `initialize/tools-list` smoke: **GREEN**; both sessionful and stateless Streamable HTTP transport are accepted while the exact nine-tool registry is enforced.
- Security/egress qualification: **GREEN** under the default-deny policy.
- gstack pinned-install qualification: **GREEN** on a disposable Codex home at upstream v`1.87.4.0` / `a6b3a575...`.
- mini-SWE-agent + SWE-ReX qualification: **GREEN** at v`2.4.6` / `a83fcae...` and v`1.4.0` / `f802b3e...`; deterministic real agent loop passed with zero external model calls.
- Provider-neutral remote preview: **GREEN** on private Railway deployment `3c70c804-e4c9-4c8c-ab6d-6d1d7cf82d46` at runtime SHA `1ed10b557...`. Health is 200/ready; unauthenticated MCP is 401; authenticated initialize/tools-list are 200; `devfabric_status` confirms the pinned mini-SWE-agent and SWE-ReX runtime contracts.
- Vercel target-provider preview: **BLOCKED** because repository deployment credentials are not configured and the connected direct-deploy operation is currently unavailable server-side.
- Permanent local gstack activation: **BLOCKED** only by runtime reachability/authentication (no authorized Remote Desktop device online; Codex Tasks not authenticated).
- Production promotion: **BLOCKED intentionally** until the Vercel-specific preview gate is green. Production has not been changed.

Machine-readable qualification evidence is stored in `config/r01-qualification-evidence.json`.