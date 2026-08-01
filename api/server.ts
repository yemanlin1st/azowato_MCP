import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const INVENTORY = {
  connectedApps: 20,
  connectorFunctions: 458,
  skillFamilies: 20,
  specializedSkills: 149,
  mcpEntries: 7,
  controlledLoops: 9,
};

const RISK = {
  T0: "Public read-only utility",
  T1: "Drafting or analysis without private data",
  T2: "Read-only connected data or reversible local changes",
  T3: "Structured writes, external communication or controlled deployment",
  T4: "Production, confidential, regulated, financial, legal, security or irreversible action",
};

const LOOPS = {
  executive: "Frame → Evidence → Options → Risk → Decision → Owner → Deadline → Review",
  research: "Question → Source map → Retrieve → Triangulate → Synthesize → Cite → Challenge",
  build: "Spec → Plan → Branch → Build → Test → Review → Deploy gate → Evidence",
  analytics: "Metric contract → Data quality → Analyze → Visualize → Validate → Decision",
  design: "User/job → Journey → Design intent → Prototype → Accessibility → Impeccable QA → Acceptance",
  artifact: "Purpose → Source truth → Architecture → Draft → QA → Format → Release",
  risk: "Scope → Hazard/threat → Control → Owner → Evidence → Residual risk → Approval",
  memory: "Capture → Classify → Segregate → Index → Retrieve test → Decay review → Retire",
  resilience: "Detect → Contain → Continue → Recover → Reconcile → Report → Improve",
};

const CAPABILITY_GROUPS = [
  { id: "design", primary: "Figma/Canva under Impeccable and PEFY brand gates", advisory: ["Adobe Express", "HeyGen", "Open-Sora"] },
  { id: "software", primary: "GitHub + Vercel controlled build", advisory: ["Supabase", "Neon", "Base44"] },
  { id: "analytics", primary: "Data Analytics skill family", advisory: ["Airtable", "Google Sheets", "Postgres"] },
  { id: "documents", primary: "Artifact capability selected by output format", advisory: ["Google Drive", "Canva", "OpenAI templates"] },
  { id: "knowledge", primary: "RMS + MemPalace + OMNIA Core Store", advisory: ["Notion", "Google Drive"] },
  { id: "communications", primary: "Native connector under read-first rule", advisory: ["Gmail", "Calendar", "Contacts"] },
  { id: "governance", primary: "Native PEFY governed loop", advisory: ["Plugin Management", "Skillspector", "Councils"] },
];

const asText = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });

function classifyMission(mission: string) {
  const text = mission.toLowerCase();
  let domain = "governance";
  let loop = "executive";
  let risk: keyof typeof RISK = "T1";

  if (/dashboard|kpi|metric|analysis|data/.test(text)) { domain = "analytics"; loop = "analytics"; }
  else if (/app|website|code|api|deploy|repository|mcp/.test(text)) { domain = "software"; loop = "build"; }
  else if (/design|figma|canva|ui|ux|brand|video/.test(text)) { domain = "design"; loop = "design"; }
  else if (/document|report|memo|presentation|spreadsheet/.test(text)) { domain = "documents"; loop = "artifact"; }
  else if (/memory|knowledge|vault|rag/.test(text)) { domain = "knowledge"; loop = "memory"; }
  else if (/email|calendar|contact|message/.test(text)) { domain = "communications"; loop = "executive"; }

  if (/production|deploy|delete|merge|legal|financial|security|confidential|publish/.test(text)) risk = "T4";
  else if (/write|external|client|connector|github|vercel|database/.test(text)) risk = "T3";
  else if (/read|connected|drive|calendar|gmail/.test(text)) risk = "T2";

  const group = CAPABILITY_GROUPS.find((item) => item.id === domain) ?? CAPABILITY_GROUPS[6];
  return {
    mission,
    domain,
    riskTier: risk,
    riskMeaning: RISK[risk],
    primaryEngine: group.primary,
    advisoryCapabilities: group.advisory,
    loop,
    loopSequence: LOOPS[loop as keyof typeof LOOPS],
    mandatoryRule: "Exactly one primary execution engine; writes, deployment, publication and irreversible actions require the applicable human gate.",
  };
}

