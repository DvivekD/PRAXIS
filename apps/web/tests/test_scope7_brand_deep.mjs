/**
 * PRAXIS SCOPE 7: BRAND (THE VIRAL BRAND CRISIS) - DEEP VERIFICATION SUITE
 * Targets:
 *   - apps/web/components/Environments/Brand/SocialListeningSubEnv.tsx
 *   - apps/web/components/Environments/Brand/BrandContentStudioSubEnv.tsx
 *   - apps/web/components/Environments/Brand/CrisisCommandSubEnv.tsx
 *   - apps/web/components/Environments/Brand/types.ts
 *   - apps/web/components/Environments/Brand/index.ts
 *   - apps/web/components/Environments/SocialCommandEnvironment.tsx
 *   - apps/web/actions/eval.ts
 *   - apps/web/lib/agents/evaluator.ts
 */

import fs from "fs";
import path from "path";
import assert from "assert";
import ts from "typescript";
import { fileURLToPath } from "url";
import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRequire = createRequire(path.resolve(__dirname, "../package.json"));

console.log("================================================================================");
console.log("PRAXIS SCOPE 7: BRAND (THE VIRAL BRAND CRISIS) DEEP VERIFICATION HARNESS");
console.log("================================================================================\n");

// Paths
const baseBrandDir = path.resolve(__dirname, "../components/Environments/Brand");
const listeningPath = path.join(baseBrandDir, "SocialListeningSubEnv.tsx");
const studioPath = path.join(baseBrandDir, "BrandContentStudioSubEnv.tsx");
const commandPath = path.join(baseBrandDir, "CrisisCommandSubEnv.tsx");
const typesPath = path.join(baseBrandDir, "types.ts");
const indexPath = path.join(baseBrandDir, "index.ts");
const masterBrandPath = path.resolve(__dirname, "../components/Environments/SocialCommandEnvironment.tsx");
const evalPath = path.resolve(__dirname, "../actions/eval.ts");
const evaluatorPath = path.resolve(__dirname, "../lib/agents/evaluator.ts");

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Static Verification & Strict TypeScript Invariants (Zero 'any')
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ [SUITE 1] Static Verification & Strict TypeScript Invariants (Zero 'any')");

const targetFiles = [
  { name: "Brand/types.ts", path: typesPath },
  { name: "Brand/index.ts", path: indexPath },
  { name: "SocialListeningSubEnv.tsx", path: listeningPath },
  { name: "BrandContentStudioSubEnv.tsx", path: studioPath },
  { name: "CrisisCommandSubEnv.tsx", path: commandPath },
  { name: "SocialCommandEnvironment.tsx", path: masterBrandPath },
];

