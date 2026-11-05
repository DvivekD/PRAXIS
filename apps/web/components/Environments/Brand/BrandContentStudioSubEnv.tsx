"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BrandCrisisSubEnvProps, BrandToneReport, PublishedStatement } from "./types";
import { submitBrandCrisisAction } from "../../../actions/eval";

interface PresetArchetype {
  id: string;
  code: string;
  title: string;
  type: "accountable" | "defensive" | "boilerplate" | "founder";
  text: string;
  toneReport: BrandToneReport;
}

const PRESET_ARCHETYPES: PresetArchetype[] = [
  {
    id: "archetype-01",
    code: "STMT_01",
    title: "01 // Transparent Accountability (Recommended)",
    type: "accountable",
    text: "We hear you loud and clear. Our checkout experienced a concurrency bug causing duplicate pending debits for a small set of orders. The bug has been fixed, zero data was compromised, and all duplicate authorizations are being automatically voided right now. We are deeply sorry for the stress heading into Black Friday.",
    toneReport: {
      accountability: 96,
      defensiveness: "Low",
      clarity: 94,
      empathy: 92,
      isOptimal: true,
      critiqueNotes: [
        "Directly admits technical root cause (concurrency race condition).",
        "Confirms zero data breach, reducing fear of credit card compromise.",
        "Guarantees automated voiding with zero manual ticketing required by users.",
        "Sincerely apologizes for Black Friday stress.",
      ],
      strengths: [
        "Unconditional ownership",
        "Clear technical transparency",
        "Frictionless customer remediation",
      ],
      warnings: [],
    },
  },
  {
    id: "archetype-02",
    code: "STMT_02",
    title: "02 // Defensive Blame / External Banks",
    type: "defensive",
    text: "The issue is due to external card network delays and high traffic from credit card issuers, not our system. Please take it up with your bank before posting online.",
    toneReport: {
      accountability: 12,
      defensiveness: "Extreme",
      clarity: 45,
      empathy: 10,
      isOptimal: false,
      critiqueNotes: [
        "Deflects blame to external card networks and card issuing banks.",
        "Hostile tone ('take it up with your bank before posting online').",
        "Does not offer any automated refund or relief timeline.",
      ],
      strengths: [],
      warnings: [
        "Will provoke severe community quote-tweet backlash.",
        "Contradicts technical reality of checkout concurrency flaw.",
        "Violates Brand Voice Rule #1: Never blame users or external banks.",
      ],
    },
  },
  {
    id: "archetype-03",
    code: "STMT_03",
    title: "03 // Corporate Boilerplate / Dismissive",
    type: "boilerplate",
    text: "We are aware of minor latency and thank our community for their patience. Our Black Friday discounts remain active!",
    toneReport: {
      accountability: 28,
      defensiveness: "Medium",
      clarity: 35,
      empathy: 20,
      isOptimal: false,
      critiqueNotes: [
        "Minimizes duplicate charges as 'minor latency'.",
        "Shamelessly pivots to pushing discounts during an active outage.",
        "Tone-deaf to customer financial anxiety.",
      ],
      strengths: [],
      warnings: [
        "Tone-deaf marketing cheerleading inflames PR crisis.",
        "Fails to explain remediation or refund guarantees.",
      ],
    },
  },
  {
    id: "archetype-04",
    code: "STMT_04",
    title: "04 // Leadership Open Letter",
    type: "founder",
    text: "An update from Aura Leadership: We failed our standard today. Rapid repeat clicks triggered duplicate authorizations on checkout. The bug is resolved, all scheduled marketing tweets are paused, and automated reversals are processing now. We will earn your trust back.",
    toneReport: {
      accountability: 92,
      defensiveness: "Low",
      clarity: 90,
      empathy: 95,
      isOptimal: true,
      critiqueNotes: [
        "Strong executive humility ('We failed our standard today').",
        "Notes that promotional marketing schedulers have been halted.",
        "Transparent about automated reversals.",
      ],
      strengths: [
        "Executive vulnerability",
        "Halts marketing insensitivity",
        "Rebuilding trust commitment",
      ],
      warnings: [],
    },
  },
];

