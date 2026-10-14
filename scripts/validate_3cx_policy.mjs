import fs from "node:fs";

const policy = JSON.parse(fs.readFileSync("config/egress-policy.json", "utf8"));
const threeCX = policy.capabilities?.telephony?.threeCX;

const failures = [];
if (!threeCX) failures.push("3CX policy missing");
if (threeCX?.credentials !== "required") failures.push("3CX credentials must be required");
if (threeCX?.writes !== "human-approved T4") failures.push("3CX writes must remain T4");
if (threeCX?.nativePlugin !== false) failures.push("3CX native plugin state must be false");

if (failures.length) {
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}
console.log("3CX adapter contract: PASS");
