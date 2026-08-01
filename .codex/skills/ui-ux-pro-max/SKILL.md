---
name: ui-ux-pro-max
description: Governed UI/UX design intelligence for product interfaces, dashboards, websites, mobile apps, design systems, UX audits and frontend implementation.
metadata:
  upstream: nextlevelbuilder/ui-ux-pro-max-skill
  package: ui-ux-pro-max-cli
  package_version: 2.11.3
  governance: PEFY-GG Meta Supra Capability Mesh
---

# UI/UX Pro Max — PEFY-GG Governed Integration

Use this skill for UI/UX creation, review, redesign, design systems, accessibility, responsive behavior, component architecture, charts and frontend polish.

## Authority

UI/UX Pro Max is a **design-intelligence advisor and accelerator**. It is not the final release authority.

Final authority remains:

1. user/business outcome;
2. PEFY-GG brand and product architecture;
3. accessibility and inclusion;
4. security, privacy and legal/IP;
5. Impeccable quality gate;
6. tests, evidence and acceptance criteria.

## Required workflow

1. Reconstruct the product type, users, surface, stack and constraints.
2. Read an existing `design-system/MASTER.md` and relevant page override before proposing changes.
3. Generate or update a coherent design system before writing interface code.
4. Apply one visual direction; do not mix unrelated styles.
5. Implement responsive behavior for 375px, 768px, 1024px and 1440px where applicable.
6. Validate WCAG AA contrast, keyboard navigation, visible focus, touch targets and reduced motion.
7. Remove generic AI-design patterns: decorative gradients without purpose, excessive cards, weak hierarchy, emoji icons, arbitrary colors and gratuitous animation.
8. Verify code, accessibility and visual consistency before release.
9. Record design decisions and evidence.

## Local design-intelligence commands

After the official CLI assets are generated, use the installed search engine:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<product> <industry> <tone>" --design-system -p "<project>"
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain style
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain color
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain typography
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain chart
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack nextjs
```

Persist major decisions:

```bash
python3 .codex/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "<project>"
```

## Release gate

Do not declare completion until all applicable gates pass:

- intent and user journey;
- hierarchy and information architecture;
- responsive behavior;
- accessibility;
- brand consistency;
- component reuse;
- performance;
- empty, loading, error and success states;
- visual QA;
- evidence and rollback.

## Version policy

The executable installer is pinned to `ui-ux-pro-max-cli@2.11.3`. Upgrade only through the controlled sync workflow after validating the npm package, generated assets, Python scripts and license metadata.
