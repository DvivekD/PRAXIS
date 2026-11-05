"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DemoPitchGuideProps {
  domain: string;
  onQuickSolve?: () => void;
}

const DOMAIN_HINTS: Record<string, { title: string; steps: string[]; quickAction: string }> = {
  engineering: {
    title: "Engineering — Checkout Concurrency Race Condition",
    steps: [
      "1. Run `npm test` to see the failing double-charge test (red).",
      "2. Run `git log` to see the recent commit that introduced the bug.",
      "3. Type `fix` (or inspect `checkout.ts`) to move the idempotency guard above the charge.",
      "4. Run `npm test` again to trigger the green victory test suite!",
    ],
    quickAction: "[ AUTO_APPLY_PATCH & RUN_TESTS ▶ ]",
  },
  sales: {
    title: "Sales — Nordic Goods $250k Renewal Call",
    steps: [
      "1. Speak into mic or use Quick Chat to ask Sam about their Black Friday scale concern.",
      "2. Acknowledge the payment latency fix to unlock the discovery goals.",
      "3. Click any open calendar slot on the right to lock in the confirmed meeting event!",
    ],
    quickAction: "[ AUTO_BOOK_MEETING & CLOSE ▶ ]",
  },
  product: {
    title: "Product — Black Friday Triage & Executive Inbox",
    steps: [
      "1. Open Jordan's ticket and VIP merchant email — notice both refer to checkout errors.",
      "2. Reply 'Prioritize Sev-1 Fix' and gently push back on CEO's last-minute gift cards.",
      "3. Pause the 500k marketing blast and click 'Publish Incident Protocol'.",
    ],
    quickAction: "[ AUTO_TRIAGE & PUBLISH ▶ ]",
  },
  data: {
    title: "Data — Inflated DAU Metric Correction",
    steps: [
      "1. Run the initial query — notice the +40% artificial DAU spike caused by JOIN duplicates.",
      "2. Change `COUNT(u.id)` to `COUNT(DISTINCT u.id)` in the SQL editor.",
      "3. Click 'Run Query' to watch the live chart animate down to reality!",
    ],
    quickAction: "[ AUTO_ADD_DISTINCT & RUN ▶ ]",
  },
  sre: {
    title: "SRE — Sev-1 Production Outage War Room",
    steps: [
      "1. Review the spiking 5xx error rate (42%) and dropping conversion (12%).",
      "2. Check the recent deployment log: `v2.4.1-hotfix`.",
      "3. Click 'Rollback to v2.4.0' to initiate the 30-second live chart recovery!",
    ],
    quickAction: "[ TRIGGER_ZERO_DOWNTIME_ROLLBACK ▶ ]",
  },
  support: {
    title: "Customer Support — Overnight Helpdesk Queue",
    steps: [
      "1. Review the 3 urgent tickets with expiring SLAs — they are all double debits.",
      "2. Toggle tone to 'Empathetic'.",
      "3. Click 'Batch Escalate to SRE' with a unified root-cause note instead of piecemeal refunds.",
    ],
    quickAction: "[ BATCH_ESCALATE_QUEUE_TO_SRE ▶ ]",
  },
  brand: {
    title: "Brand & Social — Viral Crisis Command Center",
    steps: [
      "1. Notice the viral quote-tweets criticizing the tone-deaf promotional tweet.",
      "2. Select the transparent public notice template acknowledging the payment issue.",
      "3. Click 'Post Reply' and watch the sentiment dial swing from 28% to 86% Positive!",
    ],
    quickAction: "[ PUBLISH_AUTHENTIC_STATEMENT ▶ ]",
  },
};

export default function DemoPitchGuide({ domain, onQuickSolve }: DemoPitchGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const info = DOMAIN_HINTS[domain] || DOMAIN_HINTS.engineering;

  return (
    <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 9990, fontFamily: "'JetBrains Mono', monospace" }}>
      <motion.button
        whileHover={{ scale: 1.03, borderColor: "#f59e0b" }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "rgba(8, 12, 20, 0.95)",
          color: "#f59e0b",
          border: "1px solid rgba(245, 158, 11, 0.5)",
          padding: "7px 14px",
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "1px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 0 15px rgba(245, 158, 11, 0.15)",
          backdropFilter: "blur(10px)",
        }}
      >
        <span style={{ color: "#f59e0b" }}>⚡</span>
        <span>[ DEMO_PITCH_CHEAT_SHEET ]</span>
        <span style={{ fontSize: 9, background: "rgba(245, 158, 11, 0.15)", border: "1px solid #f59e0b", color: "#f59e0b", padding: "1px 6px", borderRadius: 2 }}>
          {isOpen ? "CLOSE" : "OPEN"}
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              bottom: 44,
              right: 0,
              width: 380,
              background: "rgba(8, 12, 20, 0.98)",
              border: "1px solid rgba(245, 158, 11, 0.5)",
              borderRadius: 6,
              boxShadow: "0 0 30px rgba(0,0,0,0.8), 0 0 15px rgba(245,158,11,0.15)",
              padding: 16,
              color: "#fff",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 800, letterSpacing: "1px" }}>
                [ HACKATHON PITCH TELEMETRY ]
              </span>
              <span style={{ fontSize: 9, color: "#64748b" }}>AURA COMMERCE</span>
            </div>

            <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 10 }}>
              {info.title}
            </div>

            <div style={{ background: "#05070d", border: "1px solid #1e293b", borderRadius: 4, padding: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#f59e0b", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>Walkthrough Path (under 3 min):</div>
              {info.steps.map((s, idx) => (
                <div key={idx} style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 4 }}>
                  {s}
                </div>
              ))}
            </div>

            {onQuickSolve && (
              <button
                onClick={() => {
                  onQuickSolve();
                  setIsOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid #f59e0b",
                  color: "#f59e0b",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                  fontFamily: "inherit",
                }}
              >
                <span>⚡</span>
                <span>{info.quickAction}</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
