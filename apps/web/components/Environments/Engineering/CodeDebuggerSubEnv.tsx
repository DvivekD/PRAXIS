"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CodeDebuggerSubEnvProps {
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any> | void;
  onComplete?: () => void;
  onTestsPassing?: () => void;
}

const BUGGY_CHECKOUT_CODE = `// /var/www/aura-commerce/src/checkout.ts
import { paymentGateway } from './services/gateway';
import { orderStore } from './db/orders';

export async function processPayment(orderId: string, amount: number): Promise<boolean> {
  const order = await orderStore.find(orderId);
  if (!order) throw new Error("Order not found");

  // ✕ BUG: Payment gateway charged BEFORE idempotency flag is verified & committed!
  // Concurrently fired requests both hit the charge API before either writes 'PAID'.
  const chargeSuccess = await paymentGateway.charge(order.customerId, amount);

  // Guard placed AFTER charge allows concurrent clicks to both charge the card!
  if (order.status === "PAID") {
    console.warn("[CHECKOUT] Duplicate execution detected after charge!");
    return false;
  }

  await orderStore.update(orderId, { status: "PAID", chargedAt: Date.now() });
  return chargeSuccess;
}`;

const FIXED_CHECKOUT_CODE = `// /var/www/aura-commerce/src/checkout.ts
import { paymentGateway } from './services/gateway';
import { orderStore } from './db/orders';

export async function processPayment(orderId: string, amount: number): Promise<boolean> {
  const order = await orderStore.find(orderId);
  if (!order) throw new Error("Order not found");

  // ✓ FIXED: Guard check & atomic status claim placed BEFORE charge dispatch!
  if (order.status === "PAID" || order.status === "PROCESSING") {
    console.info("[CHECKOUT] Prevented duplicate charge on concurrent request.");
    return false;
  }
  await orderStore.update(orderId, { status: "PROCESSING" });

  const chargeSuccess = await paymentGateway.charge(order.customerId, amount);
  await orderStore.update(orderId, { status: "PAID", chargedAt: Date.now() });
  return chargeSuccess;
}`;

const GATEWAY_CODE = `// /var/www/aura-commerce/src/services/gateway.ts
export class PaymentGateway {
  private chargeHistory: Array<{ customerId: string; amount: number; txId: string }> = [];

  async charge(customerId: string, amount: number): Promise<boolean> {
    // Simulated external payment provider roundtrip
    await new Promise((r) => setTimeout(r, 45));
    const txId = "tx_" + Math.floor(Math.random() * 9000 + 1000);
    this.chargeHistory.push({ customerId, amount, txId });
    return true;
  }

  getHistory() {
    return this.chargeHistory;
  }
}
export const paymentGateway = new PaymentGateway();`;

const ORDERS_CODE = `// /var/www/aura-commerce/src/db/orders.ts
export interface Order {
  id: string;
  customerId: string;
  amount: number;
  status: "PENDING" | "PROCESSING" | "PAID";
  chargedAt?: number;
}

export const orderStore = {
  orders: new Map<string, Order>([
    ["ord_9901", { id: "ord_9901", customerId: "usr_4401", amount: 149.00, status: "PENDING" }]
  ]),
  async find(id: string) { return this.orders.get(id); },
  async update(id: string, patch: Partial<Order>) {
    const o = this.orders.get(id);
    if (o) Object.assign(o, patch);
  }
};`;

const TESTS_CODE = `// /var/www/aura-commerce/tests/checkout.test.ts
import { processPayment } from '../src/checkout';
import { orderStore } from '../src/db/orders';
import { paymentGateway } from '../src/services/gateway';

describe('Checkout Concurrency Suite', () => {
  it('should calculate cart total with taxes', () => expect(149 * 1.08).toBeCloseTo(160.92));
  it('should validate inventory availability', () => expect(orderStore.find('ord_9901')).toBeTruthy());

  it('should prevent double charges on concurrent rapid clicks', async () => {
    // Simulating two parallel requests fired in same millisecond
    const [res1, res2] = await Promise.all([
      processPayment('ord_9901', 149),
      processPayment('ord_9901', 149)
    ]);
    const totalCharges = paymentGateway.getHistory().filter(c => c.customerId === 'usr_4401').length;
    expect(totalCharges).toBe(1); // Only 1 charge must succeed!
  });
});`;

