"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const AvatarScene = dynamic(() => import("../../Avatar/AvatarScene"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 210,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020307",
        color: "#10b981",
        fontSize: 10,
        letterSpacing: "1px",
      }}
    >
      [ INITIALIZING 3D OBSERVER CORE... ]
    </div>
  ),
});

interface SupportObserverHUDProps {
  analyserNode?: AnalyserNode | null;
  cognitiveLoad?: number;
  activeSubEnv: "queue" | "investigation" | "escalation";
  isQueueSwept: boolean;
  selectedTone?: string;
  gatewayInspected?: boolean;
  onInteract?: (actionText: string) => void;
}

export default function SupportObserverHUD({
  analyserNode = null,
  cognitiveLoad = 55,
  activeSubEnv,
  isQueueSwept = false,
  selectedTone = "empathetic",
  gatewayInspected = false,
  onInteract,
}: SupportObserverHUDProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const getSubEnvLabel = () => {
    switch (activeSubEnv) {
      case "queue":
        return "01 // HELPDESK TICKET QUEUE";
      case "investigation":
        return "02 // CUSTOMER INVESTIGATION DESK";
      case "escalation":
        return "03 // ESCALATION & RESPONSE CENTER";
      default:
        return "SUPPORT SCOPE";
    }
  };

  const slaEfficiencyScore = isQueueSwept ? 98 : gatewayInspected ? 78 : 45;
  const empathyAlignmentScore = selectedTone === "empathetic" ? 95 : selectedTone === "neutral" ? 80 : 65;

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#03060d",
        borderLeft: "1px solid #1e293b",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: "#f8fafc",
        overflow: "hidden",
        width: isExpanded ? 340 : 54,
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        flexShrink: 0,
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "#080d1a",
          borderBottom: "1px solid #1e293b",
          minHeight: 46,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 10px #10b981",
            }}
          />
          {isExpanded && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#10b981", letterSpacing: "1px" }}>
                3D OBSERVER HUD
              </div>
              <div style={{ fontSize: 9, color: "#64748b" }}>AI Behavioral Telemetry</div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse HUD" : "Expand HUD"}
          style={{
            background: "transparent",
            border: "1px solid #1e293b",
            color: "#94a3b8",
            width: 26,
            height: 26,
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isExpanded ? "▶" : "◀"}
        </button>
      </div>

      {/* Expanded HUD Content */}
      {isExpanded && (
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {/* 3D Observer Avatar Scene Canvas */}
          <div style={{ height: 210, width: "100%", background: "#020307", position: "relative", borderBottom: "1px solid #1e293b" }}>
            <AvatarScene domain="support" analyserNode={analyserNode} onInteract={onInteract} />
          </div>

          {/* Sub-Environment Indicator */}
          <div style={{ padding: "10px 14px", background: "#060914", borderBottom: "1px solid #1e293b" }}>
            <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>Active Sub-Environment</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#10b981", marginTop: 2 }}>{getSubEnvLabel()}</div>
          </div>

          {/* Real-Time Behavioral Metrics */}
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14, borderBottom: "1px solid #1e293b" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 800, letterSpacing: "1px" }}>
              BEHAVIORAL DIMENSION SIGNALS
            </div>

            {/* Cognitive Load */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: "#94a3b8" }}>Cognitive Load Index:</span>
                <span style={{ color: cognitiveLoad > 75 ? "#ef4444" : "#10b981", fontWeight: 800 }}>
                  {cognitiveLoad}%
                </span>
              </div>
              <div style={{ height: 5, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${cognitiveLoad}%`,
                    background: cognitiveLoad > 75 ? "#ef4444" : "#10b981",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {/* SLA Triage Efficiency */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: "#94a3b8" }}>SLA Triage Efficiency:</span>
                <span style={{ color: "#38bdf8", fontWeight: 800 }}>{slaEfficiencyScore}%</span>
              </div>
              <div style={{ height: 5, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${slaEfficiencyScore}%`,
                    background: "#38bdf8",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {/* Customer Empathy & Retention Alignment */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: "#94a3b8" }}>Empathy & Retention Alignment:</span>
                <span style={{ color: "#10b981", fontWeight: 800 }}>{empathyAlignmentScore}%</span>
              </div>
              <div style={{ height: 5, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${empathyAlignmentScore}%`,
                    background: "#10b981",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Process Heuristics Checklist */}
          <div style={{ padding: 14, borderBottom: "1px solid #1e293b" }}>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 800, letterSpacing: "1px", marginBottom: 10 }}>
              SEEKER HEURISTICS TRACKER
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: isQueueSwept || gatewayInspected ? "#10b981" : "#64748b" }}>
                  {isQueueSwept || gatewayInspected ? "✓" : "○"}
                </span>
                <span style={{ color: gatewayInspected ? "#fff" : "#94a3b8" }}>
                  Structured Diagnosis: Gateway Logs tx_8819 vs tx_8820
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    color:
                      selectedTone === "empathetic" || selectedTone === "neutral"
                        ? "#10b981"
                        : "#64748b",
                  }}
                >
                  {selectedTone === "empathetic" || selectedTone === "neutral" ? "✓" : "○"}
                </span>
                <span
                  style={{
                    color:
                      selectedTone === "empathetic" || selectedTone === "neutral"
                        ? "#fff"
                        : "#94a3b8",
                  }}
                >
                  Tone Alignment:{" "}
                  {selectedTone === "empathetic"
                    ? "Empathetic Enterprise Retention"
                    : selectedTone === "neutral"
                    ? "Neutral SLA Enterprise Notice"
                    : "Direct Technical Tone"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: isQueueSwept ? "#10b981" : "#64748b" }}>
                  {isQueueSwept ? "✓" : "○"}
                </span>
                <span style={{ color: isQueueSwept ? "#fff" : "#94a3b8" }}>
                  Unified Escalation: SRE SEV-1 vs Fragmented Refund
                </span>
              </div>
            </div>
          </div>

          {/* Active Persona Card */}
          <div style={{ padding: 14, background: "#060a16", flex: 1 }}>
            <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
              Active Stakeholder Persona
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>Jordan Mitchell</div>
            <div style={{ fontSize: 10, color: "#10b981" }}>Customer Support Lead</div>
            <div
              style={{
                marginTop: 8,
                fontSize: 10,
                color: "#94a3b8",
                lineHeight: 1.5,
                background: "#080e1e",
                padding: 10,
                borderRadius: 6,
                border: "1px solid #1e293b",
              }}
            >
              {isQueueSwept
                ? "“Outstanding work! The unified escalation protected our $250k Nordic Goods contract and Alex Chen is already deploying the fix.”"
                : "“We have 120 tickets queued and enterprise customers breaching SLA. Do not issue piecemeal refunds — inspect the gateway logs and escalate to SRE!”"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
