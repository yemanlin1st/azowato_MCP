import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const SYSTEM_DOCS = [
  {
    id: "status",
    title: "Deployment status",
    text: "ExperienceSwarm and MediaSwarm are packaged and validated. Impeccable is pinned at 3.5.0. DevSwarm 2.3.1 is restricted to a signed Windows pilot. Open-Sora code and model revisions are pinned, but GPU-host execution requires a qualified Linux/CUDA host. The remote MCP is read-only by default."
  },
  {
    id: "architecture",
    title: "System architecture",
    text: "Customer signal to journey insight, product decision, experiment, parallel delivery, UI and media assurance, release gate, adoption and learning. The sovereign core is offline-first; online connectors are optional and separately qualified."
  },
  {
    id: "security",
    title: "Security and governance",
    text: "No autonomous merge, push, deployment, deletion or publication. No sensitive client data is exposed by this MCP. Human authority remains mandatory. Optional bearer authentication activates when MCP_API_KEY is configured."
  },
  {
    id: "account",
    title: "ChatGPT account boundary",
    text: "ChatGPT connects only to remote MCP servers. Full write-capable custom MCP deployment requires a supported Business, Enterprise or Edu workspace on ChatGPT web. A Plus mobile session cannot publish the custom app into the workspace UI."
  }
];

const COMPONENTS = {
  impeccable: { version: "3.5.0", status: "deployment package ready", mode: "user/project isolated" },
  devswarm: { version: "2.3.1", status: "restricted pilot", mode: "Windows 11, signed installer, non-sensitive repository" },
  openSora: {
    version: "2.0",
    status: "pinned installers ready; physical GPU deployment pending",
    codeCommit: "7ad6a96a135feb81f755c84fb391818718f6beb2",
    modelRevision: "44527d84044152ae014ff5e01668cf7f5fff64c3"
  },
  experienceSwarm: { version: "1.0.0", status: "implemented and smoke-tested" },
  mediaSwarm: { version: "2.0.0", status: "implemented and smoke-tested" },
  mcp: { version: "1.0.0", status: "remote read-only control plane" }
};

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function calculateExperienceScore(input: {
  nps?: number;
  csatPercent?: number;
  cesAverage1To7?: number;
  complaintClosurePercent?: number;
}) {
  const components: Array<{ name: string; normalized: number }> = [];
  if (input.nps !== undefined) {
    const nps = Math.max(-100, Math.min(100, input.nps));
    components.push({ name: "NPS", normalized: (nps + 100) / 2 });
  }
  if (input.csatPercent !== undefined) {
    components.push({ name: "CSAT", normalized: Math.max(0, Math.min(100, input.csatPercent)) });
  }
  if (input.cesAverage1To7 !== undefined) {
    const ces = Math.max(1, Math.min(7, input.cesAverage1To7));
    components.push({ name: "CES", normalized: (ces / 7) * 100 });
  }
  if (input.complaintClosurePercent !== undefined) {
    components.push({ name: "Complaint closure", normalized: Math.max(0, Math.min(100, input.complaintClosurePercent)) });
  }
  const score = components.length
    ? Math.round((components.reduce((sum, item) => sum + item.normalized, 0) / components.length) * 10) / 10
    : null;
  return {
    score,
    components,
    limitation: "The score uses only supplied metrics; absent evidence is never treated as good performance."
  };
}

function evaluateReleaseGate(input: {
  experienceScore?: number;
  criticalOpenComplaints: number;
  overdueHighActions: number;
  criticalAccessibilityFindings: number;
  criticalSecurityFindings: number;
  rollbackReady: boolean;
}) {
  const blockers: string[] = [];
  if (input.experienceScore === undefined) blockers.push("Experience evidence is missing");
  else if (input.experienceScore < 80) blockers.push("Experience score is below 80");
  if (input.criticalOpenComplaints > 0) blockers.push("Critical complaints remain open");
  if (input.overdueHighActions > 0) blockers.push("High or critical actions are overdue");
  if (input.criticalAccessibilityFindings > 0) blockers.push("Critical accessibility findings remain open");
  if (input.criticalSecurityFindings > 0) blockers.push("Critical security findings remain open");
  if (!input.rollbackReady) blockers.push("Rollback is not ready");
  return {
    decision: blockers.length ? "NO-GO / CONDITIONAL" : "GO WITH HUMAN APPROVAL",
    blockers,
    manualGates: ["legal", "privacy", "financial/value", "brand", "human release authority"]
  };
}

function routeMedia(input: {
  gpuAvailable: boolean;
  openSoraInstalled: boolean;
  remoteEndpointConfigured: boolean;
  rightsApproved: boolean;
  consentApproved: boolean;
  claimsApproved: boolean;
  accessibilityApproved: boolean;
}) {
  const blockers: string[] = [];
  if (!input.rightsApproved) blockers.push("Input rights are not approved");
  if (!input.consentApproved) blockers.push("Likeness or voice consent is not approved");
  if (!input.claimsApproved) blockers.push("Claims and proof are not approved");
  if (!input.accessibilityApproved) blockers.push("Accessibility package is not approved");
  let route = "offline-storyboard";
  if (!blockers.length && input.gpuAvailable && input.openSoraInstalled) route = "local-open-sora";
  else if (!blockers.length && input.remoteEndpointConfigured) route = "approved-remote-endpoint";
  return { route, decision: blockers.length ? "NO-GO" : "READY FOR HUMAN APPROVAL", blockers };
}