export default function CodeDebuggerSubEnv({
  onAction,
  onComplete,
  onTestsPassing,
}: CodeDebuggerSubEnvProps) {
  const [activeFile, setActiveFile] = useState<"checkout" | "gateway" | "orders" | "tests">("checkout");
  const [isFixed, setIsFixed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [codeText, setCodeText] = useState(BUGGY_CHECKOUT_CODE);

  // Debugger state
  const [breakpoints, setBreakpoints] = useState<number[]>([10, 14]);
  const [currentLine, setCurrentLine] = useState<number | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugStepIndex, setDebugStepIndex] = useState(0);

  // Concurrency Simulation State
  const [isSimulatingRace, setIsSimulatingRace] = useState(false);
  const [raceTimeline, setRaceTimeline] = useState<Array<{ time: string; thread: string; text: string; isError?: boolean }>>([]);

  // Test Runner state
  const [testOutput, setTestOutput] = useState<string[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [allTestsPassed, setAllTestsPassed] = useState(false);

  const testTerminalEndRef = useRef<HTMLDivElement>(null);

  const isCodeEffectivelyFixed = () => {
    if (isFixed) return true;
    const chargeIdx = codeText.indexOf("paymentGateway.charge");
    if (chargeIdx === -1) return false;
    const beforeCharge = codeText.slice(0, chargeIdx);
    return beforeCharge.includes("order.status") && (beforeCharge.includes("PAID") || beforeCharge.includes("PROCESSING"));
  };

  const getDynamicLocalVars = () => {
    const effectivelyFixed = isCodeEffectivelyFixed();

    if (!isDebugging || currentLine === null) {
      return {
        orderId: '"ord_9901"',
        amount: "149.00",
        orderStatus: effectivelyFixed ? '"PROCESSING"' : '"PENDING"',
        gatewayCharges: effectivelyFixed ? "1 charge (Atomic)" : "2 charges (DUPLICATE!)",
      };
    }

    if (currentLine <= 6) {
      return {
        orderId: '"ord_9901"',
        amount: "149.00",
        orderStatus: "undefined",
        gatewayCharges: "0 charges (uncalled)",
      };
    }

    if (currentLine === 7) {
      return {
        orderId: '"ord_9901"',
        amount: "149.00",
        orderStatus: '"PENDING"',
        gatewayCharges: "0 charges (uncalled)",
      };
    }

    if (currentLine >= 10 && currentLine < 16) {
      return {
        orderId: '"ord_9901"',
        amount: "149.00",
        orderStatus: effectivelyFixed ? '"PROCESSING"' : '"PENDING"',
        gatewayCharges: effectivelyFixed ? "1 charge (in flight)" : "2 charges (DUPLICATE DETECTED!)",
      };
    }

    return {
      orderId: '"ord_9901"',
      amount: "149.00",
      orderStatus: effectivelyFixed ? '"PAID"' : '"PAID"',
      gatewayCharges: effectivelyFixed ? "1 charge (Success)" : "2 charges (DOUBLE DEBIT COMMITTED)",
    };
  };

  useEffect(() => {
    setCodeText(isFixed ? FIXED_CHECKOUT_CODE : BUGGY_CHECKOUT_CODE);
  }, [isFixed]);

  useEffect(() => {
    testTerminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [testOutput]);

  const toggleBreakpoint = (lineNum: number) => {
    setBreakpoints((prev) =>
      prev.includes(lineNum) ? prev.filter((l) => l !== lineNum) : [...prev, lineNum]
    );
    onAction(`[DEBUGGER] Toggled breakpoint on line ${lineNum}`);
  };

  const startDebugger = () => {
    setIsDebugging(true);
    setCurrentLine(6); // First statement inside processPayment
    setDebugStepIndex(0);
    onAction("[DEBUGGER] Started debugger session on processPayment");
  };

  const stopDebugger = () => {
    setIsDebugging(false);
    setCurrentLine(null);
    setDebugStepIndex(0);
  };

  const stepDebugger = () => {
    if (!isDebugging) {
      startDebugger();
      return;
    }

    const steps = isFixed
      ? [6, 7, 10, 14, 16, 17, 18]
      : [6, 7, 11, 14, 19, 20];

    const nextIdx = debugStepIndex + 1;
    if (nextIdx < steps.length) {
      setDebugStepIndex(nextIdx);
      setCurrentLine(steps[nextIdx]);
      onAction(`[DEBUGGER] Step Over to line ${steps[nextIdx]}`);
    } else {
      stopDebugger();
    }
  };

  // Reproduce Race Condition
  const simulateRaceCondition = () => {
    setIsSimulatingRace(true);
    setRaceTimeline([]);
    onAction("[DEBUGGER] Dispatched concurrent double-click race condition simulation");

    const events = isFixed
      ? [
          { time: "+0ms", thread: "Request A", text: "Enters processPayment('ord_9901'). Reads order.status='PENDING'." },
          { time: "+1ms", thread: "Request B", text: "Enters processPayment('ord_9901'). Checks guard..." },
          { time: "+2ms", thread: "Request A", text: "✓ Atomically updates order.status = 'PROCESSING'." },
          { time: "+3ms", thread: "Request B", text: "✓ Guard blocks duplicate: order.status is already 'PROCESSING'! Returns false." },
          { time: "+45ms", thread: "Request A", text: "Dispatches paymentGateway.charge(). Billed $149.00 (tx_8819)." },
          { time: "+48ms", thread: "Request A", text: "Updates order.status = 'PAID'. Returns true." },
          { time: "+50ms", thread: "Summary", text: "🎉 SUCCESS: Exactly 1 gateway charge dispatched. Zero duplicate debits." },
        ]
      : [
          { time: "+0ms", thread: "Request A", text: "Enters processPayment('ord_9901'). Reads order.status='PENDING'." },
          { time: "+2ms", thread: "Request B", text: "Enters processPayment('ord_9901'). Reads order.status='PENDING' (RACE WINDOW OPEN!).", isError: true },
          { time: "+15ms", thread: "Request A", text: "Dispatches paymentGateway.charge(). Gateway returns 200 OK (tx_8819)." },
          { time: "+18ms", thread: "Request B", text: "Dispatches paymentGateway.charge(). Gateway returns 200 OK (tx_8820) ✕ DUPLICATE CHARGE!", isError: true },
          { time: "+42ms", thread: "Request A", text: "Evaluates 'if (order.status === PAID)'. Was false before charge! Proceeds." },
          { time: "+44ms", thread: "Request B", text: "Evaluates 'if (order.status === PAID)'. Was false before charge! Proceeds.", isError: true },
          { time: "+50ms", thread: "Request A", text: "Updates order.status = 'PAID'." },
          { time: "+52ms", thread: "Request B", text: "Overwrites order.status = 'PAID'." },
          { time: "+55ms", thread: "Summary", text: "🚨 FLAW REPRODUCED: Customer billed TWICE ($298.00 total) for a single order!", isError: true },
        ];

    events.forEach((evt, idx) => {
      setTimeout(() => {
        setRaceTimeline((prev) => [...prev, evt]);
        if (idx === events.length - 1) {
          setIsSimulatingRace(false);
        }
      }, (idx + 1) * 350);
    });
  };

  // Run Jest Tests
  const runTests = () => {
    setIsRunningTests(true);
    setTestOutput([
      "$ jest tests/checkout.test.ts --verbose",
      "RUNS  tests/checkout.test.ts",
    ]);
    onAction("[TEST_RUNNER] Executing npm test against checkout test suite");

    const passed = isCodeEffectivelyFixed();

    setTimeout(() => {
      if (!passed) {
        setTestOutput([
          "$ jest tests/checkout.test.ts --verbose",
          "  PASS  tests/checkout.test.ts › should calculate cart total with taxes (3ms)",
          "  PASS  tests/checkout.test.ts › should validate inventory availability (4ms)",
          "  FAIL  tests/checkout.test.ts › should prevent double charges on concurrent rapid clicks (48ms)",
          "",
          "    ● Checkout Concurrency Suite › should prevent double charges on concurrent rapid clicks",
          "",
          "      expect(received).toBe(expected) // Object.is equality",
          "",
          "      Expected: 1",
          "      Received: 2",
          "",
          "      41 |     const totalCharges = paymentGateway.getHistory().filter(c => c.customerId === 'usr_4401').length;",
          "    > 42 |     expect(totalCharges).toBe(1);",
          "         |                          ^",
          "      at tests/checkout.test.ts:42:26",
          "",
          "Test Suites: 1 failed, 1 total",
          "Tests:       1 failed, 2 passed, 3 total",
          "Snapshots:   0 total",
          "Time:        0.892 s",
          "Ran all test suites matching /tests\\/checkout.test.ts/i.",
          "",
          "HINT: Move the idempotency check and status update BEFORE paymentGateway.charge()!",
        ]);
        setIsRunningTests(false);
        setAllTestsPassed(false);
      } else {
        setTestOutput([
          "$ jest tests/checkout.test.ts --verbose",
          "  PASS  tests/checkout.test.ts › should calculate cart total with taxes (2ms)",
          "  PASS  tests/checkout.test.ts › should validate inventory availability (3ms)",
          "  PASS  tests/checkout.test.ts › should prevent double charges on concurrent rapid clicks (6ms)",
          "  PASS  tests/checkout.test.ts › should release idempotency lock on gateway error (5ms)",
          "",
          "Test Suites: 1 passed, 1 total",
          "Tests:       4 passed, 4 total",
          "Snapshots:   0 total",
          "Time:        0.914 s",
          "Ran all test suites matching /tests\\/checkout.test.ts/i.",
          "",
          "🎉 [VICTORY] RACE CONDITION RESOLVED — ALL 4 TESTS PASSING (100% GREEN)!",
          "Atomic state claim verified. Double-charges eliminated on Black Friday cluster.",
        ]);
        setIsRunningTests(false);
        setAllTestsPassed(true);
        onTestsPassing?.();
        onAction("[TESTS_PASSING] Candidate successfully fixed checkout race condition. 4/4 Jest tests green.");
      }
    }, 900);
  };

  const getFileContent = () => {
    switch (activeFile) {
      case "checkout":
        return codeText;
      case "gateway":
        return GATEWAY_CODE;
      case "orders":
        return ORDERS_CODE;
      case "tests":
        return TESTS_CODE;
      default:
        return codeText;
    }
  };

  const lines = getFileContent().split("\n");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#03060c",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: "#f8fafc",
        overflow: "hidden",
      }}
    >
      {/* Top IDE Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 16px",
          background: "#080d16",
          borderBottom: "1px solid #1e293b",
          fontSize: 12,
        }}
      >
        {/* Debugger Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8", marginRight: 6 }}>
            DEBUGGER //
          </span>

          <button
            onClick={stepDebugger}
            title="Step Over (F10)"
            style={{
              padding: "4px 10px",
              background: isDebugging ? "rgba(56,189,248,0.2)" : "#0f172a",
              border: "1px solid #38bdf8",
              color: "#38bdf8",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "inherit",
            }}
          >
            <span>↷</span>
            <span>{isDebugging ? "STEP OVER [F10]" : "STEP IN"}</span>
          </button>

          {isDebugging && (
            <button
              onClick={stopDebugger}
              title="Stop Debugger"
              style={{
                padding: "4px 8px",
                background: "rgba(239,68,68,0.15)",
                border: "1px solid #ef4444",
                color: "#ef4444",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ■ STOP
            </button>
          )}

          <button
            onClick={simulateRaceCondition}
            disabled={isSimulatingRace}
            style={{
              padding: "4px 10px",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid #f59e0b",
              color: "#f59e0b",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: isSimulatingRace ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "inherit",
            }}
          >
            <span>⚡</span>
            <span>SIMULATE CONCURRENT CLICKS</span>
          </button>
        </div>

        {/* Patch & Test Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {activeFile === "checkout" && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                padding: "4px 10px",
                background: isEditing ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.05)",
                border: isEditing ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.15)",
                color: isEditing ? "#38bdf8" : "#cbd5e1",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {isEditing ? "VIEW CODE [GUTTER]" : "✎ EDIT CODE"}
            </button>
          )}

          <button
            onClick={() => {
              const next = !isFixed;
              setIsFixed(next);
              onAction(`[CODE_PATCH] Candidate ${next ? "applied concurrency fix" : "reverted to buggy code"}`);
            }}
            style={{
              padding: "4px 12px",
              background: isFixed ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.1)",
              border: isFixed ? "1px solid #22c55e" : "1px solid #f59e0b",
              color: isFixed ? "#22c55e" : "#f59e0b",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "inherit",
            }}
          >
            <span>{isFixed ? "✓" : "⚡"}</span>
            <span>{isFixed ? "[ PATCH_APPLIED // REVERT ]" : "[ APPLY_CONCURRENCY_GUARD // fix ]"}</span>
          </button>

          <button
            onClick={runTests}
            disabled={isRunningTests}
            style={{
              padding: "4px 12px",
              background: allTestsPassed ? "rgba(0,255,65,0.2)" : "rgba(56,189,248,0.15)",
              border: allTestsPassed ? "1px solid #00ff41" : "1px solid #38bdf8",
              color: allTestsPassed ? "#00ff41" : "#38bdf8",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 800,
              cursor: isRunningTests ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "inherit",
            }}
          >
            <span>▶</span>
            <span>{isRunningTests ? "RUNNING..." : allTestsPassed ? "[ ALL TESTS GREEN ✓ ]" : "[ RUN_TESTS // npm test ]"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Code Editor on Left, Debugger Scope & Test Runner on Right */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Editor Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #1e293b", minWidth: 0 }}>
          {/* File Tabs */}
          <div style={{ display: "flex", background: "#060911", borderBottom: "1px solid #1e293b", overflowX: "auto" }}>
            {[
              { id: "checkout", name: "src/checkout.ts", badge: isFixed ? "✓ fixed" : "● buggy" },
              { id: "gateway", name: "src/services/gateway.ts" },
              { id: "orders", name: "src/db/orders.ts" },
              { id: "tests", name: "tests/checkout.test.ts" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFile(f.id as any)}
                style={{
                  padding: "8px 14px",
                  background: activeFile === f.id ? "#0d1320" : "transparent",
                  color: activeFile === f.id ? "#38bdf8" : "#64748b",
                  border: "none",
                  borderRight: "1px solid #1e293b",
                  borderTop: activeFile === f.id ? "2px solid #38bdf8" : "2px solid transparent",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "inherit",
                }}
              >
                <span>{f.name}</span>
                {f.badge && (
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 4px",
                      borderRadius: 2,
                      background: isFixed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: isFixed ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {f.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Code Viewer with Breakpoint Gutter or Interactive Code Editor */}
          {isEditing && activeFile === "checkout" ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#050811", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                <span>Editing src/checkout.ts — Guard the payment charge to prevent double debits!</span>
                <span style={{ color: "#38bdf8" }}>TypeScript</span>
              </div>
              <textarea
                value={codeText}
                onChange={(e) => {
                  setCodeText(e.target.value);
                  onAction("[CODE_EDIT] Candidate manually updated src/checkout.ts");
                }}
                spellCheck={false}
                style={{
                  flex: 1,
                  width: "100%",
                  background: "#03060c",
                  color: "#cbd5e1",
                  border: "1px solid #1e293b",
                  borderRadius: 4,
                  padding: 12,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: 12,
                  lineHeight: 1.6,
                  resize: "none",
                  outline: "none",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 0",
                background: "#050811",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {lines.map((lineText, idx) => {
                const lineNum = idx + 1;
                const hasBreakpoint = activeFile === "checkout" && breakpoints.includes(lineNum);
                const isCurrentExec = activeFile === "checkout" && currentLine === lineNum;

                return (
                  <div
                    key={lineNum}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: isCurrentExec
                        ? "rgba(245, 158, 11, 0.2)"
                        : hasBreakpoint
                        ? "rgba(239, 68, 68, 0.08)"
                        : "transparent",
                      borderLeft: isCurrentExec ? "3px solid #f59e0b" : "3px solid transparent",
                      paddingRight: 16,
                    }}
                  >
                    {/* Breakpoint Gutter */}
                    <div
                      onClick={() => activeFile === "checkout" && toggleBreakpoint(lineNum)}
                      title={activeFile === "checkout" ? `Toggle breakpoint on line ${lineNum}` : ""}
                      style={{
                        width: 44,
                        textAlign: "right",
                        paddingRight: 10,
                        color: hasBreakpoint ? "#ef4444" : "#475569",
                        fontSize: 11,
                        cursor: activeFile === "checkout" ? "pointer" : "default",
                        userSelect: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 4,
                      }}
                    >
                      {isCurrentExec ? (
                        <span style={{ color: "#f59e0b", fontSize: 10 }}>▶</span>
                      ) : hasBreakpoint ? (
                        <span style={{ color: "#ef4444", fontSize: 12 }}>●</span>
                      ) : null}
                      <span>{lineNum}</span>
                    </div>

                    {/* Code Line Content */}
                    <pre
                      style={{
                        margin: 0,
                        padding: 0,
                        fontFamily: "inherit",
                        fontSize: "inherit",
                        color: lineText.startsWith("//")
                          ? lineText.includes("BUG") || lineText.includes("Guard placed")
                            ? "#ef4444"
                            : lineText.includes("FIXED")
                            ? "#22c55e"
                            : "#64748b"
                          : isFixed && activeFile === "checkout"
                          ? "#86efac"
                          : "#cbd5e1",
                      }}
                    >
                      {lineText}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Area: Debugger Scope Inspector & Test Runner Console */}
        <div
          style={{
            width: 380,
            display: "flex",
            flexDirection: "column",
            background: "#040710",
            overflow: "hidden",
          }}
        >
          {/* Top Half of Right Pane: Debugger Scope & Call Stack */}
          <div
            style={{
              flex: 1,
              borderBottom: "1px solid #1e293b",
              padding: 12,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8", letterSpacing: "1px" }}>
                DEBUGGER SCOPE & STACK
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: isDebugging ? "#f59e0b" : "#64748b",
                  background: isDebugging ? "rgba(245,158,11,0.1)" : "transparent",
                  padding: "1px 6px",
                  borderRadius: 3,
                }}
              >
                {isDebugging ? `PAUSED AT LINE ${currentLine}` : "IDLE"}
              </span>
            </div>

            {/* Scope Variables Table */}
            <div
              style={{
                background: "#080e1c",
                border: "1px solid #1e293b",
                borderRadius: 4,
                padding: 8,
              }}
            >
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 6 }}>
                LOCAL VARIABLES (Frame #0)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>orderId:</span>
                  <span style={{ color: "#38bdf8" }}>{getDynamicLocalVars().orderId}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>amount:</span>
                  <span style={{ color: "#38bdf8" }}>{getDynamicLocalVars().amount}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>order.status:</span>
                  <span style={{ color: getDynamicLocalVars().orderStatus.includes("PROCESSING") || getDynamicLocalVars().orderStatus.includes("PAID") ? "#22c55e" : "#f59e0b", fontWeight: 700 }}>
                    {getDynamicLocalVars().orderStatus}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>gatewayCharges:</span>
                  <span style={{ color: getDynamicLocalVars().gatewayCharges.includes("1 charge") ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                    {getDynamicLocalVars().gatewayCharges}
                  </span>
                </div>
              </div>
            </div>

            {/* Call Stack */}
            <div
              style={{
                background: "#080e1c",
                border: "1px solid #1e293b",
                borderRadius: 4,
                padding: 8,
              }}
            >
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 6 }}>
                CALL STACK
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: "#cbd5e1" }}>
                <div style={{ color: "#38bdf8", fontWeight: 700 }}>
                  ▶ processPayment() @ checkout.ts:{currentLine || 11}
                </div>
                <div style={{ color: "#64748b" }}>
                  checkoutHandler() @ routes/checkout.ts:42
                </div>
                <div style={{ color: "#64748b" }}>
                  handle() @ express/router.js:142
                </div>
              </div>
            </div>

            {/* Race Condition Interleaving Timeline if simulated */}
            {raceTimeline.length > 0 && (
              <div
                style={{
                  background: "#090d18",
                  border: "1px solid #f59e0b",
                  borderRadius: 4,
                  padding: 8,
                }}
              >
                <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, marginBottom: 6 }}>
                  CONCURRENT INTERLEAVING TRACE
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10 }}>
                  {raceTimeline.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        color: item.isError ? "#ef4444" : "#86efac",
                        lineHeight: 1.35,
                      }}
                    >
                      <span style={{ color: "#64748b", marginRight: 4 }}>{item.time}</span>
                      <strong style={{ color: item.thread === "Request A" ? "#38bdf8" : "#f59e0b" }}>
                        [{item.thread}]
                      </strong>{" "}
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Half: Test Runner Terminal Console */}
          <div
            style={{
              height: 240,
              background: "#020408",
              borderTop: "1px solid #1e293b",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 12px",
                background: "#080c14",
                borderBottom: "1px solid #1e293b",
                fontSize: 11,
              }}
            >
              <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                TEST RUNNER // Jest Output
              </span>
              <button
                onClick={runTests}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#38bdf8",
                  fontSize: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontFamily: "inherit",
                }}
              >
                [ RE-RUN ]
              </button>
            </div>

            <div
              style={{
                flex: 1,
                padding: "8px 12px",
                overflowY: "auto",
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >
              {testOutput.length === 0 ? (
                <div style={{ color: "#475569", fontStyle: "italic" }}>
                  Click 'RUN_TESTS // npm test' to execute the checkout test suite against checkout.ts.
                </div>
              ) : (
                testOutput.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      color: l.includes("PASS")
                        ? "#86efac"
                        : l.includes("FAIL") || l.includes("●")
                        ? "#ef4444"
                        : l.includes("VICTORY")
                        ? "#00ff41"
                        : l.includes("HINT")
                        ? "#f59e0b"
                        : "#cbd5e1",
                      fontWeight: l.includes("PASS") || l.includes("FAIL") || l.includes("VICTORY") ? 700 : 400,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {l}
                  </div>
                ))
              )}
              <div ref={testTerminalEndRef} />
            </div>

            {/* Victory completion bar */}
            {allTestsPassed && onComplete && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: "8px 12px",
                  background: "rgba(0, 255, 65, 0.15)",
                  borderTop: "1px solid #00ff41",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 11, color: "#00ff41", fontWeight: 800 }}>
                  ◈ SCOPE 1: ENGINEERING RESOLVED
                </span>
                <button
                  onClick={() => onComplete()}
                  style={{
                    padding: "5px 12px",
                    background: "#00ff41",
                    color: "#020408",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  PROCEED TO EVALUATION ▶
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
