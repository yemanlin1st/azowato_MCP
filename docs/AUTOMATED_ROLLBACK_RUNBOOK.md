# Automated Rollback Runbook

## Trigger

A successful production deployment or the ten-minute scheduled monitor is followed by three failed production health checks.

## Automatic path

- verify the kill switch;
- identify migration-sensitive changes;
- require Vercel credentials;
- request one Instant Rollback;
- verify rollback status;
- run post-rollback health checks;
- archive JSON evidence for 90 days.

## Escalation conditions

- migration or schema change detected;
- rollback command fails;
- post-rollback health remains unhealthy;
- Vercel secrets are missing;
- rollback guard is disabled;
- more than one rollback would be required.

## Activation

The installed default is `observe`. Production rollback requires:

- repository variable `PEFY_AUTOMATED_ROLLBACKS_MODE=execute`;
- secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`;
- optional variable `VERCEL_SCOPE`;
- health URL in `PEFY_HEALTH_URL` or the workflow default.

Immediate kill switch:

```text
PEFY_AUTOMATED_ROLLBACKS_DISABLED=true
```

## Human follow-up

1. Confirm customer impact.
2. Compare bad and good deployment logs.
3. Inspect environment-variable and external-system drift.
4. Identify root cause.
5. Deploy a preview fix.
6. Verify the preview.
7. Promote only after approval.
8. Capture the lesson learned.

## Boundary

Application rollback does not automatically reverse database migrations, payment transactions, queue messages, CMS changes, external APIs, or environment-variable changes. These conditions require controlled recovery rather than blind rollback.
