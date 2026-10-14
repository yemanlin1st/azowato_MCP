import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 31379;
const child = spawn(process.execPath, ["scripts/portable_server.mjs", "--preview-selftest"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    HOST: "127.0.0.1",
    MCP_API_KEY: "pefy-ci-portable-preview-key",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (d) => { stdout += d.toString(); });
child.stderr.on("data", (d) => { stderr += d.toString(); });

async function poll() {
  const url = `http://127.0.0.1:${port}/api/qualification`;
  let last;
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      last = await res.json();
      if (last.status === "pass") return last;
      if (last.status === "fail") throw new Error(`preview self-test failed: ${JSON.stringify(last)}`);
    } catch (error) {
      if (String(error).includes("preview self-test failed")) throw error;
    }
    await new Promise((r) => setTimeout(r, 125));
  }
  throw new Error(`qualification did not reach pass: ${JSON.stringify(last)}\nstdout=${stdout}\nstderr=${stderr}`);
}

try {
  const q = await poll();
  assert.equal(q.enabled, true);
  assert.equal(q.status, "pass");
  assert.equal(q.unauthenticatedBoundary, 401);
  assert.equal(q.authenticatedInitialize, 200);
  assert.equal(q.toolsList, 200);
  assert.equal(q.toolCount, 9);
  assert.deepEqual(q.tools, [
    "capability_status",
    "capability_catalog",
    "route_mission",
    "compile_prompt_contract",
    "quality_gate",
    "select_councils",
    "devfabric_status",
    "local_install_plan",
    "loop_catalog"
  ]);
  assert.equal(q.devfabricCapability?.miniSWEAgent?.version, "2.4.6");
  assert.equal(q.devfabricCapability?.sweRex?.version, "1.4.0");
  console.log(JSON.stringify({portablePreviewQualification:"PASS", qualification:q}, null, 2));
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 1500))
  ]);
}