for (const { name, path: filePath } of targetFiles) {
  assert(fs.existsSync(filePath), `Missing required file: ${name}`);
  const content = fs.readFileSync(filePath, "utf8");

  // Parse AST
  const sf = ts.createSourceFile(name, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  let anyCount = 0;
  function walk(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      anyCount++;
    }
    ts.forEachChild(node, walk);
  }
  walk(sf);

  assert.strictEqual(
    anyCount,
    0,
    `Strict typing violation: ${name} contains ${anyCount} instances of 'any' type!`
  );

  console.log(`  ✓ ${name}: Exists, valid AST, 0 'any' types.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: Module Exports Contract
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ [SUITE 2] Module Exports & Public Contract Validation");

const indexContent = fs.readFileSync(indexPath, "utf8");
assert(indexContent.includes("SocialListeningSubEnv"), "index.ts must export SocialListeningSubEnv");
assert(indexContent.includes("BrandContentStudioSubEnv"), "index.ts must export BrandContentStudioSubEnv");
assert(indexContent.includes("CrisisCommandSubEnv"), "index.ts must export CrisisCommandSubEnv");
assert(indexContent.includes("./types"), "index.ts must re-export types");
console.log("  ✓ Brand/index.ts exports all 3 sub-environments and shared types.");

const masterContent = fs.readFileSync(masterBrandPath, "utf8");
assert(masterContent.includes("SocialListeningSubEnv"), "Master must import SocialListeningSubEnv");
assert(masterContent.includes("BrandContentStudioSubEnv"), "Master must import BrandContentStudioSubEnv");
assert(masterContent.includes("CrisisCommandSubEnv"), "Master must import CrisisCommandSubEnv");
assert(masterContent.includes("AvatarScene"), "Master must mount 3D AvatarScene");
assert(masterContent.includes("dynamic("), "Master must use dynamic import for AvatarScene to avoid SSR errors");
console.log("  ✓ SocialCommandEnvironment imports, orchestrates sub-environments, and mounts dynamic AvatarScene.");

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Brand Tone Analyzer Heuristic Unit Tests
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ [SUITE 3] Brand Tone Analyzer Heuristic Unit Tests");

// Transpile BrandContentStudioSubEnv to extract evaluateBrandTone
function transpile(tsCode) {
  const res = ts.transpileModule(tsCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  return res.outputText;
}

const studioJs = transpile(fs.readFileSync(studioPath, "utf8"));
const studioMod = { exports: {} };
const fnStudio = new Function("exports", "module", "require", studioJs);

// Minimal sandbox for module load
function createMinimalRequire() {
  return function customRequire(id) {
    if (id === "react") return React;
    if (id === "framer-motion") return { motion: {}, AnimatePresence: ({ children }) => children };
    if (id.includes("eval")) return { submitBrandCrisisAction: async () => ({ success: true }) };
    return {};
  };
}

fnStudio(studioMod.exports, studioMod, createMinimalRequire());
const { evaluateBrandTone } = studioMod.exports;
assert(typeof evaluateBrandTone === "function", "evaluateBrandTone must be exported");

// Case 1: Accountable statement
const accountableText =
  "We hear you loud and clear. Our checkout experienced a concurrency bug causing duplicate pending debits. The bug is fixed, zero data was compromised, and all duplicate authorizations are being automatically voided right now. We are deeply sorry for the stress heading into Black Friday.";
const report1 = evaluateBrandTone(accountableText);
assert(report1.accountability >= 75, `Expected accountability >= 75, got ${report1.accountability}`);
assert.strictEqual(report1.defensiveness, "Low", `Expected Low defensiveness, got ${report1.defensiveness}`);
assert.strictEqual(report1.isOptimal, true, "Accountable statement must be optimal");
console.log(`  ✓ Case 1 (Accountable): Score=${report1.accountability}%, Defensiveness=${report1.defensiveness}, Optimal=${report1.isOptimal}`);

// Case 2: Defensive statement
const defensiveText =
  "The issue is due to external card network delays and high traffic from credit card issuers, not our system. Please take it up with your bank before posting online.";
const report2 = evaluateBrandTone(defensiveText);
assert(report2.accountability < 40, `Expected accountability < 40, got ${report2.accountability}`);
assert.strictEqual(report2.defensiveness, "Extreme", `Expected Extreme defensiveness, got ${report2.defensiveness}`);
assert.strictEqual(report2.isOptimal, false, "Defensive statement must not be optimal");
console.log(`  ✓ Case 2 (Defensive): Score=${report2.accountability}%, Defensiveness=${report2.defensiveness}, Optimal=${report2.isOptimal}`);

// Case 3: Boilerplate statement
const boilerplateText =
  "We are aware of minor latency and thank our community for their patience. Our Black Friday discounts remain active! Shop till you drop!";
const report3 = evaluateBrandTone(boilerplateText);
assert(report3.accountability < 50, `Expected accountability < 50, got ${report3.accountability}`);
assert.strictEqual(report3.isOptimal, false, "Boilerplate statement must not be optimal");
console.log(`  ✓ Case 3 (Boilerplate): Score=${report3.accountability}%, Defensiveness=${report3.defensiveness}, Optimal=${report3.isOptimal}`);

// Case 4: Reassurance with partner banks (should NOT trigger false blame penalty)
const bankReassuranceText =
  "We apologize for the checkout concurrency bug. We have notified customer banks to instantly release pending authorization holds. All accounts are 100% secure.";
const report4 = evaluateBrandTone(bankReassuranceText);
assert(report4.accountability >= 75, `Expected accountability >= 75 without false blame penalty, got ${report4.accountability}`);
assert.strictEqual(report4.defensiveness, "Low", `Expected Low defensiveness for bank notification, got ${report4.defensiveness}`);
assert.strictEqual(report4.isOptimal, true, "Bank reassurance statement must remain optimal");
console.log(`  ✓ Case 4 (Bank Reassurance Non-Penalty): Score=${report4.accountability}%, Defensiveness=${report4.defensiveness}, Optimal=${report4.isOptimal}`);

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: React 19 Server-Side Rendering (SSR) Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ [SUITE 4] React Server Component Rendering Verification");

function createSandboxedRequire() {
  return function customRequire(id) {
    if (id === "react") return React;
    if (id === "react/jsx-runtime") return webRequire("react/jsx-runtime");
    if (id === "react/jsx-dev-runtime") return webRequire("react/jsx-dev-runtime");
    if (id === "next/dynamic") {
      return (loader) => {
        return function MockDynamic(props) {
          return React.createElement("div", {
            "data-testid": "mock-dynamic-avatar",
            "data-domain": props.domain || "brand",
          });
        };
      };
    }
    if (id === "framer-motion") {
      const createMotionComponent = (tag) => {
        return React.forwardRef(({ children, ...props }, ref) => {
          const domProps = { ...props, ref };
          delete domProps.initial;
          delete domProps.animate;
          delete domProps.exit;
          delete domProps.transition;
          delete domProps.whileHover;
          delete domProps.whileTap;
          return React.createElement(tag, domProps, children);
        });
      };
      return {
        motion: {
          div: createMotionComponent("div"),
          button: createMotionComponent("button"),
          span: createMotionComponent("span"),
          path: createMotionComponent("path"),
        },
        AnimatePresence: ({ children }) => children,
      };
    }
    if (id.includes("eval")) {
      return {
        submitBrandCrisisAction: async () => ({ success: true }),
      };
    }
    if (id.includes("AvatarScene")) {
      return function MockAvatarScene(props) {
        return React.createElement("div", {
          "data-testid": "mock-avatar-scene",
          "data-domain": props.domain || "brand",
        });
      };
    }
    if (id.includes("SocialListeningSubEnv")) return ListeningComponent;
    if (id.includes("BrandContentStudioSubEnv")) return StudioComponent;
    if (id.includes("CrisisCommandSubEnv")) return CommandComponent;
    return {};
  };
}

const sandboxedRequire = createSandboxedRequire();

// 1. SocialListeningSubEnv
const listeningJs = transpile(fs.readFileSync(listeningPath, "utf8"));
const listeningMod = { exports: {} };
new Function("exports", "module", "require", listeningJs)(listeningMod.exports, listeningMod, sandboxedRequire);
const ListeningComponent = listeningMod.exports.default || listeningMod.exports;

// 2. BrandContentStudioSubEnv
const studioSsrMod = { exports: {} };
new Function("exports", "module", "require", studioJs)(studioSsrMod.exports, studioSsrMod, sandboxedRequire);
const StudioComponent = studioSsrMod.exports.default || studioSsrMod.exports;

// 3. CrisisCommandSubEnv
const commandJs = transpile(fs.readFileSync(commandPath, "utf8"));
const commandMod = { exports: {} };
new Function("exports", "module", "require", commandJs)(commandMod.exports, commandMod, sandboxedRequire);
const CommandComponent = commandMod.exports.default || commandMod.exports;

// 4. SocialCommandEnvironment
const masterJs = transpile(fs.readFileSync(masterBrandPath, "utf8"));
const masterMod = { exports: {} };
new Function("exports", "module", "require", masterJs)(masterMod.exports, masterMod, sandboxedRequire);
const MasterComponent = masterMod.exports.default || masterMod.exports;

// Test SSR rendering of Sub-Env 01 (Social Listening)
const mockMentions = [
  {
    id: "m-01",
    platform: "twitter",
    author: "Sarah Jenkins (@tech_sarah)",
    handle: "@tech_sarah",
    avatar: "SJ",
    verified: true,
    followerCount: "28.4k",
    text: "Are you kidding me @AuraCommerce? You charged my card twice for a coat! #AuraOutage #chargedtwice",
    timestamp: "2m ago",
    likes: "2.4k",
    retweets: "812",
    sentiment: "hostile",
    reachImpact: "CRITICAL",
  },
];

const mockPress = [
  {
    id: "press-01",
    outlet: "TechCrunch",
    journalist: "Sarah Koenig",
    email: "sarah.k@techcrunch.com",
    outletTier: "Tier 1 (Tech)",
    deadline: "12m",
    deadlineMinutes: 12,
    urgency: "CRITICAL",
    queryText: "Hearing reports of 10k+ duplicate debits. Will Aura Commerce comment before deadline?",
    status: "pending",
  },
];

const listeningHtml = ReactDOMServer.renderToString(
  React.createElement(ListeningComponent, {
    sessionId: "test-session-brand",
    sentiment: 28,
    setSentiment: () => {},
    mentions: mockMentions,
    setMentions: () => {},
    pressInquiries: mockPress,
    setPressInquiries: () => {},
    publishedStatement: null,
    setPublishedStatement: () => {},
    onAction: async () => {},
    onComplete: () => {},
    demoMode: true,
  })
);
assert(listeningHtml.includes("LIVE SOCIAL LISTENING"), "Listening Sub-Env must render header");
assert(listeningHtml.includes("INCITING CRISIS EVENT"), "Listening Sub-Env must render quote tweet card");
assert(listeningHtml.includes("Search mentions"), "Listening Sub-Env must render live search bar input");
assert(listeningHtml.includes("REAL-TIME SENTIMENT GAUGE"), "Listening Sub-Env must render sentiment gauge");
console.log("  ✓ Sub-Environment 01 (SocialListeningSubEnv): Rendered successfully with search bar and sentiment gauge.");

// Test SSR rendering of Sub-Env 02 (Brand Content Studio)
const studioHtml = ReactDOMServer.renderToString(
  React.createElement(StudioComponent, {
    sessionId: "test-session-brand",
    sentiment: 28,
    setSentiment: () => {},
    mentions: mockMentions,
    setMentions: () => {},
    pressInquiries: mockPress,
    setPressInquiries: () => {},
    publishedStatement: null,
    setPublishedStatement: () => {},
    onAction: async () => {},
    onComplete: () => {},
    demoMode: true,
  })
);
assert(studioHtml.includes("BRAND CONTENT &amp; RESPONSE STUDIO"), "Studio must render header");
assert(studioHtml.includes("CRISIS STATEMENT DRAFT"), "Studio must render draft textarea label");
assert(studioHtml.includes("TEST AGAINST BRAND GUIDELINES"), "Studio must render tone check button");
assert(studioHtml.includes("ACCOUNTABILITY INDEX"), "Studio must render accountability gauge");
console.log("  ✓ Sub-Environment 02 (BrandContentStudioSubEnv): Rendered successfully with tone analysis studio.");

// Test SSR rendering of Sub-Env 03 (Crisis Command)
const commandHtml = ReactDOMServer.renderToString(
  React.createElement(CommandComponent, {
    sessionId: "test-session-brand",
    sentiment: 86,
    setSentiment: () => {},
    mentions: mockMentions,
    setMentions: () => {},
    pressInquiries: mockPress,
    setPressInquiries: () => {},
    publishedStatement: null,
    setPublishedStatement: () => {},
    onAction: async () => {},
    onComplete: () => {},
    demoMode: true,
  })
);
assert(commandHtml.includes("CRISIS COMMAND CENTER"), "Command must render header");
assert(commandHtml.includes("PRESS INQUIRY QUEUE"), "Command must render press queue");
assert(commandHtml.includes("EXECUTIVE PR INCIDENT REPORT GENERATOR"), "Command must render PR generator");
assert(commandHtml.includes("86%"), "Command must render 86% recovered sentiment dial");
console.log("  ✓ Sub-Environment 03 (CrisisCommandSubEnv): Rendered successfully with recovery dial and journalist briefings.");

// Test SSR rendering of Master Hub (SocialCommandEnvironment)
const masterHtml = ReactDOMServer.renderToString(
  React.createElement(MasterComponent, {
    sessionId: "test-session-brand",
    onAction: async () => {},
    onComplete: () => {},
    demoMode: true,
    initialSubEnv: 1,
  })
);
assert(masterHtml.includes("AURA COMMERCE // SCOPE 7: THE VIRAL BRAND CRISIS"), "Master must render crisis banner");
assert(masterHtml.includes("01 // SOCIAL LISTENING &amp; SENTIMENT"), "Master must render Tab 1");
assert(masterHtml.includes("02 // RESPONSE STUDIO"), "Master must render Tab 2");
assert(masterHtml.includes("03 // CRISIS COMMAND &amp; PRESS"), "Master must render Tab 3");
console.log("  ✓ SocialCommandEnvironment: Master hub rendered with synchronized tabs and docked 3D HUD.");

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: Evaluator Weights & Scoring
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ [SUITE 5] Evaluator Weights & Scoring Invariants");

const evaluatorJs = transpile(fs.readFileSync(evaluatorPath, "utf8"));
const evaluatorMod = { exports: {} };
new Function("exports", "module", "require", evaluatorJs)(evaluatorMod.exports, evaluatorMod, createMinimalRequire());
const { evaluateSession } = evaluatorMod.exports;

const mockSignals = {
  knowledgeBaseConsultation: true,
  testBeforeShip: true,
  ambiguityResponse: "proactive_clarification",
  toolUsagePattern: ["tone_analyzer", "press_dispatcher"],
  stuckRecovery: true,
  escalationHandling: "addressed",
  communicationClarity: 94,
  structuredDebugging: true,
  edgeCaseConsideration: true,
  tradeoffArticulation: true,
  collaborationSignal: true,
  timeManagement: "methodical",
};

const mockDimensions = {
  approachQuality: 92,
  efficiency: 90,
  creativity: 88,
  errorRecovery: 95,
  beyondKnownAnswer: 88,
  toolUtilization: 92,
  communication: 98,
  ambiguityHandling: 90,
};

const report = evaluateSession(mockSignals, mockDimensions, ["Candidate defused social crisis"], 6, "brand", 25);
assert(report.compositeScore >= 90, `Expected composite >= 90 for exceptional brand crisis run, got ${report.compositeScore}`);
assert.strictEqual(report.tier, "exceptional", `Expected exceptional tier, got ${report.tier}`);
console.log(`  ✓ Evaluator: Brand domain evaluated successfully. Composite=${report.compositeScore}/100, Tier=${report.tier}`);

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: Telemetry Server Action Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ [SUITE 6] Telemetry Server Action Invariants");

function createEvalRequire() {
  return function customRequire(id) {
    if (id === "@ai-sdk/groq") return { createGroq: () => () => ({}) };
    if (id === "ai") return { generateText: async () => ({ text: "" }) };
    if (id.includes("prisma")) {
      return {
        prisma: {
          simulationSession: {
            findUnique: async () => null,
            update: async () => null,
          },
          user: { upsert: async () => null },
          problem: { findMany: async () => [], findUnique: async () => null },
        },
      };
    }
    if (id.includes("problemBank")) return { problemBank: { generateMutatedProblem: () => ({}) } };
    if (id.includes("segmentation")) return { assignSegment: () => "standard", getSegmentModifiers: () => ({}) };
    if (id.includes("observer")) return { observerNode: {} };
    if (id.includes("personas")) return { PersonaOrchestrator: class {} };
    if (id.includes("evaluator")) return { evaluateSession: () => ({ compositeScore: 92 }) };
    return {};
  };
}

const evalJs = transpile(fs.readFileSync(evalPath, "utf8"));
const evalMod = { exports: {} };
new Function("exports", "module", "require", evalJs)(evalMod.exports, evalMod, createEvalRequire());
const { submitBrandCrisisAction } = evalMod.exports;

assert(typeof submitBrandCrisisAction === "function", "submitBrandCrisisAction must be exported");

const testPayloads = [
  { actionType: "ANALYZE_TONE", statementText: accountableText, toneMetrics: report1 },
  { actionType: "PUBLISH_STATEMENT", statementText: accountableText, sentimentScore: 86, toneMetrics: report1 },
  { actionType: "RESPOND_PRESS", outlet: "Bloomberg", statementText: "Financial data safe." },
  { actionType: "GENERATE_PR_REPORT", sentimentScore: 86 },
  { actionType: "FLAG_MENTION", outlet: "@tech_sarah" },
];

for (const payload of testPayloads) {
  const mockState = {
    messages: [],
    cognitiveLoadScore: 50,
    dimensionalScores: { communication: 50, approachQuality: 50 },
    processSignals: {},
    observerNotes: [],
  };

  const res = await submitBrandCrisisAction("demo-session-test", payload, mockState);
  assert.strictEqual(res.success, true, `Telemetry action ${payload.actionType} must succeed`);
  if (payload.actionType === "GENERATE_PR_REPORT") {
    assert.strictEqual(res.isComplete, true, "GENERATE_PR_REPORT with positive sentiment must mark complete");
  }
  console.log(`  ✓ Action ${payload.actionType}: Processed telemetry with persona feedback: "${res.personaFeedback?.slice(0, 40)}..."`);
}

console.log("\n================================================================================");
console.log("ALL SCOPE 7 BRAND DEEP VERIFICATION CHECKS PASSED WITH 100% SUCCESS!");
console.log("================================================================================\n");
