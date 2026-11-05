"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarScene from "../../Avatar/AvatarScene";
import { VoiceSession, VoiceSessionHandle, VoiceSessionMode } from "../../Avatar/VoiceSession";

interface ObserverHUDProps {
  analyserNode?: AnalyserNode | null;
  cognitiveLoad?: number;
  activeSubEnv: "ssh" | "network" | "debugger";
  findingsCount?: number;
  networkRemediated?: boolean;
  testsPassing?: boolean;
  recentTelemetry?: string[];
  onInteract?: (actionText: string) => void;
  domain?: string;
  problemTitle?: string;
  scenario?: string;
}

export default function ObserverHUD({
  analyserNode = null,
  cognitiveLoad = 52,
  activeSubEnv,
  findingsCount = 0,
  networkRemediated = false,
  testsPassing = false,
  recentTelemetry = [],
  onInteract,
  domain = "engineering",
  problemTitle = "Scope 1 Engineering: Checkout 504 Gateway Timeouts & Concurrency Race Condition",
  scenario = "Aura Commerce Black Friday outage investigation and race condition repair",
}: ObserverHUDProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [observerMode, setObserverMode] = useState<VoiceSessionMode>("guide");
  const [simulatedCognitive, setSimulatedCognitive] = useState(cognitiveLoad);
  const voiceSessionRef = useRef<VoiceSessionHandle>(null);

  // Subtle natural pulse in cognitive load
  useEffect(() => {
    setSimulatedCognitive(cognitiveLoad);
  }, [cognitiveLoad]);

  const getSubEnvLabel = () => {
    switch (activeSubEnv) {
      case "ssh":
        return "01 // SSH INFRA TERMINAL";
      case "network":
        return "02 // NETWORK LAB";
      case "debugger":
        return "03 // CODE DEBUGGER";
      default:
        return "ENGINEERING SCOPE";
    }
  };

  const structuredDebuggingScore = Math.min(
    100,
    (findingsCount >= 2 ? 35 : 10) +
      (networkRemediated ? 35 : 0) +
      (testsPassing ? 30 : 0)
  );

  const toolUtilizationScore = Math.min(
    100,
    30 + (findingsCount * 12) + (networkRemediated ? 15 : 0) + (testsPassing ? 15 : 0)
  );

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#03060c",
        borderLeft: "1px solid #1e293b",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: "#f8fafc",
        overflow: "hidden",
        width: isExpanded ? 390 : 64,
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* HUD Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "#080c14",
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
              background: "#00ff41",
              boxShadow: "0 0 10px #00ff41",
            }}
          />
          {isExpanded && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#00ff41",
                  letterSpacing: "1px",
                }}
              >
                3D OBSERVER HUD
              </span>
              <span style={{ fontSize: 9, color: "#64748b" }}>
                COGNITIVE ARCHITECTURE
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse Observer HUD" : "Expand Observer HUD"}
          style={{
            background: "transparent",
            border: "1px solid #334155",
            color: "#94a3b8",
            width: 26,
            height: 26,
            borderRadius: 4,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        >
          {isExpanded ? "▶" : "◀"}
        </button>
      </div>

      {isExpanded ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {/* 3D Scene Viewport */}
          <div
            style={{
              position: "relative",
              height: 210,
              width: "100%",
              background: "#010204",
              borderBottom: "1px solid #1e293b",
            }}
          >
            <AvatarScene
              analyserNode={analyserNode}
              domain="engineering"
              onInteract={onInteract}
            />

            {/* In-canvas HUD Tag */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(3, 6, 12, 0.8)",
                border: "1px solid rgba(0, 255, 65, 0.3)",
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 10,
                color: "#00ff41",
                backdropFilter: "blur(4px)",
              }}
            >
              <span>◈</span>
              <span>CORE_ENGAGEMENT</span>
            </div>

            {/* Maximize Full Screen Button */}
            <button
              onClick={() => setIsFullScreen(true)}
              style={{
                position: "absolute",
                top: 10,
                right: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(0, 255, 65, 0.15)",
                border: "1px solid rgba(0, 255, 65, 0.5)",
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 10,
                color: "#00ff41",
                cursor: "pointer",
                fontWeight: 700,
                backdropFilter: "blur(6px)",
                fontFamily: "inherit",
                boxShadow: "0 0 10px rgba(0, 255, 65, 0.2)",
              }}
              title="Maximize 3D Observer to Full Screen (Talk Live)"
            >
              <span>⛶</span>
              <span>MAXIMIZE FULL SCREEN</span>
            </button>

            <div
              style={{
                position: "absolute",
                bottom: 8,
                right: 10,
                fontSize: 9,
                color: "#475569",
                background: "rgba(3,6,12,0.7)",
                padding: "2px 6px",
                borderRadius: 3,
              }}
            >
              ORBIT / ZOOM ENABLED
            </div>
          </div>

          {/* Active Sub-Environment Telemetry Pill */}
          <div
            style={{
              padding: "10px 14px",
              background: "#060a12",
              borderBottom: "1px solid #1e293b",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 4,
              }}
            >
              Target Pipeline Scope
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>⚡</span>
              <span>{getSubEnvLabel()}</span>
            </div>
          </div>

          {/* Cognitive Load Metric */}
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid #1e293b",
              background: "rgba(2, 6, 15, 0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1" }}>
                COGNITIVE LOAD
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color:
                    simulatedCognitive > 75
                      ? "#ef4444"
                      : simulatedCognitive > 55
                      ? "#f59e0b"
                      : "#00ff41",
                }}
              >
                {simulatedCognitive} / 100
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "#0f172a",
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid #1e293b",
              }}
            >
              <motion.div
                initial={{ width: "50%" }}
                animate={{ width: `${Math.min(100, simulatedCognitive)}%` }}
                transition={{ duration: 0.4 }}
                style={{
                  height: "100%",
                  background:
                    simulatedCognitive > 75
                      ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                      : simulatedCognitive > 55
                      ? "linear-gradient(90deg, #00ff41, #f59e0b)"
                      : "linear-gradient(90deg, #00ff41, #38bdf8)",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 9,
                color: "#64748b",
                marginTop: 5,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>RELAXED</span>
              <span>FOCUSED FLOW</span>
              <span>OVERLOAD</span>
            </div>
          </div>

          {/* Process Heuristics Radar Meters */}
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid #1e293b",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              Behavioral Heuristics
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Metric 1 */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  <span style={{ color: "#94a3b8" }}>Structured Debugging</span>
                  <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                    {structuredDebuggingScore}%
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: "#0f172a",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${structuredDebuggingScore}%`,
                      background: "#38bdf8",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>

              {/* Metric 2 */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  <span style={{ color: "#94a3b8" }}>Tool Utilization</span>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>
                    {toolUtilizationScore}%
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: "#0f172a",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${toolUtilizationScore}%`,
                      background: "#22c55e",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>

              {/* Metric 3 */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    marginBottom: 3,
                  }}
                >
                  <span style={{ color: "#94a3b8" }}>Concurrency & Race Isolation</span>
                  <span
                    style={{
                      color: testsPassing ? "#00ff41" : "#f59e0b",
                      fontWeight: 700,
                    }}
                  >
                    {testsPassing ? "RESOLVED (100%)" : "IN PROGRESS"}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: "#0f172a",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: testsPassing ? "100%" : "45%",
                      background: testsPassing ? "#00ff41" : "#f59e0b",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Behavioral Observation Stream */}
          <div style={{ flex: 1, padding: "12px 14px", overflowY: "auto" }}>
            <div
              style={{
                fontSize: 10,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 8,
                fontWeight: 700,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Observer Signal Log</span>
              <span style={{ fontSize: 9, color: "#00ff41" }}>● STREAMING</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentTelemetry.length === 0 ? (
                <div
                  style={{
                    fontSize: 11,
                    color: "#475569",
                    fontStyle: "italic",
                    lineHeight: 1.5,
                  }}
                >
                  Analyzing candidate exploration patterns across host inspection, network probing, and code debugging...
                </div>
              ) : (
                recentTelemetry.slice(-6).map((note, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{
                      fontSize: 11,
                      lineHeight: 1.4,
                      color: "#94a3b8",
                      background: "#080d1a",
                      borderLeft: "2px solid #00ff41",
                      padding: "4px 8px",
                      borderRadius: "0 4px 4px 0",
                    }}
                  >
                    {note}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Mode Sidebar with Miniature 3D Avatar Orb */
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 16,
            gap: 16,
            cursor: "pointer",
          }}
          onClick={() => setIsFullScreen(true)}
          title="Click to Maximize 3D Observer to Full Screen (Talk Live)"
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid #00ff41",
              boxShadow: "0 0 16px rgba(0, 255, 65, 0.45)",
              position: "relative",
              background: "#010204",
            }}
          >
            <AvatarScene analyserNode={analyserNode} domain="engineering" />
          </div>

          <div
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontSize: 11,
              fontWeight: 800,
              color: "#00ff41",
              letterSpacing: "2px",
            }}
          >
            3D OBSERVER [LIVE]
          </div>

          <div
            style={{
              fontSize: 10,
              color: "#00ff41",
              fontWeight: 800,
              background: "rgba(0,255,65,0.08)",
              padding: "4px 2px",
              borderRadius: 3,
            }}
          >
            {simulatedCognitive}%
          </div>
        </div>
      )}

      {/* Full-Screen Immersive 3D Observer (Matching /test-avatar Live WebSocket) */}
      {isFullScreen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 99999,
            backgroundColor: "#010204",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top Bar with Live Tag & Minimize Button */}
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 24,
              right: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 100000,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(5, 8, 16, 0.85)",
                border: "1px solid rgba(0, 255, 65, 0.4)",
                padding: "8px 18px",
                borderRadius: 24,
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                boxShadow: "0 0 15px rgba(0, 255, 65, 0.2)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#00ff41",
                  boxShadow: "0 0 12px #00ff41",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 800, color: "#00ff41", letterSpacing: "1px" }}>
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
              domain={domain}
              problemTitle={problemTitle}
              scenario={scenario}
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
