"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarScene from "../../Avatar/AvatarScene";
import { VoiceSession, VoiceSessionHandle, VoiceSessionMode } from "../../Avatar/VoiceSession";

interface ProductObserverHUDProps {
  cognitiveLoad: number;
  observerNotes: string[];
  activePersona?: { name: string; role: string };
  signals?: {
    edgeCaseConsideration?: boolean;
    tradeoffArticulation?: boolean;
    structuredDebugging?: boolean;
  };
}

export default function ProductObserverHUD({
  cognitiveLoad,
  observerNotes,
  activePersona = { name: "Taylor Brooks", role: "CEO" },
  signals = {},
}: ProductObserverHUDProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [observerMode, setObserverMode] = useState<VoiceSessionMode>("guide");
  const voiceSessionRef = useRef<VoiceSessionHandle>(null);

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        width: isExpanded ? 380 : 54,
        background: "#0a0d16",
        borderLeft: "1px solid rgba(129, 140, 248, 0.25)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "'JetBrains Mono', 'Inter', monospace",
        zIndex: 50,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {isExpanded ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
          {/* HUD Header */}
          <div
            style={{
              height: 44,
              padding: "0 14px",
              background: "rgba(129, 140, 248, 0.12)",
              borderBottom: "1px solid rgba(129, 140, 248, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8", boxShadow: "0 0 8px #818cf8" }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: "#818cf8", letterSpacing: "1px" }}>
                OBSERVER // 3D SYNAPSE
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 4,
              }}
              title="Collapse 3D Observer"
            >
              ▶
            </button>
          </div>

          {/* 3D Canvas Container */}
          <div style={{ width: "100%", height: 190, position: "relative", background: "#05070d", flexShrink: 0 }}>
            <AvatarScene analyserNode={null} domain="product" />
            
            {/* Maximize to full-screen button */}
            <button
              onClick={() => setIsFullScreen(true)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(10, 15, 30, 0.8)",
                border: "1px solid #818cf8",
                color: "#c7d2fe",
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

            <div
              style={{
                position: "absolute",
                bottom: 6,
                left: 8,
                fontSize: 9,
                color: "rgba(255,255,255,0.4)",
                pointerEvents: "none",
              }}
            >
              DRAG TO ORBIT // 3D DUAL-TORUS CORE
            </div>
          </div>

          {/* Telemetry Heuristics */}
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            {/* Cognitive Load Bar */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                <span style={{ color: "#94a3b8" }}>Candidate Cognitive Load:</span>
                <strong style={{ color: cognitiveLoad > 70 ? "#ef4444" : "#818cf8" }}>{cognitiveLoad}%</strong>
              </div>
              <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${cognitiveLoad}%`,
                    height: "100%",
                    background: cognitiveLoad > 70 ? "#ef4444" : "linear-gradient(90deg, #818cf8, #a78bfa)",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <div style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>
                {cognitiveLoad < 40 ? "Low cognitive strain — decisive velocity" : cognitiveLoad <= 65 ? "Optimal analytical deliberation zone" : "Elevated load — multiple competing priorities"}
              </div>
            </div>

            {/* Behavioral Signals */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", letterSpacing: "0.5px", marginBottom: 8, textTransform: "uppercase" }}>
                Live Evaluator Signals
              </div>
              <div style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: signals.tradeoffArticulation ? "#4ade80" : "#64748b" }}>
                  <span>{signals.tradeoffArticulation ? "✓" : "○"}</span>
                  <span>Tradeoff Articulation (Pushed back on Gift Cards)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: signals.edgeCaseConsideration ? "#4ade80" : "#64748b" }}>
                  <span>{signals.edgeCaseConsideration ? "✓" : "○"}</span>
                  <span>Edge Case Consideration (Paused 500k blast)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: signals.structuredDebugging ? "#4ade80" : "#64748b" }}>
                  <span>{signals.structuredDebugging ? "✓" : "○"}</span>
                  <span>Structured Prioritization (P0 Sev-1 Idempotency)</span>
                </div>
              </div>
            </div>

            {/* Active Stakeholder Persona */}
            <div
              style={{
                padding: "8px 10px",
                background: "rgba(129,140,248,0.08)",
                border: "1px solid rgba(129,140,248,0.2)",
                borderRadius: 6,
                fontSize: 11,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                color: "#cbd5e1",
              }}
            >
              <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase" }}>Evaluating Stakeholder:</div>
              <div style={{ fontWeight: 700, color: "#a5b4fc" }}>
                {activePersona.name} — {activePersona.role}
              </div>
            </div>

            {/* Observer Notes Feed */}
            {observerNotes && observerNotes.length > 0 && (
              <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Recent Observations
                </div>
                {observerNotes.slice(-3).map((note, i) => (
                  <div key={i} style={{ fontSize: 10, color: "#94a3b8", background: "rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: 4 }}>
                    {note}
                  </div>
                ))}
              </div>
            )}
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
            background: "#080a12",
          }}
          title="Click to maximize 3D Observer to Full Screen with Live Voice"
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid #818cf8",
              boxShadow: "0 0 16px rgba(129, 140, 248, 0.45)",
              position: "relative",
              background: "#05070d",
            }}
          >
            <AvatarScene analyserNode={null} domain="product" />
          </div>

          <div
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontSize: 10,
              fontWeight: 800,
              color: "#818cf8",
              letterSpacing: "2px",
              whiteSpace: "nowrap",
            }}
          >
            3D OBSERVER [LIVE]
          </div>

          <div
            style={{
              fontSize: 10,
              color: "#818cf8",
              fontWeight: 800,
              background: "rgba(129,140,248,0.1)",
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
            background: "#05070d",
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
                border: "1px solid rgba(129, 140, 248, 0.4)",
                padding: "8px 18px",
                borderRadius: 24,
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                boxShadow: "0 0 15px rgba(129, 140, 248, 0.2)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#818cf8",
                  boxShadow: "0 0 12px #818cf8",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 800, color: "#818cf8", letterSpacing: "1px" }}>
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
              domain="product"
              problemTitle="Scope 3 Product: Black Friday Launch Triage"
              scenario="Triage 5 crisis emails: Sev-1 checkout double charges, VIP merchant churn, deployment freezes vs marketing blasts"
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
