#!/usr/bin/env python3
from __future__ import annotations
import json, os, subprocess, time, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POLICY = json.loads((ROOT / "config/rollback-policy.json").read_text())
EVIDENCE_DIR = Path(os.getenv("PEFY_ROLLBACK_EVIDENCE_DIR", ROOT / "evidence"))
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

def now():
    return datetime.now(timezone.utc).isoformat()

def env_true(name):
    return os.getenv(name, "").strip().lower() in {"1","true","yes","on"}

def check_health(url, timeout):
    started=time.time()
    try:
        req=urllib.request.Request(url, headers={"User-Agent":"PEFY-Automated-Rollbacks/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw=r.read(262144).decode("utf-8","replace")
            status=r.status
        payload=None
        try: payload=json.loads(raw)
        except Exception: pass
        accepted=status in POLICY["health"]["accepted_http_status"]
        expected=POLICY["health"].get("expected_json",{})
        if accepted and payload and "status" in expected:
            accepted=str(payload.get("status","")).lower() in [x.lower() for x in expected["status"]]
        return {"ok":accepted,"http_status":status,"payload":payload,"latency_ms":round((time.time()-started)*1000)}
    except urllib.error.HTTPError as e:
        return {"ok":False,"http_status":e.code,"error":str(e),"latency_ms":round((time.time()-started)*1000)}
    except Exception as e:
        return {"ok":False,"error":repr(e),"latency_ms":round((time.time()-started)*1000)}

def run_health_series(url, attempts, interval, timeout):
    checks=[]
    for i in range(attempts):
        checks.append(check_health(url, timeout))
        if checks[-1]["ok"]:
            break
        if i < attempts-1:
            time.sleep(interval)
    return checks

def changed_files():
    return [x.strip() for x in os.getenv("PEFY_CHANGED_FILES","").splitlines() if x.strip()]

def migration_detected(files):
    pats=POLICY["circuit_breakers"]["migration_patterns"]
    return [f for f in files if any(p.lower() in f.lower() for p in pats)]

def command(cmd):
    p=subprocess.run(cmd, text=True, capture_output=True)
    return {"command":cmd,"returncode":p.returncode,"stdout":p.stdout[-12000:],"stderr":p.stderr[-12000:]}

def evidence(data):
    stamp=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path=EVIDENCE_DIR/f"rollback-{stamp}.json"
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(json.dumps(data, indent=2))
    print(f"EVIDENCE_FILE={path}")
    return path

def main():
    url=os.getenv("PEFY_HEALTH_URL","").strip()
    mode=os.getenv("PEFY_AUTOMATED_ROLLBACKS_MODE", POLICY["default_mode"]).strip().lower()
    record={"system":"PEFY Automated Rollbacks Guard","version":"1.0.0","timestamp":now(),
            "mode":mode,"health_url":url,"decision":None,"checks":[],"actions":[]}
    if env_true("PEFY_AUTOMATED_ROLLBACKS_DISABLED"):
        record["decision"]="DISABLED_BY_KILL_SWITCH"; evidence(record); return 0
    if not url:
        record["decision"]="BLOCKED_MISSING_HEALTH_URL"; evidence(record); return 2

    changed=changed_files()
    record["changed_files"]=changed
    migrations=migration_detected(changed)
    record["migration_matches"]=migrations

    h=POLICY["health"]
    record["checks"]=run_health_series(url,h["attempts"],h["interval_seconds"],h["timeout_seconds"])
    if any(x["ok"] for x in record["checks"]):
        record["decision"]="HEALTHY_NO_ROLLBACK"; evidence(record); return 0

    if migrations and POLICY["rollback"]["stop_on_database_migration"]:
        record["decision"]="ESCALATE_MIGRATION_ROLLBACK_UNSAFE"; evidence(record); return 3

    if mode != POLICY["execute_value"]:
        record["decision"]="WOULD_ROLLBACK_OBSERVE_MODE"; evidence(record); return 4

    required=["VERCEL_TOKEN","VERCEL_ORG_ID","VERCEL_PROJECT_ID"]
    missing=[x for x in required if not os.getenv(x)]
    if missing:
        record["decision"]="BLOCKED_MISSING_SECRETS"
        record["missing_secrets"]=missing
        evidence(record); return 5

    project_dir=Path(".vercel")
    project_dir.mkdir(exist_ok=True)
    (project_dir/"project.json").write_text(json.dumps({
        "orgId":os.environ["VERCEL_ORG_ID"],
        "projectId":os.environ["VERCEL_PROJECT_ID"]
    }))
    scope=os.getenv("VERCEL_SCOPE",os.environ["VERCEL_ORG_ID"])
    rollback=command(["vercel","rollback","--timeout","0s","--scope",scope,"--token",os.environ["VERCEL_TOKEN"]])
    record["actions"].append(rollback)
    if rollback["returncode"] != 0:
        record["decision"]="ROLLBACK_COMMAND_FAILED"; evidence(record); return 6

    status=command(["vercel","rollback","status","--timeout","60s","--scope",scope,"--token",os.environ["VERCEL_TOKEN"]])
    record["actions"].append(status)
    post=POLICY["rollback"]
    record["post_rollback_checks"]=run_health_series(
        url,post["post_rollback_attempts"],post["post_rollback_interval_seconds"],h["timeout_seconds"])
    if any(x["ok"] for x in record["post_rollback_checks"]):
        record["decision"]="ROLLED_BACK_AND_RECOVERED"; evidence(record); return 0
    record["decision"]="ROLLED_BACK_BUT_HEALTH_NOT_RECOVERED"; evidence(record); return 7

if __name__=="__main__":
    raise SystemExit(main())
