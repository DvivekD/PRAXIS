"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BrandCrisisSubEnvProps, PressInquiry } from "./types";
import { submitBrandCrisisAction } from "../../../actions/eval";

export default function CrisisCommandSubEnv({
  sessionId,
  sentiment,
  setSentiment,
  mentions,
  pressInquiries,
  setPressInquiries,
  publishedStatement,
  onAction,
  onComplete,
  demoMode,
  navigateToSubEnv,
}: BrandCrisisSubEnvProps) {
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(
    pressInquiries[0]?.id || null
  );
  const [customPressReply, setCustomPressReply] = useState<string>("");
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [isBatchDispatched, setIsBatchDispatched] = useState<boolean>(false);

  const selectedInquiry = pressInquiries.find((p) => p.id === selectedInquiryId) || pressInquiries[0];

  // Respond to individual press inquiry
  const handleRespondPress = async (inquiryId: string) => {
    const target = pressInquiries.find((p) => p.id === inquiryId);
    if (!target) return;

    const responseContent = customPressReply.trim() || publishedStatement?.text || "We experienced a temporary payment gateway concurrency bug causing duplicate pending debits. It has been patched, zero data was compromised, and all duplicate authorizations are being automatically voided immediately.";

    setPressInquiries((prev) =>
      prev.map((item) =>
        item.id === inquiryId
          ? { ...item, status: "responded", responseDraft: responseContent }
          : item
      )
    );
    setCustomPressReply("");

    await onAction(
      `[PRESS_OFFICE] Dispatched verified on-the-record briefing to ${target.journalist} (${target.outlet}) ahead of their print deadline.`
    );

    try {
      await submitBrandCrisisAction(sessionId, {
        actionType: "RESPOND_PRESS",
        outlet: target.outlet,
        pressInquiryId: inquiryId,
        statementText: responseContent,
      });
    } catch (e: unknown) {
      console.warn("Press response telemetry fallback:", e);
    }
  };

  // Batch dispatch statement to all pending press inquiries
  const handleBatchDispatchPress = async () => {
    const defaultText = publishedStatement?.text || "Our checkout experienced a concurrency bug causing duplicate pending debits for a small set of orders. The bug has been fixed, zero data was compromised, and all duplicate authorizations are being automatically voided right now.";

    setPressInquiries((prev) =>
      prev.map((item) => ({
        ...item,
        status: "responded",
        responseDraft: defaultText,
      }))
    );
    setIsBatchDispatched(true);

    await onAction(
      `[PRESS_OFFICE] Coordinated mass media distribution: Transmitted verified on-the-record crisis response to TechCrunch, Bloomberg, and The Verge.`
    );

    try {
      await submitBrandCrisisAction(sessionId, {
        actionType: "RESPOND_PRESS",
        outlet: "All Press Tier-1 Outlets",
        statementText: defaultText,
      });
    } catch (e: unknown) {
      console.warn("Press batch dispatch telemetry fallback:", e);
    }
  };

  // Generate PR Incident Report
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);

    const reportContent = `# AURA COMMERCE // EXECUTIVE INCIDENT & REPUTATION BRIEFING
**Classification:** Confidential // Executive PR & Brand Review
**Incident Date:** Black Friday Eve 2026
**Lead Responders:** Maya Lin (Head of Brand Comms) & Incident Command

---

## 1. INCIDENT OVERVIEW & CATALYST
- **Trigger:** A scheduled social marketing post (*"Ready to splurge this Black Friday? Shop till you drop! 🛍️✨"*) went live simultaneously with an internal checkout idempotency race condition.
- **Viral Cascade:** 2,410 Retweets, 8,920 Quote Tweets (94% Negative sentiment ratio), reaching an estimated 1.4M social accounts within 20 minutes.
- **Media Inbound:** 3 Tier-1 inquiries received from TechCrunch, Bloomberg Retail, and Platformer / The Verge.

---

## 2. REPUTATION TRAJECTORY & METRICS
- **Initial Crisis Sentiment:** **28% Hostile Outcry** (high churn risk, hashtag #AuraOutage trending +1,420%).
- **Recovered Sentiment:** **${sentiment}% Supportive Reversal** following transparent technical disclosure and confirmation of automated debit voiding.
- **Media Handling:** ${pressInquiries.filter((p) => p.status === "responded").length} / ${pressInquiries.length} Tier-1 Press Outlets answered on the record before publication deadlines, preventing speculative reporting.

---

## 3. CORE RESOLUTION ACTIONS
1. **Public Statement:** Issued transparent, accountable statement admitting internal concurrency flaw without deflecting blame to card networks or banking partners.
2. **Remediation Guarantee:** Automated voiding of duplicate authorizations with zero customer support ticketing required.
3. **Marketing Halt:** Immediate kill-switch activated on all scheduled promotional messaging.

---

## 4. PREVENTATIVE POLICY RECOMMENDATIONS
1. Implement a **Sev-1 Automated Social Killswitch**: Any production incident rating Sev-2 or higher automatically pauses all scheduled marketing posts.
2. Pre-stage a **Unified Incident Communication Matrix** between SRE, Customer Support, and Brand Comms to ensure immediate alignment on root causes.
3. Establish a permanent automated payment idempotency verification test suite prior to all peak traffic windows.

---
*Report generated and validated by PRAXIS Meta-Cognitive Evaluator.*`;

    setTimeout(async () => {
      setGeneratedReport(reportContent);
      setIsGeneratingReport(false);

      await onAction(
        `[PR_COMMAND] Candidate generated Executive PR Crisis Incident & Reputation Recovery Briefing.`
      );

      try {
        await submitBrandCrisisAction(sessionId, {
          actionType: "GENERATE_PR_REPORT",
          sentimentScore: sentiment,
        });
      } catch (e: unknown) {
        console.warn("PR report telemetry fallback:", e);
      }
    }, 700);
  };

  const handleCopyReport = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        height: "100%",
        width: "100%",
        background: "#05070e",
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', -apple-system, monospace",
        overflow: "hidden",
      }}
    >
      {/* ─── LEFT COLUMN: RECOVERY DIAL & PRESS INQUIRY QUEUE ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #1e293b",
          height: "100%",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "12px 20px",
            background: "#080c18",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🎯</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "1px" }}>
              CRISIS COMMAND CENTER // REPUTATION RECOVERY DIAL
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              fontWeight: 800,
              background: sentiment > 60 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: sentiment > 60 ? "#22c55e" : "#ef4444",
            }}
          >
            {sentiment > 60 ? "SURGE DEFUSED // 86% POSITIVE" : "ACTIVE CRISIS // 28% HOSTILE"}
          </span>
        </div>

        {/* Public Sentiment Recovery Dial Card */}
        <div
          style={{
            padding: 20,
            background: "#0a0e1c",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* Animated Dial */}
          <div style={{ position: "relative", width: 190, height: 115 }}>
            <svg viewBox="0 0 190 115" style={{ width: "100%", height: "100%" }}>
              <path
                d="M 20,105 A 75,75 0 0,1 170,105"
                fill="none"
                stroke="#1e293b"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <motion.path
                d="M 20,105 A 75,75 0 0,1 170,105"
                fill="none"
                stroke={sentiment > 60 ? "#22c55e" : sentiment > 40 ? "#f59e0b" : "#ef4444"}
                strokeWidth="14"
                strokeDasharray="235"
                strokeDashoffset={235 - (sentiment / 100) * 235}
                strokeLinecap="round"
                animate={{ strokeDashoffset: 235 - (sentiment / 100) * 235 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center" }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: sentiment > 60 ? "#22c55e" : "#ef4444",
                }}
              >
                {sentiment}%
              </div>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700 }}>
                {sentiment > 60 ? "REPUTATION RECOVERED" : "COMMUNITY CRISIS"}
              </div>
            </div>
          </div>

          {/* Recovery Stats & Insights */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 180 }}>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              TRAJECTORY DELTA:
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: sentiment > 60 ? "#22c55e" : "#f59e0b",
              }}
            >
              {sentiment > 60 ? "+58% Reversal within 4m" : "-72% Sudden Plummet"}
            </div>
            <div style={{ fontSize: 10, color: "#cbd5e1", lineHeight: 1.4 }}>
              {sentiment > 60
                ? "Transparent statement admitting the idempotency flaw reversed viral momentum into customer praise."
                : "Awaiting candidate response. Hostile quote-tweets accelerating at +380/min."}
            </div>
            {sentiment <= 60 && navigateToSubEnv && (
              <button
                onClick={() => navigateToSubEnv("studio")}
                style={{
                  marginTop: 6,
                  background: "#ec4899",
                  border: "none",
                  borderRadius: 4,
                  padding: "5px 10px",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                CRAFT STATEMENT IN STUDIO ▶
              </button>
            )}
          </div>
        </div>

        {/* Press Inquiry Queue Section */}
        <div style={{ padding: "14px 20px", background: "#080c18", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.5px" }}>
              PRESS INQUIRY QUEUE (JOURNALIST DEADLINES)
            </div>
            <div style={{ fontSize: 9, color: "#94a3b8" }}>
              Tier-1 media requests awaiting official company statement
            </div>
          </div>

          <button
            onClick={handleBatchDispatchPress}
            disabled={isBatchDispatched}
            style={{
              background: isBatchDispatched ? "rgba(34,197,94,0.15)" : "#0f172a",
              border: isBatchDispatched ? "1px solid #22c55e" : "1px solid #38bdf8",
              color: isBatchDispatched ? "#22c55e" : "#38bdf8",
              fontSize: 10,
              padding: "4px 10px",
              borderRadius: 4,
              fontWeight: 800,
              cursor: isBatchDispatched ? "default" : "pointer",
            }}
          >
            {isBatchDispatched ? "✓ ALL PRESS ANSWERED" : "BATCH DISPATCH TO ALL MEDIA"}
          </button>
        </div>

        {/* Press Inquiries List */}
        <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {pressInquiries.map((inq) => {
            const isSelected = selectedInquiry?.id === inq.id;
            const isResponded = inq.status === "responded";

            return (
              <div
                key={inq.id}
                onClick={() => setSelectedInquiryId(inq.id)}
                style={{
                  padding: 14,
                  background: isSelected ? "rgba(236,72,153,0.12)" : "#0a0e1c",
                  border: isSelected ? "1px solid #ec4899" : isResponded ? "1px solid #22c55e" : "1px solid #1e293b",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>{inq.outlet}</span>
                      <span style={{ fontSize: 9, background: "#1e293b", padding: "1px 6px", borderRadius: 3, color: "#38bdf8" }}>
                        {inq.outletTier}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>
                      Reporter: {inq.journalist} • {inq.email}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontWeight: 800,
                        background: isResponded
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(239,68,68,0.15)",
                        color: isResponded ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {isResponded ? "✓ RESPONDED" : `⏱ ${inq.deadline}`}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.4, marginBottom: 8 }}>
                  "{inq.queryText}"
                </div>

                {isResponded ? (
                  <div style={{ fontSize: 10, color: "#22c55e", background: "rgba(34,197,94,0.06)", padding: "8px 10px", borderRadius: 4 }}>
                    <div style={{ fontWeight: 800, marginBottom: 2 }}>✓ On-the-record briefing dispatched:</div>
                    <div style={{ color: "#cbd5e1", fontStyle: "italic", fontSize: 10 }}>
                      "{inq.responseDraft || publishedStatement?.text || 'Official crisis clarification provided.'}"
                    </div>
                  </div>
                ) : isSelected ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid #1e293b",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700 }}>
                        TAILORED ON-THE-RECORD BRIEFING ({inq.outlet.toUpperCase()}):
                      </span>
                      <button
                        onClick={() => {
                          const defaultPrefill =
                            inq.id === "press-01"
                              ? "On the record for TechCrunch: We identified a concurrency race condition in payment idempotency token validation during peak volume. The patch is live, zero card data was compromised, and duplicate authorizations are actively being voided."
                              : inq.id === "press-02"
                              ? "On the record for Bloomberg: Customer financial data was never compromised. Every duplicate pending authorization is being voided automatically via acquiring networks with zero customer effort required."
                              : "On the record for The Verge: The promotional tweet was an automated scheduler post. We have activated an emergency Sev-1 marketing kill-switch and paused all outbound campaigns.";
                          setCustomPressReply(defaultPrefill);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#94a3b8",
                          fontSize: 9,
                          cursor: "pointer",
                          textDecoration: "underline",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        Auto-Fill Recommended Briefing
                      </button>
                    </div>

                    <textarea
                      value={customPressReply || (publishedStatement?.text || "")}
                      onChange={(e) => setCustomPressReply(e.target.value)}
                      rows={3}
                      style={{
                        width: "100%",
                        background: "#050814",
                        border: "1px solid #334155",
                        borderRadius: 4,
                        padding: 8,
                        color: "#fff",
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono', monospace",
                        resize: "vertical",
                        boxSizing: "border-box",
                        marginBottom: 8,
                        outline: "none",
                      }}
                      placeholder={`Draft customized statement for ${inq.journalist}...`}
                    />

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <button
                        onClick={() => handleRespondPress(inq.id)}
                        style={{
                          background: "#38bdf8",
                          border: "none",
                          color: "#05070e",
                          padding: "6px 14px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 900,
                          cursor: "pointer",
                          letterSpacing: "0.5px",
                        }}
                      >
                        TRANSMIT ON-THE-RECORD BRIEFING ▶
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInquiryId(inq.id);
                    }}
                    style={{
                      background: "rgba(56,189,248,0.12)",
                      border: "1px solid #38bdf8",
                      color: "#38bdf8",
                      padding: "4px 10px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    SELECT TO TAILOR BRIEFING ▶
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── RIGHT COLUMN: PR REPORT GENERATOR & MISSION SUMMARY ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "#070a14",
          borderLeft: "1px solid #1e293b",
          height: "100%",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#fff", fontWeight: 800, letterSpacing: "1px" }}>
              EXECUTIVE PR INCIDENT REPORT GENERATOR
            </div>
            <div style={{ fontSize: 9, color: "#94a3b8" }}>
              Synthesize brand crisis outcome, metrics, and policy safeguards
            </div>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            style={{
              background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
              border: "none",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(236,72,153,0.3)",
            }}
          >
            {isGeneratingReport ? "GENERATING..." : "GENERATE PR REPORT 📄"}
          </button>
        </div>

        {/* Report Content Display */}
        <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          {generatedReport ? (
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 800 }}>
                  ✓ REPORT READY FOR EXECUTIVE COMMITTEE
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleCopyReport}
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      color: copiedReport ? "#22c55e" : "#cbd5e1",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {copiedReport ? "✓ COPIED!" : "COPY MARKDOWN"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  background: "#090d1a",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  padding: 16,
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: "#cbd5e1",
                  whiteSpace: "pre-wrap",
                  fontFamily: "'JetBrains Mono', monospace",
                  overflowY: "auto",
                  maxHeight: "420px",
                }}
              >
                {generatedReport}
              </div>

              {/* Final Success & Completion Button */}
              <div style={{ marginTop: 16, padding: 14, background: "rgba(34,197,94,0.12)", border: "1px solid #22c55e", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#22c55e", marginBottom: 4 }}>
                  🎉 PR CRISIS SUCCESSFULLY CONTROLLED!
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5, marginBottom: 10 }}>
                  Brand sentiment successfully rebounded from 28% to {sentiment}%. All Tier-1 media inquiries answered with full technical transparency.
                </div>
                <button
                  onClick={onComplete}
                  style={{
                    width: "100%",
                    background: "#22c55e",
                    border: "none",
                    borderRadius: 6,
                    color: "#05070e",
                    padding: "10px",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                    letterSpacing: "0.5px",
                  }}
                >
                  COMPLETE MISSION & VIEW EVALUATION REPORT ▶
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                textAlign: "center",
                padding: 30,
              }}
            >
              <span style={{ fontSize: 36, marginBottom: 12 }}>📋</span>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#cbd5e1", marginBottom: 6 }}>
                PR Crisis Incident Briefing Generator
              </div>
              <div style={{ fontSize: 11, maxWidth: 360, lineHeight: 1.5, marginBottom: 16 }}>
                Click "GENERATE PR REPORT" above to synthesize public sentiment reversal, press responsiveness, and preventative safeguards into a formal executive briefing.
              </div>
              <button
                onClick={handleGenerateReport}
                style={{
                  background: "#0f172a",
                  border: "1px solid #ec4899",
                  color: "#ec4899",
                  padding: "8px 16px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                GENERATE NOW
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