const mcp = createMcpHandler((server) => {
  server.tool("capability_status", "Return the governed account capability inventory and operating posture.", {}, async () => asText({ inventory: INVENTORY, riskTiers: RISK }));

  server.tool("capability_catalog", "Return capability groups and their primary/advisory allocation.", { domain: z.string().optional() }, async ({ domain }) => {
    const results = domain ? CAPABILITY_GROUPS.filter((item) => item.id.includes(domain.toLowerCase())) : CAPABILITY_GROUPS;
    return asText({ results });
  });

  server.tool("route_mission", "Compile a mission into risk, primary engine, advisory capabilities and controlled loop.", { mission: z.string().min(5).max(2000) }, async ({ mission }) => asText(classifyMission(mission)));

  server.tool("compile_prompt_contract", "Create a machine-readable Master Mission Contract skeleton.", {
    mission: z.string().min(5),
    businessOutcome: z.string().min(3),
    audience: z.string().min(1),
    sourceOfTruth: z.array(z.string()).default([]),
    deliverables: z.array(z.string()).min(1),
    constraints: z.array(z.string()).default([]),
  }, async (input) => asText({
    ...classifyMission(input.mission),
    businessOutcome: input.businessOutcome,
    audience: input.audience,
    sourceOfTruth: input.sourceOfTruth,
    constraints: input.constraints,
    deliverables: input.deliverables,
    acceptanceCriteria: ["Deliverables exist", "Evidence supports claims", "Quality gates pass", "Rollback or recovery is defined"],
    completionRule: "Do not declare completion until acceptance criteria and evidence are both satisfied.",
  }));

  server.tool("quality_gate", "Evaluate mandatory capability and mission controls.", {
    ownerNamed: z.boolean(), scopeBounded: z.boolean(), authenticationDefined: z.boolean(), leastPrivilege: z.boolean(),
    approvalClassDefined: z.boolean(), auditLogDefined: z.boolean(), dataClassified: z.boolean(), rollbackDefined: z.boolean(),
    sandboxPassed: z.boolean(), evidenceDestinationDefined: z.boolean(), killSwitchDefined: z.boolean(), versionPinned: z.boolean(),
    licenseReviewed: z.boolean(), retentionDefined: z.boolean(), positiveEquityCaptured: z.boolean(),
  }, async (input) => {
    const failed = Object.entries(input).filter(([, value]) => !value).map(([key]) => key);
    return asText({ decision: failed.length ? "NO-GO / CONDITIONAL" : "GO WITH HUMAN APPROVAL", failedControls: failed });
  });

  server.tool("select_councils", "Select proportional counsellor and council challenge for a mission.", { mission: z.string().min(5) }, async ({ mission }) => {
    const route = classifyMission(mission);
    const count = { T0: 0, T1: 1, T2: 2, T3: 3, T4: 5 }[route.riskTier];
    const counsellors = ["Executive", "Technical", "Risk", "Market & Experience", "Human & Impact"].slice(0, count);
    return asText({ riskTier: route.riskTier, counsellors, specialistCouncil: route.domain, rule: "Use only relevant councils; consultation does not dilute single accountability." });
  });

  server.tool("loop_catalog", "Return controlled execution loops and state-machine sequences.", { loop: z.string().optional() }, async ({ loop }) => {
    const entries = Object.entries(LOOPS).filter(([name]) => !loop || name.includes(loop.toLowerCase()));
    return asText({ loops: Object.fromEntries(entries) });
  });
});

async function guarded(request: Request) {
  const key = process.env.MCP_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: "MCP is locked until MCP_API_KEY is configured" }), { status: 503, headers: { "content-type": "application/json" } });
  if (request.headers.get("authorization") !== `Bearer ${key}`) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json", "www-authenticate": "Bearer" } });
  return mcp(request);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
