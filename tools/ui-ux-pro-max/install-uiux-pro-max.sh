#!/usr/bin/env bash
set -euo pipefail

PACKAGE="ui-ux-pro-max-cli"
VERSION="2.11.3"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

command -v node >/dev/null 2>&1 || { echo "Node.js is required." >&2; exit 10; }
command -v npm >/dev/null 2>&1 || { echo "npm is required." >&2; exit 11; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required for the local search engine." >&2; exit 12; }

BACKUP=".pefy/backups/ui-ux-pro-max/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP"
for path in .codex/skills/ui-ux-pro-max .github/prompts/ui-ux-pro-max.prompt.md design-system; do
  if [ -e "$path" ]; then
    mkdir -p "$BACKUP/$(dirname "$path")"
    cp -a "$path" "$BACKUP/$path"
  fi
done

# Use npx with an exact package version. No global package mutation is required.
npx --yes "${PACKAGE}@${VERSION}" init --ai codex --force
npx --yes "${PACKAGE}@${VERSION}" init --ai copilot --force

SEARCH=".codex/skills/ui-ux-pro-max/scripts/search.py"
[ -f "$SEARCH" ] || { echo "Generated search engine missing: $SEARCH" >&2; exit 20; }
python3 "$SEARCH" "enterprise executive dashboard" --design-system -p "PEFY-GG UI UX Baseline" >/tmp/pefy-uiux-smoke.txt
[ -s /tmp/pefy-uiux-smoke.txt ] || { echo "Design-system smoke test returned no output." >&2; exit 21; }

mkdir -p .pefy/evidence
python3 - <<'PY'
from pathlib import Path
import hashlib, json, datetime
roots=[Path('.codex/skills/ui-ux-pro-max'),Path('.github/prompts')]
files=[]
for root in roots:
    if root.exists():
        for p in sorted(root.rglob('*')):
            if p.is_file():
                files.append({'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':p.stat().st_size})
out=Path('.pefy/evidence/ui-ux-pro-max-install.json')
out.write_text(json.dumps({'package':'ui-ux-pro-max-cli','version':'2.11.3','installed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files},indent=2)+'\n')
print(out)
PY

echo "UI/UX Pro Max ${VERSION} installed for Codex and GitHub Copilot."
echo "Backup: $BACKUP"
