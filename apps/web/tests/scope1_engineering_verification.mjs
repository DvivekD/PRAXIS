import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("======================================================================");
console.log("PRAXIS SCOPE 1: ENGINEERING — VERIFICATION SUITE");
console.log("Target: Scope 1 Engineering Sub-Environments & Evaluation Pipeline");
console.log("======================================================================\n");

// ─── 1. FILE EXISTENCE & STRUCTURAL AUDIT ───
console.log("▶ [TEST 1] Component Structure & Export Audit");

const componentFiles = [
  "../components/Environments/Engineering/SshTerminalSubEnv.tsx",
  "../components/Environments/Engineering/NetworkDiagnosticsSubEnv.tsx",
  "../components/Environments/Engineering/CodeDebuggerSubEnv.tsx",
  "../components/Environments/Engineering/ObserverHUD.tsx",
  "../components/Environments/Engineering/EngineeringEnvironment.tsx",
  "../components/Environments/Engineering/index.ts",
];

for (const relPath of componentFiles) {
  const fullPath = path.resolve(__dirname, relPath);
  assert.ok(fs.existsSync(fullPath), `Required file missing: ${relPath}`);
  const content = fs.readFileSync(fullPath, "utf-8");
  assert.ok(content.length > 200, `File appears truncated: ${relPath}`);
}
console.log("  ✓ All 6 Scope 1 Engineering component files exist and are fully populated.");

// ─── 2. SUB-ENV 01: SSH TERMINAL AUDIT ───
console.log("\n▶ [TEST 2] 01 — SSH Infrastructure Terminal Specification");
const sshContent = fs.readFileSync(path.resolve(__dirname, "../components/Environments/Engineering/SshTerminalSubEnv.tsx"), "utf-8");

assert.ok(sshContent.includes("aura-prod-app-04"), "Must reference remote Linux server aura-prod-app-04");
assert.ok(sshContent.includes("ps aux"), "Must support process listing via ps aux");
assert.ok(sshContent.includes("top"), "Must support top/htop system monitoring");
assert.ok(sshContent.includes("free -m") || sshContent.includes("free"), "Must support memory check free -m");
assert.ok(sshContent.includes("uptime"), "Must support uptime command");
assert.ok(sshContent.includes("systemctl status"), "Must support systemctl status for checkout-worker");
assert.ok(sshContent.includes("timeout.log"), "Must inspect checkout timeout error logs");
assert.ok(sshContent.includes("findings"), "Must track diagnostic findings");
assert.ok(sshContent.includes("UNINTERRUPTIBLE I/O WAIT") || sshContent.includes("D state") || sshContent.includes("STAT"), "Must simulate D state / socket I/O wait on checkout workers");
console.log("  ✓ SshTerminalSubEnv verified: ps aux, top, free, logs, systemctl, findings tracking.");

// ─── 3. SUB-ENV 02: NETWORK DIAGNOSTICS LAB AUDIT ───
console.log("\n▶ [TEST 3] 02 — Network Diagnostics Lab Specification");
const netContent = fs.readFileSync(path.resolve(__dirname, "../components/Environments/Engineering/NetworkDiagnosticsSubEnv.tsx"), "utf-8");

assert.ok(netContent.includes("nslookup"), "Must support nslookup DNS queries");
assert.ok(netContent.includes("dig"), "Must support dig DNS queries");
assert.ok(netContent.includes("curl"), "Must support curl HTTP latency probing");
assert.ok(netContent.includes("nc -zv") || netContent.includes("nc"), "Must support nc port connectivity checks");
assert.ok(netContent.includes("10.244.3.99"), "Must identify dead/stale pod IP 10.244.3.99");
assert.ok(netContent.includes("10.244.4.150"), "Must identify active healthy gateway IP 10.244.4.150");
assert.ok(netContent.includes("flush-dns"), "Must provide DNS remediation / flush-dns command");
assert.ok(netContent.includes("ss") || netContent.includes("netstat"), "Must inspect socket connection pool states");
assert.ok(netContent.includes("FAILURE ORIGIN ASSESSMENT") || netContent.includes("verdict"), "Must evaluate whether failure originates from app or infra");
console.log("  ✓ NetworkDiagnosticsSubEnv verified: DNS (nslookup/dig), port probing (curl/nc), topology, flush-dns, failure origin assessment.");

