/**
 * SCOPE 5: SRE FUNCTIONAL DEEP EXECUTION TEST SUITE
 * Directly exercises eval.ts server actions for Scope 5: SRE (Sev-1 Outage):
 * 1. fetchSreClusterTelemetryAction
 * 2. submitSreTelemetryAction (PromQL, Pod Logs, Status Page, Alert ACK, Postmortem, Ineffective Mitigation)
 * 3. executeSreRollbackAction (zero-downtime rollback state machine)
 */

import assert from "assert";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("================================================================================");
console.log("PRAXIS SCOPE 5: SRE SERVER ACTIONS FUNCTIONAL DEEP TEST SUITE");
console.log("================================================================================\n");

// Read eval.ts and transpile to test its logic
const evalPath = path.resolve(__dirname, "../actions/eval.ts");
const evalSource = fs.readFileSync(evalPath, "utf8");

// Mock groq and prisma to run server action functions in isolation
const mockedSource = evalSource
  .replace(/import { prisma } from "\.\.\/lib\/prisma";/, `const prisma = { simulationSession: { findUnique: async () => null, update: async () => null }, user: { findUnique: async () => null, upsert: async () => null } };`)
  .replace(/import { createGroq } from "@ai-sdk\/groq";/, `const createGroq = () => () => ({});`)
  .replace(/import { generateText } from "ai";/, `const generateText = async () => ({ text: "AI response" });`);

const { outputText } = ts.transpileModule(mockedSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});

const mod = { exports: {} };
const fn = new Function("module", "exports", "require", outputText);
fn(mod, mod.exports, (modName) => {
  if (modName.includes("problemBank")) {
    return {
      problemBank: {
        generateMutatedProblem: () => ({
          scenario: "Sev-1 Checkout API Production Outage",
          title: "Sev-1 Outage",
          contextVariables: { domain: "sre" },
          skinType: "warroom",
        }),
      },
    };
  }
  if (modName.includes("segmentation")) {
    return {
      assignSegment: () => "balanced",
      getSegmentModifiers: () => ({}),
    };
  }
  if (modName.includes("personas")) {
    return {
      PersonaOrchestrator: class {
        getActivePersonaInfo() {
          return { name: "Alex Chen", role: "Lead SRE", escalation: 0 };
        }
        evaluateEscalation() {}
        selectNextSpeaker() {}
        getSystemPrompt() {
          return "System prompt";
        }
      },
    };
  }
  if (modName.includes("observer")) {
    return {
      observerNode: () => ({
        cognitiveLoadScore: 50,
        observerNotes: [],
        processSignals: {},
        dimensionalScores: {},
      }),
    };
  }
  if (modName.includes("evaluator")) {
    return {
      evaluateSession: () => ({
        compositeScore: 92,
        tier: "exceptional",
        dimensionalScores: {},
      }),
    };
  }
  return {};
});

const {
  fetchSreClusterTelemetryAction,
  submitSreTelemetryAction,
  executeSreRollbackAction,
} = mod.exports;

