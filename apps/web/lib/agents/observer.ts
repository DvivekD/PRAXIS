// Layer 1: Observer — AI-powered behavioral telemetry analysis
// Tracks HOW the candidate thinks, not just WHAT they answer

export interface TelemetryData {
  commands?: string[];
  activeTabs?: string[];
  flightTimeVariance?: number;    // Keystroke timing variance (ms)
  pauseCount?: number;            // Number of pauses > 3s
  wordsPerMinute?: number;        // Typing speed
  tabSwitchCount?: number;        // How often they switch context
  codeEditCount?: number;         // Number of code edits made
  timeOnCurrentTurn?: number;     // Seconds spent on current response
  backspaceRatio?: number;        // Ratio of backspaces to total keystrokes
}

export interface ProcessSignals {
  knowledgeBaseConsultation: boolean;
  testBeforeShip: boolean;
  ambiguityResponse: "unknown" | "assumed" | "proactive_clarification" | "ignored";
  toolUsagePattern: string[];
  stuckRecovery: boolean;
  escalationHandling: "unknown" | "deflected" | "addressed" | "escalated_further";
  communicationClarity: number;       // 0-100
  structuredDebugging: boolean;       // Did they narrow scope before changing code?
  edgeCaseConsideration: boolean;     // Did they mention edge cases?
  tradeoffArticulation: boolean;     // Did they discuss tradeoffs?
  collaborationSignal: boolean;       // Did they ask for input from stakeholder?
  timeManagement: "unknown" | "rushing" | "methodical" | "stalling";
}

export interface ObserverOutput {
  cognitiveLoadScore: number;
  observerNotes: string[];
  processSignals: ProcessSignals;
  dimensionalScores: DimensionalScores;
}

export interface DimensionalScores {
  approachQuality: number;
  efficiency: number;
  creativity: number;
  errorRecovery: number;
  beyondKnownAnswer: number;
  toolUtilization: number;
  communication: number;
  ambiguityHandling: number;
}

