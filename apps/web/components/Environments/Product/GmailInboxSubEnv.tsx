"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EmailItem, BacklogIssue } from "./types";
import { submitProductTriageAction, dispatchLaunchProtocolAction } from "../../../actions/eval";

interface GmailInboxSubEnvProps {
  sessionId: string;
  emails: EmailItem[];
  decisions: Record<string, string>;
  onSelectOption: (emailId: string, actionText: string) => void;
  onConvertEmailToIssue: (email: EmailItem) => void;
  onAction: (actionText: string) => void;
  onComplete: () => void;
  backlogIssues: BacklogIssue[];
}

export default function GmailInboxSubEnv({
  sessionId,
  emails,
  decisions,
  onSelectOption,
  onConvertEmailToIssue,
  onAction,
  onComplete,
  backlogIssues,
}: GmailInboxSubEnvProps) {
  const [isProtocolModalOpen, setIsProtocolModalOpen] = useState(false);
  const [protocolSubmitted, setProtocolSubmitted] = useState(false);

  // Protocol gates state
  const [deployFreeze, setDeployFreeze] = useState(true);
  const [sev1Escalated, setSev1Escalated] = useState(true);
  const [marketingBlastPaused, setMarketingBlastPaused] = useState(true);
  const [merchantReassured, setMerchantReassured] = useState(true);
  const [executiveSummary, setExecutiveSummary] = useState(
    "Prioritized P0 Sev-1 checkout idempotency fix over new feature launches. Enforced deployment freeze on gift card promo banner and paused 500k marketing email blast to protect storefront stability."
  );

  const decisionCount = Object.keys(decisions).length;

  // Listen to bidirectional telemetry events from the authentic Gmail Web iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.type !== "PRAXIS_GMAIL_ACTION") return;

      const { actionType, emailId, subject, replyText, recipient, action } = event.data;

      if (actionType === "email_reply" || actionType === "smart_reply_clicked") {
        onSelectOption(emailId || "email_1", replyText);
        onAction(`[GMAIL_REPLY] To: ${recipient || "stakeholder"} | Subject: "${subject}" | Content: "${replyText}"`);

        // Check if optimal action to trigger evaluation
        const isOptimal =
          replyText.toLowerCase().includes("sev-1") ||
          replyText.toLowerCase().includes("freeze") ||
          replyText.toLowerCase().includes("hold") ||
          replyText.toLowerCase().includes("reassure");

        if (sessionId) {
          submitProductTriageAction(sessionId, "email_reply", {
            emailId,
            replyText,
            isOptimal,
          }).catch(() => {});
        }
      } else if (actionType === "compose") {
        onAction(`[GMAIL_COMPOSE] To: ${event.data.to} | Subject: "${event.data.subject}"`);
      } else if (actionType === "email_triage") {
        onAction(`[GMAIL_TRIAGE] ${action?.toUpperCase() || "UPDATE"} on "${subject}"`);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sessionId, onSelectOption, onAction]);

  const handleDispatchProtocol = async () => {
    setProtocolSubmitted(true);
    try {
      await dispatchLaunchProtocolAction(sessionId, {
        deployFreeze,
        sev1Escalated,
        marketingBlastPaused,
        merchantReassured,
        executiveSummary,
        decisions,
      });

      onAction(
        `[LAUNCH_PROTOCOL_DISPATCHED] DeployFreeze=${deployFreeze}, Sev1Escalated=${sev1Escalated}, MarketingPaused=${marketingBlastPaused}, MerchantReassured=${merchantReassured}. Executive Summary: "${executiveSummary}"`
      );

      setTimeout(() => {
        setIsProtocolModalOpen(false);
        onComplete();
      }, 2000);
    } catch (err) {
      console.error("Protocol dispatch error:", err);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#111318",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Sleek Sub-Header with Action Gate Trigger */}
      <div
        style={{
          height: 38,
          background: "#181a20",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
          <span style={{ color: "#ea4335", fontWeight: 800 }}>✉ GMAIL</span>
          <span style={{ color: "#475569" }}>|</span>
          <span style={{ color: "#94a3b8" }}>Black Friday Launch Triage Inbox</span>
          <span
            style={{
              fontSize: 10,
              background: decisionCount >= 3 ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
              color: decisionCount >= 3 ? "#22c55e" : "#f59e0b",
              border: `1px solid ${decisionCount >= 3 ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
              padding: "1px 6px",
              borderRadius: 3,
            }}
          >
            {decisionCount >= 3 ? "TRIAGE READY ✓" : `${decisionCount} / 3 DECISIONS`}
          </span>
        </div>

        <button
          onClick={() => setIsProtocolModalOpen(true)}
          style={{
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 4,
            padding: "4px 12px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
            transition: "all 0.15s ease",
          }}
        >
          <span>🚀</span>
          <span>DISPATCH LAUNCH PROTOCOL</span>
        </button>
      </div>

      {/* Authentic Google Gmail Web Application Sandboxed Viewport */}
      <div style={{ flex: 1, width: "100%", height: "calc(100% - 38px)", position: "relative" }}>
        <iframe
          src="/gmail/index.html"
          title="Authentic Google Gmail Web Application"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
        />
      </div>

      {/* ─── PROTOCOL DISPATCHER MODAL ─────────────────────────── */}
      <AnimatePresence>
        {isProtocolModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              style={{
                width: 620,
                background: "#181a24",
                borderRadius: 12,
                border: "1px solid rgba(59,130,246,0.4)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, rgba(37,99,235,0.25), rgba(30,41,59,0.6))",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🚨</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, color: "#fff", fontWeight: 800 }}>
                      Black Friday Launch Protocol Dispatcher
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: 11, color: "#93c5fd" }}>
                      Synchronize triage gates across Engineering, Operations, and Executive leadership
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProtocolModalOpen(false)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18 }}
                >
                  ✕
                </button>
              </div>

              {/* Checklist */}
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase" }}>
                  Launch Gates & Risk Containment
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#e2e8f0", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={deployFreeze}
                      onChange={(e) => setDeployFreeze(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
                    />
                    <span>
                      <strong>Enforce Deployment Freeze:</strong> Hold gift card promo release until checkout is stable.
                    </span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#e2e8f0", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={sev1Escalated}
                      onChange={(e) => setSev1Escalated(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
                    />
                    <span>
                      <strong>Sev-1 Priority Assignment:</strong> Assign checkout double-charge fix to Engineering.
                    </span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#e2e8f0", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={marketingBlastPaused}
                      onChange={(e) => setMarketingBlastPaused(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
                    />
                    <span>
                      <strong>Pause Marketing Surge:</strong> Hold 500,000 promotional blast to prevent funnel overload.
                    </span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#e2e8f0", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={merchantReassured}
                      onChange={(e) => setMerchantReassured(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
                    />
                    <span>
                      <strong>Merchant Assurance:</strong> Provide VIP merchant with formal containment and zero-data-loss SLA.
                    </span>
                  </label>
                </div>

                {/* Executive Summary Input */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                    Executive Rationale & Stakeholder Sign-Off
                  </label>
                  <textarea
                    rows={3}
                    value={executiveSummary}
                    onChange={(e) => setExecutiveSummary(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#0c0e16",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      color: "#fff",
                      fontSize: 12,
                      fontFamily: "inherit",
                      resize: "none",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Submit button */}
                <button
                  disabled={protocolSubmitted}
                  onClick={handleDispatchProtocol}
                  style={{
                    width: "100%",
                    padding: "11px",
                    background: protocolSubmitted
                      ? "rgba(34,197,94,0.2)"
                      : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    border: protocolSubmitted ? "1px solid #22c55e" : "none",
                    color: protocolSubmitted ? "#22c55e" : "#fff",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: protocolSubmitted ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {protocolSubmitted ? (
                    <>
                      <span>✓</span>
                      <span>LAUNCH PROTOCOL DISPATCHED & LOGGED</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>LOCK GATES & DISPATCH PROTOCOL</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
