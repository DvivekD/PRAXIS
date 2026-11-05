"use server";

import { cookies } from "next/headers";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export interface RedefinedCompanyProblem {
  id: string;
  companyName: string;
  rawTitle: string;
  domain: string;
  redefinedTitle: string;
  incidentOverview: string;
  blastRadius: string;
  subEnvironments: Array<{
    subEnv: number;
    title: string;
    envType: string;
    problemStatement: string;
    telemetryLogs?: string[];
  }>;
  observerPersonaPrompt: string;
  createdAt: string;
}

export async function redefineCompanyProblemAction(data: {
  companyName?: string;
  rawTitle: string;
  domain: string;
  rawDescription: string;
}): Promise<{
  success: boolean;
  problem: RedefinedCompanyProblem;
  error?: string;
}> {
  const companyName = (data.companyName || "Nordic Goods").trim();
  const rawTitle = data.rawTitle.trim();
  const domain = data.domain || "engineering";
  const rawDesc = data.rawDescription.trim();

  // Procedural default fallback
  const defaultRedefined: RedefinedCompanyProblem = {
    id: "comp-" + Date.now().toString(36),
    companyName,
    rawTitle,
    domain,
    redefinedTitle: `${companyName} // ${rawTitle || "Production Incident Outage"}`,
    incidentOverview: `A critical incident originating from ${companyName}'s production architecture: "${rawDesc || "Uncaught edge-case causing severe traffic degradation."}". Estimated blast radius: 42,000 active sessions affected, $380K potential revenue exposure.`,
    blastRadius: "42,000 active sessions // $380K revenue risk",
    subEnvironments: [
      {
        subEnv: 1,
        title: "01 — Live Infrastructure & Telemetry Triage",
        envType: "Remote Linux Terminal",
        problemStatement: `Inspect remote telemetry on ${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}-prod-01, grep system logs for authentication drops and connection saturation, and identify root failure signature.`,
        telemetryLogs: [
          `[CRITICAL] ${companyName.toUpperCase()}_GW: Gateway timeout on ingress dispatch`,
          `[ERROR] Auth token handshake rejected: 504 Gateway Timeout (30000ms limit)`,
          `[WARN] Worker pool thread saturation: 98.4% capacity utilized`,
        ],
      },
      {
        subEnv: 2,
        title: "02 — Root Cause Isolation & Diagnostics",
        envType: "Diagnostics Lab",
        problemStatement: `Determine whether failures originate from upstream DNS misdirection, network socket drops, or database connection pool exhaustion using diagnostic commands.`,
        telemetryLogs: [
          `CoreDNS lookup returned stale pod IP 10.244.7.41`,
          `Connection refused on port 8443: TCP RST packet received`,
        ],
      },
      {
        subEnv: 3,
        title: "03 — Code & Idempotency Resolution",
        envType: "Code Debugger",
        problemStatement: `Patch the underlying race condition and failure loop in the core service, verify atomic locking, and run the automated test suite.`,
      },
    ],
    observerPersonaPrompt: `You are the Lead SRE observing this candidate solving ${companyName}'s ${rawTitle} incident. Evaluate their structured debugging, tool utilization, and hypothesis formulation.`,
    createdAt: new Date().toISOString(),
  };

  if (!process.env.GROQ_API_KEY) {
    return { success: true, problem: defaultRedefined };
  }

  try {
    const systemPrompt = `You are the PRAXIS Procedural Incident Generator.
Transform a real company's raw problem description into a high-stakes, realistic production incident simulation for candidate evaluation.
Output ONLY valid JSON matching this schema:
{
  "redefinedTitle": "Short high-impact incident title (e.g. Mobile 3DS Handshake Deadlock)",
  "incidentOverview": "2-3 sentences explaining the dramatic high-stakes production outage, financial blast radius, and affected users.",
  "blastRadius": "Short metric (e.g. 54,000 checkout sessions // $420k revenue at risk)",
  "sub1Statement": "Actionable task for Sub-Env 1 (Triage, inspecting logs, top/htop/ps aux)",
  "sub2Statement": "Actionable task for Sub-Env 2 (Diagnostics, network/DNS/SQL queries, isolating root cause)",
  "sub3Statement": "Actionable task for Sub-Env 3 (Code fix, race condition patch, tests)",
  "logLine1": "Realistic server log line with timestamp and error code",
  "logLine2": "Realistic server log line with timestamp and error code",
  "observerCoachPrompt": "Instructions for the 3D Observer AI persona guiding the candidate."
}`;

    const userPrompt = `Company Name: ${companyName}
Domain: ${domain}
Raw Problem Title: ${rawTitle}
Raw Problem Description: ${rawDesc}`;

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.6,
      maxOutputTokens: 600,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        problem: {
          id: "comp-" + Date.now().toString(36),
          companyName,
          rawTitle,
          domain,
          redefinedTitle: `${companyName} // ${parsed.redefinedTitle || rawTitle}`,
          incidentOverview: parsed.incidentOverview || defaultRedefined.incidentOverview,
          blastRadius: parsed.blastRadius || defaultRedefined.blastRadius,
          subEnvironments: [
            {
              subEnv: 1,
              title: "01 — Live Infrastructure & Telemetry Triage",
              envType: "Remote Linux Terminal",
              problemStatement: parsed.sub1Statement || defaultRedefined.subEnvironments[0].problemStatement,
              telemetryLogs: [
                parsed.logLine1 || defaultRedefined.subEnvironments[0].telemetryLogs![0],
                parsed.logLine2 || defaultRedefined.subEnvironments[0].telemetryLogs![1],
                `[WARN] System throughput throttled: 84% failure rate under high load`,
              ],
            },
            {
              subEnv: 2,
              title: "02 — Root Cause Isolation & Diagnostics",
              envType: "Diagnostics Lab",
              problemStatement: parsed.sub2Statement || defaultRedefined.subEnvironments[1].problemStatement,
            },
            {
              subEnv: 3,
              title: "03 — Code & Idempotency Resolution",
              envType: "Code Debugger",
              problemStatement: parsed.sub3Statement || defaultRedefined.subEnvironments[2].problemStatement,
            },
          ],
          observerPersonaPrompt: parsed.observerCoachPrompt || defaultRedefined.observerPersonaPrompt,
          createdAt: new Date().toISOString(),
        },
      };
    }
  } catch (err) {
    console.warn("[redefineCompanyProblemAction] AI generation failed, using procedural default:", err);
  }

  return { success: true, problem: defaultRedefined };
}

