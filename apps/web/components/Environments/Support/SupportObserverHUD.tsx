"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { VoiceSession, VoiceSessionHandle, VoiceSessionMode } from "../../Avatar/VoiceSession";

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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [observerMode, setObserverMode] = useState<VoiceSessionMode>("guide");
  const voiceSessionRef = useRef<VoiceSessionHandle>(null);

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
        width: isExpanded ? 380 : 54,
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
      {isExpanded ? (
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {/* 3D Observer Avatar Scene Canvas */}
          <div style={{ height: 210, width: "100%", background: "#020307", position: "relative", borderBottom: "1px solid #1e293b" }}>
            <AvatarScene domain="support" analyserNode={analyserNode} onInteract={onInteract} />

            {/* Maximize to full-screen button */}
            <button
              onClick={() => setIsFullScreen(true)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(10, 15, 30, 0.8)",
                border: "1px solid #10b981",
                color: "#6ee7b7",
                padding: "3px 8px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
                backdropFilter: "blur(6px)",
                zIndex: 10,
              }}
              title="Maximize 3D Observer to Full Screen with Live Voice"
            >
              <span>⛶</span>
              <span>MAXIMIZE FULL SCREEN</span>
            </button>
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
      ) : (
        /* Collapsed Mode Sidebar with Miniature 3D Avatar Orb */
        <div
          onClick={() => setIsFullScreen(true)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 16,
            gap: 16,
            cursor: "pointer",
            background: "#03060d",
          }}
          title="Click to maximize 3D Observer to Full Screen with Live Voice"
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid #10b981",
              boxShadow: "0 0 16px rgba(16, 185, 129, 0.45)",
              position: "relative",
              background: "#020307",
            }}
          >
            <AvatarScene domain="support" analyserNode={analyserNode} />
          </div>

          <div
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontSize: 10,
              fontWeight: 800,
              color: "#10b981",
              letterSpacing: "2px",
              whiteSpace: "nowrap",
            }}
          >
            3D OBSERVER [LIVE]
          </div>

          <div
            style={{
              fontSize: 10,
              color: "#10b981",
              fontWeight: 800,
              background: "rgba(16,185,129,0.1)",
              padding: "4px 2px",
              borderRadius: 3,
            }}
          >
            {cognitiveLoad}%
          </div>
        </div>
      )}

      {/* Full-Screen Immersive 3D Observer Live Overlay (Matching /test-avatar) */}
      {isFullScreen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            background: "#020307",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top Bar with Status and Minimize Button */}
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 24,
              right: 24,
              zIndex: 100,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(5, 8, 16, 0.85)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                padding: "8px 18px",
                borderRadius: 24,
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                boxShadow: "0 0 15px rgba(16, 185, 129, 0.2)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 12px #10b981",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 800, color: "#10b981", letterSpacing: "1px" }}>
                3D OBSERVER LIVE // FULL SCREEN
              </span>
            </div>

            <button
              onClick={() => setIsFullScreen(false)}
              style={{
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#f8fafc",
                padding: "8px 18px",
                borderRadius: 24,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
              }}
            >
              <span style={{ color: "#ef4444", fontWeight: 900 }}>✕</span>
              <span>MINIMIZE TO WORKSPACE</span>
            </button>
          </div>

          {/* Full Screen Live Voice Session (Identical to /test-avatar) */}
          <div style={{ flex: 1, width: "100%", height: "100%", position: "relative" }}>
            <VoiceSession
              domain="support"
              problemTitle="Scope 6 Support: SLA Backlog & Customer Escalation"
              scenario="120 tickets queued up overnight. 3 Enterprise VIP tickets have expiring SLAs due to double credit card debits."
              autoConnect={true}
              initialEngine="live"
              showAvatar={true}
              compact={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
