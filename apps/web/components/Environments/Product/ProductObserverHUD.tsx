"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarScene from "../../Avatar/AvatarScene";

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

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        width: isExpanded ? 320 : 44,
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
        /* Collapsed Rail */
        <div
          onClick={() => setIsExpanded(true)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 16,
            cursor: "pointer",
            background: "#080a12",
          }}
          title="Click to expand 3D Observer HUD"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            style={{
              background: "rgba(129,140,248,0.2)",
              border: "1px solid rgba(129,140,248,0.4)",
              color: "#a5b4fc",
              borderRadius: 4,
              padding: "4px 6px",
              cursor: "pointer",
              fontSize: 11,
              marginBottom: 16,
            }}
          >
            ◀
          </button>
          <span style={{ position: "relative", display: "flex", height: 10, width: 10, marginBottom: 20 }}>
            <span
              style={{
                backgroundColor: "#818cf8",
                animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                position: "absolute",
                display: "inline-flex",
                height: "100%",
                width: "100%",
                borderRadius: "9999px",
                opacity: 0.75,
              }}
            />
            <span style={{ backgroundColor: "#818cf8", position: "relative", display: "inline-flex", borderRadius: "9999px", height: 10, width: 10 }} />
          </span>
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
            3D OBSERVER [{cognitiveLoad}%]
          </div>
        </div>
      )}
    </div>
  );
}
