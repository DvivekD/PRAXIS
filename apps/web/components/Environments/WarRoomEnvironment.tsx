"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface WarRoomEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onComplete: () => void;
  demoMode: boolean;
}

export default function WarRoomEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
}: WarRoomEnvironmentProps) {
  const [errorRate, setErrorRate] = useState(42.8);
  const [conversionRate, setConversionRate] = useState(12.4);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isWorse, setIsWorse] = useState(false);
  const [statusPosted, setStatusPosted] = useState(false);
  const [solved, setSolved] = useState(false);

  // Chat messages
  const [chat, setChat] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: "Alex Chen (Lead SRE)",
      text: "Error rate surged past 40% immediately following deploy v2.4.1-hotfix. Conversion is down 70 points. What is our rollback strategy?",
      time: "16:58:10",
    },
    {
      sender: "Datadog Bot",
      text: "🚨 P1 ALERT: checkout-service.errors > 40% for 3 consecutive minutes",
      time: "16:58:30",
    },
  ]);

  // Dynamic chart recovery tick
  useEffect(() => {
    if (!isRecovering) return;

    const interval = setInterval(() => {
      setErrorRate((prev) => {
        const next = Math.max(0.12, prev - (demoMode ? 8.5 : 3.8));
        return parseFloat(next.toFixed(2));
      });
      setConversionRate((prev) => {
        const next = Math.min(86.5, prev + (demoMode ? 14.2 : 6.5));
        return parseFloat(next.toFixed(2));
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isRecovering, demoMode]);

  useEffect(() => {
    if (isRecovering && errorRate <= 0.5 && !solved) {
      setSolved(true);
      onAction("[VICTORY] SRE candidate successfully rolled back v2.4.1-hotfix. Production error rate normalized to 0.1%.");
      setTimeout(() => {
        onComplete();
      }, 2600);
    }
  }, [errorRate, isRecovering, solved]);

  const handleRollback = () => {
    setIsRecovering(true);
    setIsWorse(false);
    onAction("[SRE_ACTION] Executed emergency zero-downtime rollback to v2.4.0");

    setChat((prev) => [
      ...prev,
      {
        sender: "You (Incident Commander)",
        text: "Executing immediate zero-downtime rollback to stable tag v2.4.0. Halting all deploys.",
        time: "17:00:02",
      },
      {
        sender: "Alex Chen (Lead SRE)",
        text: "Rollback container image pulled. Rolling replacement across all 16 pods now... Watch the charts recover!",
        time: "17:00:08",
      },
    ]);
  };

  const handleWrongAction = (actionName: string) => {
    setIsWorse(true);
    setErrorRate((prev) => Math.min(78, prev + 12));
    onAction(`[SRE_ACTION] Ineffective mitigation attempted: ${actionName}`);

    setChat((prev) => [
      ...prev,
      {
        sender: "You (Incident Commander)",
        text: `Attempting: ${actionName}`,
        time: "17:00:15",
      },
      {
        sender: "Alex Chen (Lead SRE)",
        text: "That didn't help — the bad code is still running in the deployment! We need a clean rollback to v2.4.0.",
        time: "17:00:22",
      },
    ]);
  };

  const handlePostStatusPage = () => {
    setStatusPosted(true);
    onAction("[SRE_ACTION] Updated public status page: 'Investigating checkout transaction latency'");
    setChat((prev) => [
      ...prev,
      {
        sender: "Statuspage Bot",
        text: "✓ Public status page updated: 'Investigating payment anomalies.' Customers notified.",
        time: "17:00:30",
      },
    ]);
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#05070a",
        color: "#fff",
        fontFamily: "'JetBrains Mono', monospace",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* SEV-1 HEADER BANNER */}
      <div
        style={{
          background: isRecovering ? "#0f291e" : "#2a0a0a",
          borderBottom: `2px solid ${isRecovering ? "#22c55e" : "#ef4444"}`,
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: isRecovering ? "#22c55e" : "#ef4444",
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 900, color: isRecovering ? "#22c55e" : "#ef4444" }}>
            {isRecovering ? "SYSTEM RECOVERING — ZERO DOWNTIME ROLLBACK IN PROGRESS" : "🚨 SEV-1 INCIDENT #8942 // AURA CHECKOUT OUTAGE"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Target SLA: 99.99%</span>
          <button
            onClick={handlePostStatusPage}
            disabled={statusPosted}
            style={{
              padding: "5px 12px",
              background: statusPosted ? "rgba(255,255,255,0.03)" : "rgba(245,158,11,0.08)",
              border: statusPosted ? "1px solid #334155" : "1px solid rgba(245,158,11,0.5)",
              color: statusPosted ? "#64748b" : "#f59e0b",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: statusPosted ? "default" : "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📢</span>
            <span>{statusPosted ? "[ STATUS_PAGE: NOTIFIED ]" : "[ UPDATE_STATUS_PAGE ]"}</span>
          </button>
        </div>
      </div>

      {/* MAIN DUAL CHARTS + INCIDENT CONSOLE */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 380px", overflow: "hidden" }}>
        {/* LEFT DUAL CHARTS */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, background: "#080c14" }}>
          {/* Chart 1: 5xx Error Rate */}
          <div style={{ flex: 1, background: "#0b101c", border: "1px solid #1e293b", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#ef4444" }}>
                HTTP 5XX ERROR RATE (%)
              </span>
              <span style={{ fontSize: 20, fontWeight: 900, color: errorRate < 1 ? "#22c55e" : "#ef4444" }}>
                {errorRate}%
              </span>
            </div>

            {/* Simulated Live SVG waveform */}
            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-end" }}>
              <svg viewBox="0 0 500 120" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                <line x1="0" y1="100" x2="500" y2="100" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeDasharray="3 3" />
                <motion.path
                  d={`M 0,95 L 120,96 L 240,94 L 300,${120 - errorRate * 2.2} L 500,${120 - errorRate * 2.2}`}
                  fill="none"
                  stroke={errorRate < 1 ? "#22c55e" : "#ef4444"}
                  strokeWidth="3"
                  transition={{ duration: 0.3 }}
                />
              </svg>
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
              Threshold: &lt; 0.5% | Alert triggered after deploy v2.4.1-hotfix
            </div>
          </div>

          {/* Chart 2: Checkout Conversion */}
          <div style={{ flex: 1, background: "#0b101c", border: "1px solid #1e293b", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8" }}>
                CHECKOUT FUNNEL CONVERSION (%)
              </span>
              <span style={{ fontSize: 20, fontWeight: 900, color: conversionRate > 70 ? "#22c55e" : "#f59e0b" }}>
                {conversionRate}%
              </span>
            </div>

            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-end" }}>
              <svg viewBox="0 0 500 120" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                <line x1="0" y1="20" x2="500" y2="20" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="70" x2="500" y2="70" stroke="#1e293b" strokeDasharray="3 3" />
                <motion.path
                  d={`M 0,30 L 120,28 L 240,32 L 300,${120 - conversionRate * 1.1} L 500,${120 - conversionRate * 1.1}`}
                  fill="none"
                  stroke={conversionRate > 70 ? "#22c55e" : "#f59e0b"}
                  strokeWidth="3"
                  transition={{ duration: 0.3 }}
                />
              </svg>
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
              Baseline: ~85.0% | Revenue impact: -$12,000 / minute
            </div>
          </div>
        </div>

        {/* RIGHT INCIDENT COMMAND CONTROLS */}
        <div style={{ background: "#05070d", borderLeft: "1px solid #1e293b", display: "flex", flexDirection: "column" }}>
          {/* Slack Live Chat */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b", background: "#080c14", fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>
            #war-room-sev1 (AURA INCIDENT TEAM)
          </div>

          <div style={{ flex: 1, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {chat.map((msg, i) => (
              <div key={i} style={{ background: "#0b101c", border: "1px solid #1e293b", borderRadius: 6, padding: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: (msg?.sender || "").includes("Alex") ? "#38bdf8" : (msg?.sender || "").includes("You") ? "#22c55e" : "#f59e0b" }}>
                    {msg.sender}
                  </span>
                  <span style={{ fontSize: 9, color: "#64748b" }}>{msg.time}</span>
                </div>
                <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.4 }}>{msg.text}</div>
              </div>
            ))}
          </div>

          {/* Emergency Remediation Actions */}
          <div style={{ padding: 16, background: "#090d18", borderTop: "1px solid #1e293b" }}>
            <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
              Select Incident Mitigation Action:
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={handleRollback}
                disabled={isRecovering}
                style={{
                  padding: "12px",
                  background: isRecovering ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.15)",
                  border: isRecovering ? "1px solid #22c55e" : "1px solid #ef4444",
                  color: isRecovering ? "#22c55e" : "#fca5a5",
                  fontWeight: 900,
                  fontSize: 12,
                  borderRadius: 4,
                  cursor: isRecovering ? "default" : "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "inherit",
                  letterSpacing: "0.5px",
                  boxShadow: isRecovering ? "0 0 15px rgba(34,197,94,0.2)" : "0 0 15px rgba(239,68,68,0.3)",
                }}
              >
                <span>🔥</span>
                <span>{isRecovering ? "[ ROLLBACK_ACTIVE // MONITORING ]" : "[ 1-CLICK_ROLLBACK_TO_v2.4.0 ]"}</span>
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleWrongAction("Restart Pods")}
                  disabled={isRecovering}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid #334155",
                    color: "#94a3b8",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  [ RESTART_PODS ]
                </button>
                <button
                  onClick={() => handleWrongAction("Scale to 50 Replicas")}
                  disabled={isRecovering}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid #334155",
                    color: "#94a3b8",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  [ SCALE_50_REPLICAS ]
                </button>
              </div>
            </div>

            <AnimatePresence>
              {solved && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: 12,
                    padding: 10,
                    background: "rgba(34,197,94,0.15)",
                    border: "1px solid #22c55e",
                    borderRadius: 6,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#22c55e" }}>
                    🎉 SEV-1 RESOLVED: 0.1% ERROR RATE
                  </div>
                  <div style={{ fontSize: 9, color: "#94a3b8" }}>
                    All 16 pods healthy. Routing to evaluation metrics...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
