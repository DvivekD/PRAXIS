"use server";

import { PrismaClient } from "@prisma/client";
import { problemBank, GeneratedProblem } from "../lib/services/problemBank";
import { assignSegment, getSegmentModifiers } from "../lib/services/segmentation";
import { observerNode, ProcessSignals, TelemetryData, DimensionalScores } from "../lib/agents/observer";
import { PersonaOrchestrator } from "../lib/agents/personas";
import { evaluateSession, EvaluationReport } from "../lib/agents/evaluator";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const prisma = new PrismaClient();

const ai = createOpenAI({
  apiKey: process.env.VERTEX_API_KEY || "YOUR_API_KEY",
  baseURL: process.env.OPENAI_BASE_URL || "http://localhost:8317/v1",
});

// ═══════════════════════════════════════════════════════════════
// STEP 1: BASELINE LITMUS (handled by actions/resume.ts)
// STEP 2: SEGMENTATION
// ═══════════════════════════════════════════════════════════════

export async function getProblemsByDomainAction(domain: string) {
  try {
    const problems = await prisma.problem.findMany({
      where: { domain },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, problems };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: PROBLEM MUTATION + SESSION CREATION
// ═══════════════════════════════════════════════════════════════

export async function startSimulationAction(
  domain: string,
  baselineScore: number,
  candidateId: string,
  problemId?: string
) {
  // Ensure user exists
  await prisma.user.upsert({
    where: { id: candidateId },
    update: {},
    create: {
      id: candidateId,
      email: `${candidateId}@praxis.dev`,
      passwordHash: "demo",
      role: "candidate",
      fullName: "Test Candidate",
    },
  });

  // STEP 2: Segment the candidate
  const segment = assignSegment(baselineScore, domain);
  const modifiers = getSegmentModifiers(segment);

  // STEP 3: Generate a mutated problem
  let problem: GeneratedProblem = problemBank.generateMutatedProblem(domain, segment);

  // Override with company problem if provided
  if (problemId) {
    const companyProblem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (companyProblem) {
      problem.scenario = companyProblem.description;
      problem.title = companyProblem.title;
      problem.contextVariables = {
        ...problem.contextVariables,
        companyTitle: companyProblem.title,
        domain: companyProblem.domain,
      };
      if (companyProblem.setupCode) problem.setupCode = companyProblem.setupCode;
      if (companyProblem.agentPrompt) problem.agentPrompt = companyProblem.agentPrompt;
      problem.skinType = companyProblem.setupCode ? "ide" : "roleplay";
    }
  }

  // Build initial opening message based on domain persona
  const orchestrator = new PersonaOrchestrator(domain);
  const persona = orchestrator.getActivePersonaInfo();

  const openingMessages: Record<string, string> = {
    engineering: `Hey, welcome to the project. I'm ${persona.name}, ${persona.role}. We've got a critical issue — ${problem.scenario.substring(0, 150)}. I need you to dig into this. What's your first move?`,
    sales: `Hi, thanks for taking this call. I'm ${persona.name}, ${persona.role}. Look, I'll be direct — ${problem.scenario.substring(0, 150)}. How do you propose we handle this?`,
    product: `Thanks for joining this meeting, I'm ${persona.name}, ${persona.role}. We need to discuss something urgent — ${problem.scenario.substring(0, 150)}. What's your recommendation?`,
    data: `Hey, glad you're looking at this. I'm ${persona.name}, ${persona.role}. We're in trouble — ${problem.scenario.substring(0, 150)}. Walk me through your approach.`,
  };

  const initialState = {
    messages: [
      { role: "assistant", content: openingMessages[domain] || openingMessages.engineering },
    ],
    candidateTelemetry: {},
    cognitiveLoadScore: 50,
    resolutionTurns: 0,
    currentScenario: problem.scenario,
    problemTitle: problem.title,
    contextVariables: problem.contextVariables,
    setupCode: problem.setupCode,
    agentPrompt: problem.agentPrompt,
    skinType: problem.skinType,
    difficultyModifiers: modifiers,
    observerNotes: [],
    processSignals: {
      knowledgeBaseConsultation: false,
      testBeforeShip: false,
      ambiguityResponse: "unknown",
      toolUsagePattern: [],
      stuckRecovery: false,
      escalationHandling: "unknown",
      communicationClarity: 50,
      structuredDebugging: false,
      edgeCaseConsideration: false,
      tradeoffArticulation: false,
      collaborationSignal: false,
      timeManagement: "unknown",
    } as ProcessSignals,
    dimensionalScores: {
      approachQuality: Math.floor(Math.random() * 20) + 40,
      efficiency: Math.floor(Math.random() * 20) + 40,
      creativity: Math.floor(Math.random() * 20) + 40,
      errorRecovery: Math.floor(Math.random() * 20) + 40,
      beyondKnownAnswer: Math.floor(Math.random() * 20) + 40,
      toolUtilization: Math.floor(Math.random() * 20) + 40,
      communication: Math.floor(Math.random() * 20) + 40,
      ambiguityHandling: Math.floor(Math.random() * 20) + 40,
    } as DimensionalScores,
    activePersona: persona,
  };

  const sim = await prisma.simulationSession.create({
    data: {
      candidateId,
      domain,
      problemId: problemId || null,
      state: JSON.stringify(initialState),
      cognitiveScore: 50,
      completed: false,
    },
  });

  return { sessionId: sim.id, state: initialState, segment, problem };
}

// ═══════════════════════════════════════════════════════════════
// STEP 4: SIMULATE (each message turn)
// STEP 5: OBSERVE (Layer 1 + Layer 2 run simultaneously)
// ═══════════════════════════════════════════════════════════════

export async function sendMessageAction(sessionId: string, text: string, telemetry: TelemetryData) {
  const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
  if (!sim) throw new Error("Session not found");

  const state = JSON.parse(sim.state);

  // 1. Add user message
  state.messages.push({ role: "user", content: text });

  // 2. LAYER 1: Observer tracks behavioral signals
  const observerOutput = observerNode(
    state.messages,
    telemetry,
    state.processSignals,
    state.cognitiveLoadScore,
    state.dimensionalScores
  );

  state.cognitiveLoadScore = observerOutput.cognitiveLoadScore;
  state.processSignals = observerOutput.processSignals;
  state.dimensionalScores = observerOutput.dimensionalScores;
  state.observerNotes.push(...observerOutput.observerNotes);

  // 3. LAYER 2: Persona orchestration
  const orchestrator = new PersonaOrchestrator(sim.domain);

  // Restore escalation levels from state if available
  orchestrator.evaluateEscalation(text);
  orchestrator.selectNextSpeaker(text);

  const persona = orchestrator.getActivePersonaInfo();
  state.activePersona = persona;

  // Build system prompt with full context
  let systemPrompt = orchestrator.getSystemPrompt();

  // Inject scenario context
  systemPrompt += `\n\nSCENARIO CONTEXT:\n${state.currentScenario}\n`;
  if (state.contextVariables && Object.keys(state.contextVariables).length > 0) {
    systemPrompt += `Context variables: ${JSON.stringify(state.contextVariables)}\n`;
  }
  if (state.agentPrompt) {
    systemPrompt += `\nADDITIONAL INSTRUCTIONS:\n${state.agentPrompt}\n`;
  }

  // Inject observer notes for the AI to be aware of candidate behavior
  if (observerOutput.observerNotes.length > 0) {
    systemPrompt += `\n[INTERNAL — Observer Notes for calibrating response difficulty]:\n`;
    systemPrompt += observerOutput.observerNotes.map(n => `- ${n}`).join("\n");
  }

  // 4. Generate AI Response
  let aiContent = "";
  try {
    const { text: generatedText } = await generateText({
      model: ai("gemini-2.0-flash"),
      system: systemPrompt,
      messages: state.messages.slice(-6), // Keep context window manageable
    });
    aiContent = generatedText;
  } catch (e) {
    console.error("AI Generation failed, using fallback", e);
    // Domain-specific fallbacks
    const fallbacks: Record<string, string> = {
      engineering: "Interesting approach. Can you walk me through the specific technical implementation? What happens under high concurrency?",
      sales: "I appreciate the enthusiasm, but I need more specifics. What concrete value can you demonstrate?",
      product: "That's a start, but what's the data backing this recommendation? What are the risks?",
      data: "Walk me through the query plan. Where do you think the bottleneck is?",
    };
    aiContent = fallbacks[sim.domain] || "Can you elaborate on that approach?";
  }

  state.messages.push({ role: "assistant", content: aiContent });
  state.resolutionTurns += 1;

  // Check completion (10 turns)
  const isComplete = state.resolutionTurns >= 10;

  // 5. Save updated state
  await prisma.simulationSession.update({
    where: { id: sessionId },
    data: {
      state: JSON.stringify(state),
      cognitiveScore: state.cognitiveLoadScore,
      completed: isComplete,
    },
  });

  return {
    response: aiContent,
    state,
    persona,
    isComplete,
  };
}

// ═══════════════════════════════════════════════════════════════
// STEP 6: SCORE (Layer 3 Meta-Cognitive Evaluation)
// ═══════════════════════════════════════════════════════════════

export async function getSessionResultsAction(sessionId: string): Promise<{
  success: boolean;
  report?: EvaluationReport;
  sessionMeta?: any;
  error?: string;
}> {
  try {
    const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
    if (!sim) return { success: false, error: "Session not found" };

    const state = JSON.parse(sim.state);

    // Run Layer 3 evaluation
    const report = evaluateSession(
      state.processSignals,
      state.dimensionalScores,
      state.observerNotes,
      state.resolutionTurns,
      sim.domain,
      state.cognitiveLoadScore
    );

    // Save the final score back
    await prisma.simulationSession.update({
      where: { id: sessionId },
      data: { cognitiveScore: report.compositeScore },
    });

    return {
      success: true,
      report,
      sessionMeta: {
        sessionId: sim.id,
        domain: sim.domain,
        turns: state.resolutionTurns,
        cognitiveLoad: state.cognitiveLoadScore,
        observerNotes: state.observerNotes,
        activePersona: state.activePersona,
        problemTitle: state.problemTitle,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// PORTABLE RECORD (2FA Verification Board Data)
// ═══════════════════════════════════════════════════════════════

export async function getPortableRecordAction(candidateId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: candidateId },
      include: {
        simulations: { orderBy: { createdAt: "desc" } },
        reputations: true,
      },
    });

    if (!user) return { success: false, error: "Candidate not found" };

    const completedSims = user.simulations.filter(s => s.completed);
    const avgScore = completedSims.length > 0
      ? completedSims.reduce((acc, s) => acc + s.cognitiveScore, 0) / completedSims.length
      : 0;

    const wouldWorkAgainCount = user.reputations.filter(r => r.wouldWorkAgain).length;
    const repStatus = user.reputations.length >= 3
      ? `verified (${user.reputations.length} testimonies)`
      : user.reputations.length > 0
      ? `partial (${user.reputations.length} testimonies)`
      : "unverified";

    return {
      success: true,
      record: {
        candidateId: user.id,
        fullName: user.fullName,
        summary: {
          totalSimulations: user.simulations.length,
          completedSimulations: completedSims.length,
          averageCompositeScore: Math.round(avgScore * 10) / 10,
          reputationStatus: repStatus,
          wouldWorkAgainRate: user.reputations.length > 0
            ? Math.round((wouldWorkAgainCount / user.reputations.length) * 100) + "%"
            : "N/A",
        },
        history: user.simulations.map(sim => {
          const s = JSON.parse(sim.state);
          return {
            id: sim.id,
            date: sim.createdAt,
            domain: sim.domain,
            compositeScore: sim.cognitiveScore,
            completed: sim.completed,
            turns: s.resolutionTurns || 0,
            problemTitle: s.problemTitle || "Unknown",
          };
        }),
        reputationSignals: user.reputations.map(rep => ({
          relationship: rep.relationship,
          outcomes: JSON.parse(rep.observableOutcomes),
          wouldWorkAgain: rep.wouldWorkAgain,
        })),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
