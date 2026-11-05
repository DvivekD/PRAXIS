// Layer 3: Meta-Cognitive Evaluator
// Synthesizes Observer telemetry + Persona interaction signals into final composite scores
// This is the "judge" layer that runs at the end of a simulation

import type { ProcessSignals, DimensionalScores } from "./observer";

export interface EvaluationReport {
  compositeScore: number;
  tier: "exceptional" | "strong" | "competent" | "developing" | "concerning";
  dimensionalScores: DimensionalScores;
  processNarrative: string[];
  strengthAreas: string[];
  growthAreas: string[];
  hiddenConditionsDiscovered: number;
  totalHiddenConditions: number;
  escalationManagement: "excellent" | "good" | "fair" | "poor";
  recommendedNextStep: string;
}

export function evaluateSession(
  signals: ProcessSignals,
  dimensions: DimensionalScores,
  observerNotes: string[],
  totalTurns: number,
  domain: string,
  cognitiveLoad: number
): EvaluationReport {

  // ─── Composite Score Calculation ──────────────────────────
  // Weighted average of dimensional scores, domain-adjusted
  const weights = getDomainWeights(domain);
  let composite = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const score = dimensions[key as keyof DimensionalScores] || 50;
    composite += score * weight;
    totalWeight += weight;
  }
  composite = Math.round(composite / totalWeight);

  // Bonus: proactive clarification in ambiguous situations
  if (signals.ambiguityResponse === "proactive_clarification") composite += 3;
  // Bonus: tested before shipping
  if (signals.testBeforeShip) composite += 2;
  // Bonus: structured debugging
  if (signals.structuredDebugging) composite += 2;
  // Penalty: rushing
  if (signals.timeManagement === "rushing") composite -= 5;

  composite = Math.max(0, Math.min(100, composite));

  // ─── Tier Assignment ──────────────────────────────────────
  const tier = composite >= 90 ? "exceptional"
    : composite >= 75 ? "strong"
    : composite >= 60 ? "competent"
    : composite >= 40 ? "developing"
    : "concerning";

  // ─── Narrative Generation ─────────────────────────────────
  const narrative: string[] = [];

  if (signals.structuredDebugging) {
    narrative.push("Demonstrated a structured, methodical debugging approach — narrowed scope before modifying code.");
  }
  if (signals.testBeforeShip) {
    narrative.push("Ran tests before proposing a final solution, showing production-readiness awareness.");
  }
  if (signals.ambiguityResponse === "proactive_clarification") {
    narrative.push("Proactively sought clarification when requirements were ambiguous, rather than making assumptions.");
  }
  if (signals.edgeCaseConsideration) {
    narrative.push("Considered edge cases without being prompted, suggesting depth of technical thinking.");
  }
  if (signals.tradeoffArticulation) {
    narrative.push("Articulated tradeoffs between different approaches, showing mature engineering judgment.");
  }
  if (signals.stuckRecovery) {
    narrative.push("Successfully recovered from being stuck by pivoting strategy — shows resilience and adaptability.");
  }
  if (signals.collaborationSignal) {
    narrative.push("Actively sought stakeholder input and validated approach before proceeding.");
  }
  if (cognitiveLoad > 75) {
    narrative.push("Exhibited signs of high cognitive load during the session, but managed to maintain output quality.");
  }

  // ─── Strengths & Growth ───────────────────────────────────
  const strengths: string[] = [];
  const growth: string[] = [];

  const dimEntries = Object.entries(dimensions) as [keyof DimensionalScores, number][];
  const sorted = [...dimEntries].sort((a, b) => b[1] - a[1]);

  for (const [key, val] of sorted.slice(0, 3)) {
    strengths.push(formatDimensionName(key));
  }
  for (const [key, val] of sorted.slice(-2)) {
    if (val < 70) growth.push(formatDimensionName(key));
  }

  // ─── Escalation Management ────────────────────────────────
  const escMgmt = signals.escalationHandling === "addressed" ? "excellent"
    : signals.escalationHandling === "escalated_further" ? "good"
    : signals.escalationHandling === "deflected" ? "fair"
    : "poor";

  // ─── Recommended Next Step ────────────────────────────────
  const nextStep = tier === "exceptional" || tier === "strong"
    ? "Fast-track to apprenticeship or direct hire pipeline"
    : tier === "competent"
    ? "Recommend targeted skill development in growth areas, then re-assess"
    : "Suggest foundational training before re-attempting simulation";

  return {
    compositeScore: composite,
    tier,
    dimensionalScores: dimensions,
    processNarrative: narrative,
    strengthAreas: strengths,
    growthAreas: growth,
    hiddenConditionsDiscovered: Math.floor(Math.random() * 3) + 1, // TODO: Track from persona interactions
    totalHiddenConditions: 3,
    escalationManagement: escMgmt,
    recommendedNextStep: nextStep,
  };
}

function getDomainWeights(domain: string): Record<string, number> {
  switch (domain) {
    case "engineering":
      return {
        approachQuality: 20,
        efficiency: 15,
        creativity: 10,
        errorRecovery: 15,
        beyondKnownAnswer: 10,
        toolUtilization: 15,
        communication: 10,
        ambiguityHandling: 5,
      };
    case "sales":
      return {
        approachQuality: 10,
        efficiency: 10,
        creativity: 15,
        errorRecovery: 10,
        beyondKnownAnswer: 5,
        toolUtilization: 5,
        communication: 25,
        ambiguityHandling: 20,
      };
    case "product":
      return {
        approachQuality: 15,
        efficiency: 10,
        creativity: 15,
        errorRecovery: 10,
        beyondKnownAnswer: 10,
        toolUtilization: 5,
        communication: 20,
        ambiguityHandling: 15,
      };
    case "data":
      return {
        approachQuality: 20,
        efficiency: 20,
        creativity: 10,
        errorRecovery: 15,
        beyondKnownAnswer: 5,
        toolUtilization: 20,
        communication: 5,
        ambiguityHandling: 5,
      };
    default:
      return {
        approachQuality: 15, efficiency: 15, creativity: 10, errorRecovery: 15,
        beyondKnownAnswer: 10, toolUtilization: 10, communication: 15, ambiguityHandling: 10,
      };
  }
}

function formatDimensionName(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
}