export function observerNode(
  messages: { role: string; content: string }[],
  telemetry: TelemetryData,
  currentSignals: ProcessSignals,
  currentCognitiveLoad: number,
  currentDimensions?: Partial<DimensionalScores>
): ObserverOutput {
  const processSignals = { ...currentSignals };
  let deltaScore = 0;
  const notes: string[] = [];

  const dims: DimensionalScores = {
    approachQuality: currentDimensions?.approachQuality ?? 50,
    efficiency: currentDimensions?.efficiency ?? 50,
    creativity: currentDimensions?.creativity ?? 50,
    errorRecovery: currentDimensions?.errorRecovery ?? 50,
    beyondKnownAnswer: currentDimensions?.beyondKnownAnswer ?? 50,
    toolUtilization: currentDimensions?.toolUtilization ?? 50,
    communication: currentDimensions?.communication ?? 50,
    ambiguityHandling: currentDimensions?.ambiguityHandling ?? 50,
  };

  const lastMsg = messages.length > 0 ? messages[messages.length - 1].content.toLowerCase() : "";
  const totalUserMsgs = messages.filter(m => m.role === "user").length;

  // ─── Telemetry Heuristics ─────────────────────────────────
  const variance = telemetry.flightTimeVariance || 0;
  const pauseCount = telemetry.pauseCount || 0;
  const wpm = telemetry.wordsPerMinute || 0;
  const turnTime = telemetry.timeOnCurrentTurn || 0;
  const backspaceRatio = telemetry.backspaceRatio || 0;

  // Cognitive load from typing patterns
  if (variance > 100) {
    notes.push("High keystroke variance detected — candidate may be re-reading or deeply considering.");
    deltaScore = 12;
  } else if (variance > 50) {
    deltaScore = 5;
  } else if (variance < 20 && wpm > 80) {
    notes.push("Fluid, confident typing pattern observed.");
    deltaScore = -5;
  }

  // Long pauses suggest deep thinking or being stuck
  if (pauseCount > 5 && turnTime > 60) {
    notes.push("Multiple long pauses — candidate may be stuck or deeply analyzing.");
    processSignals.timeManagement = "stalling";
    deltaScore += 10;
  } else if (turnTime < 5 && totalUserMsgs > 2) {
    notes.push("Very rapid responses — candidate may be rushing without full analysis.");
    processSignals.timeManagement = "rushing";
    dims.approachQuality = Math.max(20, dims.approachQuality - 5);
  } else if (turnTime > 15 && turnTime < 60) {
    processSignals.timeManagement = "methodical";
  }

  // High backspace ratio = self-correction
  if (backspaceRatio > 0.3) {
    notes.push("High self-correction rate — candidate is refining their approach.");
    dims.approachQuality += 3;
  }

  // ─── Process Signal Detection from Message Content ────────

  // Tool Usage & Testing
  if (telemetry.commands?.some(c => ["run_tests", "npm test", "pytest", "cargo test"].includes(c))) {
    processSignals.testBeforeShip = true;
    dims.toolUtilization += 8;
    notes.push("Candidate ran tests before proposing a solution.");
  }

  // Knowledge Base Consultation
  if (telemetry.activeTabs?.includes("docs") || lastMsg.includes("documentation") || lastMsg.includes("look up") || lastMsg.includes("reference")) {
    processSignals.knowledgeBaseConsultation = true;
    dims.toolUtilization += 5;
  }

  // Communication Clarity
  if (lastMsg.split(" ").length > 25 && (lastMsg.includes("because") || lastMsg.includes("therefore") || lastMsg.includes("the reason"))) {
    processSignals.communicationClarity = Math.min(100, processSignals.communicationClarity + 8);
    dims.communication += 5;
  }

  // Structured Debugging
  if (lastMsg.includes("first") && (lastMsg.includes("then") || lastMsg.includes("next") || lastMsg.includes("after that"))) {
    processSignals.structuredDebugging = true;
    dims.approachQuality += 6;
    notes.push("Candidate demonstrated structured, step-by-step approach.");
  }

  // Ambiguity Response
  if (lastMsg.includes("assume") || lastMsg.includes("clarify") || lastMsg.includes("what do you mean") || lastMsg.includes("can you specify")) {
    processSignals.ambiguityResponse = "proactive_clarification";
    dims.ambiguityHandling += 10;
    notes.push("Candidate proactively sought clarification on ambiguous requirements.");
  } else if (lastMsg.includes("i'll just") || lastMsg.includes("let me guess")) {
    processSignals.ambiguityResponse = "assumed";
    dims.ambiguityHandling -= 3;
  }

  // Edge Case Consideration
  if (lastMsg.includes("edge case") || lastMsg.includes("what if") || lastMsg.includes("corner case") || lastMsg.includes("race condition")) {
    processSignals.edgeCaseConsideration = true;
    dims.beyondKnownAnswer += 8;
    dims.creativity += 5;
    notes.push("Candidate considered edge cases proactively.");
  }

  // Tradeoff Articulation
  if (lastMsg.includes("tradeoff") || lastMsg.includes("trade-off") || lastMsg.includes("pros and cons") || lastMsg.includes("downside")) {
    processSignals.tradeoffArticulation = true;
    dims.creativity += 6;
    dims.communication += 4;
    notes.push("Candidate articulated tradeoffs in their approach.");
  }

  // Collaboration Signal
  if (lastMsg.includes("what do you think") || lastMsg.includes("does that make sense") || lastMsg.includes("your thoughts")) {
    processSignals.collaborationSignal = true;
    dims.communication += 6;
  }

  // Stuck Recovery
  if (lastMsg.includes("let me try a different approach") || lastMsg.includes("actually") || lastMsg.includes("wait, let me reconsider")) {
    processSignals.stuckRecovery = true;
    dims.errorRecovery += 10;
    notes.push("Candidate recovered from being stuck by pivoting strategy.");
  }

  // Escalation Handling
  if (lastMsg.includes("escalate") || lastMsg.includes("bring in") || lastMsg.includes("involve")) {
    processSignals.escalationHandling = "escalated_further";
  } else if (lastMsg.includes("i'll handle") || lastMsg.includes("let me take care")) {
    processSignals.escalationHandling = "addressed";
    dims.efficiency += 4;
  }

  // Efficiency tracking
  if (telemetry.codeEditCount && telemetry.codeEditCount > 10 && totalUserMsgs < 4) {
    dims.efficiency -= 5;
    notes.push("High code churn early in session — may indicate trial-and-error approach.");
  }

  // Clamp all dimensional scores to 0-100
  for (const key of Object.keys(dims) as (keyof DimensionalScores)[]) {
    dims[key] = Math.max(0, Math.min(100, dims[key]));
  }

  return {
    cognitiveLoadScore: Math.max(0, Math.min(100, currentCognitiveLoad + deltaScore)),
    observerNotes: notes,
    processSignals,
    dimensionalScores: dims,
  };
}
