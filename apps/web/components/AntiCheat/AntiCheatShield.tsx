"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProctoringHUD from "./ProctoringHUD";

export interface IntegrityViolation {
  id: string;
  type:
    | "TAB_SWITCH"
    | "WINDOW_BLUR"
    | "PASTE_OVERFLOW"
    | "DEVTOOLS_OPEN"
    | "GAZE_DIVERSION_LAP"
    | "GAZE_DIVERSION_OFFSCREEN"
    | "MULTIPLE_FACES_DETECTED"
    | "CANDIDATE_ABSENT"
    | "PHONE_DETECTED";
  description: string;
  timestamp: string;
  durationSeconds?: number;
}

interface AntiCheatShieldProps {
  sessionId?: string;
  onViolation?: (violation: IntegrityViolation, strikes: number) => void;
  active?: boolean;
}

export default function AntiCheatShield({
  sessionId,
  onViolation,
  active = true,
}: AntiCheatShieldProps) {
  const [strikes, setStrikes] = useState<number>(0);
  const [integrityScore, setIntegrityScore] = useState<number>(98);
  const [violations, setViolations] = useState<IntegrityViolation[]>([]);
  const [activeModalViolation, setActiveModalViolation] = useState<IntegrityViolation | null>(null);
  const [blurStartTime, setBlurStartTime] = useState<number | null>(null);
  const [isDemoBypassed, setIsDemoBypassed] = useState<boolean>(false);
  const strikesRef = useRef(strikes);
  strikesRef.current = strikes;

  // 1. Reset / Bypass Handler (for Demo purposes)
  const handleResetOrBypass = useCallback(() => {
    setStrikes(0);
    setIntegrityScore(100);
    setActiveModalViolation(null);
    setBlurStartTime(null);
    setIsDemoBypassed(true);
    setTimeout(() => setIsDemoBypassed(false), 3000);
  }, []);

  // 2. Global Keyboard Shortcut for Demo Bypass: Ctrl + Shift + X or Alt + X
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "x") || (e.altKey && e.key.toLowerCase() === "x")) {
        e.preventDefault();
        handleResetOrBypass();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleResetOrBypass]);

  // 3. Register Violation
  const registerViolation = useCallback(
    (type: IntegrityViolation["type"], description: string, durationSeconds?: number) => {
      if (!active) return;

      const newStrikes = Math.min(3, strikesRef.current + 1);
      const violation: IntegrityViolation = {
        id: `v-${Date.now()}`,
        type,
        description,
        timestamp: new Date().toLocaleTimeString(),
        durationSeconds,
      };

      setStrikes(newStrikes);
      setViolations((prev) => [violation, ...prev]);
      setActiveModalViolation(violation);

      if (onViolation) {
        onViolation(violation, newStrikes);
      }

      // Persist in localStorage for verifier audit
      if (typeof window !== "undefined" && sessionId) {
        try {
          const key = `praxis_anticheat_${sessionId}`;
          const existing = JSON.parse(localStorage.getItem(key) || "[]");
          localStorage.setItem(key, JSON.stringify([violation, ...existing]));
        } catch {}
      }
    },
    [active, onViolation, sessionId]
  );

  // 4. Tab / Window Visibility Change & Blur Detection
  useEffect(() => {
    if (!active) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setBlurStartTime(Date.now());
      } else {
        if (blurStartTime) {
          const duration = Math.round((Date.now() - blurStartTime) / 1000);
          if (duration >= 1) {
            registerViolation(
              "TAB_SWITCH",
              `Candidate switched away from simulation tab for ${duration}s (Unsanctioned LLM / search query suspected).`,
              duration
            );
          }
          setBlurStartTime(null);
        }
      }
    };

    const handleWindowBlur = () => {
      if (!blurStartTime) {
        setBlurStartTime(Date.now());
      }
    };

    const handleWindowFocus = () => {
      if (blurStartTime) {
        const duration = Math.round((Date.now() - blurStartTime) / 1000);
        if (duration >= 2) {
          registerViolation(
            "WINDOW_BLUR",
            `Window focus lost for ${duration}s (Candidate switched to secondary application/browser window).`,
            duration
          );
        }
        setBlurStartTime(null);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [active, blurStartTime, registerViolation]);

  // 5. Large Clipboard Paste Anomaly Detection (> 60 characters in a single stroke)
  useEffect(() => {
    if (!active) return;

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") || "";
      if (text.length > 60 && (text.includes("def ") || text.includes("function") || text.includes("const ") || text.split("\n").length > 3)) {
        registerViolation(
          "PASTE_OVERFLOW",
          `Suspicious external clipboard dump detected (${text.length} chars, ${text.split("\n").length} lines). Synthetic payload suspected.`
        );
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [active, registerViolation]);

  // 6. DevTools Dimension Inspection Anomaly
  useEffect(() => {
    if (!active) return;

    let devtoolsThreshold = false;
    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth > 160;
      const heightDiff = window.outerHeight - window.innerHeight > 160;
      if ((widthDiff || heightDiff) && !devtoolsThreshold) {
        devtoolsThreshold = true;
        registerViolation("DEVTOOLS_OPEN", "Browser Developer Tools inspection window opened.");
      }
    };

    const interval = setInterval(checkDevTools, 4000);
    return () => clearInterval(interval);
  }, [active, registerViolation]);

  return (
    <>
      {/* ─── DOCKED STATUS PILL IN TOP NAV / CORNER ─── */}
      <div
        style={{
          position: "fixed",
          top: 18,
          right: 220,
          zIndex: 9000,
          fontFamily: "'JetBrains Mono', monospace",
          pointerEvents: "auto",
        }}
      >
        <div
          onClick={() => {
            if (strikes > 0) setActiveModalViolation(violations[0] || null);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px",
            borderRadius: 20,
            background:
              strikes === 0
                ? "rgba(16, 185, 129, 0.12)"
                : strikes === 1
                ? "rgba(245, 158, 11, 0.15)"
                : "rgba(239, 68, 68, 0.2)",
            border: `1px solid ${
              strikes === 0 ? "rgba(16, 185, 129, 0.4)" : strikes === 1 ? "#f59e0b" : "#ef4444"
            }`,
            color: strikes === 0 ? "#10b981" : strikes === 1 ? "#f59e0b" : "#ef4444",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.5px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
            backdropFilter: "blur(10px)",
            cursor: strikes > 0 ? "pointer" : "default",
          }}
          title={
            strikes === 0
              ? "Proctoring Integrity Active — Zero anomalies detected"
              : `Integrity Alert: ${strikes} strikes detected. Click to review.`
          }
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: strikes === 0 ? "#10b981" : strikes === 1 ? "#f59e0b" : "#ef4444",
              boxShadow: `0 0 8px ${strikes === 0 ? "#10b981" : strikes === 1 ? "#f59e0b" : "#ef4444"}`,
            }}
          />
          <span>
            {strikes === 0
              ? "SHIELD: VERIFIED"
              : strikes === 1
              ? "SHIELD: 1 STRIKE"
              : `SHIELD: ${strikes} STRIKES (FLAGGED)`}
          </span>
          {isDemoBypassed && (
            <span style={{ fontSize: 9, color: "#38bdf8", marginLeft: 4 }}>[RESET]</span>
          )}
        </div>
      </div>

      {/* ─── LIVE INTEGRITY WARNING / LOCKOUT MODAL ─── */}
      <AnimatePresence>
        {activeModalViolation && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99990,
              background: "rgba(3, 6, 12, 0.88)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              fontFamily: "'JetBrains Mono', 'Inter', monospace",
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              style={{
                width: "100%",
                maxWidth: 540,
                background: "#080c16",
                border: `2px solid ${strikes >= 2 ? "#ef4444" : "#f59e0b"}`,
                borderRadius: 12,
                boxShadow: `0 24px 60px rgba(0,0,0,0.9), 0 0 30px ${
                  strikes >= 2 ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.2)"
                }`,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "16px 20px",
                  background:
                    strikes >= 2
                      ? "linear-gradient(90deg, rgba(239, 68, 68, 0.25), rgba(15, 23, 42, 0.8))"
                      : "linear-gradient(90deg, rgba(245, 158, 11, 0.25), rgba(15, 23, 42, 0.8))",
                  borderBottom: `1px solid ${strikes >= 2 ? "rgba(239, 68, 68, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{strikes >= 2 ? "🚨" : "⚠️"}</span>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: strikes >= 2 ? "#ef4444" : "#f59e0b",
                        letterSpacing: "1px",
                      }}
                    >
                      PROCTORING INTEGRITY ALERT
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>
                      AUTOMATED AUDIT SIGNAL // STRIKE {strikes} OF 3
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: strikes >= 2 ? "#ef444425" : "#f59e0b25",
                    border: `1px solid ${strikes >= 2 ? "#ef4444" : "#f59e0b"}`,
                    color: strikes >= 2 ? "#fca5a5" : "#fde68a",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {activeModalViolation.type}
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "#f8fafc",
                    background: "#0c101d",
                    padding: 14,
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {activeModalViolation.description}
                </div>

                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
                  Praxis proctors examine candidate process and cognitive problem-solving. Switching to external
                  ChatGPT tabs, consulting unsanctioned browser windows, or copying synthetic code blocks is
                  cryptographically flagged on your candidate report.
                </div>

                {/* Strike progress indicator */}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        background:
                          step <= strikes
                            ? strikes >= 2
                              ? "#ef4444"
                              : "#f59e0b"
                            : "rgba(255,255,255,0.1)",
                        boxShadow: step <= strikes ? "0 0 8px currentColor" : "none",
                        transition: "all 0.3s ease",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#64748b" }}>
                  <span>Strike 1: Warning</span>
                  <span>Strike 2: Verifier Flag</span>
                  <span>Strike 3: Proctor Lockout</span>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div
                style={{
                  padding: "14px 20px",
                  background: "#060912",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  gap: 12,
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {/* Demo Bypass / Clear Shortcut Button */}
                <button
                  onClick={handleResetOrBypass}
                  style={{
                    background: "rgba(56, 189, 248, 0.1)",
                    border: "1px solid rgba(56, 189, 248, 0.4)",
                    color: "#38bdf8",
                    padding: "8px 14px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "inherit",
                    transition: "all 0.15s ease",
                  }}
                  title="Demo Presenter Shortcut: Clears all strikes and resumes session"
                >
                  <span>⚡</span>
                  <span>DEMO BYPASS (Ctrl+Shift+X)</span>
                </button>

                {/* Acknowledge and Return */}
                <button
                  onClick={() => setActiveModalViolation(null)}
                  style={{
                    background: strikes >= 2 ? "#ef4444" : "#f59e0b",
                    border: "none",
                    color: "#050811",
                    padding: "8px 18px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "inherit",
                  }}
                >
                  <span>RETURN TO WORKSPACE ▶</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 360° Dual-Camera Omnipresent Proctoring HUD */}
      {active && (
        <ProctoringHUD
          sessionId={sessionId}
          integrityScore={integrityScore}
          onAnomalyDetected={(anomalyType, desc) => {
            registerViolation(anomalyType as any, desc);
            setIntegrityScore((prev) =>
              Math.max(25, prev - (anomalyType.includes("MULTIPLE") ? 20 : 6))
            );
          }}
          onBypassDemo={handleResetOrBypass}
        />
      )}
    </>
  );
}