async function runTests() {
  console.log("▶ [TEST 1] fetchSreClusterTelemetryAction: State Machine Verification");
  
  // 1.1 Critical initial state
  const critical = await fetchSreClusterTelemetryAction("demo-session", false, false);
  assert(critical.success, "Telemetry fetch should succeed");
  assert.strictEqual(critical.telemetry.errorRate, 42.8, "Initial error rate should be 42.8%");
  assert.strictEqual(critical.telemetry.p99LatencyMs, 2850, "Initial p99 latency should be 2850ms");
  assert.strictEqual(critical.telemetry.status, "CRITICAL", "Initial status should be CRITICAL");
  assert.strictEqual(critical.telemetry.activeRevision, "v2.4.1-hotfix", "Failing revision should be v2.4.1-hotfix");
  console.log("  ✓ Initial Sev-1 state correctly reports 42.8% error rate and CRITICAL status");

  // 1.2 Recovering state
  const recovering = await fetchSreClusterTelemetryAction("demo-session", true, false);
  assert(recovering.telemetry.errorRate < 10, "Recovering error rate should drop");
  assert.strictEqual(recovering.telemetry.status, "RECOVERING", "Status should be RECOVERING");
  console.log("  ✓ Recovering state reflects dynamic drop in errors during rollout");

  // 1.3 Solved state
  const solved = await fetchSreClusterTelemetryAction("demo-session", true, true);
  assert.strictEqual(solved.telemetry.errorRate, 0.08, "Solved error rate should be 0.08%");
  assert.strictEqual(solved.telemetry.p99LatencyMs, 42, "Solved p99 latency should be 42ms");
  assert.strictEqual(solved.telemetry.status, "HEALTHY", "Solved status should be HEALTHY");
  assert.strictEqual(solved.telemetry.activeRevision, "v2.4.0", "Solved revision should be v2.4.0");
  assert.strictEqual(solved.telemetry.healthyPods, 16, "All 16 pods should be healthy");
  console.log("  ✓ Solved state confirms 16/16 pods healthy and 0.08% SLA restored");

  console.log("\n▶ [TEST 2] submitSreTelemetryAction: Behavioral Signals & Heuristics");

  const mockState = {
    messages: [],
    cognitiveLoadScore: 75,
    processSignals: {
      structuredDebugging: false,
      edgeCaseConsideration: false,
      ambiguityResponse: "unknown",
      tradeoffArticulation: false,
    },
    dimensionalScores: {
      approachQuality: 60,
      efficiency: 60,
      toolUtilization: 60,
      communication: 60,
      beyondKnownAnswer: 60,
    },
    observerNotes: [],
    resolutionTurns: 0,
  };

  // 2.1 PromQL Query telemetry
  const promRes = await submitSreTelemetryAction("demo-session", {
    actionType: "promql_query",
    query: `sum(rate(http_requests_total{status=~"5.."}[1m]))`,
  }, mockState);

  assert(promRes.success, "PromQL action should succeed");
  assert(promRes.isOptimal, "PromQL 5xx inspection is optimal debugging");
  assert(promRes.processSignals.structuredDebugging, "Structured debugging signal should be set");
  assert(promRes.dimensionalScores.toolUtilization > 60, "Tool utilization should be rewarded");
  console.log("  ✓ PromQL query awards structured debugging and tool utilization");

  // 2.2 Pod Log Inspect telemetry
  const logRes = await submitSreTelemetryAction("demo-session", {
    actionType: "pod_log_inspect",
    podName: "checkout-service-7f6c8d4b8-2kz8q",
  }, mockState);

  assert(logRes.success, "Pod log inspect should succeed");
  assert(logRes.isOptimal, "Isolating TypeError in logs is optimal");
  assert(logRes.processSignals.edgeCaseConsideration, "Edge case consideration should be set");
  console.log("  ✓ Pod log inspection isolates TypeError root cause");

  // 2.3 Status Page Update telemetry
  const stRes = await submitSreTelemetryAction("demo-session", {
    actionType: "status_page_update",
    statusPage: {
      status: "Investigating",
      title: "Investigating checkout latency",
      message: "Customer orders are experiencing elevated latency.",
    },
  }, mockState);

  assert(stRes.success, "Status page action should succeed");
  assert.strictEqual(stRes.processSignals.ambiguityResponse, "proactive_clarification", "Proactive clarification should be awarded");
  assert(stRes.dimensionalScores.communication > 60, "Communication score should increase");
  console.log("  ✓ Public status page update awards proactive clarification and communication");

  // 2.4 Alert Acknowledgment telemetry
  const ackRes = await submitSreTelemetryAction("demo-session", {
    actionType: "alert_ack",
    alertId: "alert-5xx",
  }, mockState);

  assert(ackRes.success, "Alert ack should succeed");
  assert(ackRes.dimensionalScores.efficiency > 60, "Efficiency should increase");
  console.log("  ✓ Alert ACK establishes ownership and efficiency");

  // 2.5 Postmortem Submit telemetry
  const postRes = await submitSreTelemetryAction("demo-session", {
    actionType: "postmortem_submit",
    postmortem: { incidentId: "INC-8942", rootCause: "Null check missing" },
  }, mockState);

  assert(postRes.success, "Postmortem submission should succeed");
  assert(postRes.processSignals.tradeoffArticulation, "Postmortem sets tradeoff articulation");
  assert(postRes.dimensionalScores.beyondKnownAnswer > 60, "Beyond known answer should increase");
  console.log("  ✓ Postmortem generation awards tradeoff articulation and deep RCA reasoning");

  const loadBeforeBad = mockState.cognitiveLoadScore;
  const badRes = await submitSreTelemetryAction("demo-session", {
    actionType: "ineffective_action",
    metadata: { actionName: "Restart Pods" },
  }, mockState);

  assert(badRes.success, "Ineffective action handler should succeed");
  assert.strictEqual(badRes.isOptimal, false, "Restarting bad code is not optimal");
  assert(badRes.cognitiveLoadScore > loadBeforeBad, "Cognitive load should increase on ineffective action");
  console.log("  ✓ Ineffective mitigation correctly flags non-optimal trial-and-error");

  console.log("\n▶ [TEST 3] executeSreRollbackAction: Zero-Downtime Rollback Execution");

  const rollbackRes = await executeSreRollbackAction("demo-session", "v2.4.0", mockState);
  assert(rollbackRes.success, "Rollback action should succeed");
  assert.strictEqual(rollbackRes.score, 96, "Rollback completion score should be 96");
  assert.strictEqual(rollbackRes.metrics.errorRate, 0.08, "Rollback error rate should normalize to 0.08%");
  assert.strictEqual(rollbackRes.metrics.p99LatencyMs, 42, "Rollback p99 latency should normalize to 42ms");
  assert.strictEqual(rollbackRes.metrics.healthyPods, 16, "All 16 pods should be restored");
  assert(rollbackRes.rolloutSteps.length >= 6, "Rollout steps must trace canary surge and pod termination");
  assert(rollbackRes.rolloutSteps.some(s => s.includes("MaxSurge=25%")), "Steps must include MaxSurge canary phase");
  console.log("  ✓ 1-Click zero-downtime rollback executes 7-step canary rollout with verified 96 score");

  console.log("\n================================================================================");
  console.log("ALL SRE FUNCTIONAL DEEP TESTS COMPLETED WITH 100% SUCCESS");
  console.log("================================================================================\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