export function evaluateBrandTone(text: string): BrandToneReport {
  const textLower = text.toLowerCase();

  const hasAccountability =
    textLower.includes("bug") ||
    textLower.includes("sorry") ||
    textLower.includes("apolog") ||
    textLower.includes("failed") ||
    textLower.includes("fail") ||
    textLower.includes("responsibility") ||
    textLower.includes("concurrency") ||
    textLower.includes("our fault") ||
    textLower.includes("we hear you") ||
    textLower.includes("standard");

  const hasRemediation =
    textLower.includes("void") ||
    textLower.includes("refund") ||
    textLower.includes("revers") ||
    textLower.includes("fixed") ||
    textLower.includes("patch") ||
    textLower.includes("compromised") ||
    textLower.includes("remediat");

  const hasBlame =
    textLower.includes("blame") ||
    textLower.includes("take it up with your bank") ||
    textLower.includes("bank before posting") ||
    textLower.includes("not our system") ||
    textLower.includes("not our fault") ||
    textLower.includes("external card network") ||
    textLower.includes("external bank") ||
    textLower.includes("third-party payment") ||
    textLower.includes("card network delay") ||
    textLower.includes("issuer traffic");

  const isBoilerplate =
    textLower.includes("discounts remain") ||
    textLower.includes("minor latency") ||
    textLower.includes("shop till you drop") ||
    textLower.includes("splurge") ||
    textLower.includes("patience");

  let accountability = 65;
  let defensiveness: "Low" | "Medium" | "High" | "Extreme" = "Low";
  let empathy = 70;
  let clarity = 80;
  const critiqueNotes: string[] = [];
  const strengths: string[] = [];
  const warnings: string[] = [];

  if (hasAccountability) {
    accountability += 25;
    strengths.push("Direct acknowledgement of technical responsibility.");
  }
  if (hasRemediation) {
    accountability += 10;
    clarity += 15;
    strengths.push("Affirms automated remediation and financial protection.");
  }
  if (hasBlame) {
    accountability -= 55;
    defensiveness = "Extreme";
    empathy -= 40;
    warnings.push("Blames card network or customer bank, escalating crisis.");
  }
  if (isBoilerplate) {
    accountability -= 35;
    defensiveness = defensiveness === "Extreme" ? "Extreme" : "Medium";
    empathy -= 30;
    warnings.push("Dismissive corporate boilerplate or marketing promotion during active financial outage.");
  }

  accountability = Math.max(10, Math.min(100, accountability));
  const isOptimal = accountability >= 75 && defensiveness === "Low";

  if (isOptimal) {
    critiqueNotes.push("Adheres to Brand Voice Crisis Protocol: admits technical flaw and guarantees auto-reversal.");
  } else {
    critiqueNotes.push("Fails Brand Voice Crisis Protocol: defensive deflection or lack of remediation guarantees.");
  }

  return {
    accountability,
    defensiveness,
    clarity: Math.min(100, clarity),
    empathy: Math.min(100, empathy),
    isOptimal,
    critiqueNotes,
    strengths,
    warnings,
  };
}

