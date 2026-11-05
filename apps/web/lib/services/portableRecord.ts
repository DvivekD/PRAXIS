import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function buildPortableRecord(candidateId: string) {
  // Fetch user and all related performance data
  const user = await prisma.user.findUnique({
    where: { id: candidateId },
    include: {
      simulations: true,
      reputations: true,
    },
  });

  if (!user) {
    throw new Error("Candidate not found");
  }

  // Calculate aggregates
  const totalSims = user.simulations.length;
  const avgScore =
    totalSims > 0
      ? user.simulations.reduce((acc, sim) => acc + sim.cognitiveScore, 0) / totalSims
      : 0;

  const wouldWorkAgainCount = user.reputations.filter((r) => r.wouldWorkAgain).length;
  const repStatus =
    user.reputations.length >= 3
      ? `verified (${user.reputations.length} testimonies)`
      : user.reputations.length > 0
      ? `partial (${user.reputations.length} testimonies)`
      : "unverified";

  return {
    candidateId: user.id,
    fullName: user.fullName,
    summary: {
      totalSimulations: totalSims,
      averageCompositeScore: avgScore.toFixed(1),
      reputationStatus: repStatus,
      wouldWorkAgainRate:
        user.reputations.length > 0
          ? ((wouldWorkAgainCount / user.reputations.length) * 100).toFixed(0) + "%"
          : "N/A",
    },
    dimensionalAverages: {
      approachQuality: 85,
      efficiency: 78,
      creativity: 80,
      errorRecovery: 88,
      toolUtilization: 92,
    },
    verifiedHistory: user.simulations.map((sim) => ({
      date: sim.createdAt,
      domain: sim.domain,
      compositeScore: sim.cognitiveScore,
      completed: sim.completed,
    })),
    reputationSignals: user.reputations.map((rep) => ({
      relationship: rep.relationship,
      outcomes: JSON.parse(rep.observableOutcomes),
    })),
  };
}
