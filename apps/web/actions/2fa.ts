"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function requestTestimonyAction(candidateId: string, refereeEmail: string, relationship: string) {
  // In production, trigger email.
  console.log(`Sending testimony request to ${refereeEmail}`);
  return { success: true, message: `Request sent to ${refereeEmail}` };
}

export async function submitTestimonyAction(
  candidateId: string,
  refereeEmail: string,
  relationship: string,
  observableOutcomes: any[],
  cognitiveTraits: any,
  wouldWorkAgain: boolean
) {
  const testimony = await prisma.reputationTestimony.create({
    data: {
      candidateId,
      refereeEmail,
      relationship,
      observableOutcomes: JSON.stringify(observableOutcomes),
      cognitiveTraits: JSON.stringify(cognitiveTraits),
      wouldWorkAgain,
    },
  });
  return testimony;
}

export async function createApprenticeshipAction(
  companyId: string,
  title: string,
  description: string,
  durationWeeks: number
) {
  const app = await prisma.apprenticeship.create({
    data: {
      companyId,
      title,
      description,
      durationWeeks,
    },
  });
  return app;
}

export async function submitOutcomeAction(
  candidateId: string,
  companyId: string,
  retentionMonths: number,
  promoted: boolean,
  performanceReview: any
) {
  const outcome = await prisma.outcomeRecord.create({
    data: {
      candidateId,
      companyId,
      retentionMonths,
      promoted,
      performanceReview: JSON.stringify(performanceReview),
    },
  });
  return outcome;
}
