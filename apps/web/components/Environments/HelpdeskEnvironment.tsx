"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HelpdeskEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onComplete: () => void;
  demoMode: boolean;
}

interface Ticket {
  id: string;
  customer: string;
  avatar: string;
  subject: string;
  slaSeconds: number;
  message: string;
  orderId: string;
  amount: string;
}

export default function HelpdeskEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
}: HelpdeskEnvironmentProps) {
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: "TICK-4891",
      customer: "Elena Rostova",
      avatar: "ER",
      subject: "Double charged for Black Friday Wool Coat",
      slaSeconds: 165,
      message: "I clicked 'Complete Order' once, but my mobile banking alert showed TWO charges of $249.99! Please fix this immediately, I don't want two coats!",
      orderId: "ord_9901",
      amount: "$249.99 (x2)",
    },
    {
      id: "TICK-4892",
      customer: "David Kim",
      avatar: "DK",
      subject: "Duplicate card deduction on Visa ending 4091",
      slaSeconds: 250,
      message: "Hey support, I ordered boots 10 mins ago and got billed twice. Both transaction IDs are identical except for the last digit. Is your site glitching?",
      orderId: "ord_9904",
      amount: "$189.00 (x2)",
    },
    {
      id: "TICK-4893",
      customer: "Sarah Miller",
      avatar: "SM",
      subject: "Charged twice for single checkout item",
      slaSeconds: 320,
      message: "Checkout stalled for 2 seconds so I tapped pay again, now my Amex has 2 pending debits for the same bag. Please refund the duplicate!",
      orderId: "ord_9912",
      amount: "$120.00 (x2)",
    },
  ]);

  const [activeTicketId, setActiveTicketId] = useState<string>("TICK-4891");
  const [tone, setTone] = useState<"empathetic" | "neutral" | "direct">("empathetic");
  const [queueSwept, setQueueSwept] = useState(false);

  // SLA countdown
  useEffect(() => {
    if (queueSwept) return;
    const interval = setInterval(() => {
      setTickets((prev) =>
        prev.map((t) => ({ ...t, slaSeconds: Math.max(0, t.slaSeconds - 1) }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [queueSwept]);

  const formatSla = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, "0")}`;
  };

  const activeTicket = tickets.find((t) => t.id === activeTicketId) || tickets[0];

  const handleBatchEscalate = () => {
    setQueueSwept(true);
    onAction(
      `[VICTORY] Customer Support agent identified systemic checkout double-charge pattern across all 3 tickets. Applied tone='${tone}' and executed unified Sev-1 batch escalation to Engineering with automated customer reassurance.`
    );

    setTimeout(() => {
      onComplete();
    }, 3000);
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#080c14",
        color: "#fff",
        fontFamily: "'JetBrains Mono', -apple-system, sans-serif",
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        overflow: "hidden",
      }}
    >
      {/* LEFT: TICKET QUEUE */}
      <div
        style={{
          borderRight: "1px solid #1e293b",
          background: "#05070d",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 800, letterSpacing: "1px" }}>
              [ AURA HELPDESK ]
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              Urgent Ticket Queue ({queueSwept ? 0 : tickets.length})
            </div>
          </div>
          <span style={{ fontSize: 10, background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
            {queueSwept ? "QUEUE CLEARED" : "SLA AT RISK"}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {queueSwept ? (
            <div style={{ padding: 40, textAlign: "center", color: "#22c55e" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Queue Swept Clean!</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                All duplicate tickets batch escalated to SRE.
              </div>
            </div>
          ) : (
            tickets.map((t) => {
              const isSelected = t.id === activeTicketId;
              return (
                <div
                  key={t.id}
                  onClick={() => setActiveTicketId(t.id)}
                  style={{
                    padding: 14,
                    borderBottom: "1px solid #1e293b",
                    background: isSelected ? "rgba(245,158,11,0.08)" : "transparent",
                    borderLeft: isSelected ? "3px solid #f59e0b" : "3px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{t.customer}</span>
                    <span style={{ fontSize: 10, color: t.slaSeconds < 180 ? "#ef4444" : "#f59e0b", fontWeight: 700 }}>
                      ⏱ SLA: {formatSla(t.slaSeconds)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 4 }}>{t.subject}</div>
                  <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#64748b" }}>
                    <span>{t.orderId}</span>
                    <span>•</span>
                    <span style={{ color: "#ef4444" }}>{t.amount}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pattern Detection Badge */}
        {!queueSwept && (
          <div style={{ padding: 14, background: "#0b101c", borderTop: "1px solid #1e293b" }}>
            <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 800, marginBottom: 4 }}>
              💡 PATTERN DETECTED:
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.4, marginBottom: 10 }}>
              All 3 tickets report duplicate card debits under rapid repeat clicks. Do not issue fragmented manual refunds!
            </div>
            <button
              onClick={handleBatchEscalate}
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(239,68,68,0.15)",
                border: "1px solid #ef4444",
                color: "#ef4444",
                fontWeight: 800,
                fontSize: 11,
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.5px",
                boxShadow: "0 0 15px rgba(239,68,68,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.15s ease",
              }}
            >
              <span>⚡</span>
              <span>[ BATCH_ESCALATE_TO_SRE // SEV-1 ]</span>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: TICKET DETAILS & REPLY COMPOSER */}
      <div style={{ display: "flex", flexDirection: "column", background: "#080c16" }}>
        {/* Ticket Header */}
        <div style={{ padding: 16, borderBottom: "1px solid #1e293b", background: "#0b101c", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{activeTicket.id} // Order {activeTicket.orderId}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{activeTicket.subject}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#64748b" }}>Customer Impact:</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#ef4444" }}>{activeTicket.amount}</div>
          </div>
        </div>

        {/* Message Thread */}
        <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#0b101c", border: "1px solid #1e293b", borderRadius: 8, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f59e0b", color: "#000", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {activeTicket.avatar}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{activeTicket.customer}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>Customer via Aura Web Storefront</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6 }}>{activeTicket.message}</div>
          </div>
        </div>

        {/* Tone Selector & Reply Box */}
        <div style={{ padding: 16, background: "#0b101c", borderTop: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>COMMUNICATION TONE:</span>
            {(["empathetic", "neutral", "direct"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                style={{
                  padding: "4px 10px",
                  background: tone === t ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.03)",
                  border: tone === t ? "1px solid #f59e0b" : "1px solid #334155",
                  color: tone === t ? "#f59e0b" : "#94a3b8",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  letterSpacing: "0.5px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                [ {t.toUpperCase()} ]
              </button>
            ))}
          </div>

          <div style={{ background: "#060911", border: "1px solid #334155", borderRadius: 6, padding: 10, fontSize: 11, color: "#cbd5e1", marginBottom: 10, lineHeight: 1.5 }}>
            {tone === "empathetic"
              ? "We sincerely apologize for the duplicate charge on your order. Our engineering team has already isolated the concurrency issue and initiated an automated reversal for the duplicate debit."
              : tone === "neutral"
              ? "We are investigating the duplicate transaction on order " + activeTicket.orderId + ". The secondary pending authorization will drop off automatically."
              : "Duplicate transaction identified. An automated reversal has been dispatched."}
          </div>

          <button
            onClick={handleBatchEscalate}
            style={{
              width: "100%",
              padding: "11px",
              background: "rgba(34,197,94,0.15)",
              border: "1px solid #22c55e",
              color: "#22c55e",
              fontWeight: 800,
              fontSize: 11,
              borderRadius: 4,
              fontFamily: "inherit",
              letterSpacing: "0.5px",
              cursor: "pointer",
              boxShadow: "0 0 15px rgba(34,197,94,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            <span>▶</span>
            <span>[ RESOLVE_QUEUE // SEND_UNIFIED_REPLY ]</span>
          </button>
        </div>
      </div>
    </div>
  );
}
