#!/usr/bin/env python3
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
compose = root / "docker-compose.yml"
if not compose.exists():
    raise SystemExit("OpenRAG docker-compose.yml not found")

text = compose.read_text(encoding="utf-8")

# Upstream supports Podman and uses the Podman-specific U volume option.
# Docker Compose rejects :U,z. For the Docker/multi-cloud profile retain
# SELinux relabeling but remove ownership-remap semantics.
text = text.replace(":U,z", ":z")
compose.write_text(text, encoding="utf-8")

if ":U,z" in text:
    raise SystemExit("Podman-only :U,z volume option remains")
if "INSTANA_ENABLED=${INSTANA_ENABLED:-false}" not in text:
    raise SystemExit("OpenRAG telemetry default is no longer fail-safe false")
if "LANGFLOW_ALLOW_CUSTOM_COMPONENTS=${LANGFLOW_ALLOW_CUSTOM_COMPONENTS:-false}" not in text:
    raise SystemExit("Langflow custom components must remain disabled by default")

manifest = {
    "profile": "PEFY-OPENRAG-MULTICLOUD-R0.1",
    "upstreamLogicModified": False,
    "dockerComposeCompatibility": "Podman :U,z normalized to Docker :z",
    "instanaDefault": False,
    "langflowCustomComponentsDefault": False,
    "connectorsDefault": "disabled-until-explicit-policy",
    "documentDataEgress": "deny-by-default"
}
(root / "PEFY_OPENRAG_HARDENING.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print("PEFY OpenRAG multi-cloud compatibility overlay: PASS")