const baseHandler = createMcpHandler((server) => {
  server.tool(
    "system_status",
    "Return verified component and deployment status.",
    {},
    async () => text({ components: COMPONENTS })
  );

  server.tool(
    "search",
    "Search the Experience & Media Swarm system knowledge base.",
    { query: z.string().min(1).max(300) },
    async ({ query }) => {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      const results = SYSTEM_DOCS.map((doc) => ({
        ...doc,
        score: terms.reduce(
          (score, term) => score + (doc.title.toLowerCase().includes(term) ? 3 : 0) + (doc.text.toLowerCase().includes(term) ? 1 : 0),
          0
        )
      }))
        .filter((doc) => doc.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ id, title, text: snippet, score }) => ({ id, title, snippet, score }));
      return text({ results });
    }
  );

  server.tool(
    "fetch",
    "Fetch one complete system document by ID returned from search.",
    { id: z.string().min(1).max(100) },
    async ({ id }) => {
      const document = SYSTEM_DOCS.find((item) => item.id === id);
      return document ? text(document) : text({ error: "Document not found", id });
    }
  );

  server.tool(
    "experience_score",
    "Calculate a bounded CX/PX experience score from supplied evidence.",
    {
      nps: z.number().min(-100).max(100).optional(),
      csatPercent: z.number().min(0).max(100).optional(),
      cesAverage1To7: z.number().min(1).max(7).optional(),
      complaintClosurePercent: z.number().min(0).max(100).optional()
    },
    async (input) => text(calculateExperienceScore(input))
  );

  server.tool(
    "release_gate",
    "Evaluate experience, complaint, accessibility, security and rollback release blockers.",
    {
      experienceScore: z.number().min(0).max(100).optional(),
      criticalOpenComplaints: z.number().int().min(0),
      overdueHighActions: z.number().int().min(0),
      criticalAccessibilityFindings: z.number().int().min(0),
      criticalSecurityFindings: z.number().int().min(0),
      rollbackReady: z.boolean()
    },
    async (input) => text(evaluateReleaseGate(input))
  );

  server.tool(
    "media_route",
    "Select the governed media route: offline storyboard, local Open-Sora, approved remote endpoint, or no-go.",
    {
      gpuAvailable: z.boolean(),
      openSoraInstalled: z.boolean(),
      remoteEndpointConfigured: z.boolean(),
      rightsApproved: z.boolean(),
      consentApproved: z.boolean(),
      claimsApproved: z.boolean(),
      accessibilityApproved: z.boolean()
    },
    async (input) => text(routeMedia(input))
  );

  server.tool(
    "local_install_plan",
    "Return non-destructive installation commands for a selected target. The command is a plan, not proof of execution.",
    {
      target: z.enum(["rocky-linux", "windows", "wsl"]),
      includeImpeccable: z.boolean().default(true),
      includeOpenSoraCode: z.boolean().default(false),
      includeOpenSoraModel: z.boolean().default(false),
      includeDevSwarmPilot: z.boolean().default(false)
    },
    async (input) => {
      const commands: string[] = [];
      if (input.target === "rocky-linux" || input.target === "wsl") {
        commands.push("unzip PEFY_EXPERIENCE_MEDIA_SWARM_OS_V2.zip");
        commands.push("cd PEFY_EXPERIENCE_MEDIA_SWARM_OS_V2");
        commands.push("chmod +x *.sh bin/* integrations/open-sora/*.sh");
        commands.push(`${input.includeImpeccable ? "INSTALL_IMPECCABLE=1 " : ""}./install-rocky-linux.sh`);
        commands.push("source ~/.bashrc && experience-swarm doctor && media-swarm doctor");
        if (input.includeOpenSoraCode) commands.push("./integrations/open-sora/install-open-sora.sh --execute");
        if (input.includeOpenSoraModel) commands.push("./integrations/open-sora/download-model.sh --execute");
      } else {
        commands.push("Expand-Archive .\\PEFY_EXPERIENCE_MEDIA_SWARM_OS_V2.zip");
        commands.push("cd .\\PEFY_EXPERIENCE_MEDIA_SWARM_OS_V2");
        commands.push("Set-ExecutionPolicy -Scope Process Bypass");
        commands.push(".\\install-windows.ps1");
        commands.push("experience-swarm doctor; media-swarm doctor");
        if (input.includeDevSwarmPilot) commands.push(".\\integrations\\devswarm\\devswarm-preflight.ps1");
      }
      return text({ target: input.target, commands, requiresAuthenticatedHostShell: true });
    }
  );
});

async function guarded(request: Request) {
  const key = process.env.MCP_API_KEY;
  if (key) {
    const supplied = request.headers.get("authorization");
    if (supplied !== `Bearer ${key}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json", "www-authenticate": "Bearer" }
      });
    }
  }
  return baseHandler(request);
}

export { guarded as GET, guarded as POST, guarded as DELETE };
