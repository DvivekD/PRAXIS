"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ActiveAlert, TimelineEvent, WarRoomChatMessage, StatusPageUpdate, PostmortemReport } from "./types";

interface IncidentWarRoomSubEnvProps {
  errorRate: number;
  isRecovering: boolean;
  isSolved: boolean;
  chatMessages: WarRoomChatMessage[];
  timeline: TimelineEvent[];
  alerts: ActiveAlert[];
  statusPage: StatusPageUpdate;
  onSendMessage: (text: string) => Promise<any>;
  onAcknowledgeAlert: (alertId: string) => void;
  onUpdateStatusPage: (update: StatusPageUpdate) => void;
  onSubmitPostmortem?: (report: PostmortemReport) => void;
  onNavigateToRollback?: () => void;
  onNavigateToMonitoring?: () => void;
}

export default function IncidentWarRoomSubEnv({
  errorRate,
  isRecovering,
  isSolved,
  chatMessages,
  timeline,
  alerts,
  statusPage,
  onSendMessage,
  onAcknowledgeAlert,
  onUpdateStatusPage,
  onSubmitPostmortem,
  onNavigateToRollback,
  onNavigateToMonitoring,
}: IncidentWarRoomSubEnvProps) {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPostmortemModal, setShowPostmortemModal] = useState(false);
  const [postmortemGenerated, setPostmortemGenerated] = useState(false);

  // Status form state
  const [stStatus, setStStatus] = useState<StatusPageUpdate["status"]>(statusPage.status || "Investigating");
  const [stTitle, setStTitle] = useState(statusPage.title || "Investigating Checkout Latency & 500 Errors");
  const [stMessage, setStMessage] = useState(
    statusPage.message ||
      "We are investigating elevated error rates when completing purchases during peak Black Friday traffic. Engineering is actively engaged."
  );

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText("");
    try {
      await onSendMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  const handlePublishStatus = () => {
    const newUpdate: StatusPageUpdate = {
      status: stStatus,
      title: stTitle,
      message: stMessage,
      affectedServices: ["Checkout API", "Payment Processing"],
      updatedAt: new Date().toLocaleTimeString(),
    };
    onUpdateStatusPage(newUpdate);
    setShowStatusModal(false);
  };

  const handleGeneratePostmortem = () => {
    const report: PostmortemReport = {
      incidentId: "INC-8942",
      incidentTitle: "Sev-1 Checkout API Production Outage (Peak Black Friday)",
      severity: "SEV-1 (P1)",
      durationMinutes: 18,
      detectedAt: "16:56:12 UTC",
      mitigatedAt: isSolved ? "17:01:45 UTC" : "Pending Rollback Completion",
      impactSummary: "42.8% error rate on /v1/checkout/complete; estimated -$216,000 lost checkout transactions.",
      rootCause:
        "Hotfix v2.4.1 introduced dynamic promo discount token evaluation without null checking. Under peak concurrency, undefined cart tokens triggered unhandled exceptions and container crashloops across 16 replicas.",
      recoveryAction:
        "Executed 1-click zero-downtime Kubernetes rollback to stable revision v2.4.0. All 16 pods returned to 1/1 Running state.",
      actionItems: [
        "Enforce automated canary deployment gates (10% traffic for 5m) before full cluster promotion.",
        "Add strict TypeScript runtime assertion test suite for checkout payload token parameters.",
        "Update Prometheus alerting threshold from 3m sustained to 60s for Sev-1 escalations.",
      ],
      timeline: timeline,
    };

    setPostmortemGenerated(true);
    setShowPostmortemModal(true);
    if (onSubmitPostmortem) onSubmitPostmortem(report);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#05070a",
        color: "#fff",
        fontFamily: "'JetBrains Mono', monospace",
        overflow: "hidden",
      }}
    >
      {/* ─── INCIDENT STATUS BANNER ─── */}
      <div
        style={{
          background: isSolved
            ? "#062b19"
            : isRecovering
            ? "#1f2913"
            : "#2b0a0a",
          borderBottom: `2px solid ${isSolved ? "#22c55e" : isRecovering ? "#eab308" : "#ef4444"}`,
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <motion.div
            animate={{ scale: isSolved ? 1 : [1, 1.3, 1], opacity: isSolved ? 1 : [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: isSolved ? "#22c55e" : isRecovering ? "#eab308" : "#ef4444",
            }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: isSolved ? "#22c55e" : "#ef4444" }}>
                {isSolved
                  ? "✓ SEV-1 RESOLVED // TRAFFIC NORMALIZED"
                  : isRecovering
                  ? "⚡ MITIGATION ACTIVE // REPLACING PODS WITH v2.4.0"
                  : "🚨 SEV-1 INCIDENT #8942 // AURA CHECKOUT OUTAGE"}
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 3,
                  color: "#cbd5e1",
                }}
              >
                MTTR Target: &lt; 20m
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
              Commander: <strong style={{ color: "#38bdf8" }}>You</strong> | Lead SRE:{" "}
              <strong style={{ color: "#f59e0b" }}>Alex Chen</strong> | Current 5xx:{" "}
              <strong style={{ color: errorRate > 2 ? "#ef4444" : "#22c55e" }}>{errorRate.toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onNavigateToMonitoring && (
            <button
              onClick={onNavigateToMonitoring}
              style={{
                background: "#1e222d",
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
              <span>Grafana Metrics</span>
            </button>
          )}

          {onNavigateToRollback && !isSolved && (
            <button
              onClick={onNavigateToRollback}
              style={{
                background: isRecovering ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.2)",
                border: isRecovering ? "1px solid #22c55e" : "1px solid #ef4444",
                color: isRecovering ? "#22c55e" : "#fca5a5",
                padding: "6px 12px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>☸️</span>
              <span>{isRecovering ? "Monitor Rollout" : "Rollback Console"}</span>
            </button>
          )}

          {/* Status Page Updater trigger */}
          <button
            onClick={() => setShowStatusModal(true)}
            style={{
              padding: "6px 12px",
              background: "rgba(245,158,11,0.12)",
              border: "1px solid #f59e0b",
              color: "#f59e0b",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📢</span>
            <span>Update Status Page</span>
          </button>

          {/* Postmortem Generator trigger */}
          <button
            onClick={handleGeneratePostmortem}
            style={{
              padding: "6px 12px",
              background: "rgba(129,140,248,0.12)",
              border: "1px solid #818cf8",
              color: "#818cf8",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📝</span>
            <span>{postmortemGenerated ? "View Postmortem" : "Generate RCA"}</span>
          </button>
        </div>
      </div>

      {/* ─── 3-COLUMN WAR ROOM WORKSPACE ─── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "320px 1fr 340px", overflow: "hidden" }}>
        {/* COLUMN 1: ACTIVE INCIDENT TIMELINE & RUNBOOKS */}
        <div
          style={{
            background: "#080a10",
            borderRight: "1px solid #1e293b",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid #1e293b",
              background: "#0b101c",
              fontSize: 11,
              fontWeight: 800,
              color: "#94a3b8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>INCIDENT TIMELINE</span>
            <span style={{ fontSize: 9, color: "#38bdf8" }}>{timeline.length} EVENTS</span>
          </div>

          <div style={{ flex: 1, padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {timeline.map((evt) => (
              <div
                key={evt.id}
                style={{
                  display: "flex",
                  gap: 10,
                  position: "relative",
                  fontSize: 11,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background:
                        evt.type === "alert"
                          ? "#ef4444"
                          : evt.type === "deploy"
                          ? "#f59e0b"
                          : evt.type === "resolve"
                          ? "#22c55e"
                          : "#38bdf8",
                      marginTop: 3,
                    }}
                  />
                  <div style={{ width: 1, flex: 1, background: "#1e293b", marginTop: 2 }} />
                </div>

                <div
                  style={{
                    flex: 1,
                    background: "#0b101c",
                    border: "1px solid #1e293b",
                    borderRadius: 4,
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, color: "#f8fafc" }}>{evt.title}</span>
                    <span style={{ fontSize: 9, color: "#64748b" }}>{evt.timestamp}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.4 }}>{evt.detail}</div>
                  <div style={{ fontSize: 9, color: "#475569", marginTop: 4 }}>by {evt.author}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Status Page Banner info */}
          <div style={{ padding: 10, background: "#060911", borderTop: "1px solid #1e293b", fontSize: 10 }}>
            <div style={{ color: "#64748b", marginBottom: 4 }}>PUBLIC STATUS PAGE:</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    statusPage.status === "Resolved"
                      ? "#22c55e"
                      : statusPage.status === "Monitoring"
                      ? "#38bdf8"
                      : "#f59e0b",
                }}
              />
              <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{statusPage.status}</span>
              <span style={{ color: "#64748b" }}>({statusPage.updatedAt})</span>
            </div>
            <div style={{ color: "#94a3b8", marginTop: 4, fontSize: 9 }}>{statusPage.title}</div>
          </div>
        </div>

        {/* COLUMN 2: TEAM CHAT (#war-room-sev1) */}
        <div style={{ display: "flex", flexDirection: "column", background: "#070a12", overflow: "hidden" }}>
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #1e293b",
              background: "#0a0f1c",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#ef4444", fontWeight: 900 }}>#</span>
              <span style={{ fontWeight: 800, color: "#f8fafc", fontSize: 12 }}>war-room-sev1</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>Aura Commerce Engineering Incident Channel</span>
            </div>
            <span style={{ fontSize: 10, color: "#22c55e" }}>● 4 members active</span>
          </div>

          {/* Message Stream */}
          <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  background:
                    msg.sender.includes("You")
                      ? "rgba(56,189,248,0.06)"
                      : msg.sender.includes("Bot")
                      ? "rgba(245,158,11,0.04)"
                      : "#0c1322",
                  border:
                    msg.sender.includes("You")
                      ? "1px solid rgba(56,189,248,0.25)"
                      : msg.sender.includes("Alex")
                      ? "1px solid rgba(245,158,11,0.3)"
                      : "1px solid #1e293b",
                  borderRadius: 6,
                  padding: "10px 14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: 11,
                        color:
                          msg.sender.includes("You")
                            ? "#38bdf8"
                            : msg.sender.includes("Alex")
                            ? "#f59e0b"
                            : msg.sender.includes("Datadog")
                            ? "#ef4444"
                            : "#a855f7",
                      }}
                    >
                      {msg.sender}
                    </span>
                    <span style={{ fontSize: 9, color: "#64748b" }}>{msg.role}</span>
                  </div>
                  <span style={{ fontSize: 9, color: "#64748b" }}>{msg.time}</span>
                </div>
                <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Action Suggested Chips */}
          <div
            style={{
              padding: "8px 16px",
              background: "#080c16",
              borderTop: "1px solid #1e293b",
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 10, color: "#64748b", alignSelf: "center", marginRight: 4 }}>Suggested:</span>
            {[
              "Alex, what is the exact error stack trace from failing pods?",
              "What changed between v2.4.0 and v2.4.1-hotfix?",
              "Confirm current customer checkout drop-off rate",
              "Execute zero-downtime rollback to v2.4.0 immediately",
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid #273346",
                  color: "#94a3b8",
                  padding: "3px 8px",
                  borderRadius: 3,
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div style={{ padding: 12, background: "#0a0f1c", borderTop: "1px solid #1e293b", display: "flex", gap: 8 }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Message #war-room-sev1 (instruct team, query telemetry, plan action)..."
              style={{
                flex: 1,
                background: "#05070d",
                border: "1px solid #273346",
                borderRadius: 4,
                padding: "8px 12px",
                color: "#fff",
                fontSize: 11,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={isSending}
              style={{
                background: "#2563eb",
                border: "none",
                borderRadius: 4,
                color: "#fff",
                padding: "0 18px",
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {isSending ? "..." : "Send"}
            </button>
          </div>
        </div>

        {/* COLUMN 3: LIVE ALERT STACK & RUNBOOK ACTIONS */}
        <div
          style={{
            background: "#080a10",
            borderLeft: "1px solid #1e293b",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid #1e293b",
              background: "#0b101c",
              fontSize: 11,
              fontWeight: 800,
              color: "#94a3b8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>LIVE ALERT STACK</span>
            <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 900 }}>
              {alerts.filter((a) => !a.acknowledged).length} UNACKED
            </span>
          </div>

          <div style={{ flex: 1, padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {alerts.map((al) => (
              <div
                key={al.id}
                style={{
                  background: al.acknowledged ? "#090d16" : "rgba(239,68,68,0.06)",
                  border: al.acknowledged ? "1px solid #1e293b" : "1px solid rgba(239,68,68,0.5)",
                  borderRadius: 6,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 900,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background:
                        al.severity === "CRITICAL"
                          ? "#ef4444"
                          : al.severity === "PAGE"
                          ? "#f97316"
                          : "#eab308",
                      color: "#000",
                    }}
                  >
                    {al.severity}
                  </span>
                  <span style={{ fontSize: 9, color: "#64748b" }}>{al.firedAt}</span>
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: "#f8fafc" }}>{al.title}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.3 }}>{al.description}</div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: "#475569" }}>src: {al.source}</span>
                  <button
                    onClick={() => onAcknowledgeAlert(al.id)}
                    disabled={al.acknowledged}
                    style={{
                      background: al.acknowledged ? "transparent" : "rgba(56,189,248,0.15)",
                      border: al.acknowledged ? "1px solid #334155" : "1px solid #38bdf8",
                      color: al.acknowledged ? "#64748b" : "#38bdf8",
                      padding: "2px 8px",
                      borderRadius: 3,
                      fontSize: 9,
                      fontWeight: 700,
                      cursor: al.acknowledged ? "default" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {al.acknowledged ? "ACKNOWLEDGED ✓" : "ACK ALERT"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Remediation Box */}
          <div style={{ padding: 12, background: "#060911", borderTop: "1px solid #1e293b" }}>
            <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 800, marginBottom: 6 }}>
              QUICK ROLLBACK ACTION:
            </div>
            <button
              onClick={onNavigateToRollback}
              disabled={isSolved}
              style={{
                width: "100%",
                padding: "10px",
                background: isSolved
                  ? "rgba(34,197,94,0.12)"
                  : isRecovering
                  ? "rgba(234,179,8,0.12)"
                  : "rgba(239,68,68,0.15)",
                border: isSolved ? "1px solid #22c55e" : isRecovering ? "1px solid #eab308" : "1px solid #ef4444",
                color: isSolved ? "#22c55e" : isRecovering ? "#eab308" : "#fca5a5",
                fontWeight: 900,
                fontSize: 11,
                borderRadius: 4,
                cursor: isSolved ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {isSolved
                ? "✓ 0.1% ERRORS (RESOLVED)"
                : isRecovering
                ? "⚡ ROLLBACK EXECUTING..."
                : "🚀 1-CLICK ROLLBACK TO v2.4.0"}
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL 1: PUBLIC STATUS PAGE UPDATER ─── */}
      <AnimatePresence>
        {showStatusModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.8)",
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
                background: "#0c101c",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: 20,
                width: "100%",
                maxWidth: 550,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: "#f8fafc" }}>
                  📢 Public Status Page Updater (status.auracommerce.com)
                </span>
                <button
                  onClick={() => setShowStatusModal(false)}
                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>

              <div>
                <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                  INCIDENT STAGE:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {(["Investigating", "Identified", "Monitoring", "Resolved"] as const).map((stage) => (
                    <button
                      key={stage}
                      onClick={() => setStStatus(stage)}
                      style={{
                        padding: "6px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: stStatus === stage ? "#2563eb" : "#182030",
                        border: stStatus === stage ? "1px solid #38bdf8" : "1px solid #334155",
                        color: stStatus === stage ? "#fff" : "#94a3b8",
                      }}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                  INCIDENT TITLE:
                </label>
                <input
                  type="text"
                  value={stTitle}
                  onChange={(e) => setStTitle(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#060810",
                    border: "1px solid #334155",
                    borderRadius: 4,
                    padding: "8px 10px",
                    color: "#fff",
                    fontSize: 11,
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                  CUSTOMER-FACING UPDATE MESSAGE:
                </label>
                <textarea
                  rows={4}
                  value={stMessage}
                  onChange={(e) => setStMessage(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#060810",
                    border: "1px solid #334155",
                    borderRadius: 4,
                    padding: "8px 10px",
                    color: "#fff",
                    fontSize: 11,
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => setShowStatusModal(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid #334155",
                    color: "#94a3b8",
                    padding: "6px 14px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublishStatus}
                  style={{
                    background: "#2563eb",
                    border: "none",
                    color: "#fff",
                    padding: "6px 16px",
                    borderRadius: 4,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  Publish Live Update
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL 2: POSTMORTEM (RCA) GENERATOR ─── */}
      <AnimatePresence>
        {showPostmortemModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(6px)",
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
                background: "#0a0d18",
                border: "1px solid #38bdf8",
                borderRadius: 8,
                padding: 22,
                width: "100%",
                maxWidth: 680,
                maxHeight: "85vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#38bdf8" }}>
                    📝 Postmortem &amp; Root Cause Analysis (RCA)
                  </span>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>
                    INC-8942 // Sev-1 Checkout Outage — Black Friday Core
                  </div>
                </div>
                <button
                  onClick={() => setShowPostmortemModal(false)}
                  style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ background: "#05070d", border: "1px solid #1e293b", borderRadius: 4, padding: 12, fontSize: 11 }}>
                <strong style={{ color: "#f59e0b" }}>ROOT CAUSE:</strong>
                <p style={{ margin: "4px 0 0 0", color: "#cbd5e1", lineHeight: 1.5 }}>
                  Hotfix v2.4.1 introduced dynamic promo discount token handling without null safety check. Under peak
                  concurrency, undefined cart tokens triggered unhandled TypeError and container crashlooping across 16
                  replicas.
                </p>
              </div>

              <div style={{ background: "#05070d", border: "1px solid #1e293b", borderRadius: 4, padding: 12, fontSize: 11 }}>
                <strong style={{ color: "#22c55e" }}>RECOVERY ACTION:</strong>
                <p style={{ margin: "4px 0 0 0", color: "#cbd5e1", lineHeight: 1.5 }}>
                  Incident Commander issued zero-downtime rollback to verified stable image tag v2.4.0. MaxSurge 25%
                  rolling replacement completed without dropped in-flight transactions.
                </p>
              </div>

              <div style={{ fontSize: 11 }}>
                <strong style={{ color: "#818cf8" }}>PREVENTATIVE ACTION ITEMS:</strong>
                <ul style={{ margin: "6px 0 0 16px", padding: 0, color: "#94a3b8", lineHeight: 1.6 }}>
                  <li>Enforce automated canary deployment gates (10% traffic for 5m) before full cluster promotion.</li>
                  <li>Add strict TypeScript runtime assertion test suite for checkout payload token parameters.</li>
                  <li>Update Prometheus alerting threshold from 3m sustained to 60s for Sev-1 escalations.</li>
                </ul>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => setShowPostmortemModal(false)}
                  style={{
                    background: "#2563eb",
                    border: "none",
                    color: "#fff",
                    padding: "8px 18px",
                    borderRadius: 4,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  Close Postmortem
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
