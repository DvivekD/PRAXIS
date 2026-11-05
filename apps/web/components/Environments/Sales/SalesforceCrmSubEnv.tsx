"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import type { SalesDealState } from "./LiveSalesCallSubEnv";
import { submitSalesRenewalAction } from "../../../actions/eval";

// Dynamically import AvatarScene with SSR disabled
const AvatarScene = dynamic(() => import("../../Avatar/AvatarScene"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020307",
        color: "#f59e0b",
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      [ OBSERVER CORE INITIALIZING... ]
    </div>
  ),
});

export interface SalesforceCrmSubEnvProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, unknown>) => Promise<unknown>;
  onComplete: () => void;
  demoMode: boolean;
  analyserNode?: AnalyserNode | null;
  dealState: SalesDealState;
  updateDealState: (partial: Partial<SalesDealState>) => void;
  onNavigateToSubEnv?: (subEnv: "call" | "pitch" | "crm") => void;
}

type DealStageKey = "Discovery" | "Needs Analysis" | "Proposal / Quote" | "Negotiation / Review" | "Closed Won";

interface TimelineItem {
  id: string;
  type: "call" | "email" | "deck" | "system" | "task";
  title: string;
  description: string;
  timestamp: string;
  author: string;
  badge?: string;
  badgeColor?: string;
}

