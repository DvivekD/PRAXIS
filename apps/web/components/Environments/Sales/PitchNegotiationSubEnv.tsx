"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import type { SalesDealState } from "./LiveSalesCallSubEnv";

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

export interface PitchNegotiationSubEnvProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, unknown>) => Promise<unknown>;
  onComplete: () => void;
  demoMode: boolean;
  analyserNode?: AnalyserNode | null;
  dealState: SalesDealState;
  updateDealState: (partial: Partial<SalesDealState>) => void;
  onNavigateToSubEnv?: (subEnv: "call" | "pitch" | "crm") => void;
}

export default function PitchNegotiationSubEnv({
  sessionId,
  onAction,
  demoMode,
  analyserNode,
  dealState,
  updateDealState,
  onNavigateToSubEnv,
}: PitchNegotiationSubEnvProps) {
  const [currentSlide, setCurrentSlide] = useState(dealState.currentSlide ?? 0);
  const [isSpeakingFeedback, setIsSpeakingFeedback] = useState(false);
  const [prospectReaction, setProspectReaction] = useState<string | null>(dealState.prospectReaction ?? null);

  // Deck Customization State
  const [includeFailover, setIncludeFailover] = useState(
    dealState.includeFailover ?? (dealState.slaTier === "Mission-Critical 99.999%")
  );
  const [includeSreWarRoom, setIncludeSreWarRoom] = useState(dealState.includeWarRoom ?? true);
  const [selectedTermYears, setSelectedTermYears] = useState<number>(dealState.contractTermYears || 2);
  const [paymentTerms, setPaymentTerms] = useState<"annual_prepay" | "net_30">(dealState.paymentTerms || "annual_prepay");
  const [highlightedCompetitor, setHighlightedCompetitor] = useState<"commercecloud" | "shopify">("commercecloud");
  const [customDiscountPct, setCustomDiscountPct] = useState<number>(dealState.calculatedDiscount || 8);

  // Stakeholder Buy-in Scores
  const [buyInSam, setBuyInSam] = useState(dealState.buyIns?.sam ?? 72);
  const [buyInElena, setBuyInElena] = useState(dealState.buyIns?.elena ?? 65);
  const [buyInMarcus, setBuyInMarcus] = useState(dealState.buyIns?.marcus ?? 58);

  // Pricing Calculation
  const baseLicense = 180000;
  const burstCapacity = 40000;
  const sreWarRoomFee = includeSreWarRoom ? 30000 : 0;
  const failoverFee = includeFailover ? 25000 : 0;

  const grossContract = baseLicense + burstCapacity + sreWarRoomFee + failoverFee;
  const termDiscountPct = selectedTermYears === 3 ? 15 : selectedTermYears === 2 ? 8 : 0;
  const prepayDiscountPct = paymentTerms === "annual_prepay" ? 5 : 0;
  const totalEffectiveDiscount = Math.min(25, termDiscountPct + prepayDiscountPct + (customDiscountPct > termDiscountPct ? customDiscountPct - termDiscountPct : 0));

  const totalDiscountAmount = Math.round((grossContract * totalEffectiveDiscount) / 100);
  const netProposalARR = grossContract - totalDiscountAmount;
  const totalContractValue = netProposalARR * selectedTermYears;

  const handleSelectSlide = (idx: number) => {
    setCurrentSlide(idx);
    updateDealState({ currentSlide: idx });
  };

  const slides = [
    {
      id: "exec-summary",
      number: "01",
      title: "Executive Summary & Nordic Goods Renewal",
      subtitle: "Protecting $14.2M Black Friday GMV with Zero-Downtime Architecture",
      type: "summary",
    },
    {
      id: "architecture-proof",
      number: "02",
      title: "Root Cause Resolution: Atomic Concurrency",
      subtitle: "Eliminating checkout race conditions with pre-charge atomic reservations",
      type: "architecture",
    },
    {
      id: "competitor-matrix",
      number: "03",
      title: "Competitor Comparison: Aura vs CommerceCloud",
      subtitle: "Why migrating to CommerceCloud costs $175k in extra take rates",
      type: "competitor",
    },
    {
      id: "pricing-proposal",
      number: "04",
      title: "Tailored Renewal Pricing & ROI Proposal",
      subtitle: "Custom commercial packaging with guaranteed uptime penalty credits",
      type: "pricing",
    },
    {
      id: "action-plan",
      number: "05",
      title: "Mutual Action Plan (MAP) to Black Friday",
      subtitle: "Timeline of load tests, DNS pre-warming, and executive sign-off",
      type: "plan",
    },
  ];

  // Speech synthesis for Sam's slide reaction
  const triggerSlideFeedback = useCallback(
    async (reactionText: string, updatedBuyIns: { sam: number; elena: number; marcus: number }) => {
      setProspectReaction(reactionText);
      setIsSpeakingFeedback(true);
      setBuyInSam(updatedBuyIns.sam);
      setBuyInElena(updatedBuyIns.elena);
      setBuyInMarcus(updatedBuyIns.marcus);

      updateDealState({
        currentSlide,
        buyIns: updatedBuyIns,
        prospectReaction: reactionText,
      });

      await onAction(`[PITCH_PRESENTATION] Slide ${currentSlide + 1} presented to Buying Committee`, {
        slide: slides[currentSlide]?.title,
        reaction: reactionText,
        proposalARR: netProposalARR,
      });

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(reactionText);
          utterance.rate = 1.05;
          utterance.pitch = 0.94;
          utterance.onend = () => setIsSpeakingFeedback(false);
          utterance.onerror = () => setIsSpeakingFeedback(false);
          window.speechSynthesis.speak(utterance);
        } catch {
          setIsSpeakingFeedback(false);
        }
      } else {
        setTimeout(() => setIsSpeakingFeedback(false), 2400);
      }
    },
    [currentSlide, netProposalARR, onAction, slides, updateDealState]
  );

  const handlePresentCurrentSlide = () => {
    switch (currentSlide) {
      case 0:
        triggerSlideFeedback(
          "Sam Jenkins: 'Good framing on the $14M GMV at risk. Marcus, our CFO, will appreciate that you understand the revenue implications.'",
          { sam: 78, elena: 68, marcus: 70 }
        );
        break;
      case 1:
        triggerSlideFeedback(
          "Elena Rostova (VP Eng): 'Moving the atomic status claim before card dispatch solves the race condition we observed in staging. This satisfies our architecture gate.'",
          { sam: 82, elena: 88, marcus: 72 }
        );
        break;
      case 2:
        triggerSlideFeedback(
          "Sam Jenkins: 'CommerceCloud's 1.25% take rate would cost us $175,000 on Black Friday alone. That completely negates any discount they offered us.'",
          { sam: 90, elena: 90, marcus: 85 }
        );
        break;
      case 3:
        triggerSlideFeedback(
          "Marcus Vance (CFO): 'A 2-year commitment at $247k net ARR with the SRE War Room included fits inside our FY26 operating budget. We are ready to review the formal contract.'",
          { sam: 94, elena: 92, marcus: 90 }
        );
        break;
      case 4:
      default:
        triggerSlideFeedback(
          "Sam Jenkins: 'The Mutual Action Plan gives us complete peace of mind. Let's push this directly into the CRM Deal Desk for final sign-off.'",
          { sam: 96, elena: 95, marcus: 94 }
        );
        break;
    }
  };

  const handleExportProposalToCRM = async () => {
    updateDealState({
      contractValue: netProposalARR,
      calculatedDiscount: totalEffectiveDiscount,
      contractTermYears: selectedTermYears,
      slaTier: includeFailover ? "Mission-Critical 99.999%" : "Enterprise High-Concurrency",
      includeWarRoom: includeSreWarRoom,
      includeFailover,
      paymentTerms,
      currentSlide,
      buyIns: { sam: buyInSam, elena: buyInElena, marcus: buyInMarcus },
      prospectReaction,
      dealStage: "Proposal / Quote",
    });

    await onAction(`[PITCH_PROPOSAL_EXPORTED] Tailored proposal created: $${netProposalARR.toLocaleString()} ARR (${selectedTermYears}-Yr Term, ${totalEffectiveDiscount}% discount)`, {
      netARR: netProposalARR,
      termYears: selectedTermYears,
      discountPct: totalEffectiveDiscount,
      tcv: totalContractValue,
    });

    if (onNavigateToSubEnv) {
      onNavigateToSubEnv("crm");
    }
  };

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "grid",
        gridTemplateColumns: "280px 1fr 340px",
        background: "#060911",
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', -apple-system, monospace",
        overflow: "hidden",
      }}
    >
      {/* ──────────────── LEFT PANEL: Slide Navigator & Deck Outline ──────────────── */}
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
            [ PITCH DECK // 5 SLIDES ]
          </span>
          <span style={{ fontSize: 9, color: "#94a3b8" }}>v2.4 READY</span>
        </div>

        {/* Slide Carousel Thumbnails */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {slides.map((slide, idx) => {
            const isActive = currentSlide === idx;
            return (
              <button
                key={slide.id}
                onClick={() => handleSelectSlide(idx)}
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
                  gap: 10,
                  alignItems: "flex-start",
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? "0 0 14px rgba(56,189,248,0.2)" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: isActive ? "#38bdf8" : "#64748b",
                    minWidth: 20,
                  }}
                >
                  {slide.number}
                </span>
                <div>
                  <div style={{ fontWeight: 800, color: isActive ? "#fff" : "#cbd5e1", fontSize: 11 }}>
                    {slide.title}
                  </div>
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{slide.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stakeholder Buy-In Radar Meter */}
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 800, marginBottom: 8, letterSpacing: "1px" }}>
            [ BUYING COMMITTEE SENTIMENT ]
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ color: "#cbd5e1" }}>Sam Jenkins (VP Retail):</span>
                <span style={{ color: "#22c55e", fontWeight: 800 }}>{buyInSam}% Buy-in</span>
              </div>
              <div style={{ height: 4, background: "#1e293b", borderRadius: 2 }}>
                <div style={{ width: `${buyInSam}%`, height: "100%", background: "#22c55e", borderRadius: 2 }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ color: "#cbd5e1" }}>Elena Rostova (VP Eng):</span>
                <span style={{ color: buyInElena >= 80 ? "#22c55e" : "#38bdf8", fontWeight: 800 }}>{buyInElena}% Buy-in</span>
              </div>
              <div style={{ height: 4, background: "#1e293b", borderRadius: 2 }}>
                <div style={{ width: `${buyInElena}%`, height: "100%", background: buyInElena >= 80 ? "#22c55e" : "#38bdf8", borderRadius: 2 }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ color: "#cbd5e1" }}>Marcus Vance (CFO):</span>
                <span style={{ color: buyInMarcus >= 80 ? "#22c55e" : "#f59e0b", fontWeight: 800 }}>{buyInMarcus}% Buy-in</span>
              </div>
              <div style={{ height: 4, background: "#1e293b", borderRadius: 2 }}>
                <div style={{ width: `${buyInMarcus}%`, height: "100%", background: buyInMarcus >= 80 ? "#22c55e" : "#f59e0b", borderRadius: 2 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Export to CRM CTA */}
        <button
          onClick={handleExportProposalToCRM}
          style={{
            padding: "12px 14px",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            border: "none",
            borderRadius: 6,
            color: "#000",
            fontWeight: 900,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 0 16px rgba(34,197,94,0.3)",
          }}
        >
          <span>[ 03 — PUSH PROPOSAL TO CRM ]</span>
          <span>▶</span>
        </button>
      </div>

      {/* ──────────────── CENTER PANEL: Interactive Slide Canvas ──────────────── */}
      <div style={{ display: "flex", flexDirection: "column", background: "#05070f", position: "relative" }}>
        {/* Slide Canvas Header */}
        <div
          style={{
            padding: "12px 20px",
            background: "#0a0f1d",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 800 }}>
              SLIDE {slides[currentSlide]?.number} / 05
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
              {slides[currentSlide]?.title}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => handleSelectSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
              style={{
                padding: "6px 12px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid #334155",
                color: currentSlide === 0 ? "#475569" : "#cbd5e1",
                borderRadius: 4,
                cursor: currentSlide === 0 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontSize: 11,
              }}
            >
              ◀ PREV
            </button>
            <button
              onClick={() => handleSelectSlide(Math.min(slides.length - 1, currentSlide + 1))}
              disabled={currentSlide === slides.length - 1}
              style={{
                padding: "6px 12px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid #334155",
                color: currentSlide === slides.length - 1 ? "#475569" : "#cbd5e1",
                borderRadius: 4,
                cursor: currentSlide === slides.length - 1 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontSize: 11,
              }}
            >
              NEXT ▶
            </button>
            <button
              onClick={handlePresentCurrentSlide}
              style={{
                padding: "6px 14px",
                background: "rgba(245,158,11,0.2)",
                border: "1px solid #f59e0b",
                color: "#f59e0b",
                borderRadius: 4,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 11,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 0 10px rgba(245,158,11,0.25)",
              }}
            >
              <span>🎙</span>
              <span>[ PRESENT SLIDE TO SAM ]</span>
            </button>
          </div>
        </div>

        {/* Slide Canvas Content Area */}
        <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {/* SLIDE 1: Executive Summary */}
          {currentSlide === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(56,189,248,0.05))",
                  border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: 10,
                  padding: 20,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 6 }}>
                  Aura Commerce × Nordic Goods Enterprise Partnership
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                  Securing Nordic Goods&apos; critical Black Friday flash sales event ($14.2M projected GMV) with guaranteed sub-15ms checkout performance, zero duplicate charge guarantees, and dedicated SRE war-room protection.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 10, color: "#64748b" }}>PROJECTED GMV</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#22c55e", margin: "6px 0" }}>$14,200,000</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>Black Friday 48-hr window</div>
                </div>
                <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 10, color: "#64748b" }}>TARGET CONCURRENT TRAFFIC</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#38bdf8", margin: "6px 0" }}>75,000 Users</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>Peak checkout rush at 00:00 UTC</div>
                </div>
                <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 10, color: "#64748b" }}>REVENUE PROTECTION COMMITMENT</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#f59e0b", margin: "6px 0" }}>99.99% SLA</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>Guaranteed uptime penalty credit</div>
                </div>
              </div>

              <div style={{ background: "#0b1120", border: "1px solid #1e293b", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                  Key Executive Stakeholder Priorities
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 11 }}>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 10, borderRadius: 6, border: "1px solid #1e293b" }}>
                    <div style={{ color: "#f59e0b", fontWeight: 700 }}>Sam Jenkins (VP Retail)</div>
                    <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 4 }}>Brand reputation, zero customer friction, high checkout conversion.</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 10, borderRadius: 6, border: "1px solid #1e293b" }}>
                    <div style={{ color: "#38bdf8", fontWeight: 700 }}>Elena Rostova (VP Eng)</div>
                    <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 4 }}>Atomic locking idempotency, distributed race condition fixes, sub-15ms P99.</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: 10, borderRadius: 6, border: "1px solid #1e293b" }}>
                    <div style={{ color: "#22c55e", fontWeight: 700 }}>Marcus Vance (CFO)</div>
                    <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 4 }}>Elimination of CommerceCloud&apos;s 1.25% GMV tax, predictable annual SaaS pricing.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: Root Cause Resolution */}
          {currentSlide === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Buggy Workflow */}
                <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: 16 }}>
                  <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>✕</span>
                    <span>BEFORE: Staging Drill Concurrency Glitch</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 12 }}>
                    Concurrent requests fired at the checkout API hit the payment gateway before the idempotency status flag was written to the database.
                  </div>
                  <div style={{ background: "#05070e", padding: 10, borderRadius: 6, fontSize: 10, color: "#fca5a5", fontFamily: "inherit" }}>
                    1. Request A & B hit gateway simultaneously<br />
                    2. Both charged customer card ($250 × 2)<br />
                    3. Guard executed AFTER charge, causing duplicate debits
                  </div>
                </div>

                {/* Fixed Workflow */}
                <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: 16 }}>
                  <div style={{ color: "#22c55e", fontWeight: 800, fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>✓</span>
                    <span>AFTER: Aura Atomic Pre-Charge Reservation</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 12 }}>
                    Order status is atomically transitioned to &apos;PROCESSING&apos; with a distributed row lock prior to gateway charge dispatch.
                  </div>
                  <div style={{ background: "#05070e", padding: 10, borderRadius: 6, fontSize: 10, color: "#86efac", fontFamily: "inherit" }}>
                    1. Atomic claim locks order row (sub-2ms)<br />
                    2. Concurrent request B rejected instantly with 409 Conflict<br />
                    3. Gateway charged exactly once: 100% duplicate immunity
                  </div>
                </div>
              </div>

              {/* Benchmark Metrics Table */}
              <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", marginBottom: 10 }}>
                  Aura Synthetic Stress Test Results (100,000 Concurrent Simulated Shoppers)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, textAlign: "center" }}>
                  <div style={{ background: "#060a14", padding: 10, borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Peak Throughput</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#22c55e", marginTop: 4 }}>124,500 TPS</div>
                  </div>
                  <div style={{ background: "#060a14", padding: 10, borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>P99 Latency</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#38bdf8", marginTop: 4 }}>13.2 ms</div>
                  </div>
                  <div style={{ background: "#060a14", padding: 10, borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Duplicate Charges</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#22c55e", marginTop: 4 }}>0 (Zero)</div>
                  </div>
                  <div style={{ background: "#060a14", padding: 10, borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Checkout Success Rate</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#f59e0b", marginTop: 4 }}>99.994%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: Competitor Comparison */}
          {currentSlide === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
                <button
                  onClick={() => setHighlightedCompetitor("commercecloud")}
                  style={{
                    padding: "6px 12px",
                    background: highlightedCompetitor === "commercecloud" ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.02)",
                    border: highlightedCompetitor === "commercecloud" ? "1px solid #f59e0b" : "1px solid #1e293b",
                    color: highlightedCompetitor === "commercecloud" ? "#f59e0b" : "#94a3b8",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Focus: CommerceCloud Battlecard
                </button>
                <button
                  onClick={() => setHighlightedCompetitor("shopify")}
                  style={{
                    padding: "6px 12px",
                    background: highlightedCompetitor === "shopify" ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.02)",
                    border: highlightedCompetitor === "shopify" ? "1px solid #38bdf8" : "1px solid #1e293b",
                    color: highlightedCompetitor === "shopify" ? "#38bdf8" : "#94a3b8",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Focus: Shopify Plus Battlecard
                </button>
              </div>

              {/* Competitive Matrix Table */}
              <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "#0a0f1d", borderBottom: "1px solid #334155", textAlign: "left" }}>
                      <th style={{ padding: "12px 14px", color: "#94a3b8" }}>Architecture & Commercial Metric</th>
                      <th style={{ padding: "12px 14px", color: "#22c55e", background: "rgba(34,197,94,0.08)" }}>Aura Commerce (Enterprise)</th>
                      <th style={{ padding: "12px 14px", color: "#f59e0b" }}>CommerceCloud</th>
                      <th style={{ padding: "12px 14px", color: "#38bdf8" }}>Shopify Plus</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1", fontWeight: 700 }}>Peak TPS Capacity</td>
                      <td style={{ padding: "10px 14px", color: "#22c55e", fontWeight: 800, background: "rgba(34,197,94,0.04)" }}>120,000 TPS</td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>35,000 TPS (Throttled)</td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>40,000 TPS</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1", fontWeight: 700 }}>GMV Revenue Take Rate</td>
                      <td style={{ padding: "10px 14px", color: "#22c55e", fontWeight: 800, background: "rgba(34,197,94,0.04)" }}>0.0% ($0 Fee)</td>
                      <td style={{ padding: "10px 14px", color: "#ef4444", fontWeight: 700 }}>1.25% ($177,500 on $14.2M)</td>
                      <td style={{ padding: "10px 14px", color: "#f59e0b" }}>0.15% ($21,300)</td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1", fontWeight: 700 }}>Concurrency Idempotency</td>
                      <td style={{ padding: "10px 14px", color: "#22c55e", fontWeight: 800, background: "rgba(34,197,94,0.04)" }}>Native Atomic Pre-Claim</td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>Plugin / Third-party Redis</td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>Webhook Reconciliation</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "10px 14px", color: "#cbd5e1", fontWeight: 700 }}>Dedicated SRE War Room</td>
                      <td style={{ padding: "10px 14px", color: "#22c55e", fontWeight: 800, background: "rgba(34,197,94,0.04)" }}>Included (Principal Eng)</td>
                      <td style={{ padding: "10px 14px", color: "#ef4444" }}>+$50,000 Add-on</td>
                      <td style={{ padding: "10px 14px", color: "#94a3b8" }}>Standard Support Desk</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Executive Takeaway */}
              <div
                style={{
                  background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: 6,
                  padding: 12,
                  fontSize: 11,
                  color: "#cbd5e1",
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: "#f59e0b" }}>Killer Value Point for CFO Marcus:</strong> By staying with Aura Commerce, Nordic Goods avoids CommerceCloud&apos;s $177,500 GMV take rate, effectively subsidizing 72% of this annual contract renewal.
              </div>
            </div>
          )}

          {/* SLIDE 4: Interactive Pricing Proposal */}
          {currentSlide === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
                {/* Configuration Controls */}
                <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", marginBottom: 12 }}>
                    Renewal Package Customizer
                  </div>

                  {/* Add-on toggles */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={includeSreWarRoom}
                        onChange={(e) => setIncludeSreWarRoom(e.target.checked)}
                      />
                      <span>Dedicated 24/7 SRE Black Friday War Room (+$30,000 value)</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={includeFailover}
                        onChange={(e) => setIncludeFailover(e.target.checked)}
                      />
                      <span>Active-Active Multi-Region Instant Failover (+$25,000 value)</span>
                    </label>
                  </div>

                  {/* Contract Term Selector */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>CONTRACT COMMITMENT TERM:</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {[
                        { years: 1, disc: "0% Disc" },
                        { years: 2, disc: "8% Disc" },
                        { years: 3, disc: "15% Disc" },
                      ].map((item) => (
                        <button
                          key={item.years}
                          onClick={() => {
                            setSelectedTermYears(item.years);
                            setCustomDiscountPct(item.years === 3 ? 15 : item.years === 2 ? 8 : 0);
                          }}
                          style={{
                            padding: "8px 10px",
                            background: selectedTermYears === item.years ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.03)",
                            border: selectedTermYears === item.years ? "1px solid #22c55e" : "1px solid #1e293b",
                            color: selectedTermYears === item.years ? "#22c55e" : "#cbd5e1",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 11,
                            fontFamily: "inherit",
                            fontWeight: 700,
                          }}
                        >
                          <div>{item.years} Year{item.years > 1 ? "s" : ""}</div>
                          <div style={{ fontSize: 9, color: "#94a3b8" }}>{item.disc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Terms */}
                  <div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>PAYMENT TERMS:</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button
                        onClick={() => setPaymentTerms("annual_prepay")}
                        style={{
                          padding: "8px 10px",
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
                        Annual Prepay (+5% Disc)
                      </button>
                      <button
                        onClick={() => setPaymentTerms("net_30")}
                        style={{
                          padding: "8px 10px",
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
                        Standard Net 30
                      </button>
                    </div>
                  </div>
                </div>

                {/* Proposal Summary Card */}
                <div style={{ background: "#0a0f1d", border: "1px solid #334155", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: "1px", fontWeight: 800, marginBottom: 10 }}>
                      [ PROPOSAL CALCULATION SUMMARY ]
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
                        <span>Enterprise Core Platform:</span>
                        <span>$180,000</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
                        <span>High-Concurrency Burst (120k TPS):</span>
                        <span>$40,000</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
                        <span>SRE Black Friday War Room:</span>
                        <span>${sreWarRoomFee.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
                        <span>Active-Active Multi-Region Failover:</span>
                        <span>${failoverFee.toLocaleString()}</span>
                      </div>
                      <div style={{ borderTop: "1px solid #1e293b", paddingTop: 6, display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                        <span>Gross Annual Baseline:</span>
                        <span>${grossContract.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#22c55e", fontWeight: 700 }}>
                        <span>Blended Incentive Discount ({totalEffectiveDiscount}%):</span>
                        <span>-${totalDiscountAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #334155", paddingTop: 12, marginTop: 12 }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>NET ANNUAL CONTRACT VALUE (ARR):</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#22c55e" }}>
                      ${netProposalARR.toLocaleString()} <span style={{ fontSize: 12, color: "#94a3b8" }}>/ Year</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 4 }}>
                      Total Contract Value (TCV): ${totalContractValue.toLocaleString()} ({selectedTermYears} Yrs)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 5: Mutual Action Plan */}
          {currentSlide === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 12 }}>
                  Nordic Goods × Aura Commerce: Timeline to Black Friday Success
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    {
                      day: "T - 4 Days (Tomorrow)",
                      title: "Technical Lock-in & Synthetic Staging Load Test",
                      desc: "Simulate 120,000 concurrent checkout spikes with Elena Rostova's engineering team.",
                      status: "Scheduled",
                    },
                    {
                      day: "T - 3 Days",
                      title: "Deal Desk Contract Execution & Provisioning",
                      desc: "Execute $250k enterprise renewal agreement and pre-provision edge caching capacity.",
                      status: "Pending Signature",
                    },
                    {
                      day: "T - 1 Day",
                      title: "DNS Pre-Warming & Active-Active Failover Test",
                      desc: "Verify sub-15ms multi-region latency across US-East and EU-Central clusters.",
                      status: "Ready",
                    },
                    {
                      day: "T - 0 (Black Friday)",
                      title: "24/7 Dedicated SRE War Room Live Monitoring",
                      desc: "Aura principal engineers embedded with Nordic Goods retail ops team.",
                      status: "Guaranteed SLA",
                    },
                  ].map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: 12,
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid #1e293b",
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ minWidth: 120, color: "#f59e0b", fontWeight: 800, fontSize: 11 }}>
                        {step.day}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, color: "#fff", fontSize: 12 }}>{step.title}</div>
                        <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 2 }}>{step.desc}</div>
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#22c55e",
                          background: "rgba(34,197,94,0.1)",
                          padding: "3px 8px",
                          borderRadius: 4,
                          border: "1px solid rgba(34,197,94,0.3)",
                        }}
                      >
                        {step.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Real-time Prospect Feedback Balloon */}
          <AnimatePresence>
            {prospectReaction && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  background: isSpeakingFeedback ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.12)",
                  border: isSpeakingFeedback ? "1px solid #f59e0b" : "1px solid #22c55e",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 0 16px rgba(0,0,0,0.5)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 18 }}>{isSpeakingFeedback ? "🎙" : "💬"}</span>
                  <div>
                    <div style={{ fontSize: 10, color: isSpeakingFeedback ? "#f59e0b" : "#22c55e", fontWeight: 800 }}>
                      LIVE COMMITTEE FEEDBACK
                    </div>
                    <div style={{ fontSize: 12, color: "#fff", marginTop: 2 }}>{prospectReaction}</div>
                  </div>
                </div>

                {isSpeakingFeedback && (
                  <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>AUDIO ACTIVE...</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ──────────────── RIGHT PANEL: 3D Observer & Negotiation HUD ──────────────── */}
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
              [ 3D OBSERVER CORE // NEGOTIATION ]
            </span>
            <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 700 }}>● ANALYZING</span>
          </div>

          <div style={{ height: 160, position: "relative" }}>
            <AvatarScene analyserNode={analyserNode || null} domain="sales" />
          </div>

          <div style={{ padding: 10, background: "#0a0e1a", borderTop: "1px solid #1e293b", fontSize: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#64748b" }}>Negotiation Leverage:</span>
              <span style={{ color: "#22c55e", fontWeight: 800 }}>86% (Strong Defense)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "#64748b" }}>Value Positioning:</span>
              <span style={{ color: "#38bdf8", fontWeight: 800 }}>94% ROI Clarity</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Discount Discipline:</span>
              <span style={{ color: totalEffectiveDiscount <= 15 ? "#22c55e" : "#f59e0b", fontWeight: 800 }}>
                {totalEffectiveDiscount}% within Deal Desk bounds
              </span>
            </div>
          </div>
        </div>

        {/* Commercial Terms Summary */}
        <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 800, letterSpacing: "1px", marginBottom: 8 }}>
            [ NEGOTIATED TERMS ]
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Contract Value:</span>
              <span style={{ color: "#22c55e", fontWeight: 800 }}>${netProposalARR.toLocaleString()} / Yr</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Total Contract Value:</span>
              <span style={{ color: "#38bdf8", fontWeight: 700 }}>${totalContractValue.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Contract Duration:</span>
              <span style={{ color: "#cbd5e1" }}>{selectedTermYears} Years Commitment</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>SRE War Room:</span>
              <span style={{ color: includeSreWarRoom ? "#22c55e" : "#ef4444" }}>
                {includeSreWarRoom ? "Included" : "Excluded"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>Payment Structure:</span>
              <span style={{ color: "#cbd5e1" }}>{paymentTerms === "annual_prepay" ? "Annual Prepay" : "Net 30"}</span>
            </div>
          </div>
        </div>

        {/* Counter-Offer Negotiation Helper */}
        <div
          style={{
            background: "rgba(56,189,248,0.06)",
            border: "1px solid rgba(56,189,248,0.25)",
            borderRadius: 6,
            padding: 12,
            fontSize: 11,
          }}
        >
          <div style={{ color: "#38bdf8", fontWeight: 800, marginBottom: 4 }}>Deal Desk Alignment:</div>
          <div style={{ color: "#cbd5e1", lineHeight: 1.5, fontSize: 10 }}>
            {totalEffectiveDiscount <= 10
              ? "✓ Standard AE Authority: Instant Deal Desk approval permitted without executive sign-off."
              : totalEffectiveDiscount <= 20
              ? "ℹ VP Sales Approval required for discounts between 10% - 20%."
              : "⚠ CFO Approval required for discounts > 20%."}
          </div>
        </div>

        {/* Sub-Environment Navigation Shortcuts */}
        {onNavigateToSubEnv && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
            <button
              onClick={() => onNavigateToSubEnv("call")}
              style={{
                padding: "8px 12px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid #1e293b",
                color: "#94a3b8",
                borderRadius: 4,
                fontSize: 10,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              ◀ BACK TO 01 LIVE VOICE CALL
            </button>
            <button
              onClick={() => onNavigateToSubEnv("crm")}
              style={{
                padding: "10px 12px",
                background: "rgba(34,197,94,0.15)",
                border: "1px solid #22c55e",
                color: "#22c55e",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>ADVANCE TO 03 CRM & DEAL DESK</span>
              <span>▶</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
