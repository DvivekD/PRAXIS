"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HelpdeskQueueSubEnv from "./Support/HelpdeskQueueSubEnv";
import CustomerInvestigationSubEnv from "./Support/CustomerInvestigationSubEnv";
import EscalationResponseSubEnv from "./Support/EscalationResponseSubEnv";
import SupportObserverHUD from "./Support/SupportObserverHUD";
import { INITIAL_SUPPORT_QUEUE, ELENA_ROSTOVA_ACCOUNT } from "./Support/mockData";
import { SupportTicket, CommunicationTone } from "./Support/types";
import {
  investigateCustomerAccountAction,
  batchEscalateSupportAction,
} from "../../actions/eval";

interface HelpdeskEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onComplete: () => void;
  demoMode: boolean;
  initialSubEnv?: number;
  onSubEnvChange?: (sub: number) => void;
}

export default function HelpdeskEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
  initialSubEnv = 1,
  onSubEnvChange,
}: HelpdeskEnvironmentProps) {
  const getSubKey = (num: number): "queue" | "investigation" | "escalation" => {
    if (num === 2) return "investigation";
    if (num === 3) return "escalation";
    return "queue";
  };

  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_SUPPORT_QUEUE);
  const [activeSubEnv, setActiveSubEnv] = useState<"queue" | "investigation" | "escalation">(getSubKey(initialSubEnv));

  useEffect(() => {
    if (initialSubEnv) {
      setActiveSubEnv(getSubKey(initialSubEnv));
    }
  }, [initialSubEnv]);
  const [activeTicketId, setActiveTicketId] = useState<string>("TICK-4891");
  const [selectedTone, setSelectedTone] = useState<CommunicationTone>("empathetic");
  const [gatewayInspected, setGatewayInspected] = useState<boolean>(false);
  const [queueSwept, setQueueSwept] = useState<boolean>(false);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);

  // SLA Live Countdown Timer
  useEffect(() => {
    if (queueSwept) return;

    const interval = setInterval(() => {
      setTickets((prev) =>
        prev.map((t) => {
          if (t.status === "RESOLVED") return t;
          const nextRemaining = Math.max(0, t.slaRemainingSeconds - 1);
          return {
            ...t,
            slaRemainingSeconds: nextRemaining,
            isBreached: nextRemaining === 0,
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [queueSwept]);

  const formatSla = useCallback((sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  const activeTicket = useMemo(
    () => tickets.find((t) => t.id === activeTicketId) || tickets[0],
    [tickets, activeTicketId]
  );

  const handleSelectTicket = useCallback((ticketId: string) => {
    setActiveTicketId(ticketId);
  }, []);

  const handleNavigateToSubEnv = useCallback(
    async (subEnv: "queue" | "investigation" | "escalation") => {
      setActiveSubEnv(subEnv);
      if (onSubEnvChange) {
        onSubEnvChange(subEnv === "investigation" ? 2 : (subEnv === "escalation" ? 3 : 1));
      }

      if (subEnv === "investigation") {
        setGatewayInspected(true);
        try {
          await investigateCustomerAccountAction(sessionId, activeTicketId);
        } catch {}
        onAction(
          `[SUB_ENV_TRANSITION] Seeker entered 02 // Customer Investigation Desk for ticket ${activeTicketId}. Inspecting payment gateway logs tx_8819 vs tx_8820.`
        );
      } else if (subEnv === "escalation") {
        onAction(
          `[SUB_ENV_TRANSITION] Seeker entered 03 // Escalation & Response Center. Preparing unified customer reassurance and SRE SEV-1 escalation.`
        );
      } else {
        onAction(
          `[SUB_ENV_TRANSITION] Seeker navigated to 01 // Helpdesk Ticket Queue (120 Backlog).`
        );
      }
    },
    [sessionId, activeTicketId, onAction]
  );

  const handleExecuteBatchEscalation = useCallback(
    async (details: {
      tone: CommunicationTone;
      macroId: string;
      responseText: string;
      severity: string;
      rootCauseAnalysis: string;
    }) => {
      setSelectedTone(details.tone);
      setQueueSwept(true);

      // Sweep all tickets to RESOLVED
      setTickets((prev) =>
        prev.map((t) => ({
          ...t,
          status: "RESOLVED",
          slaRemainingSeconds: 9999,
          isBreached: false,
        }))
      );

      // Fire server action
      try {
        await batchEscalateSupportAction(sessionId, details);
      } catch (err) {
        console.warn("[Helpdesk] batchEscalateSupportAction fallback:", err);
      }

      // Record client action
      await onAction(
        `[VICTORY] Customer Support agent resolved 120-ticket SLA backlog! Identified systemic checkout double charge race condition between tx_8819 and tx_8820. Dispatched tone='${details.tone}' automated reassurance to all 24 enterprise accounts and executed unified SEV-1 batch escalation to SRE Alex Chen.`
      );

      setShowVictoryModal(true);
    },
    [sessionId, onAction]
  );

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#03060e",
        color: "#fff",
        fontFamily: "'JetBrains Mono', -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ─── TOP MASTER NAVIGATION & SUB-ENVIRONMENT SWITCHER BAR ─── */}
      <header
        style={{
          height: 52,
          background: "#060914",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          zIndex: 40,
          flexShrink: 0,
        }}
      >
        {/* Left: Scope 6 Identity & Problem Statement pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-block",
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 12px #10b981",
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 900, color: "#10b981", letterSpacing: "1.5px" }}>
              SCOPE 6: SUPPORT
            </span>
            <span style={{ fontSize: 11, color: "#64748b" }}>//</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1" }}>
              SLA Backlog & Customer Escalation
            </span>
          </div>

          <div
            style={{
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 4,
              background: queueSwept ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
              color: queueSwept ? "#22c55e" : "#ef4444",
              border: `1px solid ${queueSwept ? "#22c55e" : "#ef4444"}`,
              fontWeight: 800,
            }}
          >
            {queueSwept ? "✓ 120 TICKETS SWEPT & RESOLVED" : "⚠️ 120 UNRESOLVED BACKLOG • SLA AT RISK"}
          </div>
        </div>

        {/* Center: 3 Realistic Sub-Environment Switcher Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => handleNavigateToSubEnv("queue")}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              background: activeSubEnv === "queue" ? "rgba(16, 185, 129, 0.18)" : "#0b101c",
              border: activeSubEnv === "queue" ? "1px solid #10b981" : "1px solid #1e293b",
              color: activeSubEnv === "queue" ? "#10b981" : "#94a3b8",
              fontWeight: 800,
              fontSize: 11,
              fontFamily: "inherit",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            <span>01</span>
            <span>HELPDESK QUEUE</span>
            <span
              style={{
                fontSize: 9,
                background: activeSubEnv === "queue" ? "#10b981" : "#1e293b",
                color: activeSubEnv === "queue" ? "#000" : "#cbd5e1",
                padding: "1px 5px",
                borderRadius: 8,
                fontWeight: 900,
              }}
            >
              {queueSwept ? "0" : "120"}
            </span>
          </button>

          <button
            onClick={() => handleNavigateToSubEnv("investigation")}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              background: activeSubEnv === "investigation" ? "rgba(56, 189, 248, 0.18)" : "#0b101c",
              border: activeSubEnv === "investigation" ? "1px solid #38bdf8" : "1px solid #1e293b",
              color: activeSubEnv === "investigation" ? "#38bdf8" : "#94a3b8",
              fontWeight: 800,
              fontSize: 11,
              fontFamily: "inherit",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            <span>02</span>
            <span>CUSTOMER INVESTIGATION</span>
            <span
              style={{
                fontSize: 9,
                background: activeSubEnv === "investigation" ? "#38bdf8" : "#1e293b",
                color: activeSubEnv === "investigation" ? "#000" : "#cbd5e1",
                padding: "1px 5px",
                borderRadius: 8,
                fontWeight: 900,
              }}
            >
              tx_8819 vs tx_8820
            </span>
          </button>

          <button
            onClick={() => handleNavigateToSubEnv("escalation")}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              background: activeSubEnv === "escalation" ? "rgba(239, 68, 68, 0.18)" : "#0b101c",
              border: activeSubEnv === "escalation" ? "1px solid #ef4444" : "1px solid #1e293b",
              color: activeSubEnv === "escalation" ? "#ef4444" : "#94a3b8",
              fontWeight: 800,
              fontSize: 11,
              fontFamily: "inherit",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            <span>03</span>
            <span>ESCALATION & RESPONSE</span>
            <span
              style={{
                fontSize: 9,
                background: activeSubEnv === "escalation" ? "#ef4444" : "#1e293b",
                color: activeSubEnv === "escalation" ? "#fff" : "#cbd5e1",
                padding: "1px 5px",
                borderRadius: 8,
                fontWeight: 900,
              }}
            >
              SEV-1
            </span>
          </button>
        </div>

        {/* Right: Quick Batch Escalate Shortcut */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!queueSwept ? (
            <button
              onClick={() => handleNavigateToSubEnv("escalation")}
              style={{
                padding: "6px 14px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid #ef4444",
                color: "#ef4444",
                fontWeight: 800,
                fontSize: 10,
                borderRadius: 5,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 0 12px rgba(239, 68, 68, 0.25)",
              }}
            >
              <span>⚡</span>
              <span>BATCH ESCALATE TO SRE</span>
            </button>
          ) : (
            <button
              onClick={onComplete}
              style={{
                padding: "6px 14px",
                background: "rgba(34, 197, 94, 0.2)",
                border: "1px solid #22c55e",
                color: "#22c55e",
                fontWeight: 800,
                fontSize: 10,
                borderRadius: 5,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>✓</span>
              <span>COMPLETE ASSESSMENT</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── PRIMARY WORKSPACE: ACTIVE SUB-ENVIRONMENT + OBSERVER HUD ─── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Sub-Environment Viewport */}
        <div style={{ flex: 1, height: "100%", overflow: "hidden" }}>
          {activeSubEnv === "queue" && (
            <HelpdeskQueueSubEnv
              tickets={tickets}
              activeTicketId={activeTicketId}
              onSelectTicket={handleSelectTicket}
              onNavigateToSubEnv={handleNavigateToSubEnv}
              onBatchEscalatePrompt={() => handleNavigateToSubEnv("escalation")}
              isQueueSwept={queueSwept}
              formatSla={formatSla}
            />
          )}

          {activeSubEnv === "investigation" && (
            <CustomerInvestigationSubEnv
              account={ELENA_ROSTOVA_ACCOUNT}
              onNavigateToSubEnv={handleNavigateToSubEnv}
              onAction={onAction}
            />
          )}

          {activeSubEnv === "escalation" && (
            <EscalationResponseSubEnv
              activeTicket={activeTicket}
              account={ELENA_ROSTOVA_ACCOUNT}
              onNavigateToSubEnv={handleNavigateToSubEnv}
              onExecuteBatchEscalation={handleExecuteBatchEscalation}
              isQueueSwept={queueSwept}
              onComplete={onComplete}
            />
          )}
        </div>

        {/* 3D Observer Avatar & Telemetry HUD Dock */}
        <SupportObserverHUD
          activeSubEnv={activeSubEnv}
          isQueueSwept={queueSwept}
          selectedTone={selectedTone}
          gatewayInspected={gatewayInspected}
          onInteract={(text) => onAction(`[HUD_INTERACT] ${text}`)}
        />
      </div>

      {/* ─── VICTORY / SLA RESOLUTION MODAL ─── */}
      <AnimatePresence>
        {showVictoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2, 4, 10, 0.85)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                width: "100%",
                maxWidth: 580,
                background: "#080d1c",
                border: "1px solid #10b981",
                borderRadius: 12,
                padding: 28,
                boxShadow: "0 0 50px rgba(16, 185, 129, 0.3)",
                color: "#fff",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
                <div style={{ fontSize: 11, color: "#10b981", fontWeight: 800, letterSpacing: "2px" }}>
                  [ SLA BACKLOG SWEPT // SEV-1 MITIGATED ]
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 900, margin: "6px 0 0 0" }}>
                  All 120 Support Tickets Successfully Resolved
                </h2>
              </div>

              <div
                style={{
                  background: "#050813",
                  border: "1px solid #1e293b",
                  borderRadius: 8,
                  padding: 16,
                  fontSize: 11,
                  color: "#cbd5e1",
                  lineHeight: 1.6,
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#94a3b8" }}>Enterprise Accounts Reassured:</span>
                  <strong style={{ color: "#10b981" }}>24 VIP Accounts ($184,500 MRR)</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#94a3b8" }}>Root Cause Isolated:</span>
                  <strong style={{ color: "#38bdf8" }}>tx_8819 vs tx_8820 (Missing Idempotency Guard)</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "#94a3b8" }}>Communication Tone:</span>
                  <strong style={{ color: "#f59e0b" }}>{selectedTone.toUpperCase()} (Zero Churn Risk)</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>SRE Mitigation:</span>
                  <strong style={{ color: "#22c55e" }}>SEV-1 Dispatched // Redis Mutex Deployed</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setShowVictoryModal(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#0c1322",
                    border: "1px solid #1e293b",
                    color: "#94a3b8",
                    fontWeight: 700,
                    fontSize: 11,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Review Swept Queue
                </button>

                <button
                  onClick={onComplete}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "1px solid #10b981",
                    color: "#10b981",
                    fontWeight: 800,
                    fontSize: 11,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    boxShadow: "0 0 15px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  Proceed to Final Scorecard →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
