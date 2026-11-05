"use server";

import { cookies } from "next/headers";
import { prisma } from "../lib/prisma";
import { revalidatePath } from "next/cache";

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
