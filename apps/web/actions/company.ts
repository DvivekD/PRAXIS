"use server";

import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

async function getCompanyId() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("praxis_company_id")?.value;
  if (!companyId) throw new Error("Unauthorized: Company not logged in");
  return companyId;
}

export async function getCompanyProblemsAction() {
  try {
    const companyId = await getCompanyId();
    const problems = await prisma.problem.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, problems };
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

    // Parse the state JSON to extract telemetry data
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
