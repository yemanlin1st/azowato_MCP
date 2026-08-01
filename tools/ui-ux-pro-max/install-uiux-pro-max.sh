#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

LOCK="capabilities/ui-ux-pro-max.lock.json"
PACKAGE="$(python3 -c 'import json; print(json.load(open("capabilities/ui-ux-pro-max.lock.json"))["npm_package"])')"
VERSION="$(python3 -c 'import json; print(json.load(open("capabilities/ui-ux-pro-max.lock.json"))["npm_version_pinned"])')"
SPEC="${PACKAGE}@${VERSION}"

for command_name in node npm python3 git; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Required command missing: $command_name" >&2
    exit 10
  }
done

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
BACKUP=".pefy/backups/ui-ux-pro-max/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP" .pefy/evidence

for path in .codex/skills/ui-ux-pro-max .github/prompts/ui-ux-pro-max.prompt.md design-system; do
  if [ -e "$path" ]; then
    mkdir -p "$BACKUP/$(dirname "$path")"
    cp -a "$path" "$BACKUP/$path"
  fi
done

export NO_UPDATE_NOTIFIER=1
export npm_config_audit=false
export npm_config_fund=false
export npm_config_ignore_scripts=true

# Capture registry provenance before execution and reject version drift.
npm view "$SPEC" name version license dist.integrity dist.shasum repository.url --json > "$TMP_DIR/npm-metadata.json"
python3 - "$TMP_DIR/npm-metadata.json" "$PACKAGE" "$VERSION" <<'PY'
import json, sys
path, expected_name, expected_version = sys.argv[1:]
data = json.load(open(path, encoding="utf-8"))
if data.get("name") != expected_name or data.get("version") != expected_version:
    raise SystemExit(f"Registry drift: {data.get('name')}@{data.get('version')}")
if not data.get("dist.integrity") and not data.get("dist", {}).get("integrity"):
    raise SystemExit("Registry integrity metadata missing")
PY

# Exact package, no global mutation. Template mode uses assets bundled in the pinned npm package.
env -u GITHUB_TOKEN -u UI_PRO_MAX_GITHUB_TOKEN \
  npm exec --yes --ignore-scripts --package="$SPEC" -- uipro init --ai codex --force
env -u GITHUB_TOKEN -u UI_PRO_MAX_GITHUB_TOKEN \
  npm exec --yes --ignore-scripts --package="$SPEC" -- uipro init --ai copilot --force

python3 tools/ui-ux-pro-max/apply-pefy-governance.py
python3 tools/ui-ux-pro-max/validate-uiux-pro-max.py

python3 - "$TMP_DIR/npm-metadata.json" "$LOCK" <<'PY'
from pathlib import Path
import datetime, hashlib, json, sys
metadata_path, lock_path = map(Path, sys.argv[1:])
lock = json.loads(lock_path.read_text(encoding="utf-8"))
metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
validation = json.loads(Path('.pefy/evidence/ui-ux-pro-max-validation.json').read_text(encoding='utf-8'))
report = {
    'status': 'installed-and-validated',
    'installed_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'lock': lock,
    'npm_registry_metadata': metadata,
    'validation_summary': {
        'csv_files': validation['csv_files'],
        'python_files': validation['python_files'],
        'scanned_text_files': validation['scanned_text_files'],
    },
    'installer_sha256': hashlib.sha256(Path('tools/ui-ux-pro-max/install-uiux-pro-max.sh').read_bytes()).hexdigest(),
}
Path('.pefy/evidence/ui-ux-pro-max-install.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
PY

printf 'UI/UX Pro Max %s installed and validated for Codex and GitHub Copilot.\n' "$VERSION"
printf 'Backup created at %s\n' "$BACKUP"