async function getCompanyId() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("praxis_company_id")?.value;
  if (!companyId) throw new Error("Unauthorized: Company not logged in");
  return companyId;
}

export async function getCompanyProblemsAction() {
  try {
    const companyId = await getCompanyId();

    // PRIORITIZE MOCK CHECK to avoid DB timeout hangs for demo
    if (companyId.includes("-mock-id")) {
      return getMockCompanyProblems(companyId);
    }

    try {
      const problems = await prisma.problem.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
      });
      return { success: true, problems };
    } catch (dbError) {
      console.warn("DB query failed, using mock problems data");
      return getMockCompanyProblems(companyId);
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createProblemAction(data: {
  domain: string;
  title: string;
  description: string;
  setupCode?: string;
  agentPrompt?: string;
}) {
  try {
    const companyId = await getCompanyId();

    // Prevent saving if it's a mock session (or just return success for demo)
    if (companyId.includes("-mock-id")) {
      return { success: true, problem: { ...data, id: "new-mock-" + Date.now() } };
    }

    const problem = await prisma.problem.create({
      data: {
        ...data,
        companyId,
      },
    });
    revalidatePath("/company/dashboard");
    return { success: true, problem };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCompanyPipelineAction() {
  try {
    const companyId = await getCompanyId();

    // PRIORITIZE MOCK CHECK to avoid DB timeout hangs for demo
    if (companyId.includes("-mock-id")) {
      return getMockCompanyPipeline(companyId);
    }

    try {
      const sessions = await prisma.simulationSession.findMany({
        where: {
          problem: { companyId },
        },
        include: {
          user: true,
          problem: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const pipelineData = sessions.map(session => {
        let stateData: any = {};
        try {
          stateData = JSON.parse(session.state);
        } catch (e) {
          console.error("Failed to parse session state for session", session.id);
        }

        return {
          id: session.id,
          candidateName: session.user.fullName || session.user.email,
          candidateId: session.candidateId,
          problemTitle: session.problem?.title,
          domain: session.domain,
          cognitiveScore: session.cognitiveScore,
          completed: session.completed,
          processSignals: stateData.processSignals || {},
          resolutionTurns: stateData.resolutionTurns || 0,
          createdAt: session.createdAt,
        };
      });

      return { success: true, pipeline: pipelineData };
    } catch (dbError) {
      console.warn("DB query failed, using mock pipeline data");
      return getMockCompanyPipeline(companyId);
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Mock Data Fallbacks for Vercel Serverless (SQLite not persistent) ---

function getMockCompanyProblems(companyId: string) {
  if (companyId === "techforge-mock-id") {
    return {
      success: true,
      problems: [
        { id: "tf-p1", title: "Distributed Cache Race Condition", domain: "engineering", description: "Fix the race condition in the memcached cluster..." },
        { id: "tf-p2", title: "ETL Batch Processor Deadlock", domain: "data", description: "Resolve the locking issues in the Snowflake sync pipeline..." }
      ]
    };
  } else if (companyId === "closerhq-mock-id") {
    return {
      success: true,
      problems: [
        { id: "chq-p1", title: "Enterprise Pricing Negotiation", domain: "sales", description: "Navigate an angry VP Procurement over price hikes..." },
        { id: "chq-p2", title: "Feature Pivot Crisis", domain: "product", description: "Communicate dropping the analytics dashboard to the top client..." }
      ]
    };
  }
  return { success: true, problems: [] };
}

function getMockCompanyPipeline(companyId: string) {
  return {
    success: true,
    pipeline: [
      {
        id: "mock-sess-1",
        candidateName: "Alex Chen",
        problemTitle: companyId === "techforge-mock-id" ? "Distributed Cache Race Condition" : "Enterprise Pricing Negotiation",
        domain: companyId === "techforge-mock-id" ? "engineering" : "sales",
        cognitiveScore: 92,
        resolutionTurns: 4,
        processSignals: { "approachQuality": 95, "errorRecovery": 90 }
      },
      {
        id: "mock-sess-2",
        candidateName: "Sarah Jenkins",
        problemTitle: companyId === "techforge-mock-id" ? "ETL Batch Processor Deadlock" : "Feature Pivot Crisis",
        domain: companyId === "techforge-mock-id" ? "data" : "product",
        cognitiveScore: 68,
        resolutionTurns: 9,
        processSignals: { "efficiency": 60, "communication": 75 }
      }
    ]
  };
}
