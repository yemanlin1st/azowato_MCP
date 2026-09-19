#!/usr/bin/env python3
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
system_routes = root / "backend/src/modules/system/system.routes.ts"
compose = root / "docker-compose.yml"
backend_pkg = root / "backend/package.json"

required = [system_routes, compose, backend_pkg, root / "frontend/package.json", root / "LICENSE"]
missing = [str(p) for p in required if not p.exists()]
if missing:
    raise SystemExit(f"9drive overlay target invalid; missing: {missing}")

safe_system = """import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'

export const systemRouter = Router()

function governedOnly(_req: any, res: any) {
  return res.status(403).json({
    code: 'PEFY_GOVERNED_OPERATION_ONLY',
    message: 'This operation is disabled in the PEFY hardened profile and must be performed through the governed deployment/configuration pipeline.'
  })
}

systemRouter.all('/update', requireAuth, governedOnly)
systemRouter.all('/update-log', requireAuth, governedOnly)
systemRouter.all('/google-config', requireAuth, governedOnly)
systemRouter.all('/backup', requireAuth, governedOnly)
systemRouter.all('/restore', requireAuth, governedOnly)
"""
system_routes.write_text(safe_system, encoding="utf-8")

text = compose.read_text(encoding="utf-8")
replacements = {
    "${MYSQL_ROOT_PASSWORD:-root}": "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required}",
    "${MYSQL_PASSWORD:-change-this-database-password}": "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}",
    "${JWT_ACCESS_SECRET:-change-this-jwt-secret-at-least-32-chars}": "${JWT_ACCESS_SECRET:?JWT_ACCESS_SECRET is required}",
    "${TOKEN_ENCRYPTION_KEY:-change-this-encryption-key-32bytes!}": "${TOKEN_ENCRYPTION_KEY:?TOKEN_ENCRYPTION_KEY is required}",
}
for old, new in replacements.items():
    text = text.replace(old, new)
compose.write_text(text, encoding="utf-8")

pkg = json.loads(backend_pkg.read_text(encoding="utf-8"))
pkg["license"] = "Apache-2.0"

# Production runtime must not carry the Prisma CLI toolchain. Migrations are
# a governed build/pre-deploy operation; @prisma/client remains runtime.
prisma_cli = pkg.get("dependencies", {}).pop("prisma", None)
if prisma_cli:
    pkg.setdefault("devDependencies", {})["prisma"] = prisma_cli
pkg["scripts"]["start:deploy"] = "node dist/server.js"

# Same-major/current security remediations for upstream production deps.
if "undici" in pkg.get("dependencies", {}):
    pkg["dependencies"]["undici"] = "7.29.0"
pkg["overrides"] = {
    **pkg.get("overrides", {}),
    "body-parser": "2.3.0",
    "brace-expansion": "5.0.9",
}
backend_pkg.write_text(json.dumps(pkg, indent=2) + "\n", encoding="utf-8")

frontend_pkg = root / "frontend/package.json"
front = json.loads(frontend_pkg.read_text(encoding="utf-8"))
front["overrides"] = {
    **front.get("overrides", {}),
    "brace-expansion": "5.0.9",
}
frontend_pkg.write_text(json.dumps(front, indent=2) + "\n", encoding="utf-8")

manifest = {
    "profile": "PEFY-9DRIVE-HARDENED-R0.1",
    "stockRuntimeAllowed": False,
    "runtimeSelfUpdate": False,
    "runtimeGoogleOAuthMutation": False,
    "runtimeBackupRestore": False,
    "defaultStorageMode": "s3-compatible-first",
    "googleDriveActivation": "disabled-until-dedicated-account-and-policy-review",
    "publicSharing": "policy-gated",
    "productionPrismaCli": False,
    "securityOverrides": {
        "body-parser": "2.3.0",
        "brace-expansion": "5.0.9",
        "undici": "7.29.0"
    },
}
(root / "PEFY_HARDENING.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

post = system_routes.read_text(encoding="utf-8")
for forbidden in ["child_process", "git pull", "spawn(", "exec(", "fs.renameSync", "clientSecretEncrypted"]:
    if forbidden in post:
        raise SystemExit(f"forbidden 9drive system capability remains after overlay: {forbidden}")

compose_post = compose.read_text(encoding="utf-8")
for weak in ["change-this-jwt-secret", "change-this-encryption-key", "change-this-database-password", "MYSQL_ROOT_PASSWORD:-root"]:
    if weak in compose_post:
        raise SystemExit(f"weak docker default remains after overlay: {weak}")

print("PEFY 9drive hardening overlay: PASS")