export default function BrandContentStudioSubEnv({
  sessionId,
  sentiment,
  setSentiment,
  mentions,
  setMentions,
  publishedStatement,
  setPublishedStatement,
  onAction,
  demoMode,
  navigateToSubEnv,
}: BrandCrisisSubEnvProps) {
  const [statementText, setStatementText] = useState(
    publishedStatement?.text || PRESET_ARCHETYPES[0].text
  );
  const [activeArchetype, setActiveArchetype] = useState<string>("archetype-01");
  const [toneReport, setToneReport] = useState<BrandToneReport | null>(
    PRESET_ARCHETYPES[0].toneReport
  );
  const [isTestingTone, setIsTestingTone] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");

  // Split statement into thread if longer than 280 chars
  const threadParts = React.useMemo(() => {
    if (statementText.length <= 280) return [statementText];
    const words = statementText.split(" ");
    const parts: string[] = [];
    let current = "";

    for (const w of words) {
      if ((current + " " + w).length > 270) {
        parts.push(current.trim());
        current = w;
      } else {
        current += (current ? " " : "") + w;
      }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }, [statementText]);

  // Analyze tone heuristic
  const handleAnalyzeTone = async () => {
    setIsTestingTone(true);
    const report = evaluateBrandTone(statementText);

    setTimeout(async () => {
      setToneReport(report);
      setIsTestingTone(false);

      await onAction(
        `[BRAND_STUDIO] Candidate executed Brand Tone Analysis: Accountability=${report.accountability}%, Defensiveness=${report.defensiveness}, Optimal=${report.isOptimal}`
      );

      try {
        await submitBrandCrisisAction(sessionId, {
          actionType: "ANALYZE_TONE",
          statementText,
          toneMetrics: {
            accountability: report.accountability,
            defensiveness: report.defensiveness,
            clarity: report.clarity,
            isOptimal: report.isOptimal,
          },
        });
      } catch (e: unknown) {
        console.warn("Tone analysis telemetry fallback:", e);
      }
    }, 400);
  };

  // Publish Statement
  const handlePublish = async () => {
    setIsPublishing(true);
    const reportToUse = activeArchetype === "custom" ? evaluateBrandTone(statementText) : (toneReport || evaluateBrandTone(statementText));
    const isOpt = reportToUse.isOptimal;

    const publishedObj: PublishedStatement = {
      id: `pub-${Date.now()}`,
      code: "STMT_OFFICIAL",
      title: "Official Public Crisis Response",
      text: statementText,
      publishedAt: new Date().toLocaleTimeString(),
      isOptimal: isOpt,
      toneReport: reportToUse,
    };

    setPublishedStatement(publishedObj);
    setToneReport(reportToUse);

    if (isOpt) {
      setSentiment(86);
      await onAction(
        `[VICTORY] Brand Lead transmitted accountable public statement to all channels: "${statementText.substring(0, 90)}...". Public sentiment surged to 86% Positive.`
      );

      // Add positive community quote-tweets to stream
      setTimeout(() => {
        setMentions((prev) => [
          {
            id: `reply-${Date.now()}-1`,
            platform: "twitter",
            author: "Sarah Jenkins (@tech_sarah)",
            handle: "@tech_sarah",
            avatar: "SJ",
            verified: true,
            followerCount: "28.4k",
            text: "Appreciate the fast, honest accountability and auto-void @AuraCommerce. That's how you handle an outage. Reordering now 👍 #AuraOutage",
            timestamp: "Just now",
            likes: "1.2k",
            retweets: "340",
            sentiment: "positive",
            reachImpact: "HIGH",
          },
          {
            id: `reply-${Date.now()}-2`,
            platform: "twitter",
            author: "Marcus Chen (@mchen_dev)",
            handle: "@mchen_dev",
            avatar: "MC",
            verified: true,
            followerCount: "14.2k",
            text: "Solid crisis communication from @AuraCommerce. Clear technical root cause (concurrency race condition) and automated remedy. #AuraOutage",
            timestamp: "Just now",
            likes: "540",
            retweets: "95",
            sentiment: "positive",
            reachImpact: "MODERATE",
          },
          ...prev,
        ]);
      }, 500);

      try {
        await submitBrandCrisisAction(sessionId, {
          actionType: "PUBLISH_STATEMENT",
          statementText,
          sentimentScore: 86,
          toneMetrics: {
            accountability: reportToUse.accountability,
            defensiveness: reportToUse.defensiveness,
            clarity: reportToUse.clarity,
            isOptimal: true,
          },
        });
      } catch (e: unknown) {
        console.warn("Publish telemetry fallback:", e);
      }
    } else {
      setSentiment(14);
      await onAction(
        `[BRAND_ACTION] Suboptimal crisis statement published. Community sentiment collapsed to 14% Hostile.`
      );

      try {
        await submitBrandCrisisAction(sessionId, {
          actionType: "PUBLISH_STATEMENT",
          statementText,
          sentimentScore: 14,
          toneMetrics: {
            accountability: reportToUse.accountability,
            defensiveness: reportToUse.defensiveness,
            clarity: reportToUse.clarity,
            isOptimal: false,
          },
        });
      } catch (e: unknown) {
        console.warn("Publish telemetry fallback:", e);
      }
    }

    setTimeout(() => {
      setIsPublishing(false);
      if (navigateToSubEnv) navigateToSubEnv("command");
    }, 1200);
  };

  const handleSelectArchetype = (arch: PresetArchetype) => {
    setActiveArchetype(arch.id);
    setStatementText(arch.text);
    setToneReport(arch.toneReport);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 0.9fr",
        height: "100%",
        width: "100%",
        background: "#05070e",
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', -apple-system, monospace",
        overflow: "hidden",
      }}
    >
      {/* ─── LEFT COLUMN: STATEMENT DRAFT WORKSPACE ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #1e293b",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Header bar */}
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
            <span style={{ fontSize: 14 }}>✍️</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "1px" }}>
              BRAND CONTENT & RESPONSE STUDIO // COMPOSER
            </span>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setActiveTab("editor")}
              style={{
                background: activeTab === "editor" ? "rgba(236,72,153,0.2)" : "#0f172a",
                border: activeTab === "editor" ? "1px solid #ec4899" : "1px solid #1e293b",
                color: activeTab === "editor" ? "#ec4899" : "#94a3b8",
                fontSize: 10,
                padding: "4px 10px",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              EDITOR
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              style={{
                background: activeTab === "preview" ? "rgba(236,72,153,0.2)" : "#0f172a",
                border: activeTab === "preview" ? "1px solid #ec4899" : "1px solid #1e293b",
                color: activeTab === "preview" ? "#ec4899" : "#94a3b8",
                fontSize: 10,
                padding: "4px 10px",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              PREVIEW ({threadParts.length} TWEETS)
            </button>
          </div>
        </div>

        {/* Quick-Load Archetypes */}
        <div style={{ padding: "14px 20px", background: "#0a0e1c", borderBottom: "1px solid #1e293b" }}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 8, letterSpacing: "0.5px" }}>
            SELECT OR CUSTOMIZE RESPONSE ARCHETYPE:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PRESET_ARCHETYPES.map((arch) => {
              const isSelected = activeArchetype === arch.id;
              return (
                <div
                  key={arch.id}
                  onClick={() => handleSelectArchetype(arch)}
                  style={{
                    padding: "8px 12px",
                    background: isSelected ? "rgba(236,72,153,0.15)" : "#070b16",
                    border: isSelected
                      ? "1px solid #ec4899"
                      : arch.type === "accountable" || arch.type === "founder"
                      ? "1px solid rgba(34,197,94,0.3)"
                      : "1px solid #1e293b",
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: arch.type === "accountable" || arch.type === "founder" ? "#22c55e" : "#f59e0b",
                      }}
                    >
                      {arch.code}
                    </span>
                    <span
                      style={{
                        fontSize: 8,
                        background: "rgba(255,255,255,0.06)",
                        padding: "1px 5px",
                        borderRadius: 3,
                        color: "#94a3b8",
                      }}
                    >
                      {arch.type.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {arch.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Text Area Workspace */}
        <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", background: "#05070e", overflowY: "auto" }}>
          {activeTab === "editor" ? (
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 700 }}>
                  CRISIS STATEMENT DRAFT (TRANSMIT TO TWITTER, INSTAGRAM & THREADS):
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: statementText.length > 280 ? "#f59e0b" : "#22c55e",
                    fontWeight: 700,
                  }}
                >
                  {statementText.length} chars • {threadParts.length} tweet{threadParts.length > 1 ? "s" : ""}
                </span>
              </div>

              <textarea
                value={statementText}
                onChange={(e) => {
                  setStatementText(e.target.value);
                  setActiveArchetype("custom");
                }}
                rows={9}
                style={{
                  width: "100%",
                  background: "#090d1a",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  padding: 14,
                  color: "#f8fafc",
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 1.6,
                  resize: "vertical",
                  boxSizing: "border-box",
                  outline: "none",
                }}
                placeholder="Draft your public crisis statement here..."
              />

              {/* Character Limit & Thread warning if split */}
              {statementText.length > 280 && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "6px 12px",
                    background: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    borderRadius: 4,
                    fontSize: 10,
                    color: "#f59e0b",
                  }}
                >
                  ℹ️ Statement exceeds 280 characters. Social studio will automatically publish as a connected {threadParts.length}-part thread (1/{threadParts.length}).
                </div>
              )}

              {/* Bottom action controls */}
              <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  onClick={handleAnalyzeTone}
                  disabled={isTestingTone}
                  style={{
                    background: "#0f172a",
                    border: "1px solid #38bdf8",
                    color: "#38bdf8",
                    padding: "8px 16px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {isTestingTone ? "ANALYZING TONE..." : "🔍 TEST AGAINST BRAND GUIDELINES"}
                </button>

                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                    border: "none",
                    borderRadius: 6,
                    color: "#fff",
                    padding: "10px 18px",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: "0.5px",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(236,72,153,0.3)",
                  }}
                >
                  {isPublishing ? "TRANSMITTING TO ALL PLATFORMS..." : "TRANSMIT & PUBLISH OFFICIAL STATEMENT ▶"}
                </button>
              </div>
            </div>
          ) : (
            /* PREVIEW TAB */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>
                AUTHENTIC LIVE THREAD PREVIEW (@AuraCommerce):
              </div>
              {threadParts.map((part, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#0c1122",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: 16,
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "#ec4899",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: 12,
                      }}
                    >
                      AC
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Aura Commerce</span>
                        <span style={{ fontSize: 11, color: "#38bdf8" }}>✓</span>
                        <span style={{ fontSize: 11, color: "#64748b" }}>@AuraCommerce</span>
                      </div>
                      <span style={{ fontSize: 10, color: "#64748b" }}>Official Brand Statement • Thread {idx + 1}/{threadParts.length}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: "#f1f5f9", lineHeight: 1.5, marginBottom: 12 }}>
                    {part}
                  </div>

                  <div style={{ display: "flex", gap: 20, fontSize: 11, color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: 8 }}>
                    <span>💬 Reply</span>
                    <span>🔁 Repost</span>
                    <span>❤️ Like</span>
                    <span>📊 Analytics</span>
                  </div>
                </div>
              ))}

              <button
                onClick={handlePublish}
                disabled={isPublishing}
                style={{
                  marginTop: 10,
                  background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  padding: "10px 18px",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                CONFIRM & TRANSMIT NOW ▶
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT COLUMN: BRAND TONE GUIDELINES & DIAGNOSTICS ─── */}
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
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ fontSize: 11, color: "#fff", fontWeight: 800, letterSpacing: "1px", marginBottom: 4 }}>
            BRAND TONE ANALYSIS & CRITIQUE
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>
            Real-time evaluation against Aura Commerce Crisis Communications Playbook
          </div>
        </div>

        {/* Tone Scorecards */}
        {toneReport ? (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Score Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#0b101e", border: "1px solid #1e293b", borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700 }}>ACCOUNTABILITY INDEX</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: toneReport.accountability >= 75 ? "#22c55e" : "#ef4444",
                  }}
                >
                  {toneReport.accountability}%
                </div>
                <div style={{ fontSize: 9, color: toneReport.accountability >= 75 ? "#22c55e" : "#ef4444" }}>
                  {toneReport.accountability >= 75 ? "Direct Ownership" : "Deflection Detected"}
                </div>
              </div>

              <div style={{ background: "#0b101e", border: "1px solid #1e293b", borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700 }}>DEFENSIVENESS RATING</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: toneReport.defensiveness === "Low" ? "#22c55e" : "#ef4444",
                    marginTop: 4,
                  }}
                >
                  {toneReport.defensiveness.toUpperCase()}
                </div>
                <div style={{ fontSize: 9, color: "#94a3b8" }}>
                  {toneReport.defensiveness === "Low" ? "Neutral & Calm" : "Hostile Defensive"}
                </div>
              </div>

              <div style={{ background: "#0b101e", border: "1px solid #1e293b", borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700 }}>CLARITY & PRECISION</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#38bdf8" }}>
                  {toneReport.clarity}%
                </div>
                <div style={{ fontSize: 9, color: "#94a3b8" }}>Technical Root Cause</div>
              </div>

              <div style={{ background: "#0b101e", border: "1px solid #1e293b", borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700 }}>EMPATHY RATING</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#f59e0b" }}>
                  {toneReport.empathy}%
                </div>
                <div style={{ fontSize: 9, color: "#94a3b8" }}>Customer Focus</div>
              </div>
            </div>

            {/* Status Recommendation */}
            <div
              style={{
                padding: "10px 14px",
                background: toneReport.isOptimal ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                border: toneReport.isOptimal ? "1px solid #22c55e" : "1px solid #ef4444",
                borderRadius: 6,
                fontSize: 11,
                color: toneReport.isOptimal ? "#22c55e" : "#ef4444",
                fontWeight: 800,
              }}
            >
              {toneReport.isOptimal
                ? "✓ APPROVED FOR TRANSMISSION — High transparency defuses viral backlash."
                : "⚠️ HIGH REPUTATIONAL RISK — This draft will provoke intensified community anger."}
            </div>

            {/* Strengths */}
            {toneReport.strengths.length > 0 && (
              <div style={{ background: "#0b101e", border: "1px solid #1e293b", borderRadius: 6, padding: 14 }}>
                <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 800, marginBottom: 6 }}>
                  KEY STRENGTHS:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {toneReport.strengths.map((s, idx) => (
                    <div key={idx} style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.4 }}>
                      • {s}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {toneReport.warnings.length > 0 && (
              <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: 14 }}>
                <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 800, marginBottom: 6 }}>
                  IDENTIFIED RISKS & DEFICIENCIES:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {toneReport.warnings.map((w, idx) => (
                    <div key={idx} style={{ fontSize: 11, color: "#fca5a5", lineHeight: 1.4 }}>
                      • {w}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 20, color: "#94a3b8", fontSize: 11 }}>
            Click "Test Against Brand Guidelines" to generate real-time feedback.
          </div>
        )}

        {/* Brand Voice Guidelines Policy Card */}
        <div style={{ padding: 18, background: "#080c18", borderTop: "1px solid #1e293b", marginTop: "auto" }}>
          <div style={{ fontSize: 10, color: "#ec4899", fontWeight: 800, marginBottom: 6 }}>
            AURA COMMERCE BRAND VOICE RULES:
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>
            • Never blame the consumer or external payment rails.<br />
            • State immediate remedy: all duplicate pending charges auto-voided.<br />
            • Provide exact timeline: orders fully safe heading into Black Friday.
          </div>
        </div>
      </div>
    </div>
  );
}
