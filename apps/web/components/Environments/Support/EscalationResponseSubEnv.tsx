"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CommunicationTone,
  MacroTemplate,
  SupportTicket,
  CustomerAccount,
} from "./types";
import { MACRO_TEMPLATES, ELENA_ROSTOVA_ACCOUNT } from "./mockData";

interface EscalationResponseSubEnvProps {
  activeTicket: SupportTicket;
  account?: CustomerAccount;
  onNavigateToSubEnv: (subEnv: "queue" | "investigation" | "escalation") => void;
  onExecuteBatchEscalation: (details: {
    tone: CommunicationTone;
    macroId: string;
    responseText: string;
    severity: string;
    rootCauseAnalysis: string;
  }) => Promise<void>;
  isQueueSwept: boolean;
  onComplete: () => void;
}

export default function EscalationResponseSubEnv({
  activeTicket,
  account = ELENA_ROSTOVA_ACCOUNT,
  onNavigateToSubEnv,
  onExecuteBatchEscalation,
  isQueueSwept,
  onComplete,
}: EscalationResponseSubEnvProps) {
  const [tone, setTone] = useState<CommunicationTone>("empathetic");
  const [selectedMacroId, setSelectedMacroId] = useState<string>("macro_reassurance_systemic");
  const [responseText, setResponseText] = useState<string>("");
  const [sevLevel, setSevLevel] = useState<"SEV-1" | "SEV-2">("SEV-1");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [antiPatternWarning, setAntiPatternWarning] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Auto-populate response template based on selected macro & active ticket
  useEffect(() => {
    const macro = MACRO_TEMPLATES.find((m) => m.id === selectedMacroId) || MACRO_TEMPLATES[0];

    if (macro.warningNote) {
      setAntiPatternWarning(macro.warningNote);
    } else {
      setAntiPatternWarning(null);
    }

    let populated = macro.body
      .replace(/{customer_name}/g, activeTicket.customer)
      .replace(/{order_id}/g, activeTicket.orderId)
      .replace(/{amount}/g, activeTicket.amount)
      .replace(/{ticket_id}/g, activeTicket.id)
      .replace(/{company_name}/g, activeTicket.company)
      .replace(/{original_tx_id}/g, activeTicket.originalTxId || "tx_8819")
      .replace(/{duplicate_tx_id}/g, activeTicket.duplicateTxId || "tx_8820")
      .replace(/{payment_method}/g, "Visa ending 4091");

    setResponseText(populated);
    setTone(macro.recommendedTone);
  }, [selectedMacroId, activeTicket]);

  const handleToneChange = (newTone: CommunicationTone) => {
    setTone(newTone);
    setSubmissionError(null);
    if (newTone === "empathetic") {
      setSelectedMacroId("macro_reassurance_systemic");
    } else if (newTone === "neutral") {
      setSelectedMacroId("macro_enterprise_sla");
    } else if (newTone === "direct") {
      setSelectedMacroId("macro_technical_direct");
    }
  };

  const handleEscalateSubmit = async () => {
    if (selectedMacroId === "macro_piecemeal_refund") {
      setSubmissionError(
        "⚠️ CAUTION: Piecemeal manual refunds fail to address the 120 backlog tickets and trigger accounting losses without the SRE concurrency fix. Please select an optimal systemic macro!"
      );
      return;
    }
    setSubmissionError(null);

    setIsSubmitting(true);
    await onExecuteBatchEscalation({
      tone,
      macroId: selectedMacroId,
      responseText,
      severity: sevLevel,
      rootCauseAnalysis: "Systemic checkout.ts race condition (tx_8819 vs tx_8820). Atomic distributed mutex requested with automated gateway reversal batch script.",
    });
    setIsSubmitting(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#040711",
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', -apple-system, sans-serif",
        overflowY: "auto",
      }}
    >
      {/* Top Banner / Breadcrumb Header */}
      <div
        style={{
          padding: "16px 24px",
          background: "#080d1c",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: "#10b981", fontWeight: 800, letterSpacing: "1.5px", marginBottom: 2 }}>
            [ 03 // ESCALATION & RESPONSE CENTER ]
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff" }}>
            Customer Communication & Unified SRE Escalation
          </h2>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            Active Ticket: <strong style={{ color: "#fff" }}>{activeTicket.id}</strong> ({activeTicket.customer} • {activeTicket.company}) • Backlog: <strong style={{ color: "#ef4444" }}>120 Unresolved</strong>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => onNavigateToSubEnv("queue")}
            style={{
              padding: "7px 14px",
              background: "#0c1322",
              border: "1px solid #1e293b",
              color: "#94a3b8",
              fontSize: 11,
              borderRadius: 5,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>←</span>
            <span>01 // Back to Queue</span>
          </button>

          <button
            onClick={() => onNavigateToSubEnv("investigation")}
            style={{
              padding: "7px 14px",
              background: "#0c1322",
              border: "1px solid #1e293b",
              color: "#38bdf8",
              fontSize: 11,
              borderRadius: 5,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>🔍</span>
            <span>02 // Review Gateway Logs</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Communication Workspace, Right = SRE SEV-1 Escalation Panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          padding: 24,
          flex: 1,
        }}
      >
        {/* LEFT COLUMN: CUSTOMER COMMUNICATION WORKSPACE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Tone Selector */}
          <div style={{ background: "#080d1c", border: "1px solid #1e293b", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🎙</span>
              <span>COMMUNICATION TONE SELECTOR</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
              {(["empathetic", "neutral", "direct"] as const).map((t) => {
                const isActive = tone === t;
                return (
                  <button
                    key={t}
                    onClick={() => handleToneChange(t)}
                    style={{
                      padding: "10px",
                      borderRadius: 6,
                      background: isActive ? "rgba(16, 185, 129, 0.15)" : "#0c1322",
                      border: isActive ? "1px solid #10b981" : "1px solid #1e293b",
                      color: isActive ? "#10b981" : "#94a3b8",
                      fontWeight: 800,
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>[ {t.toUpperCase()} ]</div>
                    <div style={{ fontSize: 9, fontWeight: 400, marginTop: 4, opacity: 0.8 }}>
                      {t === "empathetic"
                        ? "Warm, reassuring, owns glitch"
                        : t === "neutral"
                        ? "Formal SLA enterprise notice"
                        : "Crisp technical facts"}
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                fontSize: 10,
                color: "#cbd5e1",
                background: "#050813",
                border: "1px solid #1e293b",
                borderRadius: 5,
                padding: "8px 12px",
                lineHeight: 1.5,
              }}
            >
              {tone === "empathetic" && (
                <span>
                  🌟 <strong style={{ color: "#10b981" }}>Empathetic Tone Activated:</strong> Reassures Elena Rostova that engineering is reversing the $249.99 duplicate hold immediately and provides a $50 account credit. Ideal for protecting the $250k enterprise contract!
                </span>
              )}
              {tone === "neutral" && (
                <span>
                  ⚖️ <strong style={{ color: "#f59e0b" }}>Neutral Enterprise Tone:</strong> Formal compliance format, providing transaction IDs and incident timelines for corporate accounting teams.
                </span>
              )}
              {tone === "direct" && (
                <span>
                  🎯 <strong style={{ color: "#38bdf8" }}>Direct Tone:</strong> Concise engineering notification stating the duplicate authorization has been voided.
                </span>
              )}
            </div>
          </div>

          {/* Macro Canned Responses Selector */}
          <div style={{ background: "#080d1c", border: "1px solid #1e293b", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📑</span>
              <span>CANNED MACROS LIBRARY</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MACRO_TEMPLATES.map((m) => {
                const isSelected = selectedMacroId === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMacroId(m.id);
                      setSubmissionError(null);
                    }}
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      background: isSelected ? "rgba(16, 185, 129, 0.08)" : "#0c1322",
                      border: isSelected ? "1px solid #10b981" : "1px solid #1e293b",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: isSelected ? "#10b981" : "#fff" }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>
                        Category: {m.category} • Tone: {m.recommendedTone}
                      </div>
                    </div>

                    {m.isOptimal ? (
                      <span style={{ fontSize: 9, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 6px", borderRadius: 3, fontWeight: 800 }}>
                        RECOMMENDED
                      </span>
                    ) : m.warningNote ? (
                      <span style={{ fontSize: 9, background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "2px 6px", borderRadius: 3, fontWeight: 800 }}>
                        ANTI-PATTERN
                      </span>
                    ) : (
                      <span style={{ fontSize: 9, background: "#1e293b", color: "#94a3b8", padding: "2px 6px", borderRadius: 3 }}>
                        ALTERNATIVE
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {antiPatternWarning && (
              <div
                style={{
                  marginTop: 10,
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid #ef4444",
                  borderRadius: 6,
                  padding: 10,
                  fontSize: 10,
                  color: "#ef4444",
                  lineHeight: 1.5,
                }}
              >
                ⚠️ {antiPatternWarning}
              </div>
            )}
          </div>

          {/* Response Message Composer */}
          <div style={{ background: "#080d1c", border: "1px solid #1e293b", borderRadius: 8, padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span>CUSTOMER RESPONSE COMPOSER</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>Tokens dynamically populated</span>
            </div>

            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={11}
              style={{
                width: "100%",
                flex: 1,
                background: "#050813",
                border: "1px solid #1e293b",
                borderRadius: 6,
                padding: 12,
                fontSize: 11,
                color: "#cbd5e1",
                fontFamily: "inherit",
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: SRE SEV-1 ESCALATION BRIDGE & QUEUE SWEEP */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* SEV-1 Incident Escalation Card */}
          <div
            style={{
              background: "#080d1c",
              border: "1px solid #ef4444",
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 0 25px rgba(239, 68, 68, 0.18)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🚨</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: "#ef4444", letterSpacing: "1px" }}>
                  UNIFIED BATCH ESCALATION TO SRE // SEV-1
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  background: "#ef4444",
                  color: "#fff",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 4,
                  animation: "pulse 1.5s infinite",
                }}
              >
                CRITICAL OUTAGE
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "#050813", border: "1px solid #1e293b", padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>Incident Room:</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8" }}>#sre-war-room (P1)</div>
              </div>
              <div style={{ background: "#050813", border: "1px solid #1e293b", padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>Incident Commander:</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#f8fafc" }}>Alex Chen (Lead SRE)</div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 14 }}>
              <div><strong>Incident Title:</strong> [SEV-1] Systemic Double Charge Incident (tx_8819 vs tx_8820) - 120 Queue Tickets / SLA Breach</div>
              <div style={{ marginTop: 6 }}><strong>Total Queue Exposure:</strong> 120 unresolved tickets • 18 SLA critical/breached • $29,880.00 duplicate holds</div>
              <div style={{ marginTop: 6 }}><strong>Packaged Root Cause Evidence:</strong> Storefront <code>checkout.ts</code> evaluates idempotency guard post-gateway charge. Duplicate authorization collision occurs at +284ms.</div>
              <div style={{ marginTop: 6 }}><strong>Requested SRE Action:</strong> Deploy atomic Redis/distributed mutex in <code>checkout.ts</code> and execute gateway batch reverse-authorization script.</div>
            </div>

            <div
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: 6,
                padding: 12,
                fontSize: 10,
                color: "#10b981",
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              ✓ Unified escalation executes batch reassurance across all 120 tickets in the backlog and halts further duplicate authorizations.
            </div>

            {submissionError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid #ef4444",
                  borderRadius: 6,
                  padding: 12,
                  fontSize: 11,
                  color: "#ef4444",
                  marginBottom: 14,
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                {submissionError}
              </motion.div>
            )}

            {/* THE BIG ACTION BUTTON */}
            <button
              onClick={handleEscalateSubmit}
              disabled={isSubmitting || isQueueSwept}
              style={{
                width: "100%",
                padding: "16px",
                background: isQueueSwept
                  ? "rgba(34, 197, 94, 0.2)"
                  : "linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(16, 185, 129, 0.25))",
                border: isQueueSwept ? "1px solid #22c55e" : "1px solid #10b981",
                color: isQueueSwept ? "#22c55e" : "#fff",
                fontWeight: 900,
                fontSize: 13,
                borderRadius: 6,
                cursor: isQueueSwept ? "default" : "pointer",
                fontFamily: "inherit",
                letterSpacing: "1px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: "0 0 25px rgba(16, 185, 129, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              <span>{isQueueSwept ? "🎉" : isSubmitting ? "⏳" : "⚡"}</span>
              <span>
                {isQueueSwept
                  ? "[ QUEUE RESOLVED // BATCH ESCALATION ACTIVE ]"
                  : isSubmitting
                  ? "DISPATCHING UNIFIED SEV-1 BATCH ESCALATION..."
                  : "[ ⚡ EXECUTE UNIFIED BATCH ESCALATION & SWEEP QUEUE ]"}
              </span>
            </button>
          </div>

          {/* SRE War Room Live Status Ticker */}
          <div style={{ background: "#080d1c", border: "1px solid #1e293b", borderRadius: 8, padding: 16, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📡</span>
              <span>LIVE SRE INCIDENT SYNC (#sre-war-room)</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 11 }}>
              <div style={{ background: "#050813", border: "1px solid #1e293b", borderRadius: 6, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 10, marginBottom: 2 }}>
                  <span>Alex Chen (Lead SRE)</span>
                  <span>17:00:10 UTC</span>
                </div>
                <div style={{ color: "#cbd5e1" }}>
                  "Datadog alert triggered on duplicate authorizations in payment gateway. Waiting for Support's diagnostic ticket report."
                </div>
              </div>

              {isQueueSwept && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid #10b981", borderRadius: 6, padding: 10 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#10b981", fontSize: 10, marginBottom: 2 }}>
                    <span>Alex Chen (Lead SRE)</span>
                    <span>Just Now</span>
                  </div>
                  <div style={{ color: "#fff", fontWeight: 700 }}>
                    "SEV-1 received from Support! Clean root cause isolation on tx_8819 vs tx_8820. Moving concurrency mutex above gateway charge now and firing automated reversal batch for all 120 tickets. Exceptional triage!"
                  </div>
                </motion.div>
              )}
            </div>

            {isQueueSwept && (
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={onComplete}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid #22c55e",
                    color: "#22c55e",
                    fontWeight: 800,
                    fontSize: 11,
                    borderRadius: 5,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  VIEW CANDIDATE EVALUATION REPORT →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
