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
CODEX = ROOT / ".agents/skills/ui-ux-pro-max"
COPILOT = ROOT / ".github/prompts/ui-ux-pro-max"
PROMPT = ROOT / ".github/prompts/ui-ux-pro-max.prompt.md"
EVIDENCE = ROOT / ".pefy/evidence/ui-ux-pro-max-validation.json"
SECRET_RE = re.compile(
    r"(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|"
    r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)"
)


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


def require_real_directory(path: Path) -> None:
    if not path.is_dir() or path.is_symlink():
        fail(f"Expected a real directory, not a pointer/symlink: {path}")


def inventory_tree(root: Path) -> tuple[list[Path], list[Path]]:
    require_real_directory(root / "data")
    require_real_directory(root / "scripts")
    csv_files = sorted((root / "data").rglob("*.csv"))
    py_files = sorted((root / "scripts").rglob("*.py"))
    if len(csv_files) < 30:
        fail(f"Insufficient UI/UX data files in {root}: {len(csv_files)}")
    if len(py_files) < 3:
        fail(f"Insufficient Python search files in {root}: {len(py_files)}")
    return csv_files, py_files


def main() -> None:
    required_files = [
        CODEX / "SKILL.md",
        CODEX / "scripts/search.py",
        COPILOT / "scripts/search.py",
        PROMPT,
    ]
    for path in required_files:
        if not path.is_file():
            fail(f"Missing required file: {path}")

    codex_csv, codex_py = inventory_tree(CODEX)
    copilot_csv, copilot_py = inventory_tree(COPILOT)

    for path in sorted(set(codex_py + copilot_py)):
        py_compile.compile(str(path), doraise=True)

    skill_text = (CODEX / "SKILL.md").read_text(encoding="utf-8")
    prompt_text = PROMPT.read_text(encoding="utf-8")
    for label, text in [("Codex skill", skill_text), ("Copilot prompt", prompt_text)]:
        if "PEFY-GOVERNANCE-BEGIN" not in text or "PEFY-GOVERNANCE-END" not in text:
            fail(f"Missing governed overlay in {label}")

    search = CODEX / "scripts/search.py"
    smoke = [
        run(
            [sys.executable, str(search), "enterprise executive dashboard", "--design-system", "-p", "PEFY-GG Baseline", "-f", "markdown"],
            90,
        ),
        run([sys.executable, str(search), "accessibility loading forms", "--domain", "ux", "-n", "3"], 60),
        run([sys.executable, str(search), "performance navigation", "--stack", "nextjs"], 60),
    ]
    for result in smoke:
        if result["returncode"] != 0 or not result["stdout_tail"].strip():
            fail(f"Smoke test failed: {json.dumps(result, indent=2)}")

    scan_roots = [CODEX, COPILOT, PROMPT]
    scanned: list[str] = []
    for base in scan_roots:
        paths = sorted(base.rglob("*")) if base.is_dir() else [base]
        for path in paths:
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
    hash_paths = sorted(CODEX.rglob("*")) + sorted(COPILOT.rglob("*")) + [PROMPT]
    for path in hash_paths:
        if path.is_file():
            hashes.append(
                {
                    "path": str(path.relative_to(ROOT)),
                    "size": path.stat().st_size,
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                }
            )

    report = {
        "status": "validated",
        "validated_at_utc": datetime.now(timezone.utc).isoformat(),
        "canonical_paths": {
            "codex": str(CODEX.relative_to(ROOT)),
            "copilot_prompt": str(PROMPT.relative_to(ROOT)),
            "copilot_assets": str(COPILOT.relative_to(ROOT)),
        },
        "codex_csv_files": len(codex_csv),
        "copilot_csv_files": len(copilot_csv),
        "python_files_compiled": len(set(codex_py + copilot_py)),
        "scanned_text_files": len(scanned),
        "smoke_tests": smoke,
        "files": hashes,
    }
    EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
    EVIDENCE.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": report["status"],
                "codex_csv_files": report["codex_csv_files"],
                "copilot_csv_files": report["copilot_csv_files"],
                "python_files_compiled": report["python_files_compiled"],
                "scanned_text_files": report["scanned_text_files"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
