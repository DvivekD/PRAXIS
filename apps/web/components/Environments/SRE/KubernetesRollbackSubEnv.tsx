"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { KubernetesPod } from "./types";

interface KubernetesRollbackSubEnvProps {
  pods: KubernetesPod[];
  isRecovering: boolean;
  isSolved: boolean;
  errorRate: number;
  onExecuteRollback: () => void;
  onWrongAction: (actionName: string) => void;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onNavigateToMonitoring?: () => void;
  onNavigateToWarRoom?: () => void;
}

export default function KubernetesRollbackSubEnv({
  pods,
  isRecovering,
  isSolved,
  errorRate,
  onExecuteRollback,
  onWrongAction,
  onAction,
  onNavigateToMonitoring,
  onNavigateToWarRoom,
}: KubernetesRollbackSubEnvProps) {
  const [selectedPod, setSelectedPod] = useState<KubernetesPod | null>(null);
  const [cliInput, setCliInput] = useState("");
  const [cliOutput, setCliOutput] = useState<string[]>([
    "Kubernetes v1.29.3 (Cluster: aura-prod-us-east-1)",
    "Namespace: default | Context: aura-prod-admin",
    "Type 'kubectl get pods' or 'kubectl rollout undo deployment/checkout-service'",
    "-------------------------------------------------------------------------",
  ]);
  const [activeTab, setActiveTab] = useState<"pods" | "history" | "cli">("pods");

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "cli") {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [cliOutput, activeTab]);

  const crashloopCount = pods.filter((p) => p.status === "CrashLoopBackOff" || p.status === "Error").length;
  const runningCount = pods.filter((p) => p.status === "Running").length;

  const handleCommand = (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    setCliOutput((prev) => [...prev, `$ ${cmd}`]);
    onAction(`[KUBECTL_CLI] ${cmd}`);

    const lower = cmd.toLowerCase();

    if (lower === "kubectl get pods" || lower === "k get pods") {
      const lines = [
        "NAME                                  READY   STATUS             RESTARTS   AGE",
        ...pods.map(
          (p) =>
            `${p.name.padEnd(38)} ${p.ready.padEnd(7)} ${p.status.padEnd(18)} ${String(p.restarts).padEnd(10)} ${p.age}`
        ),
      ];
      setCliOutput((prev) => [...prev, ...lines]);
    } else if (lower.includes("rollout undo") || lower.includes("rollback")) {
      setCliOutput((prev) => [
        ...prev,
        "deployment.apps/checkout-service rolled back to revision 41 (v2.4.0)",
        "Waiting for deployment 'checkout-service' rollout to finish: 4 of 16 updated replicas are available...",
      ]);
      onExecuteRollback();
    } else if (lower.includes("rollout history")) {
      setCliOutput((prev) => [
        ...prev,
        "REVISION  CHANGE-CAUSE",
        "40        Deploy image aura/checkout:v2.3.9 (Catalog caching fix)",
        "41        Deploy image aura/checkout:v2.4.0 (Black Friday core release - verified stable)",
        "42        Deploy image aura/checkout:v2.4.1-hotfix (Dynamic promo discount token logic)",
      ]);
    } else if (lower.includes("logs")) {
      const targetPod = pods[0];
      setCliOutput((prev) => [
        ...prev,
        `Logs for pod ${targetPod.name}:`,
        ...targetPod.logs,
      ]);
    } else if (lower === "clear") {
      setCliOutput([]);
    } else {
      setCliOutput((prev) => [
        ...prev,
        `kubectl: command executed. Type 'kubectl get pods' or 'kubectl rollout undo deployment/checkout-service'`,
      ]);
    }
    setCliInput("");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#080c14",
        color: "#fff",
        fontFamily: "'JetBrains Mono', monospace",
        overflow: "hidden",
      }}
    >
      {/* ─── HEADER / CI-CD SUMMARY BAR ─── */}
      <div
        style={{
          background: "#0b101d",
          borderBottom: "1px solid #1e293b",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 26,
              height: 26,
              background: "#326ce5",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            ☸
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800 }}>
              <span>Deployment:</span>
              <span style={{ color: "#38bdf8" }}>checkout-service</span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: isSolved ? "rgba(34,197,94,0.2)" : isRecovering ? "rgba(234,179,8,0.2)" : "rgba(239,68,68,0.2)",
                  color: isSolved ? "#22c55e" : isRecovering ? "#eab308" : "#ef4444",
                  border: `1px solid ${isSolved ? "#22c55e" : isRecovering ? "#eab308" : "#ef4444"}`,
                }}
              >
                {isSolved ? "v2.4.0 (ACTIVE)" : isRecovering ? "ROLLING TO v2.4.0" : "v2.4.1-hotfix (FAILED)"}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#64748b" }}>
              Cluster: <code style={{ color: "#94a3b8" }}>aura-prod-us-east-1</code> | Namespace:{" "}
              <code style={{ color: "#94a3b8" }}>default</code> | Strategy:{" "}
              <code style={{ color: "#a855f7" }}>RollingUpdate (MaxSurge: 25%, MaxUnavail: 0)</code>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onNavigateToMonitoring && (
            <button
              onClick={onNavigateToMonitoring}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#f97316",
                padding: "6px 12px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>📊</span>
              <span>Grafana</span>
            </button>
          )}

          {onNavigateToWarRoom && (
            <button
              onClick={onNavigateToWarRoom}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#f59e0b",
                padding: "6px 12px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>🚨</span>
              <span>War Room</span>
            </button>
          )}

          {/* Tab buttons */}
          <div style={{ display: "flex", background: "#05070d", border: "1px solid #1e293b", borderRadius: 4, padding: 2 }}>
            <button
              onClick={() => setActiveTab("pods")}
              style={{
                background: activeTab === "pods" ? "#1e293b" : "transparent",
                border: "none",
                color: activeTab === "pods" ? "#38bdf8" : "#94a3b8",
                padding: "4px 10px",
                borderRadius: 3,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Pods (16)
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                background: activeTab === "history" ? "#1e293b" : "transparent",
                border: "none",
                color: activeTab === "history" ? "#38bdf8" : "#94a3b8",
                padding: "4px 10px",
                borderRadius: 3,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Release History
            </button>
            <button
              onClick={() => setActiveTab("cli")}
              style={{
                background: activeTab === "cli" ? "#1e293b" : "transparent",
                border: "none",
                color: activeTab === "cli" ? "#38bdf8" : "#94a3b8",
                padding: "4px 10px",
                borderRadius: 3,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Kubectl CLI
            </button>
          </div>
        </div>
      </div>

      {/* ─── PRIMARY ROLLBACK ACTION CALLOUT ─── */}
      <div
        style={{
          background: isSolved
            ? "rgba(34,197,94,0.08)"
            : isRecovering
            ? "rgba(234,179,8,0.08)"
            : "rgba(239,68,68,0.1)",
          borderBottom: `1px solid ${isSolved ? "#22c55e" : isRecovering ? "#eab308" : "#ef4444"}`,
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>
            {isSolved ? "🎉" : isRecovering ? "⚡" : "🚨"}
          </span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: isSolved ? "#22c55e" : isRecovering ? "#eab308" : "#fca5a5" }}>
              {isSolved
                ? "ROLLOUT SUCCESSFUL: 16/16 PODS RESTORED TO v2.4.0 (ERROR RATE &lt; 0.1%)"
                : isRecovering
                ? "ZERO-DOWNTIME ROLLING REPLACEMENT IN PROGRESS — MONITORING CANARY SURGE..."
                : "REMEDIATION REQUIRED: 12 PODS CRASHLOOPING ON v2.4.1-hotfix"}
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              {isSolved
                ? "Service restored with 0 transaction loss during rolling replacement."
                : isRecovering
                ? "MaxSurge: spinning up healthy v2.4.0 pods before terminating failing replicas."
                : "Candidate action: Execute 1-click zero-downtime rollback to verified stable revision v2.4.0."}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {/* Wrong mitigation 1 */}
          <button
            onClick={() => onWrongAction("Restart Pods")}
            disabled={isRecovering || isSolved}
            style={{
              padding: "8px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid #334155",
              color: "#94a3b8",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              cursor: isRecovering || isSolved ? "default" : "pointer",
            }}
          >
            [ RESTART ALL PODS ]
          </button>

          {/* Wrong mitigation 2 */}
          <button
            onClick={() => onWrongAction("Scale to 50 Replicas")}
            disabled={isRecovering || isSolved}
            style={{
              padding: "8px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid #334155",
              color: "#94a3b8",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              cursor: isRecovering || isSolved ? "default" : "pointer",
            }}
          >
            [ SCALE TO 50 REPLICAS ]
          </button>

          {/* HERO ACTION: 1-Click Rollback */}
          <button
            onClick={onExecuteRollback}
            disabled={isRecovering || isSolved}
            style={{
              padding: "10px 18px",
              background: isSolved
                ? "rgba(34,197,94,0.18)"
                : isRecovering
                ? "rgba(234,179,8,0.18)"
                : "rgba(239,68,68,0.25)",
              border: isSolved ? "1px solid #22c55e" : isRecovering ? "1px solid #eab308" : "1px solid #ef4444",
              color: isSolved ? "#22c55e" : isRecovering ? "#eab308" : "#fff",
              fontWeight: 900,
              fontSize: 11,
              borderRadius: 4,
              cursor: isRecovering || isSolved ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: isSolved
                ? "0 0 15px rgba(34,197,94,0.25)"
                : "0 0 20px rgba(239,68,68,0.35)",
            }}
          >
            <span>🚀</span>
            <span>
              {isSolved
                ? "ROLLBACK COMPLETE ✓"
                : isRecovering
                ? "ROLLING BACK TO v2.4.0..."
                : "1-CLICK ROLLBACK TO v2.4.0"}
            </span>
          </button>
        </div>
      </div>

      {/* ─── MAIN WORKSPACE CONTENT ─── */}
      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        {activeTab === "pods" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>
                POD DASHBOARD // REPLICAS: {runningCount}/16 READY (CLICK POD TO VIEW STDOUT/STDERR LOGS)
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
                <span style={{ color: "#22c55e" }}>● Running: {runningCount}</span>
                <span style={{ color: "#ef4444" }}>● CrashLoop: {crashloopCount}</span>
              </div>
            </div>

            {/* 16-Pod Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 10,
              }}
            >
              {pods.map((pod, i) => {
                const isCrash = pod.status === "CrashLoopBackOff" || pod.status === "Error";
                const isCreating = pod.status === "ContainerCreating" || pod.status === "Terminating";
                return (
                  <motion.div
                    key={pod.name}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => {
                      setSelectedPod(pod);
                      onAction(`[POD_LOG_INSPECT] Inspected logs for ${pod.name}`);
                    }}
                    style={{
                      background: selectedPod?.name === pod.name ? "#111827" : "#0a0e18",
                      border: isCrash
                        ? "1px solid rgba(239,68,68,0.6)"
                        : isCreating
                        ? "1px solid rgba(234,179,8,0.6)"
                        : "1px solid rgba(34,197,94,0.4)",
                      borderRadius: 6,
                      padding: 10,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#f8fafc" }}>
                        pod/{pod.name.split("-").slice(-2).join("-")}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: "1px 6px",
                          borderRadius: 3,
                          background: isCrash
                            ? "rgba(239,68,68,0.2)"
                            : isCreating
                            ? "rgba(234,179,8,0.2)"
                            : "rgba(34,197,94,0.2)",
                          color: isCrash ? "#ef4444" : isCreating ? "#eab308" : "#22c55e",
                        }}
                      >
                        {pod.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8" }}>
                      <span>Ready: <strong style={{ color: "#fff" }}>{pod.ready}</strong></span>
                      <span>Restarts: <strong style={{ color: isCrash ? "#ef4444" : "#22c55e" }}>{pod.restarts}</strong></span>
                      <span>Tag: <strong style={{ color: pod.version === "v2.4.0" ? "#22c55e" : "#f59e0b" }}>{pod.version}</strong></span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#64748b" }}>
                      <span>{pod.node}</span>
                      <span>CPU: {pod.cpuPercent}% | MEM: {pod.memoryMb}MB</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8" }}>
              DEPLOYMENT REVISION HISTORY &amp; GIT COMMIT LOG
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Revision 42 (Hotfix / Failed) */}
              <div
                style={{
                  background: isSolved ? "#0b101d" : "#1a0d10",
                  border: isSolved ? "1px solid #1e293b" : "1px solid #ef4444",
                  borderRadius: 6,
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#ef4444" }}>Revision 42 (v2.4.1-hotfix)</span>
                    <span style={{ fontSize: 9, background: "#ef4444", color: "#000", padding: "1px 5px", borderRadius: 3, fontWeight: 900 }}>
                      BUGGY RELEASE
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: "#64748b" }}>Deployed 18m ago via CI/CD</span>
                </div>
                <div style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 4 }}>
                  Commit <code style={{ color: "#f59e0b" }}>7b8a10f</code>: Hotfix: Add dynamic promo discount token handling
                </div>
                <div style={{ fontSize: 10, color: "#ef4444" }}>
                  ⚠ Culprit: Missing null assertion on optional coupon token causing Uncaught TypeError under peak concurrency.
                </div>
              </div>

              {/* Revision 41 (Stable v2.4.0) */}
              <div
                style={{
                  background: isSolved ? "#0a1f14" : "#0b101d",
                  border: isSolved ? "1px solid #22c55e" : "1px solid #334155",
                  borderRadius: 6,
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#22c55e" }}>Revision 41 (v2.4.0)</span>
                    <span style={{ fontSize: 9, background: "#22c55e", color: "#000", padding: "1px 5px", borderRadius: 3, fontWeight: 900 }}>
                      VERIFIED STABLE
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: "#64748b" }}>Deployed 2h ago</span>
                </div>
                <div style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 4 }}>
                  Commit <code style={{ color: "#38bdf8" }}>3c90e4a</code>: Release 2.4.0: Black Friday Core Architecture
                </div>
                <div style={{ fontSize: 10, color: "#22c55e" }}>
                  ✓ Passed all 142 integration tests, 0.08% baseline error rate.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cli" && (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              background: "#05070d",
              border: "1px solid #1e293b",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <div style={{ flex: 1, padding: 12, overflowY: "auto", fontSize: 11, lineHeight: 1.6 }}>
              {cliOutput.map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    color: line.startsWith("$")
                      ? "#22c55e"
                      : line.includes("CrashLoopBackOff") || line.includes("FATAL")
                      ? "#ef4444"
                      : "#94a3b8",
                  }}
                >
                  {line}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            <div style={{ display: "flex", borderTop: "1px solid #1e293b", background: "#080c14" }}>
              <span style={{ padding: "10px 12px", color: "#326ce5", fontWeight: 900 }}>kubectl&gt;</span>
              <input
                type="text"
                value={cliInput}
                onChange={(e) => setCliInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommand(cliInput);
                }}
                placeholder="kubectl get pods | kubectl rollout undo deployment/checkout-service"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: 11,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: POD LOGS INSPECTOR ─── */}
      <AnimatePresence>
        {selectedPod && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                background: "#0a0e1a",
                border: "1px solid #38bdf8",
                borderRadius: 8,
                padding: 18,
                width: "100%",
                maxWidth: 720,
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#38bdf8" }}>
                    pod/{selectedPod.name} — Terminal Logs
                  </span>
                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    Node: {selectedPod.node} | Restarts: {selectedPod.restarts} | Tag: {selectedPod.version}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPod(null)}
                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  background: "#04060a",
                  border: "1px solid #1e293b",
                  borderRadius: 4,
                  padding: 12,
                  fontSize: 10,
                  lineHeight: 1.6,
                  overflowY: "auto",
                  maxHeight: 400,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {selectedPod.logs.map((log, idx) => (
                  <div
                    key={idx}
                    style={{
                      color: log.includes("FATAL") || log.includes("Error:")
                        ? "#ef4444"
                        : log.includes("KUBELET")
                        ? "#f59e0b"
                        : "#94a3b8",
                    }}
                  >
                    {log}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setSelectedPod(null)}
                  style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    color: "#fff",
                    padding: "6px 14px",
                    borderRadius: 4,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Close Logs
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
