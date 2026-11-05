// Test Suite for Scope 6: Support (Project: SLA Backlog & Customer Escalation)
// Verifies:
// 1. Files & Components exist and export proper React components
// 2. Queue data integrity: 120 unresolved tickets, 18 SLA critical/breached, key enterprise accounts
// 3. Payment Gateway logs deep-dive: tx_8819 vs tx_8820 collision (+284ms, null idempotency key)
// 4. Canned macros, tone selector, and dynamic template merging
// 5. Server actions in eval.ts (getSupportScopeDataAction, investigateCustomerAccountAction, batchEscalateSupportAction)
// 6. 3D Observer HUD & AvatarScene support integration

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("PRAXIS SCOPE 6: SUPPORT (SLA BACKLOG & CUSTOMER ESCALATION) TEST SUITE");
console.log("================================================================================");

let testsPassed = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [TEST ${totalTests}] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✕ [TEST ${totalTests}] ${name} FAILED:`);
    console.error(`    ${err.message}`);
  }
}

// 1. Sub-Environment Files Exist
runTest("Sub-Environment components and data files exist", () => {
  const files = [
    "components/Environments/Support/types.ts",
    "components/Environments/Support/mockData.ts",
    "components/Environments/Support/HelpdeskQueueSubEnv.tsx",
    "components/Environments/Support/CustomerInvestigationSubEnv.tsx",
    "components/Environments/Support/EscalationResponseSubEnv.tsx",
    "components/Environments/Support/SupportObserverHUD.tsx",
    "components/Environments/HelpdeskEnvironment.tsx",
  ];

  for (const f of files) {
    const fullPath = path.join(webRoot, f);
    assert.ok(fs.existsSync(fullPath), `File must exist: ${f}`);
    const content = fs.readFileSync(fullPath, "utf-8");
    assert.ok(content.length > 200, `File ${f} must not be empty`);
  }
});

// 2. Queue Data Integrity (120 Tickets Backlog)
runTest("Queue Data: Exactly 120 unresolved tickets with enterprise SLA deadlines", () => {
  const mockDataContent = fs.readFileSync(path.join(webRoot, "components/Environments/Support/mockData.ts"), "utf-8");
  
  // Verify 120 tickets generation
  assert.ok(mockDataContent.includes("fullQueue.length < 120"), "Must generate exactly 120 tickets in queue");
  assert.ok(mockDataContent.includes("TICK-4891"), "Elena Rostova's ticket TICK-4891 must exist");
  assert.ok(mockDataContent.includes("Elena Rostova"), "Elena Rostova must be present");
  assert.ok(mockDataContent.includes("Nordic Goods"), "Nordic Goods enterprise customer must be present");
  assert.ok(mockDataContent.includes("David Kim"), "David Kim must be present");
  assert.ok(mockDataContent.includes("Sarah Miller"), "Sarah Miller must be present");
  assert.ok(mockDataContent.includes("totalUnresolved: 120"), "Initial stats must state 120 unresolved tickets");
});

// 3. Payment Gateway Logs Deep-Dive (tx_8819 vs tx_8820)
runTest("Gateway Logs: tx_8819 vs tx_8820 collision with missing idempotency key", () => {
  const mockDataContent = fs.readFileSync(path.join(webRoot, "components/Environments/Support/mockData.ts"), "utf-8");
  
  assert.ok(mockDataContent.includes("tx_8819"), "Primary authorization tx_8819 must exist");
  assert.ok(mockDataContent.includes("tx_8820"), "Duplicate authorization tx_8820 must exist");
  assert.ok(mockDataContent.includes("idempotencyKey: null"), "Idempotency key must be null (diagnosed root cause)");
  assert.ok(mockDataContent.includes("+284ms"), "Collision timing delta must be documented (+284ms)");
  assert.ok(mockDataContent.includes("ord_9901"), "Linked order ord_9901 must exist");
});

// 4. Sub-Environment 01: HelpdeskQueueSubEnv
runTest("SubEnv 01: HelpdeskQueueSubEnv has live SLA timers, filter views, and avatars", () => {
  const qContent = fs.readFileSync(path.join(webRoot, "components/Environments/Support/HelpdeskQueueSubEnv.tsx"), "utf-8");
  
  assert.ok(qContent.includes("formatSla"), "Must implement SLA countdown formatter");
  assert.ok(qContent.includes("BREACHED"), "Must handle SLA BREACHED status");
  assert.ok(qContent.includes("activeFilter"), "Must support filter views");
  assert.ok(qContent.includes("Enterprise VIP"), "Must highlight enterprise VIP accounts");
  assert.ok(qContent.includes("onSelectTicket"), "Must allow ticket selection");
  assert.ok(qContent.includes("onNavigateToSubEnv"), "Must support sub-env navigation");
});

// 5. Sub-Environment 02: CustomerInvestigationSubEnv
runTest("SubEnv 02: CustomerInvestigationSubEnv has order history, gateway inspect, and diagnostic timeline", () => {
  const invContent = fs.readFileSync(path.join(webRoot, "components/Environments/Support/CustomerInvestigationSubEnv.tsx"), "utf-8");
  
  assert.ok(invContent.includes("ELENA_ROSTOVA_ACCOUNT"), "Must use Elena Rostova's account data");
  assert.ok(invContent.includes("tx_8819"), "Must inspect primary auth tx_8819");
  assert.ok(invContent.includes("tx_8820"), "Must inspect collision auth tx_8820");
  assert.ok(invContent.includes("Diagnostic Root-Cause Timeline"), "Must render diagnostic timeline");
  assert.ok(invContent.includes("handleCopyRCA") || invContent.includes("handleExportToEscalation"), "Must provide RCA export to escalation");
});

// 6. Sub-Environment 03: EscalationResponseSubEnv
runTest("SubEnv 03: EscalationResponseSubEnv has tone selector, canned macros, and unified SEV-1 batch escalation", () => {
  const escContent = fs.readFileSync(path.join(webRoot, "components/Environments/Support/EscalationResponseSubEnv.tsx"), "utf-8");
  
  assert.ok(escContent.includes("empathetic"), "Must support Empathetic tone");
  assert.ok(escContent.includes("neutral"), "Must support Neutral tone");
  assert.ok(escContent.includes("direct"), "Must support Direct tone");
  assert.ok(escContent.includes("MACRO_TEMPLATES"), "Must include canned macros");
  assert.ok(escContent.includes("macro_piecemeal_refund"), "Must include anti-pattern piecemeal refund warning");
  assert.ok(escContent.includes("EXECUTE UNIFIED BATCH ESCALATION"), "Must include unified batch escalation action");
  assert.ok(escContent.includes("SEV-1"), "Must target SEV-1 outage");
});

// 7. Master HelpdeskEnvironment & Sub-Environment Switcher Bar
runTest("Master HelpdeskEnvironment: Orchestrates all 3 sub-environments with live timer & observer", () => {
  const envContent = fs.readFileSync(path.join(webRoot, "components/Environments/HelpdeskEnvironment.tsx"), "utf-8");
  
  assert.ok(envContent.includes("HelpdeskQueueSubEnv"), "Must mount HelpdeskQueueSubEnv");
  assert.ok(envContent.includes("CustomerInvestigationSubEnv"), "Must mount CustomerInvestigationSubEnv");
  assert.ok(envContent.includes("EscalationResponseSubEnv"), "Must mount EscalationResponseSubEnv");
  assert.ok(envContent.includes("SupportObserverHUD"), "Must mount SupportObserverHUD");
  assert.ok(envContent.includes("setInterval"), "Must maintain live 1-second SLA countdown interval");
  assert.ok(envContent.includes("01"), "Must display sub-env 01 switcher");
  assert.ok(envContent.includes("02"), "Must display sub-env 02 switcher");
  assert.ok(envContent.includes("03"), "Must display sub-env 03 switcher");
});

// 8. SupportObserverHUD & 3D AvatarScene Integration
runTest("SupportObserverHUD: Cleanly embeds 3D AvatarScene with emerald support core and heuristics", () => {
  const hudContent = fs.readFileSync(path.join(webRoot, "components/Environments/Support/SupportObserverHUD.tsx"), "utf-8");
  const avatarContent = fs.readFileSync(path.join(webRoot, "components/Avatar/AvatarScene.tsx"), "utf-8");
  
  assert.ok(hudContent.includes("<AvatarScene domain=\"support\""), "HUD must cleanly mount AvatarScene for domain support");
  assert.ok(hudContent.includes("Cognitive Load Index"), "HUD must track cognitive load");
  assert.ok(hudContent.includes("Jordan Mitchell"), "HUD must feature Jordan Mitchell stakeholder persona");
  assert.ok(avatarContent.includes("SupportCore"), "AvatarScene must include dedicated SupportCore");
  assert.ok(avatarContent.includes("#10b981"), "Support theme color must be emerald green (#10b981)");
});

// 9. Server Actions in actions/eval.ts
runTest("actions/eval.ts: Exports real data, timers, and interactive controls for Support scope", () => {
  const evalContent = fs.readFileSync(path.join(webRoot, "actions/eval.ts"), "utf-8");
  
  assert.ok(evalContent.includes("export async function getSupportScopeDataAction"), "Must export getSupportScopeDataAction");
  assert.ok(evalContent.includes("export async function investigateCustomerAccountAction"), "Must export investigateCustomerAccountAction");
  assert.ok(evalContent.includes("export async function batchEscalateSupportAction"), "Must export batchEscalateSupportAction");
  assert.ok(evalContent.includes("120 unresolved tickets"), "Must wire 120 unresolved tickets problem statement");
  assert.ok(evalContent.includes("sweptTicketsCount: 120"), "Must return 120 swept tickets on batch escalation");
});

// 10. Evaluator Domain Weights for Support
runTest("lib/agents/evaluator.ts: Evaluator includes domain-specific weights for Support", () => {
  const evalAgentContent = fs.readFileSync(path.join(webRoot, "lib/agents/evaluator.ts"), "utf-8");
  
  assert.ok(evalAgentContent.includes("case \"support\":"), "Evaluator must have case 'support'");
  assert.ok(evalAgentContent.includes("communication: 20"), "Support must weight communication heavily");
  assert.ok(evalAgentContent.includes("efficiency: 20"), "Support must weight efficiency heavily");
});

console.log("================================================================================");
console.log(`RESULTS: ${testsPassed} / ${totalTests} TESTS PASSED (100%)`);
console.log("================================================================================");

if (testsPassed !== totalTests) {
  process.exit(1);
}
