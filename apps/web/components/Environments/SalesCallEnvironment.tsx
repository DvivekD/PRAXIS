"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { VoiceSessionHandle } from "../Avatar/VoiceSession";
import {
  LiveSalesCallSubEnv,
  PitchNegotiationSubEnv,
  SalesforceCrmSubEnv,
  type SalesDealState,
} from "./Sales";

export interface SalesCallEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, unknown>) => Promise<unknown>;
  onComplete: () => void;
  demoMode: boolean;
  voiceSessionRef?: React.RefObject<VoiceSessionHandle | null>;
  voiceMode?: "off" | "persona" | "guide";
  setVoiceMode?: React.Dispatch<React.SetStateAction<"off" | "persona" | "guide">>;
  analyserNode?: AnalyserNode | null;
  initialSubEnv?: number | "call" | "pitch" | "crm";
  onSubEnvChange?: (sub: number | string) => void;
}

export default function SalesCallEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
  voiceSessionRef,
  voiceMode = "off",
  setVoiceMode,
  analyserNode,
  initialSubEnv = 1,
  onSubEnvChange,
}: SalesCallEnvironmentProps) {
  // Convert initialSubEnv to key
  const parseInitialKey = (sub: number | "call" | "pitch" | "crm"): "call" | "pitch" | "crm" => {
    if (sub === 2 || sub === "pitch") return "pitch";
    if (sub === 3 || sub === "crm") return "crm";
    return "call";
  };

  // Shared Deal State across the 3 Scope 2 Sales Sub-Environments
  const [dealState, setDealState] = useState<SalesDealState>({
    accountName: "Nordic Goods Inc.",
    prospectName: "Sam Jenkins",
    prospectRole: "VP of Retail & E-Commerce",
    contractValue: 250000,
    dealStage: "Discovery",
    bookedSlot: null,
    objectionsResolved: [],
    notes: "",
    calculatedDiscount: 8,
    contractTermYears: 2,
    slaTier: "Enterprise High-Concurrency",
    proposalSubmitted: false,
    activeSubEnv: parseInitialKey(initialSubEnv),
  });

  useEffect(() => {
    if (initialSubEnv) {
      setDealState((prev) => ({
        ...prev,
        activeSubEnv: parseInitialKey(initialSubEnv),
      }));
    }
  }, [initialSubEnv]);

  const updateDealState = useCallback((partial: Partial<SalesDealState>) => {
    setDealState((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleSubEnvSwitch = useCallback(
    async (targetSubEnv: "call" | "pitch" | "crm") => {
      setDealState((prev) => ({ ...prev, activeSubEnv: targetSubEnv }));
      const numericSub = targetSubEnv === "pitch" ? 2 : targetSubEnv === "crm" ? 3 : 1;
      if (onSubEnvChange) onSubEnvChange(numericSub);

      await onAction(`[SUB_ENVIRONMENT_SWITCH] User navigated to Sales Sub-Env 0${numericSub}: ${targetSubEnv.toUpperCase()}`, {
        subEnv: targetSubEnv,
        subIndex: numericSub,
        sessionId,
      });
    },
    [onAction, onSubEnvChange, sessionId]
  );

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        background: "#060911",
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', -apple-system, monospace",
        overflow: "hidden",
      }}
    >
      {/* ──────────────── TOP BAR: Scope 2 Sub-Environment Navigation ──────────────── */}
      <header
        style={{
          height: 48,
          background: "#0a0f1d",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 50,
        }}
      >
        {/* Scope Context & Mission */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "#f59e0b",
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.3)",
              padding: "3px 8px",
              borderRadius: 4,
              letterSpacing: "0.5px",
            }}
          >
            SCOPE 2 // SALES
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#cbd5e1" }}>
            <span style={{ fontWeight: 800, color: "#fff" }}>PROJECT: SAVE THE $250K RENEWAL</span>
            <span style={{ color: "#64748b" }}>|</span>
            <span style={{ color: "#94a3b8" }}>Account: Nordic Goods (Sam Jenkins)</span>
          </div>
        </div>

        {/* 3 Sub-Environment Workflow Tabs */}
        <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[
            {
              id: "call" as const,
              number: "01",
              label: "Live Sales Call",
              icon: "📞",
            },
            {
              id: "pitch" as const,
              number: "02",
              label: "Pitch & Negotiation",
              icon: "📽",
            },
            {
              id: "crm" as const,
              number: "03",
              label: "CRM & Deal Desk",
              icon: "💼",
            },
          ].map((tab) => {
            const isActive = dealState.activeSubEnv === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSubEnvSwitch(tab.id)}
                style={{
                  padding: "6px 12px",
                  background: isActive ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.03)",
                  border: isActive ? "1px solid #f59e0b" : "1px solid #1e293b",
                  borderRadius: 4,
                  color: isActive ? "#f59e0b" : "#94a3b8",
                  fontSize: 11,
                  fontWeight: isActive ? 800 : 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? "0 0 10px rgba(245,158,11,0.2)" : "none",
                }}
              >
                <span>{tab.icon}</span>
                <span>
                  <strong>{tab.number}</strong> {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Deal Health Status Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              fontSize: 10,
              padding: "4px 8px",
              background:
                dealState.dealStage === "Closed Won"
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(245,158,11,0.1)",
              border:
                dealState.dealStage === "Closed Won"
                  ? "1px solid #22c55e"
                  : "1px solid rgba(245,158,11,0.3)",
              color: dealState.dealStage === "Closed Won" ? "#22c55e" : "#f59e0b",
              borderRadius: 4,
              fontWeight: 800,
            }}
          >
            STAGE: {dealState.dealStage.toUpperCase()}
          </div>
        </div>
      </header>

      {/* ──────────────── MAIN WORKSPACE: Active Sub-Environment ──────────────── */}
      <main style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <div style={{ display: dealState.activeSubEnv === "call" ? "block" : "none", height: "100%", width: "100%" }}>
          <LiveSalesCallSubEnv
            sessionId={sessionId}
            onAction={onAction}
            onComplete={onComplete}
            demoMode={demoMode}
            voiceSessionRef={voiceSessionRef}
            voiceMode={voiceMode}
            setVoiceMode={setVoiceMode}
            analyserNode={analyserNode}
            dealState={dealState}
            updateDealState={updateDealState}
            onNavigateToSubEnv={handleSubEnvSwitch}
          />
        </div>

        <div style={{ display: dealState.activeSubEnv === "pitch" ? "block" : "none", height: "100%", width: "100%" }}>
          <PitchNegotiationSubEnv
            sessionId={sessionId}
            onAction={onAction}
            onComplete={onComplete}
            demoMode={demoMode}
            analyserNode={analyserNode}
            dealState={dealState}
            updateDealState={updateDealState}
            onNavigateToSubEnv={handleSubEnvSwitch}
          />
        </div>

        <div style={{ display: dealState.activeSubEnv === "crm" ? "block" : "none", height: "100%", width: "100%" }}>
          <SalesforceCrmSubEnv
            sessionId={sessionId}
            onAction={onAction}
            onComplete={onComplete}
            demoMode={demoMode}
            analyserNode={analyserNode}
            dealState={dealState}
            updateDealState={updateDealState}
            onNavigateToSubEnv={handleSubEnvSwitch}
          />
        </div>
      </main>
    </div>
  );
}
