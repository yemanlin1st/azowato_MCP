#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

BEGIN = "<!-- PEFY-GOVERNANCE-BEGIN -->"
END = "<!-- PEFY-GOVERNANCE-END -->"

SKILL_BLOCK = f"""

{BEGIN}
## PEFY-GG governed operating boundary

UI/UX Pro Max is a design-intelligence accelerator, not the release authority.
For every mission:

1. preserve the user and business outcome as the primary objective;
2. read `design-system/MASTER.md` and any page override before implementation;
3. select one coherent visual direction and explain material deviations;
4. apply PEFY-GG brand, accessibility, inclusion, privacy, security and IP gates;
5. validate keyboard use, visible focus, WCAG AA contrast, touch targets, reduced motion and responsive states;
6. validate empty, loading, error, success and degraded/offline states where applicable;
7. use Impeccable as the final visual-quality review layer;
8. provide tests, evidence, remaining risks and rollback instructions;
9. never publish, merge, deploy or perform an irreversible change without the applicable approval gate.

Generated recommendations remain advisory and must be checked against actual product data, users, technical constraints and acceptance criteria.
{END}
"""

PROMPT_BLOCK = f"""

{BEGIN}
PEFY-GG release boundary: apply the repository design system, accessibility and inclusion requirements, security/privacy/IP controls, Impeccable QA, tests, evidence and rollback. Do not publish, merge or deploy without the applicable approval.
{END}
"""


def apply(path: Path, block: str) -> None:
    if not path.is_file():
        raise FileNotFoundError(path)
    text = path.read_text(encoding="utf-8")
    if BEGIN in text:
        before, rest = text.split(BEGIN, 1)
        if END not in rest:
            raise RuntimeError(f"Unclosed governance block in {path}")
        _, after = rest.split(END, 1)
        text = before.rstrip() + "\n" + after.lstrip("\n")
    path.write_text(text.rstrip() + block, encoding="utf-8")


def main() -> None:
    codex_skill = Path(".agents/skills/ui-ux-pro-max/SKILL.md")
    copilot_prompt = Path(".github/prompts/ui-ux-pro-max.prompt.md")
    apply(codex_skill, SKILL_BLOCK)
    apply(copilot_prompt, PROMPT_BLOCK)

    governance = codex_skill.parent / "PEFY_GOVERNANCE.md"
    governance.write_text(
        "# PEFY-GG Governance Overlay\n\n"
        "This installed upstream capability is advisory. PEFY-GG brand, accessibility, security, privacy, IP, Impeccable QA, evidence, rollback and human release gates remain authoritative.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