export default function SalesforceCrmSubEnv({
  sessionId,
  onAction,
  onComplete,
  demoMode,
  analyserNode,
  dealState,
  updateDealState,
  onNavigateToSubEnv,
}: SalesforceCrmSubEnvProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "email" | "dealdesk" | "account">("dealdesk");

  // Deal Desk Configuration
  const [contractTermYears, setContractTermYears] = useState<number>(dealState.contractTermYears || 2);
  const [discountPct, setDiscountPct] = useState<number>(dealState.calculatedDiscount || 8);
  const [includeWarRoom, setIncludeWarRoom] = useState<boolean>(dealState.includeWarRoom ?? true);
  const [includeFailover, setIncludeFailover] = useState<boolean>(
    dealState.includeFailover ?? (dealState.slaTier === "Mission-Critical 99.999%")
  );
  const [paymentTerms, setPaymentTerms] = useState<"annual_prepay" | "net_30">(dealState.paymentTerms || "annual_prepay");

  // Email Composer State
  const [emailTo, setEmailTo] = useState("sam.jenkins@nordicgoods.com");
  const [emailCc, setEmailCc] = useState("elena.rostova@nordicgoods.com, marcus.vance@nordicgoods.com, vp-sales@auracommerce.com");
  const [emailSubject, setEmailSubject] = useState("Nordic Goods × Aura Commerce // Renewal Proposal & Concurrency SLA Confirmation");
  const [emailBody, setEmailBody] = useState("");
  const [emailSent, setEmailSent] = useState(dealState.emailSent ?? false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Victory / Proposal Submission State
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [isWon, setIsWon] = useState(dealState.dealStage === "Closed Won");

  // Keep state synchronized with dealState updates
  useEffect(() => {
    if (dealState.contractTermYears && dealState.contractTermYears !== contractTermYears) {
      setContractTermYears(dealState.contractTermYears);
    }
    if (dealState.calculatedDiscount !== undefined && dealState.calculatedDiscount !== discountPct) {
      setDiscountPct(Math.max(0, Math.min(25, dealState.calculatedDiscount)));
    }
    if (dealState.includeWarRoom !== undefined && dealState.includeWarRoom !== includeWarRoom) {
      setIncludeWarRoom(dealState.includeWarRoom);
    }
    if (dealState.includeFailover !== undefined && dealState.includeFailover !== includeFailover) {
      setIncludeFailover(dealState.includeFailover);
    }
    if (dealState.paymentTerms && dealState.paymentTerms !== paymentTerms) {
      setPaymentTerms(dealState.paymentTerms);
    }
    if (dealState.dealStage === "Closed Won" && !isWon) {
      setIsWon(true);
    }
  }, [dealState.contractTermYears, dealState.calculatedDiscount, dealState.includeWarRoom, dealState.includeFailover, dealState.paymentTerms, dealState.dealStage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pricing calculations
  const basePlatform = 180000;
  const burstCapacity = 40000;
  const warRoom = includeWarRoom ? 30000 : 0;
  const failover = includeFailover ? 25000 : 0;
  const grossARR = basePlatform + burstCapacity + warRoom + failover;

  const totalDiscountAmount = Math.round((grossARR * discountPct) / 100);
  const netARR = grossARR - totalDiscountAmount;
  const totalContractValue = netARR * contractTermYears;

  // Stages array
  const stages: Array<{ key: DealStageKey; label: string; probability: number }> = [
    { key: "Discovery", label: "01 Discovery", probability: 20 },
    { key: "Needs Analysis", label: "02 Needs Analysis", probability: 40 },
    { key: "Proposal / Quote", label: "03 Proposal / Quote", probability: 70 },
    { key: "Negotiation / Review", label: "04 Negotiation / Review", probability: 90 },
    { key: "Closed Won", label: "05 Closed Won", probability: 100 },
  ];

  // Initialize email template with dynamic deal state values
  useEffect(() => {
    setEmailBody(`Dear Sam, Elena, and Marcus,

Thank you for our productive discussions regarding the Nordic Goods enterprise renewal.

As reviewed during our technical demo and presentation, Aura Commerce is proud to guarantee:
1. Zero Duplicate Debits: Atomic pre-charge status claim architecture eliminating race conditions under peak traffic.
2. 120,000 Peak TPS Capacity: Benchmarked sub-14ms P99 checkout latency during synthetic load tests.
3. 24/7 Dedicated SRE War Room: Principal engineers embedded with your team during Black Friday.
4. Commercial Terms: $${netARR.toLocaleString()} ARR on a ${contractTermYears}-Year commitment (${discountPct}% early renewal incentive).
5. Zero GMV Take Rate: Saving Nordic Goods an estimated $177,500 compared to CommerceCloud's 1.25% revenue fee.

Our Mutual Action Plan is scheduled to commence tomorrow with synthetic staging verification.

Best regards,
Senior Account Executive, Enterprise Retail
Aura Commerce Cloud`);
  }, [netARR, contractTermYears, discountPct]);

  // Activity Timeline Feed
  const [timeline, setTimeline] = useState<TimelineItem[]>([
    {
      id: "t-1",
      type: "call",
      title: "Live Discovery Call Logged // Sam Jenkins",
      description:
        dealState.notes ||
        "Sam uncovered primary risk: Black Friday concurrency crashes and duplicate debits. Addressed with atomic status isolation. Booked tomorrow's technical lock-in meeting.",
      timestamp: "Today at 10:14 AM",
      author: "You (Account Executive)",
      badge: dealState.bookedSlot ? "MEETING BOOKED" : "COMPLETED",
      badgeColor: "#22c55e",
    },
    {
      id: "t-2",
      type: "deck",
      title: "Tailored Pitch Deck Presented // Nordic Goods Committee",
      description:
        "Presented 5-slide deck to Sam Jenkins (VP Retail), Elena Rostova (VP Eng), and Marcus Vance (CFO). Benchmarks (120k TPS) and GMV fee comparison ($177k savings) validated.",
      timestamp: "Today at 11:30 AM",
      author: "You (Account Executive)",
      badge: "DECK REVIEWED",
      badgeColor: "#38bdf8",
    },
    {
      id: "t-3",
      type: "system",
      title: "Automated Churn Risk Alert Cleared",
      description: "Opportunity health score improved from 12 (Critical) to 94 (Safe) following SLA guarantee and technical demo confirmation.",
      timestamp: "Today at 11:45 AM",
      author: "Aura Salesforce CRM Bot",
      badge: "HEALTH RESTORED",
      badgeColor: "#22c55e",
    },
    {
      id: "t-4",
      type: "task",
      title: "Support Incident #4928 Linked to Deal",
      description: "Staging checkout race condition resolved via atomic pre-charge claim patch. Verified clean in unit & stress test suites.",
      timestamp: "Yesterday at 4:20 PM",
      author: "DevOps & SRE War Room",
      badge: "RESOLVED",
      badgeColor: "#94a3b8",
    },
  ]);

  const handleStageSelect = async (newStage: DealStageKey) => {
    updateDealState({ dealStage: newStage });
    if (newStage === "Closed Won") {
      setIsWon(true);
    }

    await onAction(`[CRM_STAGE_UPDATE] Opportunity advanced to stage: "${newStage}"`, {
      stage: newStage,
      netARR,
      opportunity: "Nordic Goods Enterprise Renewal",
    });

    setTimeline((prev) => [
      {
        id: `t-stage-${Date.now()}`,
        type: "system",
        title: `Opportunity Stage Updated -> ${newStage}`,
        description: `Stage milestone progressed by Account Executive with probability updated to ${
          stages.find((s) => s.key === newStage)?.probability
        }%.`,
        timestamp: "Just now",
        author: "You (Account Executive)",
        badge: "STAGE CHANGE",
        badgeColor: "#f59e0b",
      },
      ...prev,
    ]);
  };

  const handleSendFollowUpEmail = async () => {
    setIsSendingEmail(true);

    const nextStage =
      dealState.dealStage === "Discovery" || dealState.dealStage === "Needs Analysis"
        ? "Proposal / Quote"
        : dealState.dealStage === "Proposal / Quote"
        ? "Negotiation / Review"
        : dealState.dealStage;

    updateDealState({
      dealStage: nextStage,
      emailSent: true,
      calculatedDiscount: discountPct,
      contractTermYears,
      contractValue: netARR,
    });

    await onAction(`[CRM_EMAIL_SENT] Follow-up proposal quote email dispatched to ${emailTo}`, {
      recipient: emailTo,
      subject: emailSubject,
      netARR,
      stage: nextStage,
    });

    setTimeout(() => {
      setIsSendingEmail(false);
      setEmailSent(true);

      setTimeline((prev) => [
        {
          id: `t-email-${Date.now()}`,
          type: "email",
          title: `Follow-Up Proposal Email Sent to Sam Jenkins`,
          description: `Dispatched proposal quote to ${emailTo} with CC to buying committee. SLA guarantees and $${netARR.toLocaleString()} terms attached. Opportunity advanced to ${nextStage}.`,
          timestamp: "Just now",
          author: "You (Account Executive)",
          badge: "EMAIL DISPATCHED",
          badgeColor: "#38bdf8",
        },
        ...prev,
      ]);
    }, 700);
  };

  const handleSubmitFinalRenewal = async () => {
    setIsSubmittingProposal(true);

    updateDealState({
      dealStage: "Closed Won",
      contractValue: netARR,
      calculatedDiscount: discountPct,
      contractTermYears,
      proposalSubmitted: true,
      includeWarRoom,
      includeFailover,
    });

    try {
      await submitSalesRenewalAction(sessionId, {
        accountName: dealState.accountName,
        prospectName: dealState.prospectName,
        finalARR: netARR,
        tcv: totalContractValue,
        termYears: contractTermYears,
        discountPct,
        slaTier: includeFailover ? "Mission-Critical 99.999%" : "Enterprise High-Concurrency",
        bookedSlot: dealState.bookedSlot,
        objectionsCount: dealState.objectionsResolved.length,
      });
    } catch {
      // Fallback in demo/offline mode
    }

    await onAction(`[VICTORY] Sam Jenkins and Nordic Goods signed the $250k enterprise renewal proposal! Deal Closed-Won.`, {
      opportunity: "Nordic Goods - FY26 Enterprise Renewal",
      finalARR: netARR,
      tcv: totalContractValue,
      termYears: contractTermYears,
      discountPct,
      status: "Closed Won",
    });

    setTimeout(() => {
      setIsSubmittingProposal(false);
      setIsWon(true);

      setTimeline((prev) => [
        {
          id: `t-won-${Date.now()}`,
          type: "system",
          title: "🏆 CLOSED WON: Nordic Goods Enterprise Contract Signed!",
          description: `Contract executed at $${netARR.toLocaleString()} ARR for a ${contractTermYears}-Year commitment (TCV: $${totalContractValue.toLocaleString()}). Churn prevented ahead of Black Friday.`,
          timestamp: "Just now",
          author: "Salesforce Deal Desk System",
          badge: "CLOSED WON",
          badgeColor: "#22c55e",
        },
        ...prev,
      ]);

      // Complete scenario after 2.8s
      setTimeout(() => {
        onComplete();
      }, 2800);
    }, 800);
  };

  const currentStageIndex = stages.findIndex((s) => s.key === dealState.dealStage);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "grid",
        gridTemplateColumns: "300px 1fr 340px",
        background: "#060911",
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', -apple-system, monospace",
        overflow: "hidden",
      }}
    >
      {/* ──────────────── LEFT PANEL: Salesforce Opportunity Summary ──────────────── */}
      <div
        style={{
          borderRight: "1px solid #1e293b",
          background: "#0a0f1d",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 12,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#38bdf8", letterSpacing: "1.5px", fontWeight: 800 }}>
            [ SALESFORCE CRM // LIGHTNING ]
          </span>
          <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 800 }}>
            {isWon ? "🏆 CLOSED WON" : "PIPELINE ACTIVE"}
          </span>
        </div>

        {/* Opportunity Card */}
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            Nordic Goods — FY26 Renewal
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
            Account: Nordic Goods Inc. (Enterprise E-Commerce)
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11, borderTop: "1px solid #1e293b", paddingTop: 10 }}>
            <div>
              <span style={{ color: "#64748b", fontSize: 10 }}>Amount (ARR):</span>
              <div style={{ color: "#22c55e", fontWeight: 900, fontSize: 15 }}>
                ${netARR.toLocaleString()}
              </div>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: 10 }}>Close Date:</span>
              <div style={{ color: "#f59e0b", fontWeight: 700 }}>Nov 28 (Black Friday)</div>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: 10 }}>Owner:</span>
              <div style={{ color: "#cbd5e1" }}>You (Senior AE)</div>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: 10 }}>Probability:</span>
              <div style={{ color: "#38bdf8", fontWeight: 700 }}>
                {stages.find((s) => s.key === dealState.dealStage)?.probability}%
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { id: "dealdesk", label: "Deal Desk & Pricing Calculator", icon: "📊" },
            { id: "email", label: "Quote & Follow-Up Email", icon: "✉️" },
            { id: "timeline", label: "Activity Audit Timeline", icon: "🕒" },
            { id: "account", label: "Account & Committee Details", icon: "🏢" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  padding: "10px 12px",
                  background: isActive ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.02)",
                  border: isActive ? "1px solid #38bdf8" : "1px solid #1e293b",
                  borderRadius: 6,
                  color: isActive ? "#38bdf8" : "#94a3b8",
                  textAlign: "left",
                  fontSize: 11,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: isActive ? 800 : 500,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Sub-Env Links */}
        {onNavigateToSubEnv && (
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              onClick={() => onNavigateToSubEnv("call")}
              style={{
                padding: "8px 12px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid #1e293b",
                color: "#94a3b8",
                borderRadius: 4,
                fontSize: 10,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              ◀ RETURN TO 01 LIVE VOICE CALL
            </button>
            <button
              onClick={() => onNavigateToSubEnv("pitch")}
              style={{
                padding: "8px 12px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid #1e293b",
                color: "#94a3b8",
                borderRadius: 4,
                fontSize: 10,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              ◀ RETURN TO 02 PITCH DECK ROOM
            </button>
          </div>
        )}
      </div>

      {/* ──────────────── CENTER PANEL: Stage Stepper & Active Tab Workspace ──────────────── */}
      <div style={{ display: "flex", flexDirection: "column", background: "#05070f", position: "relative" }}>
        {/* Salesforce Lightning Chevron Stage Stepper */}
        <div
          style={{
            padding: "12px 18px",
            background: "#0a0f1d",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            overflowX: "auto",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 540 }}>
            {stages.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;

              return (
                <button
                  key={stage.key}
                  onClick={() => handleStageSelect(stage.key)}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    background: isCurrent
                      ? "rgba(245,158,11,0.2)"
                      : isPast
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(255,255,255,0.02)",
                    border: isCurrent
                      ? "1px solid #f59e0b"
                      : isPast
                      ? "1px solid #22c55e"
                      : "1px solid #1e293b",
                    borderRadius: 4,
                    color: isCurrent ? "#f59e0b" : isPast ? "#22c55e" : "#64748b",
                    fontSize: 10,
                    fontWeight: isCurrent ? 800 : 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{isPast ? "✓" : isCurrent ? "▶" : "○"}</span>
                  <span>{stage.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              const nextIdx = Math.min(stages.length - 1, currentStageIndex + 1);
              const nextStage = stages[nextIdx]?.key;
              if (nextStage) handleStageSelect(nextStage);
            }}
            style={{
              padding: "8px 14px",
              background: "rgba(34,197,94,0.15)",
              border: "1px solid #22c55e",
              color: "#22c55e",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            [ ADVANCE STAGE ▶ ]
          </button>
        </div>

        {/* Tab Content Body */}
        <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
          {/* TAB 1: DEAL DESK & DISCOUNT CALCULATOR */}
          {activeTab === "dealdesk" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
                    Deal Desk Approval Matrix & Discount Calculator
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    Configure renewal line items, term incentives, and verify Deal Desk approval compliance.
                  </div>
                </div>

                <div
                  style={{
                    padding: "6px 12px",
                    background:
                      discountPct <= 10
                        ? "rgba(34,197,94,0.15)"
                        : discountPct <= 20
                        ? "rgba(245,158,11,0.15)"
                        : "rgba(239,68,68,0.15)",
                    border:
                      discountPct <= 10
                        ? "1px solid #22c55e"
                        : discountPct <= 20
                        ? "1px solid #f59e0b"
                        : "1px solid #ef4444",
                    borderRadius: 4,
                    color: discountPct <= 10 ? "#22c55e" : discountPct <= 20 ? "#f59e0b" : "#ef4444",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {discountPct <= 10
                    ? "✓ AUTO-APPROVED (AE AUTHORITY)"
                    : discountPct <= 20
                    ? "⚠ VP SALES SIGN-OFF REQUIRED"
                    : "✕ CFO APPROVAL REQUIRED (>20%)"}
                </div>
              </div>

              {/* Line Items Table */}
              <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "#0a0f1d", borderBottom: "1px solid #334155", textAlign: "left" }}>
                      <th style={{ padding: "10px 14px", color: "#94a3b8" }}>Product / Module</th>
                      <th style={{ padding: "10px 14px", color: "#94a3b8" }}>Description</th>
                      <th style={{ padding: "10px 14px", color: "#94a3b8", textAlign: "right" }}>List Price</th>
                      <th style={{ padding: "10px 14px", color: "#94a3b8", textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "10px 14px", color: "#fff", fontWeight: 700 }}>Aura Core Platform</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>Base Enterprise Tier (Unlimited API calls, 99.99% uptime)</td>
                      <td style={{ padding: "10px 14px", color: "#22c55e", textAlign: "right", fontWeight: 700 }}>$180,000</td>
                      <td style={{ padding: "10px 14px", color: "#22c55e", textAlign: "center" }}>Included</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "10px 14px", color: "#fff", fontWeight: 700 }}>High-Concurrency Burst</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>120,000 TPS capacity for Black Friday midnight rush</td>
                      <td style={{ padding: "10px 14px", color: "#22c55e", textAlign: "right", fontWeight: 700 }}>$40,000</td>
                      <td style={{ padding: "10px 14px", color: "#22c55e", textAlign: "center" }}>Included</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "10px 14px", color: "#fff", fontWeight: 700 }}>Dedicated SRE War Room</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>Principal engineers on-call during Black Friday 48h</td>
                      <td style={{ padding: "10px 14px", color: includeWarRoom ? "#22c55e" : "#64748b", textAlign: "right", fontWeight: 700 }}>
                        $30,000
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={includeWarRoom}
                          onChange={(e) => setIncludeWarRoom(e.target.checked)}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 14px", color: "#fff", fontWeight: 700 }}>Active-Active Multi-Region</td>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1" }}>Instant failover between US-East and EU-Central clusters</td>
                      <td style={{ padding: "10px 14px", color: includeFailover ? "#22c55e" : "#64748b", textAlign: "right", fontWeight: 700 }}>
                        $25,000
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={includeFailover}
                          onChange={(e) => setIncludeFailover(e.target.checked)}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deal Controls & Discount Slider */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
                <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", marginBottom: 12 }}>
                    Contract Terms & Commercial Levers
                  </div>

                  {/* Commitment Term */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>CONTRACT DURATION:</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {[1, 2, 3].map((yr) => (
                        <button
                          key={yr}
                          onClick={() => {
                            setContractTermYears(yr);
                            updateDealState({ contractTermYears: yr });
                          }}
                          style={{
                            padding: "8px",
                            background: contractTermYears === yr ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.03)",
                            border: contractTermYears === yr ? "1px solid #22c55e" : "1px solid #1e293b",
                            color: contractTermYears === yr ? "#22c55e" : "#cbd5e1",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 11,
                            fontFamily: "inherit",
                            fontWeight: 700,
                          }}
                        >
                          {yr} Year{yr > 1 ? "s" : ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Discount Slider */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 6 }}>
                      <span style={{ color: "#94a3b8" }}>DISCOUNT PERCENTAGE:</span>
                      <span style={{ color: discountPct <= 10 ? "#22c55e" : "#f59e0b", fontWeight: 800 }}>
                        {discountPct}% (-${totalDiscountAmount.toLocaleString()})
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="1"
                      value={discountPct}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(25, Number(e.target.value) || 0));
                        setDiscountPct(val);
                        updateDealState({ calculatedDiscount: val });
                      }}
                      style={{ width: "100%", accentColor: discountPct <= 10 ? "#22c55e" : "#f59e0b" }}
                    />
                  </div>

                  {/* Payment Terms */}
                  <div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>PAYMENT FREQUENCY:</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button
                        onClick={() => setPaymentTerms("annual_prepay")}
                        style={{
                          padding: "8px",
                          background: paymentTerms === "annual_prepay" ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.03)",
                          border: paymentTerms === "annual_prepay" ? "1px solid #38bdf8" : "1px solid #1e293b",
                          color: paymentTerms === "annual_prepay" ? "#38bdf8" : "#cbd5e1",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 11,
                          fontFamily: "inherit",
                          fontWeight: 700,
                        }}
                      >
                        Annual Prepay
                      </button>
                      <button
                        onClick={() => setPaymentTerms("net_30")}
                        style={{
                          padding: "8px",
                          background: paymentTerms === "net_30" ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.03)",
                          border: paymentTerms === "net_30" ? "1px solid #38bdf8" : "1px solid #1e293b",
                          color: paymentTerms === "net_30" ? "#38bdf8" : "#cbd5e1",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 11,
                          fontFamily: "inherit",
                          fontWeight: 700,
                        }}
                      >
                        Net 30
                      </button>
                    </div>
                  </div>
                </div>

                {/* Final Quote Summary & Submit CTA */}
                <div style={{ background: "#0a0f1d", border: "1px solid #334155", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: "1px", fontWeight: 800, marginBottom: 8 }}>
                      [ FINAL PROPOSAL TOTALS ]
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                        <span>Gross Annual Base:</span>
                        <span>${grossARR.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#22c55e", fontWeight: 700 }}>
                        <span>Applied Discount ({discountPct}%):</span>
                        <span>-${totalDiscountAmount.toLocaleString()}</span>
                      </div>
                      <div style={{ borderTop: "1px solid #1e293b", paddingTop: 8, marginTop: 4 }}>
                        <div style={{ fontSize: 10, color: "#64748b" }}>NET ANNUAL CONTRACT VALUE (ARR):</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#22c55e" }}>
                          ${netARR.toLocaleString()} <span style={{ fontSize: 11, color: "#94a3b8" }}>/ Year</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#38bdf8", marginTop: 2 }}>
                          Total Contract Value (TCV): ${totalContractValue.toLocaleString()} ({contractTermYears} Yrs)
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitFinalRenewal}
                    disabled={isSubmittingProposal || isWon}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: isWon
                        ? "#15803d"
                        : "linear-gradient(135deg, #f59e0b, #d97706)",
                      border: "none",
                      borderRadius: 6,
                      color: "#000",
                      fontWeight: 900,
                      fontSize: 12,
                      cursor: isWon ? "default" : "pointer",
                      fontFamily: "inherit",
                      letterSpacing: "0.5px",
                      boxShadow: "0 0 16px rgba(245,158,11,0.35)",
                      marginTop: 14,
                    }}
                  >
                    {isSubmittingProposal
                      ? "SUBMITTING TO DEAL DESK..."
                      : isWon
                      ? "🏆 PROPOSAL SIGNED (CLOSED WON)"
                      : "SUBMIT FINAL RENEWAL PROPOSAL ▶"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QUOTE & FOLLOW-UP EMAIL COMPOSER */}
          {activeTab === "email" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
                    Executive Quote & Follow-Up Email Composer
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    Salesforce Lightning Mailer // TLS 1.3 Certified Delivery
                  </div>
                </div>

                {emailSent && (
                  <span style={{ fontSize: 10, color: "#22c55e", background: "rgba(34,197,94,0.15)", padding: "4px 8px", borderRadius: 4, fontWeight: 800 }}>
                    ✓ DISPATCHED TO BUYING COMMITTEE
                  </span>
                )}
              </div>

              {/* Email Form */}
              <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>To:</span>
                  <input
                    type="text"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    style={{ background: "#060a14", border: "1px solid #1e293b", borderRadius: 4, padding: "6px 10px", color: "#fff", fontSize: 11, fontFamily: "inherit" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>CC:</span>
                  <input
                    type="text"
                    value={emailCc}
                    onChange={(e) => setEmailCc(e.target.value)}
                    style={{ background: "#060a14", border: "1px solid #1e293b", borderRadius: 4, padding: "6px 10px", color: "#fff", fontSize: 11, fontFamily: "inherit" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Subject:</span>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    style={{ background: "#060a14", border: "1px solid #1e293b", borderRadius: 4, padding: "6px 10px", color: "#fff", fontSize: 11, fontFamily: "inherit" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>Proposal Body:</span>
                  <textarea
                    rows={12}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    style={{
                      background: "#060a14",
                      border: "1px solid #1e293b",
                      borderRadius: 6,
                      padding: 12,
                      color: "#f8fafc",
                      fontSize: 11,
                      lineHeight: 1.6,
                      fontFamily: "inherit",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>
                    Attachment: 📎 <span style={{ color: "#38bdf8" }}>Nordic_Goods_Renewal_Proposal_v2.pdf ($${netARR.toLocaleString()})</span>
                  </div>
                  <button
                    onClick={handleSendFollowUpEmail}
                    disabled={isSendingEmail}
                    style={{
                      padding: "10px 18px",
                      background: "rgba(56,189,248,0.2)",
                      border: "1px solid #38bdf8",
                      color: "#38bdf8",
                      borderRadius: 4,
                      fontWeight: 800,
                      cursor: "pointer",
                      fontSize: 11,
                      fontFamily: "inherit",
                    }}
                  >
                    {isSendingEmail ? "SENDING EMAIL..." : "SEND FORMAL QUOTE EMAIL ▶"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY TIMELINE AUDIT TRAIL */}
          {activeTab === "timeline" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
                Customer Activity Audit Feed
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {timeline.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{item.title}</span>
                        {item.badge && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              color: item.badgeColor || "#22c55e",
                              background: `${item.badgeColor || "#22c55e"}18`,
                              padding: "2px 6px",
                              borderRadius: 3,
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 10, color: "#64748b" }}>{item.timestamp}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.5 }}>{item.description}</div>
                    <div style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>Logged by: {item.author}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ACCOUNT DETAILS & BUYING COMMITTEE */}
          {activeTab === "account" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
                Account Dossier & Buying Committee Matrix
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", marginBottom: 10 }}>
                    Account Profile
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Company:</span>
                      <span style={{ color: "#fff" }}>Nordic Goods Inc.</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Industry:</span>
                      <span style={{ color: "#cbd5e1" }}>Retail & E-Commerce</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Projected GMV:</span>
                      <span style={{ color: "#22c55e", fontWeight: 700 }}>$14.2M Black Friday</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Contract Baseline:</span>
                      <span style={{ color: "#f59e0b", fontWeight: 700 }}>$250,000 ARR</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", marginBottom: 10 }}>
                    Buying Committee Alignment
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 700 }}>Sam Jenkins (VP Retail)</div>
                      <div style={{ color: "#94a3b8", fontSize: 10 }}>Economic Decision Maker — Reassured on uptime & meeting scheduled.</div>
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 700 }}>Elena Rostova (VP Engineering)</div>
                      <div style={{ color: "#94a3b8", fontSize: 10 }}>Technical Blocker — Validated atomic locking & 120k TPS synthetic load.</div>
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 700 }}>Marcus Vance (CFO)</div>
                      <div style={{ color: "#94a3b8", fontSize: 10 }}>Budget Gatekeeper — Approved 2-Year $247k proposal vs CommerceCloud tax.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Victory Celebration Banner */}
        <AnimatePresence>
          {isWon && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                right: 20,
                background: "rgba(34,197,94,0.95)",
                color: "#000",
                borderRadius: 8,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 10px 40px rgba(34,197,94,0.5)",
                zIndex: 100,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>🎉 CONTRACT RENEWAL SECURED // $250,000 ARR SAVED!</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                  Sam Jenkins and Nordic Goods successfully executed their multi-year renewal agreement. Routing to final talent evaluation metrics...
                </div>
              </div>
              <button
                onClick={onComplete}
                style={{
                  padding: "8px 16px",
                  background: "#000",
                  color: "#22c55e",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 900,
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                VIEW RESULTS ▶
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ──────────────── RIGHT PANEL: 3D Observer & Deal Desk Telemetry ──────────────── */}
      <div
        style={{
          borderLeft: "1px solid #1e293b",
          background: "#0a0f1d",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 14,
          overflowY: "auto",
        }}
      >
        {/* 3D Observer Core in Sales Mode */}
        <div
          style={{
            background: "#050811",
            border: "1px solid #334155",
            borderRadius: 8,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(245,158,11,0.1)",
              borderBottom: "1px solid rgba(245,158,11,0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 800, letterSpacing: "1px" }}>
              [ 3D OBSERVER CORE // CRM ]
            </span>
            <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 700 }}>● VERIFIED</span>
          </div>

          <div style={{ height: 160, position: "relative" }}>
            <AvatarScene analyserNode={analyserNode || null} domain="sales" />
          </div>

          <div style={{ padding: 10, background: "#0a0e1a", borderTop: "1px solid #1e293b", fontSize: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#64748b" }}>CRM Hygiene Score:</span>
              <span style={{ color: "#22c55e", fontWeight: 800 }}>100% (Flawless)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#64748b" }}>Deal Desk Compliance:</span>
              <span style={{ color: discountPct <= 10 ? "#22c55e" : "#f59e0b", fontWeight: 800 }}>
                {discountPct <= 10 ? "100% Standard" : "VP Approved"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Pipeline Velocity:</span>
              <span style={{ color: "#38bdf8", fontWeight: 800 }}>+42% Accelerated</span>
            </div>
          </div>
        </div>

        {/* Deal Desk Compliance Checklist */}
        <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 800, letterSpacing: "1px", marginBottom: 8 }}>
            [ DEAL DESK AUDIT CHECKLIST ]
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#22c55e" }}>
              <span>✓</span>
              <span>Account Churn Risk Mitigated</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: dealState.bookedSlot ? "#22c55e" : "#64748b" }}>
              <span>{dealState.bookedSlot ? "✓" : "○"}</span>
              <span>Technical Demo Completed</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: emailSent ? "#22c55e" : "#64748b" }}>
              <span>{emailSent ? "✓" : "○"}</span>
              <span>Follow-Up Quote Email Dispatched</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: isWon ? "#22c55e" : "#64748b" }}>
              <span>{isWon ? "✓" : "○"}</span>
              <span>Proposal Signed & Stage Closed Won</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
