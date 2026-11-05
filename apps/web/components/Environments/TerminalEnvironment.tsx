"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TerminalEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onComplete: () => void;
  demoMode: boolean;
  onQuickSolve?: () => void;
}

const BUGGY_CODE = `// /var/www/aura-commerce/src/checkout.ts
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

const FIXED_CODE = `// /var/www/aura-commerce/src/checkout.ts
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

export default function TerminalEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
}: TerminalEnvironmentProps) {
  const [output, setOutput] = useState<Array<{ text: string; color?: string; isBold?: boolean }>>([
    { text: "Linux aura-prod-app-04 6.5.0-41-generic #42-Ubuntu SMP x86_64", color: "#888" },
    { text: "Aura Commerce (Black Friday Production Cluster) — All activities logged.", color: "#888" },
    { text: "Type 'help' for available commands, or 'cat checkout.ts' to inspect code.", color: "#38bdf8" },
    { text: "", color: "#888" },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFixed, setIsFixed] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [solved, setSolved] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output, testRunning]);

  const addLine = (text: string, color: string = "#fff", isBold: boolean = false) => {
    setOutput((prev) => [...prev, { text, color, isBold }]);
  };

  const handleCommand = async (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    setHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    addLine(`root@aura-prod-app-04:~/src# ${cmd}`, "#00ff41", true);
    onAction(`[TERMINAL] $ ${cmd}`);

    const parts = cmd.split(" ");
    const command = parts[0].toLowerCase();
    const arg = parts[1]?.toLowerCase();

    switch (command) {
      case "help":
        addLine("Available commands:", "#f59e0b");
        addLine("  ls, dir           - List source files & logs", "#aaa");
        addLine("  cat <file>        - View file contents (e.g., cat checkout.ts)", "#aaa");
        addLine("  git log           - View recent git commits to find who introduced the bug", "#aaa");
        addLine("  cat payment.log   - View production error logs showing duplicate charges", "#aaa");
        addLine("  edit checkout.ts  - Open interactive patch editor to move the idempotency guard", "#aaa");
        addLine("  fix               - Apply the concurrency guard fix to checkout.ts", "#aaa");
        addLine("  npm test, test    - Run the Jest checkout test suite", "#aaa");
        addLine("  clear             - Clear the terminal screen", "#aaa");
        break;

      case "ls":
      case "dir":
        addLine("total 28K", "#666");
        addLine("-rw-r--r-- 1 aura aura  840 Nov  5 14:12 checkout.ts", "#38bdf8");
        addLine("-rw-r--r-- 1 aura aura 1.2K Nov  5 14:10 tests/checkout.test.ts", "#38bdf8");
        addLine("-rw-r--r-- 1 aura aura 4.8K Nov  5 16:55 logs/payment.log", "#ef4444");
        addLine("-rw-r--r-- 1 aura aura  620 Nov  4 09:30 package.json", "#aaa");
        break;

      case "git":
        if (arg === "log" || parts.join(" ") === "git log") {
          addLine("commit a94fbc28 (HEAD -> main, origin/main)", "#f59e0b");
          addLine("Author: Alex Chen <alex.chen@aura.commerce>", "#aaa");
          addLine("Date:   Thu Nov 5 14:12:00 2026 +0000", "#aaa");
          addLine("", "#aaa");
          addLine("    feat(payment): async fast-checkout pipeline for Black Friday", "#fff");
          addLine("    CAUTION: Removed blocking mutex to boost throughput under load.", "#ef4444");
          addLine("", "#aaa");
          addLine("commit 83bc910a", "#f59e0b");
          addLine("Author: Taylor Brooks <taylor@aura.commerce>", "#aaa");
          addLine("Date:   Wed Nov 4 18:20:11 2026 +0000", "#aaa");
          addLine("    chore: update Black Friday banner assets", "#aaa");
        } else {
          addLine("Usage: git log", "#ef4444");
        }
        break;

      case "cat":
      case "view":
        if (arg === "checkout.ts" || arg === "src/checkout.ts") {
          const lines = (isFixed ? FIXED_CODE : BUGGY_CODE).split("\n");
          lines.forEach((l) => addLine(l, isFixed ? "#86efac" : "#cbd5e1"));
        } else if (arg === "payment.log" || arg === "logs/payment.log") {
          addLine("[2026-11-05T16:55:01.102Z] POST /api/checkout/pay order=ord_9901 user=usr_4401", "#aaa");
          addLine("[2026-11-05T16:55:01.124Z] POST /api/checkout/pay order=ord_9901 user=usr_4401 (RAPID REPEAT CLICK)", "#ef4444");
          addLine("[2026-11-05T16:55:01.310Z] Gateway: charged $149.00 (tx_8819)", "#f59e0b");
          addLine("[2026-11-05T16:55:01.325Z] Gateway: charged $149.00 (tx_8820) ✕ DUPLICATE CHARGE!", "#ef4444");
          addLine("[2026-11-05T16:55:01.340Z] [CHECKOUT] Duplicate execution detected after charge!", "#ef4444");
        } else if (arg === "package.json") {
          addLine('{"name": "@aura/checkout", "scripts": {"test": "jest checkout.test.ts"}}', "#aaa");
        } else {
          addLine(`cat: ${arg || "missing file"}: No such file or directory`, "#ef4444");
        }
        break;

      case "edit":
      case "nano":
      case "vim":
        setEditorOpen(true);
        addLine("Opened interactive editor for checkout.ts. Click 'Apply Fix' when ready.", "#38bdf8");
        break;

      case "fix":
        setIsFixed(true);
        addLine("✓ Patched checkout.ts: Concurrency guard moved before payment gateway dispatch.", "#22c55e", true);
        addLine("Run 'npm test' to verify the fix.", "#f59e0b");
        break;

      case "test":
      case "npm":
        if (command === "npm" && arg !== "test" && arg !== "run") {
          addLine(`npm: Unknown argument '${arg}'. Use 'npm test'`, "#ef4444");
          break;
        }
        setTestRunning(true);
        addLine("RUNS  tests/checkout.test.ts", "#f59e0b");

        setTimeout(() => {
          setTestRunning(false);
          if (!isFixed) {
            addLine("  ✓ should calculate cart total with taxes (3ms)", "#86efac");
            addLine("  ✓ should validate inventory availability (4ms)", "#86efac");
            addLine("  ✕ should prevent double charges on concurrent rapid clicks (42ms)", "#ef4444", true);
            addLine("", "#fff");
            addLine("    Expected gateway charges: 1", "#ef4444");
            addLine("    Received: 2 charges (tx_8819, tx_8820)", "#ef4444");
            addLine("    Location: tests/checkout.test.ts:48:19", "#888");
            addLine("", "#fff");
            addLine("FAIL  Tests: 1 failed, 2 passed, 3 total", "#ef4444", true);
            addLine("HINT: Inspect checkout.ts and move the idempotency check BEFORE paymentGateway.charge()", "#f59e0b");
          } else {
            addLine("  ✓ should calculate cart total with taxes (2ms)", "#86efac");
            addLine("  ✓ should validate inventory availability (3ms)", "#86efac");
            addLine("  ✓ should prevent double charges on concurrent rapid clicks (5ms)", "#86efac", true);
            addLine("", "#fff");
            addLine("PASS  Tests: 3 passed, 3 total", "#22c55e", true);
            addLine("Time: 0.812 s, estimated 1 s", "#888");
            addLine("─────────────────────────────────────────────────────────────────", "#22c55e");
            addLine("🎉 [VICTORY] RACE CONDITION RESOLVED — PRODUCTION READY!", "#22c55e", true);
            addLine("Black Friday checkout kernel verified. Routing to evaluation...", "#38bdf8");
            setSolved(true);
            onAction("[VICTORY] Candidate moved the idempotency guard and verified all tests pass (3/3 green).");
            setTimeout(() => onComplete(), 2800);
          }
        }, 800);
        break;

      case "clear":
        setOutput([]);
        break;

      default:
        addLine(`bash: ${command}: command not found. Type 'help' for options.`, "#ef4444");
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(inputVal);
      setInputVal("");
    } else if (e.key === "ArrowUp") {
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < history.length) {
          setHistoryIndex(nextIdx);
          setInputVal(history[nextIdx]);
        } else {
          setHistoryIndex(-1);
          setInputVal("");
        }
      }
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#05070a",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: "#f8fafc",
        overflow: "hidden",
      }}
    >
      {/* Top SSH bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 16px",
          background: "#090d14",
          borderBottom: "1px solid #1e293b",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
          </div>
          <span style={{ color: "#94a3b8", fontWeight: 700 }}>
            ssh: root@aura-prod-app-04 (~/src)
          </span>
          <span style={{ fontSize: 10, background: "rgba(0,255,65,0.1)", color: "#00ff41", padding: "1px 6px", borderRadius: 3, border: "1px solid #00ff4130" }}>
            LIVE TERMINAL
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => handleCommand("npm test")}
            style={{
              padding: "5px 12px",
              background: "rgba(56,189,248,0.08)",
              border: "1px solid rgba(56,189,248,0.4)",
              color: "#38bdf8",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "inherit",
              letterSpacing: "0.5px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>▶</span>
            <span>[ RUN_TESTS // npm test ]</span>
          </button>
          <button
            onClick={() => handleCommand("fix")}
            style={{
              padding: "5px 12px",
              background: isFixed ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.08)",
              border: isFixed ? "1px solid #22c55e" : "1px solid rgba(245,158,11,0.4)",
              color: isFixed ? "#22c55e" : "#f59e0b",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "inherit",
              letterSpacing: "0.5px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>⚡</span>
            <span>{isFixed ? "[ ✓ PATCH_APPLIED ]" : "[ APPLY_PATCH // fix ]"}</span>
          </button>
        </div>
      </div>

      {/* Main Terminal Window */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          flex: 1,
          padding: "16px 20px",
          overflowY: "auto",
          background: "radial-gradient(circle at 50% 0%, #080d1a 0%, #020408 100%)",
        }}
      >
        {output.map((line, idx) => (
          <div
            key={idx}
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: line.color || "#fff",
              fontWeight: line.isBold ? 700 : 400,
              whiteSpace: "pre-wrap",
            }}
          >
            {line.text}
          </div>
        ))}

        {testRunning && (
          <div style={{ fontSize: 13, color: "#f59e0b", margin: "6px 0" }}>
            [ JEST ] Executing test runner against checkout.test.ts...
          </div>
        )}

        {/* Command Prompt Line */}
        {!solved && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ color: "#00ff41", fontWeight: 700, fontSize: 13 }}>
              root@aura-prod-app-04:~/src#
            </span>
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontFamily: "inherit",
                fontSize: 13,
              }}
            />
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Editor Modal Drawer if user typed edit checkout.ts */}
      <AnimatePresence>
        {editorOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              height: "55vh",
              background: "#0b101b",
              borderTop: "2px solid #38bdf8",
              boxShadow: "0 -8px 30px rgba(0,0,0,0.8)",
              display: "flex",
              flexDirection: "column",
              zIndex: 100,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 16px",
                background: "#080c14",
                borderBottom: "1px solid #1e293b",
              }}
            >
              <span style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700 }}>
                NANO 7.2 // /var/www/aura-commerce/src/checkout.ts
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    setIsFixed(true);
                    setEditorOpen(false);
                    handleCommand("fix");
                  }}
                  style={{
                    background: "rgba(34,197,94,0.15)",
                    border: "1px solid #22c55e",
                    color: "#22c55e",
                    padding: "5px 12px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.5px",
                    boxShadow: "0 0 10px rgba(34,197,94,0.2)",
                  }}
                >
                  [ SAVE_AND_APPLY // Ctrl+O ]
                </button>
                <button
                  onClick={() => setEditorOpen(false)}
                  style={{
                    background: "#080c14",
                    color: "#94a3b8",
                    border: "1px solid #334155",
                    padding: "5px 10px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  [ CLOSE // Ctrl+X ]
                </button>
              </div>
            </div>

            <pre
              style={{
                flex: 1,
                padding: 16,
                margin: 0,
                overflowY: "auto",
                fontSize: 12,
                color: isFixed ? "#86efac" : "#cbd5e1",
                lineHeight: 1.6,
              }}
            >
              {isFixed ? FIXED_CODE : BUGGY_CODE}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
