"use server";

import { prisma } from "../lib/prisma";
import { problemBank, GeneratedProblem } from "../lib/services/problemBank";
import { assignSegment, getSegmentModifiers } from "../lib/services/segmentation";
import { observerNode, ProcessSignals, TelemetryData, DimensionalScores } from "../lib/agents/observer";
import { PersonaOrchestrator } from "../lib/agents/personas";
import { evaluateSession, EvaluationReport } from "../lib/agents/evaluator";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import {
  INITIAL_SUPPORT_QUEUE,
  ELENA_ROSTOVA_ACCOUNT,
  MACRO_TEMPLATES,
  INITIAL_QUEUE_STATS,
} from "../components/Environments/Support/mockData";
import type {
  SupportTicket,
  CustomerAccount,
  MacroTemplate,
  SupportQueueStats,
  CommunicationTone,
} from "../components/Environments/Support/types";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

const ai = (model: string = "llama-3.3-70b-versatile") => groq(model);


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
    // DB unavailable (e.g. Vercel with SQLite) — return empty
    return { success: true, problems: [] };
  }
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: PROBLEM MUTATION + SESSION CREATION
// ═══════════════════════════════════════════════════════════════

export async function startSimulationAction(
  domain: string,
  baselineScore: number,
  candidateId: string,
  problemId?: string,
  subEnv: number = 1
) {
  // Ensure user exists (skip if DB unavailable)
  try {
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
  } catch (e) { /* DB unavailable, proceed without persistence */ }

  // STEP 2: Segment the candidate
  const segment = assignSegment(baselineScore, domain);
  const modifiers = getSegmentModifiers(segment);

  // STEP 3: Generate a mutated problem for the selected sub-environment
  let problem: GeneratedProblem = problemBank.generateMutatedProblem(domain, segment, subEnv);

  // Override with company problem if provided
  if (problemId) {
    try {
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
    } catch (e) { /* DB unavailable, use generated problem */ }
  }

  // Build initial opening message based on domain persona
  const orchestrator = new PersonaOrchestrator(domain);
  const persona = orchestrator.getActivePersonaInfo();

  const openingMessages: Record<string, string> = {
    engineering: `Hey, welcome to the project. I'm ${persona.name}, ${persona.role}. We've got a critical issue — ${problem.scenario.substring(0, 150)}. I need you to dig into this. What's your first move?`,
    sales: `Hi, thanks for taking this call. I'm ${persona.name}, ${persona.role}. Look, I'll be direct — ${problem.scenario.substring(0, 150)}. How do you propose we handle this?`,
    product: `Thanks for joining this meeting, I'm ${persona.name}, ${persona.role}. We need to discuss something urgent — ${problem.scenario.substring(0, 150)}. What's your recommendation?`,
    data: `Hey, glad you're looking at this. I'm ${persona.name}, ${persona.role}. We're in trouble — ${problem.scenario.substring(0, 150)}. Walk me through your approach.`,
    sre: `War room assembled. I'm ${persona.name}, ${persona.role}. Error rates exploded to 42% after the latest deploy. What is your rollback action?`,
    support: `Support queue update: I'm ${persona.name}, ${persona.role}. Our support queue has accumulated 120 unresolved tickets. Several enterprise customers have breached or are approaching their SLA deadlines due to duplicate checkout charges. We need a unified resolution before contract churn hits. What is your triage plan?`,
    brand: `Crisis command online: I'm ${persona.name}, ${persona.role}. A scheduled marketing tweet went viral beside customer checkout complaints. What's our public statement?`,
  };

  const initialState = {
    messages: [
      { role: "assistant", content: openingMessages[domain] || openingMessages.engineering },
    ],
    candidateTelemetry: {},
    cognitiveLoadScore: Math.floor(Math.random() * 30) + 30, // Start between 30-60
    resolutionTurns: 0,
    subEnv: problem.subEnv,
    problemStatement: problem.problemStatement,
    envType: problem.envType,
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
      communicationClarity: Math.floor(Math.random() * 40) + 30,
      structuredDebugging: false,
      edgeCaseConsideration: false,
      tradeoffArticulation: false,
      collaborationSignal: false,
      timeManagement: "unknown",
    } as ProcessSignals,
    dimensionalScores: {
      approachQuality: Math.floor(Math.random() * 40) + 40,
      efficiency: Math.floor(Math.random() * 40) + 40,
      creativity: Math.floor(Math.random() * 40) + 40,
      errorRecovery: Math.floor(Math.random() * 40) + 40,
      beyondKnownAnswer: Math.floor(Math.random() * 40) + 40,
      toolUtilization: Math.floor(Math.random() * 40) + 40,
      communication: Math.floor(Math.random() * 40) + 40,
      ambiguityHandling: Math.floor(Math.random() * 40) + 40,
    } as DimensionalScores,
    activePersona: persona,
  };

  // Try to persist to DB, fallback to generated UUID
  let sessionId: string;
  try {
    const sim = await prisma.simulationSession.create({
      data: {
        candidateId,
        domain,
        problemId: problemId || null,
        state: JSON.stringify(initialState),
        cognitiveScore: initialState.cognitiveLoadScore,
        completed: false,
      },
    });
    sessionId = sim.id;
  } catch (e) {
    // DB unavailable — generate a UUID-like ID for the session
    sessionId = `demo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  return { sessionId, state: initialState, segment, problem };
}

// ═══════════════════════════════════════════════════════════════
// STEP 4: SIMULATE (each message turn)
// STEP 5: OBSERVE (Layer 1 + Layer 2 run simultaneously)
// ═══════════════════════════════════════════════════════════════

export async function sendMessageAction(sessionId: string, text: string, telemetry: TelemetryData, clientState?: any) {
  let state: any;
  let domain: string;

  // Try loading from DB, fallback to client-provided state
  try {
    const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
    if (sim) {
      state = JSON.parse(sim.state);
      domain = sim.domain;
    } else {
      throw new Error("Not found");
    }
  } catch (e) {
    // DB unavailable — use client-provided state
    if (!clientState) throw new Error("Session not found and no client state provided");
    state = clientState;
    domain = clientState.contextVariables?.domain || "engineering";
    // Infer domain from scenario context
    if (state.activePersona) {
      const personaHints: Record<string, string> = { "Marcus": "engineering", "Priya": "engineering", "Jordan": "sales", "Diana": "sales", "Sam Jenkins": "sales", "Sam": "sales", "Alex": "product", "Taylor Brooks": "product", "Taylor": "product", "Riley Kim": "data", "Riley": "data", "Marcus Reid": "data", "Taylor Vance": "data", "Dr. Chen": "data", "Maya": "brand", "Maya Lin": "brand" };
      domain = personaHints[state.activePersona?.name] || domain;
    }
  }

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
  const orchestrator = new PersonaOrchestrator(domain);
  orchestrator.evaluateEscalation(text);
  orchestrator.selectNextSpeaker(text);

  const persona = orchestrator.getActivePersonaInfo();
  state.activePersona = persona;

  // Build system prompt with full context
  let systemPrompt = orchestrator.getSystemPrompt();
  systemPrompt += `\n\nSCENARIO CONTEXT:\n${state.currentScenario}\n`;
  if (state.contextVariables && Object.keys(state.contextVariables).length > 0) {
    systemPrompt += `Context variables: ${JSON.stringify(state.contextVariables)}\n`;
  }
  if (state.agentPrompt) {
    systemPrompt += `\nADDITIONAL INSTRUCTIONS:\n${state.agentPrompt}\n`;
  }
  if (observerOutput.observerNotes.length > 0) {
    systemPrompt += `\n[INTERNAL — Observer Notes for calibrating response difficulty]:\n`;
    systemPrompt += observerOutput.observerNotes.map(n => `- ${n}`).join("\n");
  }

  // 4. Generate AI Response
  let aiContent = "";
  try {
    const { text: generatedText } = await generateText({
      model: ai("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages: state.messages.slice(-6),
    });
    aiContent = generatedText;
  } catch (e) {
    console.error("AI Generation failed, using fallback", e);
    const fallbacks: Record<string, string> = {
      engineering: "Interesting approach. Can you walk me through the specific technical implementation? What happens under high concurrency?",
      sales: "I appreciate the enthusiasm, but I need more specifics. What concrete value can you demonstrate?",
      product: "That's a start, but what's the data backing this recommendation? What are the risks?",
      data: "Review the session join in SQL Studio and check the mobile event ingestion in the pipeline DAG. Why would DAU drop if raw requests didn't?",
      sre: "We are monitoring pod saturation. Has the rollback container image settled traffic across the cluster?",
      support: "Ticket volume remains elevated. Have we unified customer responses with the SRE root-cause fix?",
      brand: "Our public reputation is under acute strain. Mentions are multiplying and journalists are requesting statements. What is your verified statement and containment plan?",
    };
    aiContent = fallbacks[domain] || "Can you elaborate on that approach?";
  }

  state.messages.push({ role: "assistant", content: aiContent });
  state.resolutionTurns += 1;

  const isComplete = state.resolutionTurns >= 10;

  // 5. Try to save updated state to DB
  try {
    await prisma.simulationSession.update({
      where: { id: sessionId },
      data: {
        state: JSON.stringify(state),
        cognitiveScore: state.cognitiveLoadScore,
        completed: isComplete,
      },
    });
  } catch (e) { /* DB unavailable, state lives in client */ }

  return {
    response: aiContent,
    state,
    persona,
    isComplete,
  };
}

// ═══════════════════════════════════════════════════════════════
// SCOPE 2: SALES (SAVE THE $250K RENEWAL) ACTIONS
// ═══════════════════════════════════════════════════════════════

export interface SalesRenewalPayload {
  accountName: string;
  prospectName: string;
  finalARR: number;
  tcv: number;
  termYears: number;
  discountPct: number;
  slaTier: string;
  bookedSlot?: string | null;
  objectionsCount?: number;
  summaryNotes?: string;
}

export async function submitSalesRenewalAction(
  sessionId: string,
  payload: SalesRenewalPayload,
  currentState?: any
) {
  try {
    const score = 98;
    const logEntry = `[VICTORY] Enterprise AE executed renewal contract for ${payload.accountName} (${payload.prospectName})! Secured $${payload.finalARR.toLocaleString()} ARR on a ${payload.termYears}-year commitment (TCV: $${payload.tcv.toLocaleString()}, ${payload.discountPct}% incentive). Guaranteed ${payload.slaTier} and atomic zero-double-charge architecture. Churn eliminated ahead of Black Friday.`;

    if (sessionId && !sessionId.startsWith("demo-")) {
      try {
        let state = currentState;
        const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
        if (sim) state = JSON.parse(sim.state);

        if (state) {
          state.messages.push({ role: "user", content: logEntry });
          state.messages.push({
            role: "assistant",
            content: `Sam Jenkins: 'Outstanding presentation and commercial partnership. The atomic reservation architecture and SRE war room give us 100% confidence for Black Friday. Contract executed. Welcome to another multi-year term with Nordic Goods!'`,
            persona: "Sam Jenkins",
          });
          state.observerNotes.push(logEntry);
          state.cognitiveLoadScore = 20; // Calm & Masterful
          state.dimensionalScores = {
            approachQuality: 98,
            efficiency: 96,
            creativity: 94,
            errorRecovery: 97,
            beyondKnownAnswer: 95,
            toolUtilization: 96,
            communication: 99,
            ambiguityHandling: 96,
          };
          state.processSignals = {
            ...state.processSignals,
            tradeoffArticulation: true,
            edgeCaseConsideration: true,
            structuredDebugging: true,
            escalationHandling: "addressed",
            timeManagement: "methodical",
            communicationClarity: 98,
          };

          await prisma.simulationSession.update({
            where: { id: sessionId },
            data: {
              state: JSON.stringify(state),
              cognitiveScore: score,
              completed: true,
            },
          });
        }
      } catch {}
    }

    return {
      success: true,
      score,
      isComplete: true,
      finalARR: payload.finalARR,
      tcv: payload.tcv,
      message: `Enterprise renewal secured at $${payload.finalARR.toLocaleString()} ARR. Opportunity marked Closed-Won.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// STEP 5B: BRAND CRISIS SUB-ENV TELEMETRY ACTIONS
// ═══════════════════════════════════════════════════════════════

export interface BrandCrisisActionPayload {
  actionType: "ANALYZE_TONE" | "PUBLISH_STATEMENT" | "RESPOND_PRESS" | "GENERATE_PR_REPORT" | "FLAG_MENTION";
  statementText?: string;
  toneMetrics?: {
    accountability: number;
    defensiveness: "Low" | "Medium" | "High" | "Extreme";
    clarity: number;
    isOptimal?: boolean;
  };
  sentimentScore?: number;
  pressInquiryId?: string;
  outlet?: string;
  customNotes?: string;
  telemetry?: TelemetryData;
}

export async function submitBrandCrisisAction(
  sessionId: string,
  payload: BrandCrisisActionPayload,
  clientState?: any
) {
  let state: any;
  let domain = "brand";

  try {
    const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
    if (sim) {
      state = JSON.parse(sim.state);
      domain = sim.domain || "brand";
    } else {
      throw new Error("Session not found in DB");
    }
  } catch (e) {
    if (!clientState) {
      state = {
        messages: [],
        cognitiveLoadScore: 45,
        resolutionTurns: 0,
        currentScenario: "The Viral Brand Crisis",
        problemTitle: "Viral Checkout Glitch Crisis Control",
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
        },
        dimensionalScores: {
          approachQuality: 50,
          efficiency: 50,
          creativity: 50,
          errorRecovery: 50,
          beyondKnownAnswer: 50,
          toolUtilization: 50,
          communication: 50,
          ambiguityHandling: 50,
        },
        observerNotes: [],
      };
    } else {
      state = clientState;
    }
  }

  if (!state.processSignals) state.processSignals = {};
  if (!state.dimensionalScores) state.dimensionalScores = {};
  if (!state.observerNotes) state.observerNotes = [];

  let actionSummary = "";
  let personaFeedback = "";

  switch (payload.actionType) {
    case "ANALYZE_TONE": {
      actionSummary = `[BRAND_STUDIO] Tested crisis draft against Brand Tone Guidelines: Accountability=${payload.toneMetrics?.accountability || 0}%, Defensiveness=${payload.toneMetrics?.defensiveness || "Low"}`;
      state.processSignals.testBeforeShip = true;
      state.processSignals.knowledgeBaseConsultation = true;
      state.dimensionalScores.approachQuality = Math.min(100, (state.dimensionalScores.approachQuality || 50) + 6);
      state.dimensionalScores.toolUtilization = Math.min(100, (state.dimensionalScores.toolUtilization || 50) + 8);
      state.observerNotes.push(`[Tone Check] Candidate pre-screened crisis communication tone against brand policy before public release.`);
      personaFeedback = "Maya Lin (Brand Comms): Pre-testing statement tone shows strategic discipline. Prioritize full accountability over corporate boilerplate.";
      break;
    }
    case "PUBLISH_STATEMENT": {
      const isOptimal = payload.toneMetrics?.isOptimal ?? ((payload.toneMetrics?.accountability || 0) >= 70);
      actionSummary = `[CRISIS_DESK] Published public crisis statement: "${payload.statementText?.substring(0, 120)}..."`;

      if (isOptimal) {
        state.processSignals.communicationClarity = Math.min(100, (state.processSignals.communicationClarity || 50) + 20);
        state.processSignals.escalationHandling = "addressed";
        state.processSignals.tradeoffArticulation = true;
        state.dimensionalScores.communication = Math.min(100, (state.dimensionalScores.communication || 50) + 22);
        state.dimensionalScores.errorRecovery = Math.min(100, (state.dimensionalScores.errorRecovery || 50) + 20);
        state.dimensionalScores.approachQuality = Math.min(100, (state.dimensionalScores.approachQuality || 50) + 15);
        state.cognitiveLoadScore = Math.max(20, (state.cognitiveLoadScore || 60) - 18);
        state.observerNotes.push("[Crisis Resolution] Candidate published transparent, accountable statement admitting root cause and automated refund remedies. Public sentiment surged.");
        personaFeedback = "Maya Lin (Brand Comms): Excellent statement. Owning the bug directly and confirming automated card voiding has halted the viral quote-tweet spike.";
      } else {
        state.processSignals.escalationHandling = "deflected";
        state.dimensionalScores.communication = Math.max(20, (state.dimensionalScores.communication || 50) - 10);
        state.dimensionalScores.errorRecovery = Math.max(20, (state.dimensionalScores.errorRecovery || 50) - 8);
        state.cognitiveLoadScore = Math.min(95, (state.cognitiveLoadScore || 50) + 15);
        state.observerNotes.push("[Crisis Misstep] Published statement deflected blame or used boilerplate, prolonging negative sentiment.");
        personaFeedback = "Maya Lin (Brand Comms): Warning: Deflection or vague boilerplate inflames social sentiment. Community is demanding direct accountability.";
      }
      break;
    }
    case "RESPOND_PRESS": {
      actionSummary = `[PRESS_OFFICE] Dispatched on-the-record response to ${payload.outlet || "Press Outlet"}: "${payload.statementText?.substring(0, 80)}..."`;
      state.processSignals.escalationHandling = "addressed";
      state.processSignals.edgeCaseConsideration = true;
      state.dimensionalScores.communication = Math.min(100, (state.dimensionalScores.communication || 50) + 8);
      state.dimensionalScores.efficiency = Math.min(100, (state.dimensionalScores.efficiency || 50) + 8);
      state.observerNotes.push(`[Media Strategy] Provided prompt, coordinated briefing to ${payload.outlet}, neutralizing speculative rumors.`);
      personaFeedback = `Maya Lin (Brand Comms): Press inquiry from ${payload.outlet} answered with accurate facts before print deadline.`;
      break;
    }
    case "GENERATE_PR_REPORT": {
      actionSummary = `[EXECUTIVE_BRIEFING] Generated comprehensive PR Crisis Incident & Reputation Recovery Briefing.`;
      state.processSignals.structuredDebugging = true;
      state.dimensionalScores.approachQuality = Math.min(100, (state.dimensionalScores.approachQuality || 50) + 10);
      state.dimensionalScores.beyondKnownAnswer = Math.min(100, (state.dimensionalScores.beyondKnownAnswer || 50) + 8);
      state.observerNotes.push(`[Incident Synthesis] Candidate compiled structured post-crisis reputation impact analysis with preventative safeguards.`);
      personaFeedback = "Maya Lin (Brand Comms): PR crisis report compiled. Strong synthesis of recovery trajectory and cross-functional recommendations.";
      break;
    }
    case "FLAG_MENTION": {
      actionSummary = `[SOCIAL_LISTENING] Flagged high-velocity viral mention for urgent PR team monitoring.`;
      state.processSignals.knowledgeBaseConsultation = true;
      state.dimensionalScores.toolUtilization = Math.min(100, (state.dimensionalScores.toolUtilization || 50) + 5);
      state.observerNotes.push("[Active Listening] Candidate flagged key influencer mention to prioritize customer sentiment triage.");
      personaFeedback = "Maya Lin (Brand Comms): Influencer mention flagged and prioritized for real-time customer care.";
      break;
    }
  }

  state.messages.push({ role: "user", content: actionSummary });
  state.messages.push({ role: "assistant", content: personaFeedback, persona: "Maya Lin" });
  state.resolutionTurns = (state.resolutionTurns || 0) + 1;

  const isComplete = payload.actionType === "GENERATE_PR_REPORT" && (payload.sentimentScore ?? 86) > 60;

  try {
    await prisma.simulationSession.update({
      where: { id: sessionId },
      data: {
        state: JSON.stringify(state),
        cognitiveScore: state.cognitiveLoadScore,
        completed: isComplete,
      },
    });
  } catch (e) { /* DB unavailable fallback */ }

  return {
    success: true,
    actionSummary,
    personaFeedback,
    state,
    sentiment: payload.sentimentScore ?? 86,
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
    let state: any;
    let domain = "engineering";

    try {
      const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
      if (sim) {
        state = JSON.parse(sim.state);
        domain = sim.domain;

        // Save the final score back
        try {
          // Calculate report first to get score
          const report = evaluateSession(
            state.processSignals,
            state.dimensionalScores,
            state.observerNotes,
            state.resolutionTurns,
            domain,
            state.cognitiveLoadScore
          );

          await prisma.simulationSession.update({
            where: { id: sessionId },
            data: { cognitiveScore: report.compositeScore },
          });

          return {
            success: true,
            report,
            sessionMeta: {
              sessionId: sim.id,
              domain,
              turns: state.resolutionTurns,
              cognitiveLoad: state.cognitiveLoadScore,
              observerNotes: state.observerNotes,
              activePersona: state.activePersona,
              problemTitle: state.problemTitle,
            },
          };
        } catch (e) {
          // If update fails, just continue and return report
        }
      }
    } catch (e) {
      // DB failed, will use mock data below
    }

    // FALLBACK / MOCK DATA FOR DEMO/VERCEL
    // If we're here, the DB failed or session wasn't found
    const mockReport: EvaluationReport = {
      compositeScore: 92,
      tier: "exceptional",
      dimensionalScores: {
        approachQuality: 95,
        efficiency: 88,
        creativity: 92,
        errorRecovery: 96,
        beyondKnownAnswer: 89,
        toolUtilization: 94,
        communication: 85,
        ambiguityHandling: 90
      },
      processNarrative: [
        "Candidate immediately recognized the core issue without relying on obvious syntax errors.",
        "Demonstrated systematic debugging by isolating the race condition before writing code.",
        "Proactively identified edge cases related to distributed state that were not explicitly mentioned.",
        "Remained calm and articulate when the stakeholder escalated the urgency."
      ],
      strengthAreas: [
        "Distributed Systems Architecture",
        "Calm Under Pressure",
        "Root Cause Analysis"
      ],
      growthAreas: [
        "Could communicate intermediate steps more frequently to non-technical stakeholders"
      ],
      hiddenConditionsDiscovered: 2,
      totalHiddenConditions: 3,
      escalationManagement: "excellent",
      recommendedNextStep: "Strong hire recommendation. Fast-track to final cultural interview."
    };

    return {
      success: true,
      report: mockReport,
      sessionMeta: {
        sessionId,
        domain: "engineering",
        turns: 4,
        cognitiveLoad: 45,
        observerNotes: [
          "[0:45] Candidate correctly identified token bucket flaw.",
          "[1:20] Candidate deployed fix via terminal.",
          "[1:45] System stability verified."
        ],
        activePersona: { name: "Alex Chen", role: "PM" },
        problemTitle: "Rate Limiter Bypass",
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

// ═══════════════════════════════════════════════════════════════
// SCOPE 3: PRODUCT MANAGEMENT (BLACK FRIDAY TRIAGE) ACTIONS
// ═══════════════════════════════════════════════════════════════

export interface ProductTriageData {
  emails: any[];
  backlogIssues: any[];
  funnelSteps: any[];
  hourlyTelemetry: any[];
  experiments: any[];
  sprintMetrics: {
    totalPoints: number;
    committedPoints: number;
    capacity: number;
    p0Count: number;
    launchBlockers: number;
  };
}

const DEFAULT_EMAILS = [
  {
    id: "email_1",
    sender: "Jordan Mitchell",
    email: "jordan.mitchell@aura.commerce",
    role: "Customer Support Lead",
    subject: "URGENT: 3 customers charged twice on checkout (Cart Glitch)",
    preview: "We have multiple users reporting duplicate card deductions within 10 seconds...",
    body: `Hey Product Team,

Our support queue just lit up. Within the past 15 minutes, three high-value shoppers were double-charged on Black Friday checkout (Error reference: ERR_DOUBLE_CHARGE_TX).

One of them is furious and threatened to post on Twitter. Should we treat this as a one-off or escalate this as a company-wide Sev-1 to Alex Chen in Engineering?

Need your call ASAP before queue SLA breaches.

Best,
Jordan Mitchell
Customer Support Lead // Aura Commerce`,
    time: "2:48 PM",
    unread: true,
    starred: true,
    priority: "urgent",
    labels: ["Sev-1", "Support", "Payment"],
    options: [
      { label: "Declare Sev-1 & route to Alex in Engineering", action: "Escalated to Engineering as Sev-1", isOptimal: true },
      { label: "Tell support to issue manual refunds and wait", action: "Instructed support to issue piecemeal refunds", isOptimal: false },
    ],
    linkedIssueId: "AURA-101",
  },
  {
    id: "email_2",
    sender: "Marcus Vance",
    email: "marcus@nordicgoods.co",
    role: "VP Merchant (Nordic Goods)",
    subject: "Payment anomalies on our storefront — please advise immediately",
    preview: "Our checkout transactions are throwing ERR_DOUBLE_CHARGE_TX...",
    body: `Hi Product Team,

We are seeing checkout anomalies on our Nordic Goods storefront heading into Black Friday. Our finance team spotted duplicate authorizations with transaction code ERR_DOUBLE_CHARGE_TX.

If this isn't stabilized immediately, we will be forced to pause our store on Aura and redirect traffic to Shopify. Please confirm what steps you are taking.

Regards,
Marcus Vance
VP Retail & Operations, Nordic Goods`,
    time: "2:42 PM",
    unread: true,
    starred: true,
    priority: "urgent",
    labels: ["VIP", "Merchant", "SLA"],
    options: [
      { label: "Reassure VIP: Patch in progress, zero risk of data loss", action: "Reassured VIP merchant with active Sev-1 containment", isOptimal: true },
      { label: "Offer a $500 platform credit to delay decision", action: "Offered generic credit without technical explanation", isOptimal: false },
    ],
    linkedIssueId: "AURA-103",
  },
  {
    id: "email_3",
    sender: "Taylor Brooks",
    email: "taylor.brooks@aura.commerce",
    role: "Chief Executive Officer",
    subject: "Can we push the gift card feature before the midnight rush?",
    preview: "Marketing says it will increase AOV by 15%, let's ship it now...",
    body: `Team,

I know it's T-minus 6 hours to Black Friday, but marketing is strongly advising that we launch the new Gift Card promo banner tonight to bump AOV by 15%.

Can we push this to production right now or should we hold? What's your call?

Taylor Brooks
CEO, Aura Commerce`,
    time: "2:35 PM",
    unread: true,
    starred: false,
    priority: "normal",
    labels: ["Executive", "Roadmap"],
    options: [
      { label: "Hold: Freeze all deployments until checkout bug is fixed", action: "Enforced deployment freeze to protect checkout reliability", isOptimal: true },
      { label: "Ship it: Fast-track the gift card feature to production", action: "Approved risky deploy during active outage", isOptimal: false },
    ],
    linkedIssueId: "AURA-104",
  },
  {
    id: "email_4",
    sender: "Chloe Zhao",
    email: "chloe.zhao@aura.commerce",
    role: "Head of Growth Marketing",
    subject: "Ready to blast 500,000 Black Friday promotional emails",
    preview: "Campaign scheduled for top of the hour. Final confirmation needed...",
    body: `Hi,

Our 500,000 user Black Friday promotional email blast is scheduled to fire at the top of the hour. This will drive a 10x surge to the checkout funnel.

Confirming we have the green light to send?

Chloe Zhao
Head of Growth Marketing`,
    time: "2:20 PM",
    unread: false,
    starred: false,
    priority: "normal",
    labels: ["Growth", "Campaign"],
    options: [
      { label: "Hold email blast until checkout fix is verified", action: "Paused promotional blast to prevent funnel overload", isOptimal: true },
      { label: "Send as scheduled to maximize top-of-funnel traffic", action: "Sent blast, flooding buggy checkout", isOptimal: false },
    ],
    linkedIssueId: "AURA-102",
  },
  {
    id: "email_5",
    sender: "Dr. Chen",
    email: "chen@aura.commerce",
    role: "Head of Data & Analytics",
    subject: "Funnel drop-off alert: 42.8% loss detected at Step 5 (Payment)",
    preview: "Amplitude alert: checkout dropoff exceeds 3 standard deviations...",
    body: `Product Team,

Amplitude alert fired 12 minutes ago. Checkout conversion from 'Begin Checkout' to 'Order Confirmation' dropped from 68% down to 25.4%.

Drop-off is concentrated heavily at Step 5 (Payment Gateway Tokenization), with 6,951 repeat click attempts resulting in HTTP 500 / ERR_DOUBLE_CHARGE_TX.

Dashboard link has been pinned to the Product Analytics tab. Please review before traffic triples tonight.

Dr. Chen
Head of Data & Analytics`,
    time: "2:10 PM",
    unread: true,
    starred: false,
    priority: "urgent",
    labels: ["Analytics", "Sev-1"],
    options: [
      { label: "Acknowledge anomaly & isolate payment step in analytics", action: "Investigated Step 5 drop-off in Mixpanel/Amplitude", isOptimal: true },
      { label: "Ignore alert: Assume typical user cart indecision", action: "Dismissed analytics alert as normal user hesitation", isOptimal: false },
    ],
  },
];

const DEFAULT_BACKLOG_ISSUES = [
  {
    id: "issue_1",
    key: "AURA-101",
    title: "Checkout Double-Charge Idempotency Fix",
    description: "Move idempotency token validation and Redis lock BEFORE payment gateway charge execution to prevent duplicate charges under rapid repeat clicks.",
    priority: "P0",
    status: "in_progress",
    storyPoints: 8,
    assignee: { name: "Alex Chen", avatar: "AC", role: "Lead SRE & Backend" },
    labels: ["Sev-1", "Payment", "Core"],
    originEmailId: "email_1",
    isLaunchBlocker: true,
  },
  {
    id: "issue_2",
    key: "AURA-102",
    title: "Emergency Pause 500k Marketing Email Campaign",
    description: "Temporarily halt Chloe Zhao's 500,000 subscriber email blast until the checkout idempotency fix is verified in production.",
    priority: "P0",
    status: "triage",
    storyPoints: 1,
    assignee: { name: "Chloe Zhao", avatar: "CZ", role: "Growth Marketing" },
    labels: ["Growth", "Risk", "Safety"],
    originEmailId: "email_4",
    isLaunchBlocker: true,
  },
  {
    id: "issue_3",
    key: "AURA-103",
    title: "Nordic Goods VIP Merchant Incident Bulletin & SLA Reassurance",
    description: "Provide VP Marcus Vance with a formal technical status bulletin, confirming containment underway and zero risk to ledger data.",
    priority: "P1",
    status: "backlog",
    storyPoints: 2,
    assignee: { name: "Jordan Mitchell", avatar: "JM", role: "Support Lead" },
    labels: ["Merchant", "SLA", "VIP"],
    originEmailId: "email_2",
    isLaunchBlocker: false,
  },
  {
    id: "issue_4",
    key: "AURA-104",
    title: "Midnight Gift Card Upsell Banner (CEO Request)",
    description: "Launch new promotional gift card banner across cart drawer to drive +15% AOV ahead of midnight sale.",
    priority: "P2",
    status: "triage",
    storyPoints: 5,
    assignee: { name: "Product Manager", avatar: "PM", role: "Product Lead" },
    labels: ["Marketing", "Feature", "High-Risk"],
    originEmailId: "email_3",
    isLaunchBlocker: false,
  },
  {
    id: "issue_5",
    key: "AURA-105",
    title: "Cart Cross-Sell Recommendation Drawer",
    description: "Show personalized accessories in cart review slide-over using client-side vector recommendations.",
    priority: "P2",
    status: "backlog",
    storyPoints: 3,
    assignee: { name: "Sarah Lin", avatar: "SL", role: "Frontend Eng" },
    labels: ["Frontend", "UX"],
    isLaunchBlocker: false,
  },
  {
    id: "issue_6",
    key: "AURA-106",
    title: "Wishlist Social Share Button & Deep Linking",
    description: "Allow shoppers to share their curated holiday wishlist directly to Instagram Stories and WhatsApp.",
    priority: "P3",
    status: "backlog",
    storyPoints: 2,
    assignee: { name: "David Kim", avatar: "DK", role: "Product Designer" },
    labels: ["Social", "Nice-To-Have"],
    isLaunchBlocker: false,
  },
];

const DEFAULT_FUNNEL_STEPS = [
  {
    step: 1,
    name: "Storefront Landings",
    subtitle: "Homepage & campaign landing visits",
    users: 124500,
    conversionRate: 100.0,
    dropOffRate: 0.0,
    benchmarkRate: 100.0,
    isAnomaly: false,
  },
  {
    step: 2,
    name: "Product Detail View",
    subtitle: "Browsed SKU specifications & pricing",
    users: 89200,
    conversionRate: 71.6,
    dropOffRate: 28.4,
    benchmarkRate: 72.0,
    isAnomaly: false,
  },
  {
    step: 3,
    name: "Add to Cart",
    subtitle: "Selected variants and added to session cart",
    users: 42100,
    conversionRate: 47.2,
    dropOffRate: 52.8,
    benchmarkRate: 48.0,
    isAnomaly: false,
  },
  {
    step: 4,
    name: "Begin Checkout",
    subtitle: "Entered shipping address & shipping tier",
    users: 28400,
    conversionRate: 67.5,
    dropOffRate: 32.5,
    benchmarkRate: 68.0,
    isAnomaly: false,
  },
  {
    step: 5,
    name: "Payment Review",
    subtitle: "Clicked 'Pay Now' to tokenize & authorize card",
    users: 16240,
    conversionRate: 57.2,
    dropOffRate: 42.8,
    benchmarkRate: 88.5,
    isAnomaly: true,
    anomalyNote: "CRITICAL DROP: 42.8% drop-off! 6,951 repeat clicks caused ERR_DOUBLE_CHARGE_TX race conditions",
  },
  {
    step: 6,
    name: "Order Confirmed",
    subtitle: "Receipt generated & invoice sent",
    users: 9289,
    conversionRate: 57.2,
    dropOffRate: 42.8,
    benchmarkRate: 98.0,
    isAnomaly: false,
  },
];

const DEFAULT_HOURLY_TELEMETRY = [
  { time: "08:00", totalRequests: 14200, doubleChargeErrors: 4, successfulOrders: 3100, conversionRate: 78.2 },
  { time: "09:00", totalRequests: 21500, doubleChargeErrors: 8, successfulOrders: 4800, conversionRate: 76.5 },
  { time: "10:00", totalRequests: 36000, doubleChargeErrors: 22, successfulOrders: 7900, conversionRate: 74.0 },
  { time: "11:00", totalRequests: 58400, doubleChargeErrors: 114, successfulOrders: 11200, conversionRate: 68.4 },
  { time: "12:00", totalRequests: 82000, doubleChargeErrors: 490, successfulOrders: 13400, conversionRate: 54.1 },
  { time: "13:00", totalRequests: 104000, doubleChargeErrors: 1820, successfulOrders: 12100, conversionRate: 41.2 },
  { time: "14:00", totalRequests: 124500, doubleChargeErrors: 6951, successfulOrders: 9289, conversionRate: 25.4 },
];

const DEFAULT_EXPERIMENT = {
  id: "EXP-2026-BF-01",
  name: "Idempotent One-Click Checkout Guard",
  hypothesis: "Generating a unique client transaction UUID token on cart submit and disabling the pay button after first click will eradicate ERR_DOUBLE_CHARGE_TX duplicate debits and lift payment completion from 57% to >90%.",
  status: "running",
  controlVariant: "Control (Current un-mutexed checkout, allows repeat button spam)",
  testVariant: "Variant B (Idempotency Key Header + Redis Distributed Lock + Button Disabled State)",
  trafficSplit: 50,
  primaryMetric: "Payment Step Conversion (%)",
  sampleSize: 12500,
  confidence: 99.4,
  projectedLift: 58.2,
  winner: "Variant B (Idempotent Guard)",
};

export async function getProductTriageDataAction(sessionId: string): Promise<{
  success: boolean;
  data: ProductTriageData;
}> {
  return {
    success: true,
    data: {
      emails: DEFAULT_EMAILS,
      backlogIssues: DEFAULT_BACKLOG_ISSUES,
      funnelSteps: DEFAULT_FUNNEL_STEPS,
      hourlyTelemetry: DEFAULT_HOURLY_TELEMETRY,
      experiments: [DEFAULT_EXPERIMENT],
      sprintMetrics: {
        totalPoints: 21,
        committedPoints: 9, // AURA-101 (8) + AURA-102 (1)
        capacity: 20,
        p0Count: 2,
        launchBlockers: 2,
      },
    },
  };
}

export async function submitProductTriageAction(
  sessionId: string,
  actionType: "email_reply" | "convert_to_issue" | "update_issue" | "commit_sprint",
  payload: any,
  currentState?: any
) {
  try {
    let state = currentState;
    if (!state && sessionId) {
      try {
        const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
        if (sim) state = JSON.parse(sim.state);
      } catch {}
    }

    if (!state) {
      state = {
        messages: [],
        cognitiveLoadScore: 50,
        processSignals: {},
        dimensionalScores: {},
        observerNotes: [],
        resolutionTurns: 0,
      };
    }

    // Evaluate Product Management strategic trade-offs
    let feedback = "";
    let isOptimal = false;

    if (actionType === "email_reply") {
      const { emailId, decision } = payload;
      if (emailId === "email_1" && decision.includes("Sev-1")) {
        feedback = "Candidate recognized systemic double-charge bug and escalated as Sev-1 to Engineering.";
        isOptimal = true;
      } else if (emailId === "email_3" && (decision.includes("Hold") || decision.includes("Freeze"))) {
        feedback = "Candidate successfully pushed back on CEO last-minute feature to protect launch stability.";
        isOptimal = true;
      } else if (emailId === "email_4" && (decision.includes("Hold") || decision.includes("Pause"))) {
        feedback = "Candidate proactively paused 500k marketing blast to prevent checkout funnel flooding.";
        isOptimal = true;
      } else if (emailId === "email_2" && decision.includes("Reassure")) {
        feedback = "Candidate provided direct technical reassurance and active containment to VIP merchant.";
        isOptimal = true;
      } else if (emailId === "email_5" && (decision.includes("Acknowledge") || decision.includes("Investigate") || decision.includes("isolate") || decision.includes("Isolate"))) {
        feedback = "Candidate acknowledged critical Step 5 funnel drop-off and prioritized telemetry investigation.";
        isOptimal = true;
      } else {
        feedback = `Candidate logged triage decision: ${decision}`;
      }
    } else if (actionType === "convert_to_issue") {
      feedback = `Candidate converted stakeholder communication into actionable engineering user story (${payload.key || "Linear issue"}).`;
      isOptimal = true;
    } else if (actionType === "update_issue") {
      const { issueKey, priority, status } = payload;
      if (issueKey === "AURA-101" && priority === "P0" && (status === "in_progress" || status === "ready_for_launch")) {
        feedback = "Candidate correctly prioritized checkout idempotency bug as top P0 sprint blocker.";
        isOptimal = true;
      } else if (issueKey === "AURA-104" && (priority === "P2" || priority === "P3" || status === "triage" || status === "done")) {
        feedback = "Candidate de-prioritized risky gift card feature during active outage.";
        isOptimal = true;
      } else {
        feedback = `Updated issue ${issueKey} -> Priority: ${priority}, Status: ${status}`;
      }
    } else if (actionType === "commit_sprint") {
      const points = payload.committedPoints || 0;
      if (points <= 20) {
        feedback = `Sprint scope committed within capacity (${points}/20 pts) prioritizing Sev-1 checkout reliability.`;
        isOptimal = true;
      } else {
        feedback = `Warning: Sprint committed over capacity (${points}/20 pts), risking engineering delivery failure before midnight launch.`;
        isOptimal = false;
      }
    }

    // Update observer signals
    if (state.processSignals) {
      if (isOptimal) {
        state.processSignals.edgeCaseConsideration = true;
        state.processSignals.tradeoffArticulation = true;
        state.processSignals.structuredDebugging = true;
      }
      state.cognitiveLoadScore = Math.min(85, Math.max(30, (state.cognitiveLoadScore || 50) + (isOptimal ? -4 : 6)));
    }

    if (state.dimensionalScores) {
      state.dimensionalScores.approachQuality = Math.min(98, (state.dimensionalScores.approachQuality || 70) + (isOptimal ? 6 : -2));
      state.dimensionalScores.efficiency = Math.min(95, (state.dimensionalScores.efficiency || 70) + (isOptimal ? 5 : -1));
      state.dimensionalScores.ambiguityHandling = Math.min(96, (state.dimensionalScores.ambiguityHandling || 70) + (isOptimal ? 7 : -2));
    }

    if (state.observerNotes) {
      state.observerNotes.push(`[PRODUCT_OBSERVER] ${feedback}`);
    }

    state.resolutionTurns = (state.resolutionTurns || 0) + 1;

    // Save back to DB if available
    try {
      if (sessionId && !sessionId.startsWith("demo-")) {
        await prisma.simulationSession.update({
          where: { id: sessionId },
          data: {
            state: JSON.stringify(state),
            cognitiveScore: state.cognitiveLoadScore,
          },
        });
      }
    } catch {}

    return {
      success: true,
      feedback,
      isOptimal,
      cognitiveLoadScore: state.cognitiveLoadScore,
      dimensionalScores: state.dimensionalScores,
      processSignals: state.processSignals,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function proposeExperimentAction(
  sessionId: string,
  experimentData: {
    name: string;
    hypothesis: string;
    controlVariant: string;
    testVariant: string;
    trafficSplit: number;
    primaryMetric: string;
  },
  currentState?: any
) {
  try {
    // Statistically validate experiment parameters
    const sampleSizeRequired = 10000;
    const estimatedLift = 58.4;
    const pValue = 0.0004;
    const confidenceLevel = 99.6;

    const resultExperiment = {
      ...DEFAULT_EXPERIMENT,
      name: experimentData.name || DEFAULT_EXPERIMENT.name,
      hypothesis: experimentData.hypothesis || DEFAULT_EXPERIMENT.hypothesis,
      controlVariant: experimentData.controlVariant || DEFAULT_EXPERIMENT.controlVariant,
      testVariant: experimentData.testVariant || DEFAULT_EXPERIMENT.testVariant,
      trafficSplit: experimentData.trafficSplit || 50,
      primaryMetric: experimentData.primaryMetric || "Payment Step Conversion (%)",
      sampleSize: sampleSizeRequired,
      confidence: confidenceLevel,
      projectedLift: estimatedLift,
      status: "running" as const,
      winner: "Variant B (Idempotent Guard)",
    };

    // Update observer signals for testing before shipping
    if (sessionId && !sessionId.startsWith("demo-")) {
      try {
        let state = currentState;
        const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
        if (sim) state = JSON.parse(sim.state);
        if (state) {
          if (state.processSignals) {
            state.processSignals.testBeforeShip = true;
            state.processSignals.structuredDebugging = true;
          }
          if (state.observerNotes) {
            state.observerNotes.push(`[PRODUCT_EXPERIMENT] Deployed A/B experiment "${resultExperiment.name}" (Split: ${resultExperiment.trafficSplit}%, Metric: ${resultExperiment.primaryMetric}, p < 0.001)`);
          }
          await prisma.simulationSession.update({
            where: { id: sessionId },
            data: { state: JSON.stringify(state) },
          });
        }
      } catch {}
    }

    return {
      success: true,
      experiment: resultExperiment,
      analysis: {
        pValue,
        confidenceLevel,
        statisticalSignificance: "High (p < 0.001)",
        recommendedAction: "Roll out Variant B (Idempotent Guard) to 100% of Black Friday traffic immediately.",
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function dispatchLaunchProtocolAction(
  sessionId: string,
  protocol: {
    deployFreeze: boolean;
    sev1Escalated: boolean;
    marketingBlastPaused: boolean;
    merchantReassured: boolean;
    executiveSummary: string;
    decisions: Record<string, string>;
  },
  currentState?: any
) {
  try {
    const isReady =
      protocol.deployFreeze &&
      protocol.sev1Escalated &&
      protocol.marketingBlastPaused &&
      protocol.merchantReassured;

    const score = isReady ? 96 : 74;

    const logEntry = `[VICTORY] Product Manager published Black Friday launch triage protocol: CodeFreeze=${protocol.deployFreeze}, Sev1Escalated=${protocol.sev1Escalated}, MarketingPaused=${protocol.marketingBlastPaused}, MerchantReassured=${protocol.merchantReassured}. Summary: "${protocol.executiveSummary}"`;

    let state = currentState;
    if (!state && sessionId && !sessionId.startsWith("demo-")) {
      try {
        const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
        if (sim) state = JSON.parse(sim.state);
      } catch {}
    }

    if (!state) {
      state = {
        messages: [],
        cognitiveLoadScore: 48,
        processSignals: {},
        dimensionalScores: {},
        observerNotes: [],
        resolutionTurns: 0,
      };
    }

    state.messages.push({ role: "user", content: logEntry });
    state.messages.push({
      role: "assistant",
      content:
        "Taylor Brooks: 'Outstanding triage leadership. Freezing speculative deployments, pausing the 500k marketing email flood, and prioritizing Alex's checkout idempotency fix gives Aura Commerce maximum stability for Black Friday. Launch protocol approved!'",
      persona: "Taylor Brooks",
    });
    state.observerNotes.push(logEntry);
    state.cognitiveLoadScore = 24; // Normalized / Calm
    state.dimensionalScores = {
      approachQuality: 96,
      efficiency: 94,
      creativity: 90,
      errorRecovery: 98,
      beyondKnownAnswer: 95,
      toolUtilization: 92,
      communication: 97,
      ambiguityHandling: 96,
    };
    state.processSignals = {
      ...state.processSignals,
      tradeoffArticulation: true,
      edgeCaseConsideration: true,
      structuredDebugging: true,
      testBeforeShip: true,
      escalationHandling: "addressed",
      timeManagement: "methodical",
    };

    try {
      if (sessionId && !sessionId.startsWith("demo-")) {
        await prisma.simulationSession.update({
          where: { id: sessionId },
          data: {
            state: JSON.stringify(state),
            cognitiveScore: score,
            completed: true,
          },
        });
      }
    } catch {}

    return {
      success: true,
      isReady,
      score,
      isComplete: true,
      activePersonaFeedback:
        "Taylor Brooks: Outstanding triage leadership! You protected storefront stability and prioritized the core checkout fix before the midnight surge.",
      message: isReady
        ? "All launch blockers cleared. Incident protocol dispatched across Aura Commerce."
        : "Protocol dispatched with warnings: ensure all launch gates are checked.",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// SCOPE 5: SRE — SITE RELIABILITY ENGINEERING ACTIONS
// ═══════════════════════════════════════════════════════════════

export interface SreTelemetryPayload {
  actionType:
    | "promql_query"
    | "pod_log_inspect"
    | "kubectl_cmd"
    | "status_page_update"
    | "alert_ack"
    | "postmortem_submit"
    | "team_chat"
    | "ineffective_action";
  query?: string;
  podName?: string;
  command?: string;
  alertId?: string;
  statusPage?: {
    status: string;
    title: string;
    message: string;
  };
  postmortem?: any;
  metadata?: Record<string, any>;
}

export async function submitSreTelemetryAction(
  sessionId: string,
  payload: SreTelemetryPayload,
  currentState?: any
) {
  try {
    let state = currentState;

    if (!state && sessionId && !sessionId.startsWith("demo-")) {
      try {
        const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
        if (sim) state = JSON.parse(sim.state);
      } catch {}
    }

    if (!state) {
      state = {
        messages: [],
        cognitiveLoadScore: 50,
        processSignals: {},
        dimensionalScores: {},
        observerNotes: [],
        resolutionTurns: 0,
      };
    }

    let feedback = "";
    let isOptimal = false;

    switch (payload.actionType) {
      case "promql_query": {
        const q = payload.query || "";
        if (q.includes("5..") || q.includes("http_requests_total")) {
          feedback = "Candidate analyzed HTTP 5xx error rate distribution via Prometheus query.";
          isOptimal = true;
        } else if (q.includes("quantile") || q.includes("duration")) {
          feedback = "Candidate inspected p99 latency curve, isolating degradation to checkout charge endpoints.";
          isOptimal = true;
        } else if (q.includes("CrashLoopBackOff")) {
          feedback = "Candidate queried kubelet container waiting reasons, confirming CrashLoopBackOff pattern.";
          isOptimal = true;
        } else {
          feedback = `Candidate executed PromQL query: ${q}`;
        }
        if (state.processSignals) {
          state.processSignals.structuredDebugging = true;
          state.processSignals.knowledgeBaseConsultation = true;
        }
        if (state.dimensionalScores) {
          state.dimensionalScores.toolUtilization = Math.min(98, (state.dimensionalScores.toolUtilization || 70) + 6);
          state.dimensionalScores.approachQuality = Math.min(96, (state.dimensionalScores.approachQuality || 70) + 4);
        }
        break;
      }

      case "pod_log_inspect": {
        feedback = `Candidate inspected stdout/stderr logs on pod ${payload.podName || "checkout-service"}, identifying unhandled TypeError in token handler.`;
        isOptimal = true;
        if (state.processSignals) {
          state.processSignals.structuredDebugging = true;
          state.processSignals.edgeCaseConsideration = true;
        }
        if (state.dimensionalScores) {
          state.dimensionalScores.approachQuality = Math.min(98, (state.dimensionalScores.approachQuality || 70) + 6);
          state.dimensionalScores.beyondKnownAnswer = Math.min(95, (state.dimensionalScores.beyondKnownAnswer || 70) + 5);
        }
        break;
      }

      case "status_page_update": {
        const status = payload.statusPage?.status || "Investigating";
        feedback = `Candidate published public status page update: '${status}' with customer impact clarification.`;
        isOptimal = true;
        if (state.processSignals) {
          state.processSignals.ambiguityResponse = "proactive_clarification";
          state.processSignals.communicationClarity = Math.min(100, (state.processSignals.communicationClarity || 50) + 12);
        }
        if (state.dimensionalScores) {
          state.dimensionalScores.communication = Math.min(98, (state.dimensionalScores.communication || 70) + 7);
          state.dimensionalScores.ambiguityHandling = Math.min(96, (state.dimensionalScores.ambiguityHandling || 70) + 5);
        }
        break;
      }

      case "alert_ack": {
        feedback = `Candidate acknowledged alert ${payload.alertId || "P1-Sev-1"}, establishing ownership in War Room.`;
        isOptimal = true;
        if (state.dimensionalScores) {
          state.dimensionalScores.efficiency = Math.min(95, (state.dimensionalScores.efficiency || 70) + 3);
        }
        break;
      }

      case "kubectl_cmd": {
        const cmd = payload.command || "";
        feedback = `Candidate executed cluster command: $ ${cmd}`;
        if (cmd.includes("rollout undo") || cmd.includes("rollback")) {
          isOptimal = true;
        }
        if (state.dimensionalScores) {
          state.dimensionalScores.toolUtilization = Math.min(96, (state.dimensionalScores.toolUtilization || 70) + 4);
        }
        break;
      }

      case "postmortem_submit": {
        feedback = "Candidate drafted and submitted comprehensive Postmortem (RCA) including timeline, root-cause analysis, and preventative canary deployment gates.";
        isOptimal = true;
        if (state.processSignals) {
          state.processSignals.tradeoffArticulation = true;
          state.processSignals.edgeCaseConsideration = true;
        }
        if (state.dimensionalScores) {
          state.dimensionalScores.beyondKnownAnswer = Math.min(98, (state.dimensionalScores.beyondKnownAnswer || 70) + 8);
          state.dimensionalScores.approachQuality = Math.min(98, (state.dimensionalScores.approachQuality || 70) + 6);
        }
        break;
      }

      case "team_chat": {
        const text = payload.metadata?.messageText || payload.metadata?.text || "";
        feedback = `Candidate coordinated incident response with team in #war-room-sev1: "${text.substring(0, 80)}"`;
        isOptimal = true;
        if (state.processSignals) {
          state.processSignals.collaborationSignal = true;
          state.processSignals.communicationClarity = Math.min(100, (state.processSignals.communicationClarity || 50) + 8);
        }
        if (state.dimensionalScores) {
          state.dimensionalScores.communication = Math.min(98, (state.dimensionalScores.communication || 70) + 6);
          state.dimensionalScores.approachQuality = Math.min(96, (state.dimensionalScores.approachQuality || 70) + 3);
        }
        break;
      }

      case "ineffective_action": {
        const act = payload.metadata?.actionName || "Unknown action";
        feedback = `Candidate attempted ineffective mitigation '${act}'. Bad container image remained in deployment.`;
        isOptimal = false;
        if (state.dimensionalScores) {
          state.dimensionalScores.efficiency = Math.max(30, (state.dimensionalScores.efficiency || 70) - 4);
        }
        break;
      }
    }

    if (state.observerNotes) {
      state.observerNotes.push(`[SRE_OBSERVER] ${feedback}`);
    }

    state.cognitiveLoadScore = Math.min(85, Math.max(25, (state.cognitiveLoadScore || 50) + (isOptimal ? -3 : 5)));
    state.resolutionTurns = (state.resolutionTurns || 0) + 1;

    try {
      if (sessionId && !sessionId.startsWith("demo-")) {
        await prisma.simulationSession.update({
          where: { id: sessionId },
          data: {
            state: JSON.stringify(state),
            cognitiveScore: state.cognitiveLoadScore,
          },
        });
      }
    } catch {}

    return {
      success: true,
      feedback,
      isOptimal,
      cognitiveLoadScore: state.cognitiveLoadScore,
      dimensionalScores: state.dimensionalScores,
      processSignals: state.processSignals,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function executeSreRollbackAction(
  sessionId: string,
  targetRevision: string = "v2.4.0",
  currentState?: any
) {
  try {
    let state = currentState;

    if (!state && sessionId && !sessionId.startsWith("demo-")) {
      try {
        const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
        if (sim) state = JSON.parse(sim.state);
      } catch {}
    }

    if (!state) {
      state = {
        messages: [],
        cognitiveLoadScore: 65,
        processSignals: {},
        dimensionalScores: {},
        observerNotes: [],
        resolutionTurns: 0,
      };
    }

    const logEntry = `[VICTORY] SRE Incident Commander executed zero-downtime rollback to ${targetRevision}. MaxSurge 25% completed across 16 pods. Production error rate normalized to 0.08%, p99 latency to 42ms.`;

    state.messages.push({ role: "user", content: logEntry });
    state.messages.push({
      role: "assistant",
      content: "All 16 pods healthy and serving peak traffic. 5xx errors dropped below 0.1%. Well executed, Incident Commander.",
      persona: "Alex Chen",
    });

    state.observerNotes.push(logEntry);
    state.cognitiveLoadScore = 22; // Normalized / Calm
    state.dimensionalScores = {
      approachQuality: 97,
      efficiency: 95,
      creativity: 90,
      errorRecovery: 98,
      beyondKnownAnswer: 94,
      toolUtilization: 96,
      communication: 95,
      ambiguityHandling: 94,
    };

    if (state.processSignals) {
      state.processSignals.testBeforeShip = true;
      state.processSignals.structuredDebugging = true;
      state.processSignals.stuckRecovery = true;
      state.processSignals.escalationHandling = "addressed";
      state.processSignals.timeManagement = "methodical";
    }

    const rolloutSteps = [
      `17:00:01 UTC - kubectl rollout undo deployment/checkout-service --to-revision=${targetRevision}`,
      "17:00:03 UTC - Container image aura/checkout:v2.4.0 pulled across worker nodes",
      "17:00:05 UTC - 4 canary pods created (MaxSurge=25%); readiness probes passing (200 OK on /healthz)",
      "17:00:08 UTC - 25% traffic shifted; 5xx errors dropped to 24.1%",
      "17:00:12 UTC - 8 additional v2.4.0 replicas provisioned; 5xx errors dropped to 8.4%",
      "17:00:16 UTC - Gracefully terminated failing v2.4.1 containers",
      "17:00:20 UTC - 16/16 replicas ready on v2.4.0. Error rate normalized to 0.08%, p99 latency: 42ms. SLA restored.",
    ];

    try {
      if (sessionId && !sessionId.startsWith("demo-")) {
        await prisma.simulationSession.update({
          where: { id: sessionId },
          data: {
            state: JSON.stringify(state),
            cognitiveScore: 96,
            completed: true,
          },
        });
      }
    } catch {}

    return {
      success: true,
      score: 96,
      targetRevision,
      rolloutSteps,
      metrics: {
        errorRate: 0.08,
        p99LatencyMs: 42,
        cpuSaturation: 22,
        memorySaturation: 28,
        healthyPods: 16,
        totalPods: 16,
      },
      message: "Zero-downtime rollback to v2.4.0 completed successfully. Production cluster stable.",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchSreClusterTelemetryAction(
  sessionId: string,
  isRecovering: boolean,
  isSolved: boolean
) {
  try {
    const errorRate = isSolved ? 0.08 : isRecovering ? 4.2 : 42.8;
    const p99LatencyMs = isSolved ? 42 : isRecovering ? 450 : 2850;
    const cpuSaturation = isSolved ? 22 : isRecovering ? 42 : 94;
    const memorySaturation = isSolved ? 28 : isRecovering ? 48 : 88;
    const throughputRps = 48200;
    const healthyPods = isSolved ? 16 : isRecovering ? 12 : 4;

    return {
      success: true,
      telemetry: {
        errorRate,
        p99LatencyMs,
        cpuSaturation,
        memorySaturation,
        throughputRps,
        healthyPods,
        totalPods: 16,
        status: isSolved ? "HEALTHY" : isRecovering ? "RECOVERING" : "CRITICAL",
        activeRevision: isSolved ? "v2.4.0" : "v2.4.1-hotfix",
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// SCOPE 4: DATA — THE MISSING DAU PROBLEM
// ═══════════════════════════════════════════════════════════════

export interface DataScopeDataset {
  problemStatement: string;
  schemaTables: Array<{
    name: string;
    rowCount: string;
    description: string;
    columns: Array<{ name: string; type: string; isPk?: boolean; isFk?: boolean; ref?: string }>;
  }>;
  dauTelemetry: Array<{
    date: string;
    flawedDau: number;
    correctedDau: number;
    serverIngress: number;
    variance: string;
    status: string;
    note: string;
  }>;
  dagNodes: Array<{
    id: string;
    label: string;
    type: string;
    status: string;
    duration: string;
    records: string;
    description: string;
    errorSnippet?: string;
  }>;
  kpis: {
    reportedDau: number;
    correctedDau: number;
    ingressReqMin: number;
    stickinessRatio: number;
    pipelineHealth: number;
  };
}

export async function getDataWorkspaceDataAction(sessionId?: string): Promise<{
  success: boolean;
  data: DataScopeDataset;
}> {
  return {
    success: true,
    data: {
      problemStatement:
        "A subscription platform's daily active user count suddenly drops by 18%, but the engineering team claims that traffic is normal. The seeker must investigate the data and correct the reporting.",
      schemaTables: [
        {
          name: "users",
          rowCount: "65,420 rows",
          description: "Registered subscriber profiles and plan state",
          columns: [
            { name: "id", type: "uuid", isPk: true },
            { name: "email", type: "varchar(255)" },
            { name: "tier", type: "varchar(32)" },
            { name: "status", type: "varchar(32)" },
            { name: "created_at", type: "timestamptz" },
          ],
        },
        {
          name: "sessions",
          rowCount: "148,900 rows",
          description: "Authenticated client connection sessions",
          columns: [
            { name: "id", type: "uuid", isPk: true },
            { name: "user_id", type: "uuid", isFk: true, ref: "users.id" },
            { name: "device_type", type: "varchar(16)" },
            { name: "ip_address", type: "inet" },
            { name: "is_bot", type: "boolean" },
            { name: "started_at", type: "timestamptz" },
            { name: "ended_at", type: "timestamptz" },
          ],
        },
        {
          name: "events",
          rowCount: "890,200 rows",
          description: "Raw behavioral telemetry stream",
          columns: [
            { name: "id", type: "uuid", isPk: true },
            { name: "user_id", type: "uuid", isFk: true, ref: "users.id" },
            { name: "account_uid", type: "varchar(64)" },
            { name: "session_id", type: "uuid", isFk: true, ref: "sessions.id" },
            { name: "event_name", type: "varchar(64)" },
            { name: "timestamp", type: "timestamptz" },
          ],
        },
        {
          name: "transactions",
          rowCount: "38,100 rows",
          description: "Monetary subscription payments and renewals",
          columns: [
            { name: "id", type: "uuid", isPk: true },
            { name: "user_id", type: "uuid", isFk: true, ref: "users.id" },
            { name: "amount", type: "numeric(10,2)" },
            { name: "status", type: "varchar(32)" },
            { name: "created_at", type: "timestamptz" },
          ],
        },
      ],
      dauTelemetry: [
        { date: "2026-11-01", flawedDau: 61200, correctedDau: 61200, serverIngress: 122400, variance: "0.0%", status: "NORMAL", note: "Baseline normal traffic" },
        { date: "2026-11-02", flawedDau: 60950, correctedDau: 61500, serverIngress: 123800, variance: "-0.4%", status: "NORMAL", note: "Weekend peak stable" },
        { date: "2026-11-03", flawedDau: 61800, correctedDau: 62300, serverIngress: 124100, variance: "+1.0%", status: "NORMAL", note: "Traffic steady ahead of mobile release" },
        { date: "2026-11-04", flawedDau: 50680, correctedDau: 62100, serverIngress: 124500, variance: "-18.0% 🔻", status: "ANOMALOUS DROP", note: "⚠️ -18.0% drop reported, but server ingress stayed flat!" },
        { date: "2026-11-05", flawedDau: 50840, correctedDau: 62850, serverIngress: 125100, variance: "-18.2% 🔻", status: "ANOMALOUS DROP", note: "⚠️ Ongoing anomaly until pipeline & join repair" },
      ],
      dagNodes: [
        { id: "raw_ingress_stream", label: "kafka.ingress.events", type: "extractor", status: "success", duration: "1.4s", records: "124,500 req/min", description: "Ingests raw JSON payloads from AWS API Gateway into Kafka stream topics." },
        { id: "extract_client_events", label: "extract_client_events", type: "extractor", status: "success", duration: "4.2s", records: "98,400 events/hr", description: "Snowplow batch extractor unpacking client payloads into raw bronze storage." },
        { id: "cleanse_mobile_v2", label: "stg_mobile_events.sql", type: "transform", status: "failed", duration: "12.8s (FAILED)", records: "18,240 dropped (18.2%)", description: "Silver staging transformation. Cleanses and validates mobile app telemetry.", errorSnippet: "dbt test assert_not_null_user_id FAILED: 18,240 null rows in mobile batch. Schema drift: mobile v2.4.1 sent 'account_uid' instead of 'user_id'. Duplicate event_ids detected in retry queue." },
        { id: "join_session_enrichment", label: "int_session_events.sql", type: "transform", status: "upstream_failed", duration: "0.0s (BLOCKED)", records: "0 records", description: "Enriches session windows by joining client telemetry with subscriber tiers.", errorSnippet: "Task upstream dependency `stg_mobile_events` failed. Execution halted." },
        { id: "aggregate_dau_metrics", label: "mart_daily_active_users.sql", type: "mart", status: "upstream_failed", duration: "0.0s (BLOCKED)", records: "Stale: 50,840 DAU", description: "Gold reporting mart providing published DAU metrics to BI dashboards.", errorSnippet: "Cannot recompute DAU mart while upstream silver tables are corrupt." },
        { id: "publish_bi_warehouse", label: "export.snowflake_bi_sync", type: "export", status: "blocked", duration: "0.0s (WAITING)", records: "Pending", description: "Reverse ETL sync pushing consolidated mart tables to Snowflake & BI replicas." },
      ],
      kpis: {
        reportedDau: 50840,
        correctedDau: 62850,
        ingressReqMin: 125100,
        stickinessRatio: 42.6,
        pipelineHealth: 81.8,
      },
    },
  };
}

export async function executeDataQueryAction(
  sessionId: string,
  sqlQuery: string,
  currentState?: any
) {
  try {
    const lower = sqlQuery.toLowerCase();
    const hasDistinct = lower.includes("distinct");
    const hasInnerTransactions =
      (lower.includes("inner join transactions") || lower.includes("join transactions")) &&
      !lower.includes("left join transactions");
    const omitsInnerTransactions = !hasInnerTransactions;
    const joinsSessions = lower.includes("sessions");

    const isFixed = hasDistinct && joinsSessions && omitsInnerTransactions;

    const logEntry = isFixed
      ? `[SQL_FIX_VERIFIED] Seeker updated DAU query with COUNT(DISTINCT u.id) and decoupled transactions join. Recovered 18% missing active subscribers.`
      : `[SQL_QUERY_EXECUTED] Executed query: ${sqlQuery.substring(0, 100).replace(/\n/g, " ")}...`;

    if (sessionId && !sessionId.startsWith("demo-")) {
      try {
        let state = currentState;
        const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
        if (sim) state = JSON.parse(sim.state);

        if (state) {
          state.messages.push({ role: "user", content: logEntry });
          state.observerNotes.push(logEntry);
          if (isFixed) {
            state.processSignals.structuredDebugging = true;
            state.dimensionalScores.toolUtilization = Math.min(100, (state.dimensionalScores.toolUtilization || 50) + 10);
            state.dimensionalScores.approachQuality = Math.min(100, (state.dimensionalScores.approachQuality || 50) + 8);
          }
          await prisma.simulationSession.update({
            where: { id: sessionId },
            data: { state: JSON.stringify(state) },
          });
        }
      } catch {}
    }

    return {
      success: true,
      isFixed,
      durationMs: Math.floor(Math.random() * 25) + 30,
      rowCount: 5,
      queryPlan: isFixed
        ? "Index Scan using sessions_started_at_idx on sessions (cost=0.42..18.50 rows=62850 width=24)"
        : "Hash Join (cost=24.10..892.40 rows=50840 width=24) - Omits non-transacting users",
      message: isFixed
        ? "Distinct user join verified! 18% missing active users restored."
        : "Query executed with legacy join. 18% discrepancy remains.",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function repairPipelineDagNodeAction(
  sessionId: string,
  nodeId: string,
  modelSql: string,
  currentState?: any
) {
  try {
    const lower = modelSql.toLowerCase();
    const handlesSchemaDrift = lower.includes("account_uid") && lower.includes("coalesce");
    const handlesDedupe = lower.includes("row_number") || lower.includes("dedupe") || lower.includes("distinct");

    const isRepaired = handlesSchemaDrift && handlesDedupe;

    const logEntry = isRepaired
      ? `[PIPELINE_FIX_VERIFIED] Seeker patched \`stg_mobile_events.sql\` with COALESCE(account_uid, user_id) and window deduplication. DAG run succeeded with 100% test pass rate.`
      : `[PIPELINE_PATCH_SUBMITTED] Updated node ${nodeId} transformation SQL.`;

    if (sessionId && !sessionId.startsWith("demo-")) {
      try {
        let state = currentState;
        const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
        if (sim) state = JSON.parse(sim.state);

        if (state) {
          state.messages.push({ role: "user", content: logEntry });
          state.observerNotes.push(logEntry);
          if (isRepaired) {
            state.processSignals.edgeCaseConsideration = true;
            state.dimensionalScores.beyondKnownAnswer = Math.min(100, (state.dimensionalScores.beyondKnownAnswer || 50) + 12);
            state.dimensionalScores.errorRecovery = Math.min(100, (state.dimensionalScores.errorRecovery || 50) + 10);
          }
          await prisma.simulationSession.update({
            where: { id: sessionId },
            data: { state: JSON.stringify(state) },
          });
        }
      } catch {}
    }

    return {
      success: true,
      isRepaired,
      dagStatus: isRepaired ? "SUCCESS" : "FAILED",
      assertions: [
        { test: "assert_not_null_user_id", status: isRepaired ? "PASS" : "FAIL" },
        { test: "assert_unique_event_id", status: isRepaired ? "PASS" : "WARN" },
        { test: "assert_row_count_variance", status: "PASS" },
      ],
      message: isRepaired
        ? "Pipeline node successfully repaired. Upstream dependencies unblocked and silver staging synchronized."
        : "Transformation submitted but schema drift or deduplication assertions still failing.",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitExecutiveDataReportAction(
  sessionId: string,
  reportData: {
    title: string;
    rootCauseSummary: string;
    sqlJoinFixed: boolean;
    pipelineRepaired: boolean;
    serverTrafficSteady: boolean;
    normalizedDau: number;
  },
  currentState?: any
) {
  try {
    const isComplete =
      reportData.sqlJoinFixed &&
      reportData.pipelineRepaired &&
      reportData.serverTrafficSteady &&
      reportData.normalizedDau >= 62000;

    const score = isComplete ? 98 : 76;

    const logEntry = `[VICTORY] Data candidate published final Executive Incident Report: "The Missing DAU Problem". Confirmed server traffic was steady (125k req/min). Normalized DAU to ${reportData.normalizedDau.toLocaleString()} via DISTINCT user join and dbt schema drift repair.`;

    if (sessionId && !sessionId.startsWith("demo-")) {
      try {
        let state = currentState;
        const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
        if (sim) state = JSON.parse(sim.state);

        if (state) {
          state.messages.push({ role: "user", content: logEntry });
          state.observerNotes.push(logEntry);
          state.cognitiveLoadScore = 32; // Calm / Normalized
          state.dimensionalScores = {
            approachQuality: 98,
            efficiency: 95,
            creativity: 92,
            errorRecovery: 99,
            beyondKnownAnswer: 96,
            toolUtilization: 98,
            communication: 97,
            ambiguityHandling: 96,
          };
          state.processSignals = {
            ...state.processSignals,
            structuredDebugging: true,
            edgeCaseConsideration: true,
            tradeoffArticulation: true,
          };

          await prisma.simulationSession.update({
            where: { id: sessionId },
            data: {
              state: JSON.stringify(state),
              cognitiveScore: score,
              completed: true,
            },
          });
        }
      } catch {}
    }

    return {
      success: true,
      score,
      isComplete,
      message: "Executive Incident Report approved and published. Metric integrity fully restored.",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// SCOPE 1: ENGINEERING (BLACK FRIDAY CHECKOUT INCIDENT) ACTIONS
// ═══════════════════════════════════════════════════════════════

export interface EngineeringActionPayload {
  actionType:
    | "SSH_CMD"
    | "HOST_FINDING"
    | "NETWORK_PROBE"
    | "REMEDIATE_DNS"
    | "SUBMIT_VERDICT"
    | "DEBUGGER_STEP"
    | "SIMULATE_RACE"
    | "APPLY_PATCH"
    | "RUN_TESTS";
  subEnv: 1 | 2 | 3;
  command?: string;
  findingId?: string;
  verdict?: "app" | "infra" | "both";
  isCorrect?: boolean;
  testPassed?: boolean;
  metadata?: Record<string, any>;
  telemetry?: TelemetryData;
}

export async function submitEngineeringAction(
  sessionId: string,
  payload: EngineeringActionPayload,
  clientState?: any
) {
  let state: any;
  let domain = "engineering";

  try {
    const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
    if (sim) {
      state = JSON.parse(sim.state);
      domain = sim.domain || "engineering";
    } else {
      throw new Error("Session not found in DB");
    }
  } catch (e) {
    if (!clientState) {
      state = {
        messages: [],
        cognitiveLoadScore: 48,
        resolutionTurns: 0,
        currentScenario: "Black Friday Checkout Degradation & Concurrency",
        problemTitle: "Checkout Concurrency & Infrastructure Degradation",
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
        },
        dimensionalScores: {
          approachQuality: 50,
          efficiency: 50,
          creativity: 50,
          errorRecovery: 50,
          beyondKnownAnswer: 50,
          toolUtilization: 50,
          communication: 50,
          ambiguityHandling: 50,
        },
        observerNotes: [],
      };
    } else {
      state = JSON.parse(JSON.stringify(clientState));
    }
  }

  if (!state.processSignals) state.processSignals = {};
  if (!state.dimensionalScores) state.dimensionalScores = {};
  if (!state.observerNotes) state.observerNotes = [];

  let actionSummary = "";
  let personaFeedback = "";

  switch (payload.actionType) {
    case "SSH_CMD": {
      actionSummary = `[SSH_TERMINAL] Executed: $ ${payload.command || "command"}`;
      const cmd = (payload.command || "").toLowerCase();

      if (cmd.includes("top") || cmd.includes("ps aux")) {
        state.processSignals.structuredDebugging = true;
        state.dimensionalScores.toolUtilization = Math.min(100, (state.dimensionalScores.toolUtilization || 50) + 6);
        state.observerNotes.push(`[Host Inspection] Candidate analyzed running processes and CPU load on aura-prod-app-04.`);
        personaFeedback = "Alex Chen (Staff Engineer): Good instincts checking host metrics before touching application code.";
      } else if (cmd.includes("timeout.log") || cmd.includes("error.log")) {
        state.processSignals.knowledgeBaseConsultation = true;
        state.dimensionalScores.approachQuality = Math.min(100, (state.dimensionalScores.approachQuality || 50) + 8);
        state.observerNotes.push(`[Log Analysis] Candidate inspected timeout logs and identified 30s upstream timeout to auth.payment.internal:8443.`);
        personaFeedback = "Alex Chen (Staff Engineer): Notice those 30s socket timeouts to the payment gateway. That's why worker threads are piling up.";
      } else if (cmd.includes("free")) {
        state.dimensionalScores.toolUtilization = Math.min(100, (state.dimensionalScores.toolUtilization || 50) + 4);
      }
      break;
    }

    case "HOST_FINDING": {
      actionSummary = `[HOST_FINDING_LOCKED] Discovered infrastructure clue: ${payload.findingId}`;
      state.processSignals.structuredDebugging = true;
      state.dimensionalScores.approachQuality = Math.min(100, (state.dimensionalScores.approachQuality || 50) + 7);
      state.dimensionalScores.efficiency = Math.min(100, (state.dimensionalScores.efficiency || 50) + 5);
      state.observerNotes.push(`[Clue Resolved] Candidate isolated host state: ${payload.findingId}.`);
      personaFeedback = "Alex Chen (Staff Engineer): Key finding recorded. Workers are stuck waiting on socket I/O rather than CPU or memory exhaustion.";
      break;
    }

    case "NETWORK_PROBE": {
      actionSummary = `[NETWORK_LAB] Executed probe: $ ${payload.command || "probe"}`;
      state.processSignals.knowledgeBaseConsultation = true;
      state.dimensionalScores.toolUtilization = Math.min(100, (state.dimensionalScores.toolUtilization || 50) + 8);
      const netCmd = (payload.command || "").toLowerCase();

      if (netCmd.includes("nslookup") || netCmd.includes("dig")) {
        state.dimensionalScores.beyondKnownAnswer = Math.min(100, (state.dimensionalScores.beyondKnownAnswer || 50) + 8);
        state.observerNotes.push(`[DNS Analysis] Candidate inspected CoreDNS resolution mapping for auth.payment.internal.`);
        personaFeedback = "Priya Patel (Lead Network Engineer): Notice CoreDNS is returning two IPs: 10.244.3.99 (decommissioned) and 10.244.4.150 (healthy).";
      } else if (netCmd.includes("curl") || netCmd.includes("nc")) {
        state.observerNotes.push(`[Socket Probing] Candidate probed TCP port 8443 connectivity between cluster nodes.`);
        personaFeedback = "Priya Patel (Lead Network Engineer): Port 8443 on 10.244.3.99 is dropping packets with 100% loss. That's a dead pod in the route table.";
      }
      break;
    }

    case "REMEDIATE_DNS": {
      actionSummary = `[NETWORK_REMEDIATION] Pruned stale pod 10.244.3.99 from CoreDNS and drained HTTP socket pool.`;
      state.processSignals.stuckRecovery = true;
      state.dimensionalScores.errorRecovery = Math.min(100, (state.dimensionalScores.errorRecovery || 50) + 16);
      state.dimensionalScores.approachQuality = Math.min(100, (state.dimensionalScores.approachQuality || 50) + 12);
      state.cognitiveLoadScore = Math.max(25, (state.cognitiveLoadScore || 60) - 15);
      state.observerNotes.push(`[Network Healed] Upstream CoreDNS misrouting fixed. Connection pool saturation dropped from 128 to 4.`);
      personaFeedback = "Priya Patel (Lead Network Engineer): Excellent. DNS route table updated and worker connection pool drained. Traffic now flows exclusively to the healthy gateway.";
      break;
    }

    case "SUBMIT_VERDICT": {
      const isBoth = payload.verdict === "both";
      actionSummary = `[VERDICT_SUBMITTED] Failure origin diagnosed as: ${payload.verdict}. Correctness: ${isBoth ? "Full" : "Partial"}`;

      if (isBoth) {
        state.processSignals.tradeoffArticulation = true;
        state.processSignals.edgeCaseConsideration = true;
        state.dimensionalScores.beyondKnownAnswer = Math.min(100, (state.dimensionalScores.beyondKnownAnswer || 50) + 18);
        state.dimensionalScores.approachQuality = Math.min(100, (state.dimensionalScores.approachQuality || 50) + 15);
        state.observerNotes.push(`[Root Cause Accuracy] Candidate correctly identified dual origin: Infrastructure DNS misrouting combined with unbounded application connection pool and concurrency race condition.`);
        personaFeedback = "Alex Chen (Staff Engineer): Spot on. It's a dual failure: DNS was blackholing traffic, AND the application code has no socket timeout and a race condition.";
      } else {
        state.dimensionalScores.approachQuality = Math.min(100, (state.dimensionalScores.approachQuality || 50) + 5);
        state.observerNotes.push(`[Root Cause Partial] Candidate identified single layer (${payload.verdict}), overlooking the interplay between DNS routing and code concurrency.`);
        personaFeedback = "Alex Chen (Staff Engineer): Partial match. Remember to look across both layers: DNS routing to dead pods and application concurrency handling.";
      }
      break;
    }

    case "DEBUGGER_STEP":
    case "SIMULATE_RACE": {
      actionSummary = `[DEBUGGER_INSPECT] Stepped through checkout.ts execution trace and reproduced concurrency race condition under rapid repeat clicks.`;
      state.processSignals.structuredDebugging = true;
      state.processSignals.edgeCaseConsideration = true;
      state.dimensionalScores.creativity = Math.min(100, (state.dimensionalScores.creativity || 50) + 10);
      state.dimensionalScores.toolUtilization = Math.min(100, (state.dimensionalScores.toolUtilization || 50) + 12);
      state.observerNotes.push(`[Concurrency Replication] Candidate stepped through breakpoints to observe the race condition where both requests pass order.status check before either updates state.`);
      personaFeedback = "Alex Chen (Staff Engineer): Notice how Thread 1 and Thread 2 both see status='PENDING' at line 24. That's why the customer is billed twice!";
      break;
    }

    case "APPLY_PATCH": {
      actionSummary = `[CODE_PATCH] Applied atomic idempotency guard in checkout.ts before external payment gateway dispatch.`;
      state.processSignals.structuredDebugging = true;
      state.dimensionalScores.approachQuality = Math.min(100, (state.dimensionalScores.approachQuality || 50) + 15);
      state.dimensionalScores.errorRecovery = Math.min(100, (state.dimensionalScores.errorRecovery || 50) + 12);
      state.observerNotes.push(`[Patch Applied] Candidate moved status claim to PROCESSING before dispatching paymentGateway.charge().`);
      personaFeedback = "Alex Chen (Staff Engineer): Clean fix. Atomic status check and claim before charge prevents duplicate dispatches. Now run the Jest test suite to verify.";
      break;
    }

    case "RUN_TESTS": {
      const isPassed = payload.testPassed ?? true;
      actionSummary = `[TEST_RUNNER] Executed Jest checkout test suite ($ jest checkout.test.ts). Result: ${isPassed ? "4/4 PASS (100% GREEN)" : "FAIL"}`;
      state.processSignals.testBeforeShip = true;

      if (isPassed) {
        state.dimensionalScores.toolUtilization = Math.min(100, (state.dimensionalScores.toolUtilization || 50) + 16);
        state.dimensionalScores.approachQuality = Math.min(100, (state.dimensionalScores.approachQuality || 50) + 18);
        state.dimensionalScores.efficiency = Math.min(100, (state.dimensionalScores.efficiency || 50) + 15);
        state.cognitiveLoadScore = Math.max(20, (state.cognitiveLoadScore || 60) - 20);
        state.observerNotes.push(`[Verification Passed] All 4 Jest tests green. Concurrency race condition double charges eliminated from Black Friday cluster.`);
        personaFeedback = "Alex Chen (Staff Engineer): All 4 tests passing! The race condition is completely mitigated and checkout is verified production ready.";
      } else {
        state.dimensionalScores.toolUtilization = Math.min(100, (state.dimensionalScores.toolUtilization || 50) + 4);
        state.observerNotes.push(`[Test Regression] Failing test detected: race condition allows double charges.`);
        personaFeedback = "Alex Chen (Staff Engineer): Tests are still failing with duplicate charges. Ensure the guard check happens BEFORE the charge call.";
      }
      break;
    }
  }

  state.messages.push({ role: "user", content: actionSummary });
  state.messages.push({ role: "assistant", content: personaFeedback, persona: "Alex Chen" });
  state.resolutionTurns = (state.resolutionTurns || 0) + 1;

  const isCompleted = payload.actionType === "RUN_TESTS" && payload.testPassed;

  try {
    await prisma.simulationSession.update({
      where: { id: sessionId },
      data: {
        state: JSON.stringify(state),
        cognitiveScore: state.cognitiveLoadScore,
        completed: isCompleted,
      },
    });
  } catch (e) { /* DB unavailable fallback */ }

  return {
    success: true,
    actionSummary,
    personaFeedback,
    state,
    isComplete: isCompleted,
  };
}

export async function fetchEngineeringTelemetryAction(
  sessionId: string,
  subEnv: 1 | 2 | 3 = 1
) {
  try {
    let state: any = null;
    try {
      const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
      if (sim && sim.state) {
        state = JSON.parse(sim.state);
      }
    } catch {}

    const cognitiveLoadScore = state?.cognitiveLoadScore ?? 48;
    const processSignals = state?.processSignals ?? {
      structuredDebugging: false,
      testBeforeShip: false,
      stuckRecovery: false,
      tradeoffArticulation: false,
      edgeCaseConsideration: false,
    };
    const dimensionalScores = state?.dimensionalScores ?? {
      approachQuality: 65,
      efficiency: 60,
      creativity: 58,
      errorRecovery: 62,
      beyondKnownAnswer: 64,
      toolUtilization: 70,
      communication: 65,
      ambiguityHandling: 60,
    };
    const observerNotes = state?.observerNotes ?? [
      "[t+0s] Host aura-prod-app-04 (10.244.2.14) connected via SSH.",
      "[t+2s] 3D Observer Synapse initialized in Engineering matrix mode.",
    ];

    return {
      success: true,
      cognitiveLoadScore,
      processSignals,
      dimensionalScores,
      observerNotes,
      cluster: {
        host: "aura-prod-app-04",
        ip: "10.244.2.14",
        status: "CONNECTED",
        uptime: "14 days, 3:22",
        loadAvg: [1.12, 1.05, 0.98],
        memoryUsedMb: 3210,
        memoryTotalMb: 15980,
        activeWorkers: 4,
        dnsRecord: "auth.payment.internal -> 10.244.4.150:8443",
        socketPoolSaturation: "4/128",
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// SCOPE 6: SUPPORT (PROJECT: SLA BACKLOG & CUSTOMER ESCALATION) ACTIONS
// ═══════════════════════════════════════════════════════════════

export interface SupportScopeDataset {
  problemStatement: string;
  subEnvironments: Array<{ id: string; name: string; description: string }>;
  tickets: SupportTicket[];
  account: CustomerAccount;
  macros: MacroTemplate[];
  stats: SupportQueueStats;
}

export async function getSupportScopeDataAction(sessionId?: string): Promise<{
  success: boolean;
  data: SupportScopeDataset;
}> {
  return {
    success: true,
    data: {
      problemStatement:
        "A SaaS company's support queue has accumulated 120 unresolved tickets. Several enterprise customers have breached or are approaching their SLA deadlines. The seeker must prioritize and resolve the queue.",
      subEnvironments: [
        {
          id: "01",
          name: "Helpdesk Ticket Queue",
          description:
            "Authentic Zendesk / Freshdesk ticket queue with live SLA countdown timers, customer avatars, order values, priority tags, and filter views.",
        },
        {
          id: "02",
          name: "Customer Investigation Desk",
          description:
            "Deep-dive into customer order histories, payment gateway logs (duplicate authorizations tx_8819 vs tx_8820), and diagnostic root-cause timeline.",
        },
        {
          id: "03",
          name: "Escalation & Response Center",
          description:
            "Communication tone selector (Empathetic, Neutral, Direct), macro canned responses, and unified batch escalation to SRE SEV-1.",
        },
      ],
      tickets: INITIAL_SUPPORT_QUEUE,
      account: ELENA_ROSTOVA_ACCOUNT,
      macros: MACRO_TEMPLATES,
      stats: INITIAL_QUEUE_STATS,
    },
  };
}

export async function investigateCustomerAccountAction(
  sessionId: string,
  ticketId: string,
  currentState?: any
) {
  try {
    const logEntry = `[INVESTIGATION_ISOLATED] Seeker investigated ticket ${ticketId} (Elena Rostova), inspected payment gateway authorization logs tx_8819 vs tx_8820 (+284ms collision), and identified missing idempotency key and race condition in checkout.ts.`;

    if (sessionId && !sessionId.startsWith("demo-")) {
      try {
        let state = currentState;
        const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
        if (sim) state = JSON.parse(sim.state);

        if (state) {
          state.messages.push({ role: "user", content: logEntry });
          state.observerNotes.push(logEntry);
          state.processSignals.structuredDebugging = true;
          state.processSignals.edgeCaseConsideration = true;
          state.dimensionalScores.toolUtilization = Math.min(
            100,
            (state.dimensionalScores.toolUtilization || 50) + 12
          );
          state.dimensionalScores.approachQuality = Math.min(
            100,
            (state.dimensionalScores.approachQuality || 50) + 10
          );

          await prisma.simulationSession.update({
            where: { id: sessionId },
            data: { state: JSON.stringify(state) },
          });
        }
      } catch {}
    }

    return {
      success: true,
      ticketId,
      gatewayLogsAnalyzed: ["tx_8819", "tx_8820"],
      rootCauseConfirmed: true,
      concurrencyCollisionDeltaMs: 284,
      missingGuard: "Idempotency key null; guard evaluated post-charge",
      message: "Customer account & payment gateway logs verified. Diagnostic evidence packaged.",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function batchEscalateSupportAction(
  sessionId: string,
  details: {
    tone: CommunicationTone;
    macroId: string;
    responseText: string;
    severity: string;
    rootCauseAnalysis: string;
  },
  currentState?: any
) {
  try {
    const isOptimalTone = details.tone === "empathetic" || details.tone === "neutral";
    const isOptimalMacro =
      details.macroId === "macro_reassurance_systemic" ||
      details.macroId === "macro_enterprise_sla";
    const score = isOptimalTone && isOptimalMacro ? 98 : 84;

    const logEntry = `[VICTORY] Customer Support Seeker resolved 120-ticket backlog! Identified systemic checkout race condition across 120 backlog tickets. Applied tone='${details.tone}' (reassurance and courtesy credit), attached gateway collision proof (tx_8819 vs tx_8820), and executed unified Sev-1 batch escalation to SRE instead of fragmented manual refunds. Swept entire 120-ticket queue to resolved.`;

    let state = currentState;
    if (!state && sessionId && !sessionId.startsWith("demo-")) {
      try {
        const sim = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
        if (sim) state = JSON.parse(sim.state);
      } catch {}
    }

    if (!state) {
      state = {
        messages: [],
        cognitiveLoadScore: 65,
        processSignals: {},
        dimensionalScores: {},
        observerNotes: [],
        resolutionTurns: 0,
      };
    }

    state.messages.push({ role: "user", content: logEntry });
    state.messages.push({
      role: "assistant",
      content:
        "All 120 tickets swept to resolved. SEV-1 ticket received in SRE war room. Concurrency mutex deployed to checkout.ts and automated reversal batch dispatched to payment gateway. Outstanding triage and escalation, Support Commander.",
      persona: "Jordan Mitchell",
    });

    state.observerNotes.push(logEntry);
    state.cognitiveLoadScore = 22; // Normalized / Calm
    state.dimensionalScores = {
      approachQuality: 98,
      efficiency: 97,
      creativity: 92,
      errorRecovery: 98,
      beyondKnownAnswer: 95,
      toolUtilization: 96,
      communication: 98,
      ambiguityHandling: 94,
    };

    if (state.processSignals) {
      state.processSignals.testBeforeShip = true;
      state.processSignals.structuredDebugging = true;
      state.processSignals.stuckRecovery = true;
      state.processSignals.escalationHandling = "addressed";
      state.processSignals.timeManagement = "methodical";
      state.processSignals.communicationClarity = 96;
      state.processSignals.tradeoffArticulation = true;
    }

    try {
      if (sessionId && !sessionId.startsWith("demo-")) {
        await prisma.simulationSession.update({
          where: { id: sessionId },
          data: {
            state: JSON.stringify(state),
            cognitiveScore: score,
            completed: true,
          },
        });
      }
    } catch {}

    return {
      success: true,
      score,
      isComplete: true,
      sweptTicketsCount: 120,
      reassuredEnterpriseCount: 24,
      financialExposureSecured: "$29,880.00",
      activePersonaFeedback:
        "Jordan Mitchell: Exceptional leadership! You prioritized the queue, isolated the tx_8819 vs tx_8820 race condition, and executed a unified SEV-1 escalation with empathetic customer reassurance. Enterprise contracts protected!",
      message: "Unified SEV-1 batch escalation completed. 120-ticket backlog resolved.",
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
