#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

for command_name in node npm python3 git; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "Required command missing: $command_name" >&2
    exit 10
  }
done

LOCK="capabilities/ui-ux-pro-max.lock.json"
PACKAGE="$(python3 -c 'import json; print(json.load(open("capabilities/ui-ux-pro-max.lock.json"))["npm_package"])')"
VERSION="$(python3 -c 'import json; print(json.load(open("capabilities/ui-ux-pro-max.lock.json"))["npm_version_pinned"])')"
SPEC="${PACKAGE}@${VERSION}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
BACKUP=".pefy/backups/ui-ux-pro-max/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP" .pefy/evidence "$TMP_DIR/codex" "$TMP_DIR/copilot"

TARGETS=(
  ".agents/skills/ui-ux-pro-max"
  ".github/prompts/ui-ux-pro-max.prompt.md"
  ".github/prompts/ui-ux-pro-max"
  "design-system"
)
for path in "${TARGETS[@]}"; do
  if [ -e "$path" ]; then
    mkdir -p "$BACKUP/$(dirname "$path")"
    cp -a "$path" "$BACKUP/$path"
  fi
done

export NO_UPDATE_NOTIFIER=1
export npm_config_audit=false
export npm_config_fund=false
export npm_config_ignore_scripts=true

npm view "$SPEC" name version license dist.integrity dist.shasum repository.url --json > "$TMP_DIR/npm-metadata.json"
python3 - "$TMP_DIR/npm-metadata.json" "$PACKAGE" "$VERSION" <<'PY'
import json, sys
path, expected_name, expected_version = sys.argv[1:]
data = json.load(open(path, encoding="utf-8"))
if data.get("name") != expected_name or data.get("version") != expected_version:
    raise SystemExit(f"Registry drift: {data.get('name')}@{data.get('version')}")
dist = data.get("dist", {}) if isinstance(data.get("dist"), dict) else {}
if not data.get("dist.integrity") and not dist.get("integrity"):
    raise SystemExit("Registry integrity metadata missing")
PY

(
  cd "$TMP_DIR/codex"
  env -u GITHUB_TOKEN -u UI_PRO_MAX_GITHUB_TOKEN \
    npm exec --yes --ignore-scripts --package="$SPEC" -- uipro init --ai codex --force
)
(
  cd "$TMP_DIR/copilot"
  env -u GITHUB_TOKEN -u UI_PRO_MAX_GITHUB_TOKEN \
    npm exec --yes --ignore-scripts --package="$SPEC" -- uipro init --ai copilot --force
)

STAGED_CODEX="$TMP_DIR/codex/.agents/skills/ui-ux-pro-max"
STAGED_COPILOT="$TMP_DIR/copilot/.github/prompts/ui-ux-pro-max"
STAGED_PROMPT="$STAGED_COPILOT/PROMPT.md"
for path in "$STAGED_CODEX/SKILL.md" "$STAGED_CODEX/scripts/search.py" "$STAGED_PROMPT" "$STAGED_COPILOT/scripts/search.py"; do
  [ -f "$path" ] || { echo "Staged asset missing: $path" >&2; exit 20; }
done

rm -rf .agents/skills/ui-ux-pro-max .github/prompts/ui-ux-pro-max
rm -f .github/prompts/ui-ux-pro-max.prompt.md
mkdir -p .agents/skills .github/prompts
cp -a "$STAGED_CODEX" .agents/skills/ui-ux-pro-max
cp -a "$STAGED_COPILOT" .github/prompts/ui-ux-pro-max
cp -a "$STAGED_PROMPT" .github/prompts/ui-ux-pro-max.prompt.md

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
        'codex_csv_files': validation['codex_csv_files'],
        'copilot_csv_files': validation['copilot_csv_files'],
        'python_files_compiled': validation['python_files_compiled'],
        'scanned_text_files': validation['scanned_text_files'],
    },
    'installer_sha256': hashlib.sha256(Path('tools/ui-ux-pro-max/install-uiux-pro-max.sh').read_bytes()).hexdigest(),
}
Path('.pefy/evidence/ui-ux-pro-max-install.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
PY

printf 'UI/UX Pro Max %s installed and validated for Codex and GitHub Copilot.\n' "$VERSION"
printf 'Backup created at %s\n' "$BACKUP"
