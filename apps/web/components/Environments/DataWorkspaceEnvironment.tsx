"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import SqlQuerySubEnv from "./Data/SqlQuerySubEnv";
import DataPipelineSubEnv from "./Data/DataPipelineSubEnv";
import AnalyticsBiSubEnv from "./Data/AnalyticsBiSubEnv";
import { VoiceSession, VoiceSessionHandle, VoiceSessionMode } from "../Avatar/VoiceSession";

// Dynamically import 3D Avatar Scene to ensure no SSR Canvas errors
const AvatarScene = dynamic(() => import("../Avatar/AvatarScene"), { ssr: false });

interface DataWorkspaceEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onComplete: () => void;
  demoMode: boolean;
  initialSubEnv?: number;
  onSubEnvChange?: (sub: number) => void;
}

export default function DataWorkspaceEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
  initialSubEnv = 1,
  onSubEnvChange,
}: DataWorkspaceEnvironmentProps) {
  const getSubKey = (num: number): "sql" | "pipeline" | "bi" => {
    if (num === 2) return "pipeline";
    if (num === 3) return "bi";
    return "sql";
  };

  // Active Sub-Environment Tab (01 = SQL Studio, 02 = Pipeline Lab, 03 = BI Studio)
  const [activeSubEnv, setActiveSubEnv] = useState<"sql" | "pipeline" | "bi">(getSubKey(initialSubEnv));

  useEffect(() => {
    if (initialSubEnv) {
      setActiveSubEnv(getSubKey(initialSubEnv));
    }
  }, [initialSubEnv]);

  // Multi-step progress states
  const [isSqlFixed, setIsSqlFixed] = useState(false);
  const [isPipelineRepaired, setIsPipelineRepaired] = useState(false);

  // 3D Observer HUD visibility & Voice Session
  const [showObserverHud, setShowObserverHud] = useState(true);
  const [isObserverExpanded, setIsObserverExpanded] = useState(false);
  const [observerMode, setObserverMode] = useState<VoiceSessionMode>("guide");
  const voiceSessionRef = useRef<VoiceSessionHandle>(null);

  // Dynamic cognitive load & signals
  const [cognitiveLoad, setCognitiveLoad] = useState(48);
  const [observerSignals, setObserverSignals] = useState<string[]>([
    "Observer active — tracking query syntax & heuristics",
    "Telemetry stream connected to Aura analytics cluster",
    "Monitoring DAU metric divergence against API ingress",
  ]);

  // Update signals as seeker makes progress
  useEffect(() => {
    if (isSqlFixed && !isPipelineRepaired) {
      setCognitiveLoad(58);
      setObserverSignals((prev) => [
        "✓ Candidate identified DISTINCT user session join flaw",
        "Observing triage of upstream Airflow/dbt DAG tasks",
        ...prev.slice(0, 2),
      ]);
    } else if (isSqlFixed && isPipelineRepaired) {
      setCognitiveLoad(42);
      setObserverSignals((prev) => [
        "✓ Pipeline schema drift patched (COALESCE + deduplication)",
        "✓ Data veracity restored across all reporting marts",
        "Awaiting final executive BI report generation",
        ...prev.slice(0, 1),
      ]);
    }
  }, [isSqlFixed, isPipelineRepaired]);

  const handleStepCompletion = (step: number) => {
    if (step === 1) {
      setIsSqlFixed(true);
      // Auto-suggest next step
      onAction("[STEP_1_COMPLETE] SQL Join corrected. Advised to inspect upstream data pipeline.");
    } else if (step === 2) {
      setIsPipelineRepaired(true);
      onAction("[STEP_2_COMPLETE] Pipeline schema drift repaired. Advised to verify metrics in BI Studio.");
    }
  };

  const handleObserverCoreInteraction = (actionText: string) => {
    onAction(`[3D_OBSERVER_INTERACT] ${actionText}`);
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#03060c",
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', monospace",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ─── TOP MASTER NAVIGATION BAR ─── */}
      <header
        style={{
          height: 52,
          background: "#050914",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          zIndex: 40,
        }}
      >
        {/* Left: Project & Scope Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#06b6d4", fontWeight: 900, letterSpacing: "1px" }}>
              ◈ SCOPE 4: DATA
            </span>
            <span style={{ color: "#475569" }}>|</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1" }}>
              Project: The Missing DAU Problem
            </span>
          </div>

          <span
            style={{
              fontSize: 9,
              padding: "2px 8px",
              background: "rgba(6,182,212,0.1)",
              border: "1px solid rgba(6,182,212,0.3)",
              color: "#38bdf8",
              borderRadius: 3,
            }}
          >
            SEV-2 METRIC ANOMALY (-18% DAU)
          </span>
        </div>

        {/* Center: Sub-Environment Switcher Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#080e1d",
            border: "1px solid #1e293b",
            borderRadius: 6,
            padding: 2,
            gap: 2,
          }}
        >
          {/* Tab 01: SQL Query Workspace */}
          <button
            onClick={() => {
              setActiveSubEnv("sql");
              if (onSubEnvChange) onSubEnvChange(1);
            }}
            style={{
              padding: "6px 14px",
              background: activeSubEnv === "sql" ? "rgba(6,182,212,0.18)" : "transparent",
              border: activeSubEnv === "sql" ? "1px solid #06b6d4" : "1px solid transparent",
              color: activeSubEnv === "sql" ? "#22d3ee" : "#94a3b8",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            <span>01</span>
            <span>SQL Studio</span>
            {isSqlFixed && <span style={{ color: "#22c55e", fontSize: 10 }}>✓</span>}
          </button>

          {/* Tab 02: Data Pipeline & Quality Lab */}
          <button
            onClick={() => {
              setActiveSubEnv("pipeline");
              if (onSubEnvChange) onSubEnvChange(2);
            }}
            style={{
              padding: "6px 14px",
              background: activeSubEnv === "pipeline" ? "rgba(6,182,212,0.18)" : "transparent",
              border: activeSubEnv === "pipeline" ? "1px solid #06b6d4" : "1px solid transparent",
              color: activeSubEnv === "pipeline" ? "#22d3ee" : "#94a3b8",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            <span>02</span>
            <span>Pipeline Lab (ETL)</span>
            {isPipelineRepaired && <span style={{ color: "#22c55e", fontSize: 10 }}>✓</span>}
          </button>

          {/* Tab 03: Analytics & BI Studio */}
          <button
            onClick={() => {
              setActiveSubEnv("bi");
              if (onSubEnvChange) onSubEnvChange(3);
            }}
            style={{
              padding: "6px 14px",
              background: activeSubEnv === "bi" ? "rgba(6,182,212,0.18)" : "transparent",
              border: activeSubEnv === "bi" ? "1px solid #06b6d4" : "1px solid transparent",
              color: activeSubEnv === "bi" ? "#22d3ee" : "#94a3b8",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            <span>03</span>
            <span>BI Studio</span>
            {isSqlFixed && isPipelineRepaired && <span style={{ color: "#22c55e", fontSize: 10 }}>✓</span>}
          </button>
        </div>

        {/* Right: Observer 3D Toggle & Progress Indicators */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Investigation Step Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#64748b" }}>
            <span>Progress:</span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isSqlFixed ? "#22c55e" : "#ef4444",
              }}
              title="Step 1: SQL Join Correction"
            />
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isPipelineRepaired ? "#22c55e" : "#ef4444",
              }}
              title="Step 2: Pipeline Schema Drift"
            />
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isSqlFixed && isPipelineRepaired ? "#22c55e" : "#64748b",
              }}
              title="Step 3: Executive BI Verification"
            />
          </div>

          {/* 3D Observer Avatar HUD Toggle Button */}
          <button
            onClick={() => setIsObserverExpanded(!isObserverExpanded)}
            style={{
              padding: "5px 10px",
              background: isObserverExpanded ? "rgba(6,182,212,0.2)" : "rgba(15,23,42,0.6)",
              border: `1px solid ${isObserverExpanded ? "#06b6d4" : "#334155"}`,
              color: isObserverExpanded ? "#22d3ee" : "#94a3b8",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: "#06b6d4" }}>🔮</span>
            <span>3D OBSERVER HUD</span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>{isObserverExpanded ? "[CLOSE]" : "[OPEN]"}</span>
          </button>
        </div>
      </header>

      {/* ─── MAIN WORKSPACE CONTENT AREA ─── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Active Sub-Environment View */}
        <main style={{ flex: 1, height: "100%", overflow: "hidden" }}>
          {activeSubEnv === "sql" && (
            <SqlQuerySubEnv
              onAction={onAction}
              onStepComplete={handleStepCompletion}
              isFixed={isSqlFixed}
              setIsFixed={setIsSqlFixed}
            />
          )}

          {activeSubEnv === "pipeline" && (
            <DataPipelineSubEnv
              onAction={onAction}
              onStepComplete={handleStepCompletion}
              isPipelineRepaired={isPipelineRepaired}
              setIsPipelineRepaired={setIsPipelineRepaired}
            />
          )}

          {activeSubEnv === "bi" && (
            <AnalyticsBiSubEnv
              onAction={onAction}
              onComplete={onComplete}
              isSqlFixed={isSqlFixed}
              isPipelineRepaired={isPipelineRepaired}
            />
          )}
        </main>

        {/* ─── 3D OBSERVER AVATAR / SCENE HUD DOCKED DRAWER ─── */}
        <AnimatePresence>
          {isObserverExpanded && (
            <motion.aside
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                width: 380,
                height: "100%",
                background: "#04070e",
                borderLeft: "1px solid #1e293b",
                display: "flex",
                flexDirection: "column",
                zIndex: 35,
                boxShadow: "-10px 0 30px rgba(0,0,0,0.7)",
              }}
            >
              {/* Observer HUD Top */}
              <div
                style={{
                  padding: "12px 14px",
                  background: "#070b16",
                  borderBottom: "1px solid #1e293b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: "#06b6d4", fontWeight: 800, letterSpacing: "1.5px" }}>
                    [ 3D OBSERVER NODE ]
                  </div>
                  <div style={{ fontSize: 11, color: "#f8fafc", fontWeight: 700 }}>
                    Telemetry Stream Observer
                  </div>
                </div>

                <button
                  onClick={() => setIsObserverExpanded(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 3D Three.js Interactive Canvas Container */}
              <div style={{ height: 210, width: "100%", background: "#020306", position: "relative" }}>
                <AvatarScene
                  analyserNode={null}
                  domain="data"
                  onInteract={handleObserverCoreInteraction}
                />
              </div>

              {/* 2-Way Voice Agent Live Control Panel */}
              <div
                style={{
                  padding: "10px 14px",
                  background: "#050814",
                  borderBottom: "1px solid rgba(6, 182, 212, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
                    2-Way Voice Observer
                  </span>
                  <button
                    onClick={() => {
                      const next: VoiceSessionMode = observerMode === "interviewer" ? "guide" : "interviewer";
                      setObserverMode(next);
                      voiceSessionRef.current?.setMode(next);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      background: observerMode === "interviewer" ? "rgba(239, 68, 68, 0.2)" : "rgba(6, 182, 212, 0.2)",
                      border: `1px solid ${observerMode === "interviewer" ? "#ef4444" : "#06b6d4"}`,
                      borderRadius: 12,
                      color: observerMode === "interviewer" ? "#fca5a5" : "#67e8f9",
                      fontSize: 10,
                      fontFamily: "monospace",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {observerMode === "interviewer" ? "🎯 INTERVIEWER MODE" : "🛠️ CO-PILOT MODE"}
                  </button>
                </div>

                <div style={{ height: 175, position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(6, 182, 212, 0.2)" }}>
                  <VoiceSession
                    ref={voiceSessionRef}
                    mode={observerMode}
                    domain="data"
                    problemTitle="Scope 4 Data: The Missing DAU Problem (-18% Anomaly)"
                    scenario="Daily active users dropped 18% on Nov 04 while ingress was normal. Repair SQL inner join and Airflow pipeline schema drift."
                    autoConnect={isObserverExpanded}
                    initialEngine="fallback"
                    showAvatar={false}
                    compact={true}
                  />
                </div>

                {/* Quick Socratic / Technical Doubts Pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button
                    onClick={() => {
                      voiceSessionRef.current?.speakProactiveContext(
                        "Why is the DAU query undercounting daily active users?"
                      );
                    }}
                    style={{
                      fontSize: 10,
                      color: "#94a3b8",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      padding: "3px 8px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    💡 Why is DAU undercounting users?
                  </button>
                  <button
                    onClick={() => {
                      voiceSessionRef.current?.speakProactiveContext(
                        "Explain schema drift between account_uid and user_id in the pipeline."
                      );
                    }}
                    style={{
                      fontSize: 10,
                      color: "#94a3b8",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      padding: "3px 8px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ❓ Explain schema drift in ETL pipeline
                  </button>
                  <button
                    onClick={() => {
                      setObserverMode("interviewer");
                      voiceSessionRef.current?.setMode("interviewer");
                      voiceSessionRef.current?.speakProactiveContext(
                        "Grill me on my data pipeline architecture and metric validation approach."
                      );
                    }}
                    style={{
                      fontSize: 10,
                      color: "#fca5a5",
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      padding: "3px 8px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    🎯 Grill me on data architecture & ETL
                  </button>
                </div>
              </div>

              {/* Observer Diagnostics & Signals */}
              <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
                {/* Cognitive Load Bar */}
                <div style={{ background: "#080c18", border: "1px solid #1e293b", borderRadius: 6, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8" }}>
                    <span>Candidate Cognitive Load</span>
                    <span style={{ color: "#38bdf8", fontWeight: 700 }}>{cognitiveLoad}%</span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: "#0f172a", borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${cognitiveLoad}%`,
                        height: "100%",
                        background: cognitiveLoad > 70 ? "#ef4444" : cognitiveLoad > 50 ? "#f59e0b" : "#06b6d4",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>
                    Optimal zone (40-65%): Calm analytical troubleshooting
                  </div>
                </div>

                {/* Live Observer Heuristic Signals */}
                <div style={{ background: "#080c18", border: "1px solid #1e293b", borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 10, color: "#06b6d4", fontWeight: 700, marginBottom: 6 }}>
                    OBSERVATION STREAM:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {observerSignals.map((sig, i) => (
                      <div key={i} style={{ fontSize: 10, color: "#cbd5e1", lineHeight: 1.4 }}>
                        • {sig}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-Environment Quick Guide */}
                <div
                  style={{
                    background: "rgba(6,182,212,0.06)",
                    border: "1px solid rgba(6,182,212,0.3)",
                    borderRadius: 6,
                    padding: 10,
                    fontSize: 10,
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ color: "#06b6d4", fontWeight: 700, marginBottom: 4 }}>
                    Investigation Playbook:
                  </div>
                  <div style={{ color: "#94a3b8" }}>
                    1. <strong>SQL Studio:</strong> Decouple transactions join and add DISTINCT.
                    <br />
                    2. <strong>Pipeline Lab:</strong> Fix mobile v2.4.1 schema drift in dbt model.
                    <br />
                    3. <strong>BI Studio:</strong> Verify traffic baseline & submit incident report.
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Mini 3D Observer Pill if Drawer is closed */}
      {!isObserverExpanded && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsObserverExpanded(true)}
          style={{
            position: "absolute",
            bottom: 18,
            right: 18,
            background: "rgba(5, 9, 20, 0.92)",
            border: "1px solid rgba(6, 182, 212, 0.4)",
            borderRadius: 24,
            padding: "6px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.8), 0 0 12px rgba(6,182,212,0.2)",
            backdropFilter: "blur(8px)",
            zIndex: 30,
          }}
        >
          <span style={{ position: "relative", display: "flex", height: 8, width: 8 }}>
            <span
              style={{
                backgroundColor: "#06b6d4",
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                position: "absolute",
                display: "inline-flex",
                height: "100%",
                width: "100%",
                borderRadius: "9999px",
                opacity: 0.75,
              }}
            />
            <span
              style={{
                backgroundColor: "#06b6d4",
                position: "relative",
                display: "inline-flex",
                borderRadius: "9999px",
                height: 8,
                width: 8,
              }}
            />
          </span>
          <span style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700 }}>
            3D OBSERVER ACTIVE ({cognitiveLoad}%)
          </span>
        </motion.div>
      )}
    </div>
  );
}
