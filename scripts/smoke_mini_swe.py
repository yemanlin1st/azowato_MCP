import json
import os
import tempfile
from pathlib import Path

SENSITIVE_KEYS = [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "OPENROUTER_API_KEY",
    "AZURE_OPENAI_API_KEY",
]
for key in SENSITIVE_KEYS:
    if os.environ.get(key):
        raise SystemExit(f"model secret unexpectedly present during deterministic readiness test: {key}")

os.environ["MSWEA_SILENT_STARTUP"] = "1"

from minisweagent import __version__ as mini_version
from minisweagent.agents.default import DefaultAgent
from minisweagent.environments import get_environment_class
from minisweagent.environments.local import LocalEnvironment
import swerex

assert mini_version == "2.4.6", mini_version
assert swerex.__version__ == "1.4.0", swerex.__version__

# Prove the governed sandbox adapter resolves with SWE-ReX installed.
sandbox_cls = get_environment_class("swerex_docker")
assert sandbox_cls.__name__ == "SwerexDockerEnvironment"

class DeterministicModel:
    def __init__(self):
        self.config = {"type": "deterministic-readiness-model"}
        self.calls = 0

    def query(self, messages, **kwargs):
        self.calls += 1
        if self.calls == 1:
            return {
                "role": "assistant",
                "content": "Create qualification artifact.",
                "extra": {
                    "cost": 0.0,
                    "actions": [
                        {"command": "printf 'mini-swe-ok\\n' > qualified.txt && cat qualified.txt"}
                    ],
                },
            }
        if self.calls == 2:
            return {
                "role": "assistant",
                "content": "Submit qualification result.",
                "extra": {
                    "cost": 0.0,
                    "actions": [
                        {"command": "printf 'COMPLETE_TASK_AND_SUBMIT_FINAL_OUTPUT\\nmini-swe-agent-qualified\\n'"}
                    ],
                },
            }
        raise RuntimeError("unexpected extra model call")

    def format_message(self, *, role, content, extra=None, **kwargs):
        return {"role": role, "content": content, "extra": extra or {}}

    def format_observation_messages(self, message, outputs, template_vars):
        return [{
            "role": "user",
            "content": "\n".join(str(item.get("output", "")) for item in outputs),
            "extra": {"outputs": outputs},
        }]

    def get_template_vars(self, **kwargs):
        return {}

    def serialize(self):
        return {"info": {"config": {"model": self.config}}}

with tempfile.TemporaryDirectory(prefix="pefy-mini-swe-") as tmp:
    root = Path(tmp)
    trajectory = root / "trajectory.json"
    env = LocalEnvironment(cwd=str(root), timeout=10)
    model = DeterministicModel()
    agent = DefaultAgent(
        model,
        env,
        system_template="Deterministic readiness qualification. Execute only the supplied fixed action.",
        instance_template="{{ task }}",
        step_limit=3,
        cost_limit=0,
        wall_time_limit_seconds=20,
        output_path=trajectory,
    )
    result = agent.run("Create a bounded qualification artifact and submit success.")

    marker = root / "qualified.txt"
    assert marker.read_text() == "mini-swe-ok\n"
    assert result.get("exit_status") == "Submitted", result
    assert "mini-swe-agent-qualified" in result.get("submission", ""), result
    assert model.calls == 2
    assert trajectory.exists()

    data = json.loads(trajectory.read_text())
    assert data["info"]["mini_version"] == "2.4.6"
    assert data["info"]["exit_status"] == "Submitted"
    assert data["info"]["model_stats"]["api_calls"] == 2
    assert data["info"]["model_stats"]["instance_cost"] == 0.0

print(json.dumps({
    "miniSWEAgent": "PASS",
    "version": mini_version,
    "sweRex": "PASS",
    "sweRexVersion": swerex.__version__,
    "sandboxAdapter": sandbox_cls.__name__,
    "deterministicAgentLoop": "PASS",
    "externalModelCalls": 0,
    "hostLocalUse": "ephemeral-ci-test-only"
}, indent=2))
