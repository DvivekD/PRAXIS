"use client";

import React, { useState } from "react";
import SshTerminalSubEnv from "./SshTerminalSubEnv";
import NetworkDiagnosticsSubEnv from "./NetworkDiagnosticsSubEnv";
import CodeDebuggerSubEnv from "./CodeDebuggerSubEnv";
import ObserverHUD from "./ObserverHUD";
import { submitEngineeringAction } from "../../../actions/eval";

export interface EngineeringEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any> | void;
  onComplete: () => void;
  demoMode: boolean;
  onQuickSolve?: () => void;
  analyserNode?: AnalyserNode | null;
  initialSubEnv?: number;
  onSubEnvChange?: (sub: number) => void;
}

export type EngineeringSubEnv = "ssh" | "network" | "debugger";

const subNumToEnv = (n?: number): EngineeringSubEnv => {
  if (n === 2) return "network";
  if (n === 3) return "debugger";
  return "ssh";
};

const envToSubNum = (e: EngineeringSubEnv): 1 | 2 | 3 => {
  if (e === "network") return 2;
  if (e === "debugger") return 3;
  return 1;
};

export default function EngineeringEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
  onQuickSolve,
  analyserNode = null,
  initialSubEnv = 1,
  onSubEnvChange,
}: EngineeringEnvironmentProps) {
  const [activeSubEnv, setActiveSubEnv] = useState<EngineeringSubEnv>(() =>
    subNumToEnv(initialSubEnv)
  );

  React.useEffect(() => {
    if (initialSubEnv) {
      setActiveSubEnv(subNumToEnv(initialSubEnv));
    }
  }, [initialSubEnv]);

  const switchSubEnv = (target: EngineeringSubEnv) => {
    setActiveSubEnv(target);
    onSubEnvChange?.(envToSubNum(target));
  };

  // State across sub-environments
  const [findingsDiscovered, setFindingsDiscovered] = useState<string[]>([]);
  const [networkRemediated, setNetworkRemediated] = useState(false);
  const [testsPassing, setTestsPassing] = useState(false);
  const [observerNotes, setObserverNotes] = useState<string[]>([
    "[t+0s] Candidate initiated Scope 1 Engineering assessment.",
    "[t+2s] 3D Observer HUD initialized. Monitoring heuristics and keystroke variance.",
  ]);

  const handleQuickSolve = () => {
    setFindingsDiscovered(["cpu_mem", "worker_state", "timeout_logs", "pool_starvation"]);
    setNetworkRemediated(true);
    setTestsPassing(true);
    addObserverNote("[QUICK_SOLVE] All Scope 1 Engineering sub-environments resolved.");
    handleAction("[DEMO_QUICK_SOLVE] Verified all 3 sub-environments (SSH, Network, Debugger)");
    if (onQuickSolve) {
      onQuickSolve();
    } else {
      setTimeout(() => onComplete(), 1500);
    }
  };

  const addObserverNote = (note: string) => {
    setObserverNotes((prev) => [...prev, note]);
  };

  const handleAction = async (actionText: string, metadata?: Record<string, any>) => {
    // Generate intelligent observer heuristics
    if (actionText.includes("SSH_CMD")) {
      addObserverNote(`[HOST_PROBE] Candidate executed: ${actionText.replace("[SSH_CMD] ", "")}`);
    } else if (actionText.includes("NET_CMD")) {
      addObserverNote(`[NETWORK_PROBE] Candidate queried network: ${actionText.replace("[NET_CMD] ", "")}`);
    } else if (actionText.includes("DEBUGGER")) {
      addObserverNote(`[DEBUGGER] Interactive stepping: ${actionText.replace("[DEBUGGER] ", "")}`);
    } else if (actionText.includes("CODE_PATCH")) {
      addObserverNote(`[CODE_PATCH] Candidate modified checkout concurrency guard.`);
    }

    const subEnvNum: 1 | 2 | 3 = activeSubEnv === "ssh" ? 1 : activeSubEnv === "network" ? 2 : 3;

    if (sessionId) {
      let actionType: any = "SSH_CMD";
      if (actionText.includes("SSH_CMD")) actionType = "SSH_CMD";
      else if (actionText.includes("NET_CMD")) actionType = "NETWORK_PROBE";
      else if (actionText.includes("SSH_FINDING")) actionType = "HOST_FINDING";
      else if (actionText.includes("NETWORK_REMEDIATION")) actionType = "REMEDIATE_DNS";
      else if (actionText.includes("VERDICT_SUBMITTED")) actionType = "SUBMIT_VERDICT";
      else if (actionText.includes("DEBUGGER")) actionType = "DEBUGGER_STEP";
      else if (actionText.includes("CODE_PATCH")) actionType = "APPLY_PATCH";
      else if (actionText.includes("TESTS_PASSING")) actionType = "RUN_TESTS";

      try {
        await submitEngineeringAction(sessionId, {
          actionType,
          subEnv: subEnvNum,
          command: actionText,
          metadata,
          testPassed: testsPassing || actionText.includes("TESTS_PASSING"),
        });
      } catch (err) {
        // Continue gracefully in demo/mock mode
      }
    }

    await onAction(actionText, {
      ...metadata,
      activeSubEnv,
      findingsCount: findingsDiscovered.length,
      networkRemediated,
      testsPassing,
    });
  };

  const handleFindingDiscovered = (findingId: string) => {
    if (!findingsDiscovered.includes(findingId)) {
      setFindingsDiscovered((prev) => [...prev, findingId]);
      addObserverNote(`[FINDING_LOCKED] Host clue resolved: ${findingId}`);
    }
  };

  const handleNetworkRemediated = () => {
    setNetworkRemediated(true);
    addObserverNote("[REMEDIATION] Upstream DNS and socket connection pool successfully healed.");
  };

  const handleTestsPassing = () => {
    setTestsPassing(true);
    addObserverNote("[VERIFICATION] Jest checkout concurrency suite: 4/4 passing (100% green).");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        background: "#020408",
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        overflow: "hidden",
      }}
    >
      {/* Scope 1 Top Sub-Environment Switcher & Status Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 14px",
          background: "#050811",
          borderBottom: "1px solid #1e293b",
          minHeight: 46,
        }}
      >
        {/* Brand / Scope Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#00ff41", fontSize: 13, fontWeight: 800 }}>◈ PRAXIS</span>
            <span style={{ color: "#64748b", fontSize: 11 }}>//</span>
            <span style={{ color: "#38bdf8", fontSize: 11, fontWeight: 700, letterSpacing: "1px" }}>
              SCOPE 1: ENGINEERING
            </span>
          </div>

          {/* Sub-Environment Navigation Tabs */}
          <div style={{ display: "flex", gap: 4, background: "#090e1a", padding: 3, borderRadius: 6, border: "1px solid #1e293b" }}>
            {/* Tab 01: SSH */}
            <button
              onClick={() => {
                switchSubEnv("ssh");
                handleAction("[TAB_SWITCH] Switched to 01 — SSH Infrastructure Terminal");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                background: activeSubEnv === "ssh" ? "#1e293b" : "transparent",
                color: activeSubEnv === "ssh" ? "#00ff41" : "#94a3b8",
                border: "none",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span>01 // SSH INFRA TERMINAL</span>
              <span
                style={{
                  fontSize: 9,
                  background: findingsDiscovered.length >= 3 ? "rgba(0,255,65,0.15)" : "rgba(245,158,11,0.15)",
                  color: findingsDiscovered.length >= 3 ? "#00ff41" : "#f59e0b",
                  padding: "1px 5px",
                  borderRadius: 2,
                }}
              >
                {findingsDiscovered.length}/4
              </span>
            </button>

            {/* Tab 02: Network Diagnostics */}
            <button
              onClick={() => {
                switchSubEnv("network");
                handleAction("[TAB_SWITCH] Switched to 02 — Network Diagnostics Lab");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                background: activeSubEnv === "network" ? "#1e293b" : "transparent",
                color: activeSubEnv === "network" ? "#38bdf8" : "#94a3b8",
                border: "none",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span>02 // NETWORK DIAGNOSTICS LAB</span>
              <span
                style={{
                  fontSize: 9,
                  background: networkRemediated ? "rgba(0,255,65,0.15)" : "rgba(239,68,68,0.15)",
                  color: networkRemediated ? "#00ff41" : "#ef4444",
                  padding: "1px 5px",
                  borderRadius: 2,
                }}
              >
                {networkRemediated ? "HEALTHY ✓" : "BLOCKED ✕"}
              </span>
            </button>

            {/* Tab 03: Code Debugger */}
            <button
              onClick={() => {
                switchSubEnv("debugger");
                handleAction("[TAB_SWITCH] Switched to 03 — Code Debugger");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                background: activeSubEnv === "debugger" ? "#1e293b" : "transparent",
                color: activeSubEnv === "debugger" ? "#f59e0b" : "#94a3b8",
                border: "none",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span>03 // CODE DEBUGGER</span>
              <span
                style={{
                  fontSize: 9,
                  background: testsPassing ? "rgba(0,255,65,0.15)" : "rgba(245,158,11,0.15)",
                  color: testsPassing ? "#00ff41" : "#f59e0b",
                  padding: "1px 5px",
                  borderRadius: 2,
                }}
              >
                {testsPassing ? "4/4 GREEN ✓" : "RACE BUG"}
              </span>
            </button>
          </div>
        </div>

        {/* Global Status Indicators & Demo Solve */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleQuickSolve}
            title="Auto-solve all 3 sub-environments for demo evaluation"
            style={{
              padding: "4px 10px",
              background: "rgba(245,158,11,0.15)",
              border: "1px solid #f59e0b",
              color: "#f59e0b",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ⚡ QUICK SOLVE
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <span style={{ color: "#64748b" }}>SESSION:</span>
            <span style={{ color: "#cbd5e1", fontWeight: 700 }}>{sessionId.slice(0, 14)}...</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(0,255,65,0.08)",
              border: "1px solid rgba(0,255,65,0.3)",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11,
              color: "#00ff41",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff41" }} />
            <span>BLACK FRIDAY CLUSTER</span>
          </div>
        </div>
      </div>

      {/* Main Workspace: Active Sub-Environment on Left, 3D Observer HUD on Right */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Active Sub-Environment Viewport */}
        <div style={{ flex: 1, minWidth: 0, height: "100%", position: "relative" }}>
          {activeSubEnv === "ssh" && (
            <SshTerminalSubEnv
              onAction={handleAction}
              onFindingDiscovered={handleFindingDiscovered}
              onNavigateSubEnv={(target) => {
                switchSubEnv(target);
                handleAction(`[NAVIGATE] Routed to 0${target === "network" ? 2 : 3} sub-environment`);
              }}
            />
          )}

          {activeSubEnv === "network" && (
            <NetworkDiagnosticsSubEnv
              onAction={handleAction}
              onRemediated={handleNetworkRemediated}
              onNavigateSubEnv={(target) => {
                switchSubEnv(target);
                handleAction(`[NAVIGATE] Routed to 03 code debugger sub-environment`);
              }}
            />
          )}

          {activeSubEnv === "debugger" && (
            <CodeDebuggerSubEnv
              onAction={handleAction}
              onTestsPassing={handleTestsPassing}
              onComplete={onComplete}
            />
          )}
        </div>

        {/* 3D Observer HUD Sidebar */}
        <ObserverHUD
          analyserNode={analyserNode}
          activeSubEnv={activeSubEnv}
          findingsCount={findingsDiscovered.length}
          networkRemediated={networkRemediated}
          testsPassing={testsPassing}
          recentTelemetry={observerNotes}
          onInteract={(text) => handleAction(`[OBSERVER_CORE_INTERACT] ${text}`)}
        />
      </div>
    </div>
  );
}
