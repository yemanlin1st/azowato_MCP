#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import py_compile
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.cwd()
SKILL = ROOT / ".codex/skills/ui-ux-pro-max"
PROMPT = ROOT / ".github/prompts/ui-ux-pro-max.prompt.md"
EVIDENCE = ROOT / ".pefy/evidence/ui-ux-pro-max-validation.json"
SECRET_RE = re.compile(r"(?:ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)")


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def run(args: list[str], timeout: int = 60) -> dict:
    proc = subprocess.run(args, text=True, capture_output=True, timeout=timeout)
    return {
        "command": args,
        "returncode": proc.returncode,
        "stdout_tail": proc.stdout[-4000:],
        "stderr_tail": proc.stderr[-4000:],
    }


def main() -> None:
    required_files = [SKILL / "SKILL.md", SKILL / "scripts/search.py", PROMPT]
    for path in required_files:
        if not path.is_file():
            fail(f"Missing required file: {path}")

    for path in [SKILL / "data", SKILL / "scripts"]:
        if not path.is_dir() or path.is_symlink():
            fail(f"Expected a real directory, not a pointer/symlink: {path}")

    csv_files = sorted((SKILL / "data").rglob("*.csv"))
    py_files = sorted((SKILL / "scripts").rglob("*.py"))
    if len(csv_files) < 5:
        fail(f"Insufficient UI/UX data files: {len(csv_files)}")
    if not py_files:
        fail("No Python search scripts found")

    for path in py_files:
        py_compile.compile(str(path), doraise=True)

    skill_text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    prompt_text = PROMPT.read_text(encoding="utf-8")
    for label, text in [("skill", skill_text), ("prompt", prompt_text)]:
        if "PEFY-GOVERNANCE-BEGIN" not in text or "PEFY-GOVERNANCE-END" not in text:
            fail(f"Missing governed overlay in {label}")

    smoke = [
        run([sys.executable, str(SKILL / "scripts/search.py"), "enterprise executive dashboard", "--design-system", "-p", "PEFY-GG Baseline", "-f", "markdown"], 90),
        run([sys.executable, str(SKILL / "scripts/search.py"), "accessibility loading forms", "--domain", "ux", "-n", "3"], 60),
        run([sys.executable, str(SKILL / "scripts/search.py"), "performance navigation", "--stack", "nextjs"], 60),
    ]
    for result in smoke:
        if result["returncode"] != 0 or not result["stdout_tail"].strip():
            fail(f"Smoke test failed: {json.dumps(result, indent=2)}")

    scanned = []
    for base in [SKILL, PROMPT.parent]:
        for path in sorted(base.rglob("*")) if base.is_dir() else [base]:
            if not path.is_file() or path.stat().st_size > 2_000_000:
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            if SECRET_RE.search(text):
                fail(f"Potential secret detected in {path}")
            scanned.append(str(path.relative_to(ROOT)))

    hashes = []
    for path in sorted(SKILL.rglob("*")) + [PROMPT]:
        if path.is_file():
            hashes.append({
                "path": str(path.relative_to(ROOT)),
                "size": path.stat().st_size,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            })

    report = {
        "status": "validated",
        "validated_at_utc": datetime.now(timezone.utc).isoformat(),
        "csv_files": len(csv_files),
        "python_files": len(py_files),
        "scanned_text_files": len(scanned),
        "smoke_tests": smoke,
        "files": hashes,
    }
    EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in ["status", "csv_files", "python_files", "scanned_text_files"]}, indent=2))


if __name__ == "__main__":
    main()
