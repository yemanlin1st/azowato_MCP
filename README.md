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
- `devfabric_status`
- `local_install_plan`

## ΩDEVFABRIC R0.1

The control plane now exposes a read-only registry and installation planner for the governed development stack:

- Connected/core adapters: GitHub, Context7, Figma, Vercel, Neon/PostgreSQL, Exa.
- Qualified extension targets: Playwright, Sentry, Firecrawl, Brave Search, Sequential Thinking, SkillUI.
- Playwright is dual-mode by design: CLI + SKILLS for coding-agent throughput; MCP for persistent exploratory browser workflows.
- Firecrawl can start with the vendor-hosted keyless MCP endpoint for bounded basic retrieval, then move to OAuth/API-key mode for the full tool set.
- Credentialed providers must use client/secret-manager injection. Secrets must never be committed, embedded in MCP URLs, or pasted into agent prompts/chat.
- Production promotion requires version pinning, least privilege, tool allowlists, sandbox qualification, audit evidence, rollback and kill-switch controls.

`local_install_plan` returns a client-specific bootstrap/qualification plan for `codex`, `vscode`, or a generic MCP host. It deliberately returns secret variable names only, never secret values.

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
