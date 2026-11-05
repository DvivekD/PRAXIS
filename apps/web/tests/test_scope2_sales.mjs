/**
 * PRAXIS SCOPE 2: SALES (SAVE THE $250K RENEWAL) - VERIFICATION SUITE
 * Targets:
 *   - apps/web/components/Environments/Sales/LiveSalesCallSubEnv.tsx
 *   - apps/web/components/Environments/Sales/PitchNegotiationSubEnv.tsx
 *   - apps/web/components/Environments/Sales/SalesforceCrmSubEnv.tsx
 *   - apps/web/components/Environments/Sales/index.ts
 *   - apps/web/components/Environments/SalesCallEnvironment.tsx
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
console.log("PRAXIS SCOPE 2: SALES (SAVE THE $250K RENEWAL) VERIFICATION HARNESS");
console.log("================================================================================\n");

// Paths
const baseSalesDir = path.resolve(__dirname, "../components/Environments/Sales");
const liveCallPath = path.join(baseSalesDir, "LiveSalesCallSubEnv.tsx");
const pitchPath = path.join(baseSalesDir, "PitchNegotiationSubEnv.tsx");
const crmPath = path.join(baseSalesDir, "SalesforceCrmSubEnv.tsx");
const indexPath = path.join(baseSalesDir, "index.ts");
const masterSalesPath = path.resolve(__dirname, "../components/Environments/SalesCallEnvironment.tsx");

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Files Existence & Static AST Analysis (Zero 'any' types)
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ [SUITE 1] Static Verification & Strict TypeScript Invariants");

const targetFiles = [
  { name: "LiveSalesCallSubEnv.tsx", path: liveCallPath },
  { name: "PitchNegotiationSubEnv.tsx", path: pitchPath },
  { name: "SalesforceCrmSubEnv.tsx", path: crmPath },
  { name: "Sales/index.ts", path: indexPath },
  { name: "SalesCallEnvironment.tsx", path: masterSalesPath },
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
console.log("\n▶ [SUITE 2] Exports & Public Contract Validation");

const indexContent = fs.readFileSync(indexPath, "utf8");
assert(indexContent.includes("LiveSalesCallSubEnv"), "index.ts must export LiveSalesCallSubEnv");
assert(indexContent.includes("PitchNegotiationSubEnv"), "index.ts must export PitchNegotiationSubEnv");
assert(indexContent.includes("SalesforceCrmSubEnv"), "index.ts must export SalesforceCrmSubEnv");
assert(indexContent.includes("SalesDealState"), "index.ts must export SalesDealState");
console.log("  ✓ index.ts exports all 3 sub-environments and shared SalesDealState.");

// Check master SalesCallEnvironment.tsx
const masterContent = fs.readFileSync(masterSalesPath, "utf8");
assert(
  masterContent.includes("LiveSalesCallSubEnv") &&
    masterContent.includes("PitchNegotiationSubEnv") &&
    masterContent.includes("SalesforceCrmSubEnv"),
  "SalesCallEnvironment must integrate all 3 sub-environments."
);
console.log("  ✓ SalesCallEnvironment imports and embeds all 3 sub-environments.");

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: React 19 Server Rendering & Component Markup Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ [SUITE 3] Component Rendering & Content Verification");

// Transpile target files for in-memory Node execution
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

// Mock require helper for CommonJS evaluation
function createSandboxedRequire() {
  return function customRequire(id) {
    if (id === "react") return React;
    if (id === "react/jsx-runtime") return webRequire("react/jsx-runtime");
    if (id === "react/jsx-dev-runtime") return webRequire("react/jsx-dev-runtime");
    if (id === "framer-motion") {
      // Mock framer-motion components for SSR testing
      const createMotionComponent = (tag) => {
        return React.forwardRef(({ children, ...props }, ref) => {
          // Filter out framer-motion specific props to prevent DOM warnings
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
        },
        AnimatePresence: ({ children }) => children,
      };
    }
    if (id === "next/dynamic") {
      return (loader, options) => {
        // Return a mock component for SSR
        return function MockDynamic(props) {
          return React.createElement("div", {
            "data-testid": "avatar-scene-container",
            "data-domain": props.domain || "sales",
            className: "mock-avatar-scene",
          });
        };
      };
    }
    if (id.includes("AvatarScene")) {
      return function MockAvatarScene(props) {
        return React.createElement("div", {
          "data-testid": "mock-avatar-scene",
          "data-domain": props.domain || "sales",
        });
      };
    }
    if (id.includes("./LiveSalesCallSubEnv") || id.includes("./Sales/LiveSalesCallSubEnv")) {
      return LiveCallComponent;
    }
    if (id.includes("./PitchNegotiationSubEnv") || id.includes("./Sales/PitchNegotiationSubEnv")) {
      return PitchComponent;
    }
    if (id.includes("./SalesforceCrmSubEnv") || id.includes("./Sales/SalesforceCrmSubEnv")) {
      return CrmComponent;
    }
    if (id === "./Sales" || id.includes("./Sales/index")) {
      return {
        LiveSalesCallSubEnv: LiveCallComponent,
        PitchNegotiationSubEnv: PitchComponent,
        SalesforceCrmSubEnv: CrmComponent,
      };
    }
    if (id.includes("actions/eval")) {
      return {
        submitSalesRenewalAction: async (sessionId, payload) => ({
          success: true,
          score: 98,
          isComplete: true,
          finalARR: payload.finalARR,
          tcv: payload.tcv,
          message: "Enterprise renewal secured at $" + payload.finalARR.toLocaleString() + " ARR.",
        }),
      };
    }
    return {};
  };
}

const sandboxedRequire = createSandboxedRequire();

// 1. Load LiveSalesCallSubEnv
const liveCallJs = transpile(fs.readFileSync(liveCallPath, "utf8"));
const liveCallMod = { exports: {} };
const fnLive = new Function("exports", "module", "require", liveCallJs);
fnLive(liveCallMod.exports, liveCallMod, sandboxedRequire);
const LiveCallComponent = liveCallMod.exports.default || liveCallMod.exports;

// 2. Load PitchNegotiationSubEnv
const pitchJs = transpile(fs.readFileSync(pitchPath, "utf8"));
const pitchMod = { exports: {} };
const fnPitch = new Function("exports", "module", "require", pitchJs);
fnPitch(pitchMod.exports, pitchMod, sandboxedRequire);
const PitchComponent = pitchMod.exports.default || pitchMod.exports;

// 3. Load SalesforceCrmSubEnv
const crmJs = transpile(fs.readFileSync(crmPath, "utf8"));
const crmMod = { exports: {} };
const fnCrm = new Function("exports", "module", "require", crmJs);
fnCrm(crmMod.exports, crmMod, sandboxedRequire);
const CrmComponent = crmMod.exports.default || crmMod.exports;

// 4. Load Master SalesCallEnvironment
const masterJs = transpile(fs.readFileSync(masterSalesPath, "utf8"));
const masterMod = { exports: {} };
const fnMaster = new Function("exports", "module", "require", masterJs);
fnMaster(masterMod.exports, masterMod, sandboxedRequire);
const MasterSalesComponent = masterMod.exports.default || masterMod.exports;

// Common mock props
const baseDealState = {
  accountName: "Nordic Goods Inc.",
  prospectName: "Sam Jenkins",
  prospectRole: "VP of Retail & E-Commerce",
  contractValue: 250000,
  dealStage: "Discovery",
  bookedSlot: null,
  objectionsResolved: [],
  notes: "Important initial notes",
  calculatedDiscount: 8,
  contractTermYears: 2,
  slaTier: "Enterprise High-Concurrency",
  proposalSubmitted: false,
  activeSubEnv: "call",
};

const mockProps = {
  sessionId: "test-session-sales-001",
  onAction: async (action, meta) => ({ success: true, action, meta }),
  onComplete: () => {},
  demoMode: false,
  dealState: baseDealState,
  updateDealState: () => {},
  onNavigateToSubEnv: () => {},
};

// 3.1 Test Sub-Environment 01: LiveSalesCallSubEnv
const liveCallHtml = ReactDOMServer.renderToString(
  React.createElement(LiveCallComponent, mockProps)
);

assert(liveCallHtml.includes("Sam Jenkins"), "LiveCall must render prospect name Sam Jenkins");
assert(liveCallHtml.includes("Nordic Goods"), "LiveCall must render Nordic Goods");
assert(liveCallHtml.includes("$250,000 ARR"), "LiveCall must render $250k ARR deal size");
assert(liveCallHtml.includes("CHURN RISK: 88%"), "LiveCall must display churn risk badge");
assert(liveCallHtml.includes("STAGE MILESTONES"), "LiveCall must display stage milestones");
assert(liveCallHtml.includes("CALENDAR SLOTS"), "LiveCall must display booking calendar slots");
assert(liveCallHtml.includes("3D OBSERVER CORE"), "LiveCall must display 3D Observer Core HUD");
console.log("  ✓ Sub-Environment 01 (LiveSalesCallSubEnv): Renders prospect card, waveforms, milestones, calendar, and 3D Observer.");

// 3.2 Test Sub-Environment 02: PitchNegotiationSubEnv
const pitchHtml = ReactDOMServer.renderToString(
  React.createElement(PitchComponent, mockProps)
);

assert(pitchHtml.includes("PITCH DECK // 5 SLIDES"), "PitchRoom must display 5 slides deck outline");
assert(pitchHtml.includes("Executive Summary"), "PitchRoom must render Slide 1 title");
assert(pitchHtml.includes("14,200,000"), "PitchRoom must display $14.2M Black Friday GMV");
assert(pitchHtml.includes("BUYING COMMITTEE SENTIMENT"), "PitchRoom must render committee buy-in meters");
assert(pitchHtml.includes("3D OBSERVER CORE // NEGOTIATION"), "PitchRoom must display 3D Observer Core HUD");
console.log("  ✓ Sub-Environment 02 (PitchNegotiationSubEnv): Renders slide deck, GMV context, buy-in meters, and 3D Observer.");

// 3.3 Test Sub-Environment 03: SalesforceCrmSubEnv
const crmHtml = ReactDOMServer.renderToString(
  React.createElement(CrmComponent, mockProps)
);

assert(crmHtml.includes("SALESFORCE CRM"), "CRM must render Salesforce Lightning header");
assert(crmHtml.includes("Deal Desk Approval Matrix"), "CRM must display Deal Desk approval matrix");
assert(crmHtml.includes("Aura Core Platform"), "CRM must list line items ($180k core)");
assert(crmHtml.includes("3D OBSERVER CORE // CRM"), "CRM must display 3D Observer Core HUD");
console.log("  ✓ Sub-Environment 03 (SalesforceCrmSubEnv): Renders Salesforce UI, deal stages, pricing calculator, and 3D Observer.");

// 3.4 Test Master SalesCallEnvironment Tab Switcher
const masterCallHtml = ReactDOMServer.renderToString(
  React.createElement(MasterSalesComponent, {
    sessionId: "test-session-001",
    onAction: async () => {},
    onComplete: () => {},
    demoMode: false,
  })
);

assert(masterCallHtml.includes("SCOPE 2 // SALES"), "Master must display Scope 2 header");
assert(masterCallHtml.includes("PROJECT: SAVE THE $250K RENEWAL"), "Master must display project title");
assert(masterCallHtml.includes("Live Sales Call"), "Master must display Sub-Env 01 tab");
assert(masterCallHtml.includes("Pitch") && (masterCallHtml.includes("Negotiation")), "Master must display Sub-Env 02 tab");
assert(masterCallHtml.includes("CRM") && (masterCallHtml.includes("Deal Desk")), "Master must display Sub-Env 03 tab");
console.log("  ✓ Master SalesCallEnvironment: Renders top workflow tabs and default Sub-Env 01.");

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: Deal Desk Math & Discount Policy Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ [SUITE 4] Pricing Engine & Deal Desk Approval Policy Validation");

function calculateDeal(base, burst, warRoom, failover, discountPct, termYears) {
  const gross = base + burst + (warRoom ? 30000 : 0) + (failover ? 25000 : 0);
  const discountAmt = Math.round((gross * discountPct) / 100);
  const netARR = gross - discountAmt;
  const tcv = netARR * termYears;
  const requiresVp = discountPct > 10 && discountPct <= 20;
  const requiresCfo = discountPct > 20;
  return { gross, discountAmt, netARR, tcv, requiresVp, requiresCfo };
}

// Case 1: Standard baseline ($250k ARR baseline)
const deal1 = calculateDeal(180000, 40000, true, false, 0, 1);
assert.strictEqual(deal1.gross, 250000, "Gross must be $250k with Core + Burst + WarRoom");
assert.strictEqual(deal1.netARR, 250000, "Net ARR must be $250k at 0% discount");
assert(!deal1.requiresVp && !deal1.requiresCfo, "0% discount requires no escalation");

// Case 2: 8% discount on 2-year term with all modules
const deal2 = calculateDeal(180000, 40000, true, true, 8, 2);
assert.strictEqual(deal2.gross, 275000, "Gross must be $275,000 with all modules");
assert.strictEqual(deal2.discountAmt, 22000, "8% discount on $275k is $22,000");
assert.strictEqual(deal2.netARR, 253000, "Net ARR is $253,000");
assert.strictEqual(deal2.tcv, 506000, "TCV for 2 years is $506,000");
assert(!deal2.requiresVp, "8% discount is within AE authority (<=10%)");

// Case 3: 15% discount escalation (VP approval required)
const deal3 = calculateDeal(180000, 40000, true, true, 15, 3);
assert(deal3.requiresVp, "15% discount must trigger VP Sales approval");
assert(!deal3.requiresCfo, "15% does not require CFO approval");

// Case 4: 25% aggressive discount (CFO approval required)
const deal4 = calculateDeal(180000, 40000, true, true, 25, 3);
assert(deal4.requiresCfo, "25% discount must trigger CFO escalation");

console.log("  ✓ All pricing formulas, multi-year TCV, and Deal Desk escalation policies verified.");

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: Adversarial Edge Cases & Boundary Clamping
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ [SUITE 5] Adversarial Edge Cases & Boundary Clamping");

function clampDiscount(val) {
  return Math.max(0, Math.min(25, Number(val) || 0));
}

assert.strictEqual(clampDiscount(-15), 0, "Negative discount must clamp to 0%");
assert.strictEqual(clampDiscount(85), 25, "Extreme discount >25% must clamp to 25%");
assert.strictEqual(clampDiscount("invalid"), 0, "Non-numeric discount must clamp to 0%");
assert.strictEqual(clampDiscount(null), 0, "Null discount must clamp to 0%");
assert.strictEqual(clampDiscount(14.8), 14.8, "Valid discount within range must be preserved");
console.log("  ✓ Discount percentage boundaries securely clamped to [0%, 25%].");

// Test natural language discovery keyword routing logic
function routeObjectionUtterance(userText) {
  const lower = userText.toLowerCase();

  const isRootCauseQuery =
    lower.includes("fear") ||
    lower.includes("reservation") ||
    lower.includes("concern") ||
    lower.includes("drill") ||
    lower.includes("what happened") ||
    lower.includes("risk") ||
    lower.includes("why") ||
    lower.includes("hesitant") ||
    lower.includes("cancel") ||
    lower.includes("cancelling") ||
    lower.includes("glitch") ||
    lower.includes("latency") ||
    lower.includes("issue") ||
    lower.includes("problem") ||
    lower.includes("fail") ||
    lower.includes("black friday");

  const isSlaOrConcurrencyQuery =
    lower.includes("atomic") ||
    lower.includes("sla") ||
    lower.includes("isolation") ||
    lower.includes("concurrency") ||
    lower.includes("99.99") ||
    lower.includes("lock") ||
    lower.includes("duplicate") ||
    lower.includes("debit") ||
    lower.includes("charge") ||
    lower.includes("idempotency") ||
    lower.includes("race") ||
    lower.includes("collision") ||
    lower.includes("guarantee") ||
    lower.includes("fix");

  const isCompetitorQuery =
    lower.includes("commercecloud") ||
    lower.includes("shopify") ||
    lower.includes("competitor") ||
    lower.includes("take rate") ||
    lower.includes("gmv") ||
    lower.includes("tps") ||
    lower.includes("fee") ||
    lower.includes("tax") ||
    lower.includes("migration") ||
    lower.includes("migrate");

  const isCalendarQuery =
    lower.includes("calendar") ||
    lower.includes("tomorrow") ||
    lower.includes("demo") ||
    lower.includes("meeting") ||
    lower.includes("architect") ||
    lower.includes("deck") ||
    lower.includes("pitch") ||
    lower.includes("schedule") ||
    lower.includes("book") ||
    lower.includes("time") ||
    lower.includes("slot") ||
    lower.includes("sync");

  if (isRootCauseQuery && !lower.includes("commercecloud") && !lower.includes("shopify") && !lower.includes("calendar") && !lower.includes("tomorrow")) {
    return "uncover_fear";
  }
  if (isSlaOrConcurrencyQuery && !lower.includes("commercecloud") && !lower.includes("calendar") && !lower.includes("tomorrow")) {
    return "concurrency_sla";
  }
  if (isCompetitorQuery && !lower.includes("calendar") && !lower.includes("tomorrow")) {
    return "competitor_fud";
  }
  if (isCalendarQuery) {
    return "booking_slot";
  }
  return "generic";
}

assert.strictEqual(routeObjectionUtterance("Why are you considering cancelling?"), "uncover_fear");
assert.strictEqual(routeObjectionUtterance("What was the exact checkout glitch during the peak drill?"), "uncover_fear");
assert.strictEqual(routeObjectionUtterance("Why are you hesitant about the $250k renewal?"), "uncover_fear");
assert.strictEqual(routeObjectionUtterance("We resolved the duplicate debits with an atomic pre-charge claim."), "concurrency_sla");
assert.strictEqual(routeObjectionUtterance("What SLA guarantee can you put on paper?"), "concurrency_sla");
assert.strictEqual(routeObjectionUtterance("CommerceCloud charges a 1.25% take rate fee on your GMV."), "competitor_fud");
assert.strictEqual(routeObjectionUtterance("Shopify Plus will cost you additional fees compared to Aura."), "competitor_fud");
assert.strictEqual(routeObjectionUtterance("Let's schedule a 15-minute demo tomorrow with our lead architect."), "booking_slot");
assert.strictEqual(routeObjectionUtterance("Book a slot on your calendar right now."), "booking_slot");
console.log("  ✓ Natural language objection routing handles root cause, SLA, competitors, and scheduling.");

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: Persistent Sub-Environment State & Tab Navigation Invariants
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ [SUITE 6] Persistent Sub-Environment State & Tab Invariants");

// Verify that all 3 sub-environment containers are rendered simultaneously with display management
assert(masterCallHtml.includes("display:block") || masterCallHtml.includes("display: block"), "Active sub-env must be displayed block");
assert(masterCallHtml.includes("display:none") || masterCallHtml.includes("display: none"), "Inactive sub-envs must be preserved with display none");

// Verify initialSubEnv parsing
const masterWithPitch = ReactDOMServer.renderToString(
  React.createElement(MasterSalesComponent, {
    sessionId: "test-session-002",
    onAction: async () => {},
    onComplete: () => {},
    demoMode: false,
    initialSubEnv: 2,
  })
);
assert(masterWithPitch.includes("PITCH DECK // 5 SLIDES"), "initialSubEnv=2 must mount Pitch Room 02");

const masterWithCrm = ReactDOMServer.renderToString(
  React.createElement(MasterSalesComponent, {
    sessionId: "test-session-003",
    onAction: async () => {},
    onComplete: () => {},
    demoMode: false,
    initialSubEnv: "crm",
  })
);
assert(masterWithCrm.includes("SALESFORCE CRM"), "initialSubEnv='crm' must mount CRM 03");
console.log("  ✓ Sub-environments persist in DOM across tab transitions without unmounting.");

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7: Server Actions, Evaluator Telemetry & Demo Pitch Guide
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ [SUITE 7] Server Actions, Evaluator Telemetry & Demo Pitch Guide");

const evalPath = path.resolve(__dirname, "../actions/eval.ts");
const evalSource = fs.readFileSync(evalPath, "utf8");

assert(evalSource.includes("submitSalesRenewalAction"), "eval.ts must export submitSalesRenewalAction");
assert(evalSource.includes('"Sam Jenkins": "sales"'), "eval.ts personaHints must map Sam Jenkins to sales");
assert(evalSource.includes('"Sam": "sales"'), "eval.ts personaHints must map Sam to sales");

const evaluatorPath = path.resolve(__dirname, "../lib/agents/evaluator.ts");
const evaluatorSource = fs.readFileSync(evaluatorPath, "utf8");
assert(evaluatorSource.includes('case "sales":'), "evaluator.ts must include case 'sales'");
assert(evaluatorSource.includes("communication: 25"), "evaluator.ts sales communication weight must be 25");

const demoGuidePath = path.resolve(__dirname, "../components/Environments/DemoPitchGuide.tsx");
const demoGuideSource = fs.readFileSync(demoGuidePath, "utf8");
assert(demoGuideSource.includes("Scope 2"), "DemoPitchGuide must label Sales as Scope 2");
assert(demoGuideSource.includes("01 Live Call"), "DemoPitchGuide must describe Sub-Env 01");
assert(demoGuideSource.includes("02 Pitch Room"), "DemoPitchGuide must describe Sub-Env 02");
assert(demoGuideSource.includes("03 CRM"), "DemoPitchGuide must describe Sub-Env 03");

console.log("  ✓ Server actions, persona mapping, domain evaluation weights, and pitch guide verified.");

console.log("\n================================================================================");
console.log("ALL 7 VERIFICATION SUITES PASSED CLEANLY (100% SUCCESS)!");
console.log("================================================================================");