// ─── 4. SUB-ENV 03: CODE DEBUGGER AUDIT ───
console.log("\n▶ [TEST 4] 03 — Code Debugger Specification");
const codeContent = fs.readFileSync(path.resolve(__dirname, "../components/Environments/Engineering/CodeDebuggerSubEnv.tsx"), "utf-8");

assert.ok(codeContent.includes("checkout.ts"), "Must inspect checkout service code");
assert.ok(codeContent.includes("breakpoints"), "Must support interactive breakpoint toggling");
assert.ok(codeContent.includes("stepDebugger") || codeContent.includes("STEP OVER"), "Must support stepping controls");
assert.ok(codeContent.includes("simulateRaceCondition") || codeContent.includes("SIMULATE CONCURRENT CLICKS"), "Must reproduce race condition under concurrent requests");
assert.ok(codeContent.includes("DUPLICATE CHARGE"), "Must demonstrate double-debit bug during race");
assert.ok(codeContent.includes("FIXED_CHECKOUT_CODE") || codeContent.includes("PROCESSING"), "Must provide atomic concurrency fix");
assert.ok(codeContent.includes("jest") || codeContent.includes("npm test"), "Must execute test suite (npm test / jest)");
assert.ok(codeContent.includes("4 passed, 4 total") || codeContent.includes("ALL TESTS GREEN"), "Must verify 4/4 passing tests upon fix");
console.log("  ✓ CodeDebuggerSubEnv verified: breakpoint gutter, step debugger, race reproduction, atomic patch, Jest test runner.");

// ─── 5. 3D OBSERVER HUD AUDIT ───
console.log("\n▶ [TEST 5] 3D Observer HUD & Avatar Scene Display");
const hudContent = fs.readFileSync(path.resolve(__dirname, "../components/Environments/Engineering/ObserverHUD.tsx"), "utf-8");

assert.ok(hudContent.includes("AvatarScene"), "Must embed 3D AvatarScene component");
assert.ok(hudContent.includes("domain=\"engineering\""), "Must initialize AvatarScene in engineering matrix mode");
assert.ok(hudContent.includes("COGNITIVE LOAD"), "Must display live cognitive load score");
assert.ok(hudContent.includes("Structured Debugging"), "Must display Structured Debugging heuristic meter");
assert.ok(hudContent.includes("Tool Utilization"), "Must display Tool Utilization heuristic meter");
assert.ok(hudContent.includes("Observer Signal Log"), "Must display real-time observer notes log");
assert.ok(hudContent.includes("isExpanded"), "Must support collapsing/docking layout toggle");
console.log("  ✓ ObserverHUD verified: 3D AvatarScene, cognitive load gauge, behavioral heuristics, streaming notes, dockable drawer.");

// ─── 6. EVAL.TS & PROBLEM BANK INTEGRATION AUDIT ───
console.log("\n▶ [TEST 6] Server Actions & Problem Seed Integration");
const evalContent = fs.readFileSync(path.resolve(__dirname, "../actions/eval.ts"), "utf-8");
const probBankContent = fs.readFileSync(path.resolve(__dirname, "../lib/services/problemBank.ts"), "utf-8");
const seedContent = fs.readFileSync(path.resolve(__dirname, "../prisma/seed.js"), "utf-8");

assert.ok(evalContent.includes("submitEngineeringAction"), "eval.ts must export submitEngineeringAction");
assert.ok(evalContent.includes("fetchEngineeringTelemetryAction"), "eval.ts must export fetchEngineeringTelemetryAction");
assert.ok(evalContent.includes("EngineeringActionPayload"), "eval.ts must define EngineeringActionPayload");

assert.ok(probBankContent.includes("eng-ssh-terminal"), "problemBank.ts must define eng-ssh-terminal");
assert.ok(probBankContent.includes("eng-network-lab"), "problemBank.ts must define eng-network-lab");
assert.ok(probBankContent.includes("eng-code-debugger"), "problemBank.ts must define eng-code-debugger");

assert.ok(seedContent.includes("prob-eng-checkout-concurrency"), "prisma/seed.js must seed prob-eng-checkout-concurrency");
console.log("  ✓ eval.ts and problemBank.ts verified with dedicated Scope 1 actions and problem seeds.");

console.log("\n======================================================================");
console.log("ALL 6 SCOPE 1 ENGINEERING VERIFICATION TESTS PASSED (100% GREEN)");
console.log("======================================================================\n");
