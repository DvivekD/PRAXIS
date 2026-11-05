"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DemoPitchGuideProps {
  domain: string;
  onQuickSolve?: () => void;
}

const DOMAIN_HINTS: Record<string, { title: string; steps: string[]; quickAction: string }> = {
  engineering: {
    title: "Engineering (Scope 1) — 3 Realistic Sub-Environments",
    steps: [
      "1. Sub-01 SSH Terminal: Run `ps aux`, `top`, and `tail timeout.log` to discover worker pool starvation (128/128).",
      "2. Sub-02 Network Lab: Run `nslookup auth.payment.internal` and `nc -zv` to isolate dead pod 10.244.3.99, then click `flush-dns`.",
      "3. Sub-03 Code Debugger: Step through breakpoints on checkout.ts, reproduce the double charge race condition, click `Apply Patch`, and run `npm test`!",
    ],
    quickAction: "[ RESOLVE_SCOPE_1_ENGINEERING ▶ ]",
  },
  sales: {
    title: "Sales (Scope 2) — Save the $250K Renewal (3 Sub-Environments)",
    steps: [
      "1. [01 Live Call]: Speak into mic or use Quick Chat to discover Sam's Black Friday fear, address concurrency race conditions, and book a technical demo calendar slot.",
      "2. [02 Pitch Room]: Present 5-slide deck to committee (Elena & Marcus), validate $177k GMV savings over CommerceCloud, and export tailored proposal to CRM.",
      "3. [03 CRM & Deal Desk]: Review activity audit feed, compose executive quote email, calculate multi-year discounts within Deal Desk policy, and submit final renewal for Closed-Won victory!",
    ],
    quickAction: "[ CLOSE_RENEWAL_&_SAVE_$250K ▶ ]",
  },
  product: {
    title: "Product Management — Black Friday Launch Triage",
    steps: [
      "1. [01 Gmail]: Triage stakeholder emails; escalate Sev-1 checkout fix and hold marketing email blast.",
      "2. [02 Linear]: Convert requests to user stories; commit P0 idempotency fix & defer gift card banner.",
      "3. [03 Amplitude]: Inspect Step 5 drop-off (42.8%), review error telemetry & launch A/B experiment.",
      "4. Click 'Dispatch Launch Protocol' to finalize Black Friday triage gates!",
    ],
    quickAction: "[ AUTO_TRIAGE_&_DISPATCH_PROTOCOL ▶ ]",
  },
  data: {
    title: "Data — The Missing DAU Problem (18% Drop Investigation)",
    steps: [
      "1. SQL Studio: Correct DISTINCT user session join in query_daily_active_users.sql (F5 to run).",
      "2. Pipeline Lab: Fix mobile v2.4.1 schema drift (account_uid) and retry duplicates in dbt DAG.",
      "3. BI Studio: Compare reported DAU vs server traffic baseline & publish the executive report!",
    ],
    quickAction: "[ AUTO_RESOLVE_DAU_INCIDENT & VERIFY ▶ ]",
  },
  sre: {
    title: "SRE — Sev-1 Production Outage War Room",
    steps: [
      "1. [01 Grafana]: Inspect 5xx error spikes (42.8%), p99 latency curve (2850ms), and run PromQL queries.",
      "2. [02 War Room]: Review active alert stack, acknowledge Sev-1, update public status page, and consult Alex Chen.",
      "3. [03 Kubernetes]: Inspect 16 pods (12 CrashLooping on v2.4.1), check terminal crash logs, and trigger 1-Click Rollback to v2.4.0!",
      "4. Generate RCA Postmortem report and watch 3D Observer reactor normalize to green.",
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
    title: "Brand & Social — The Viral Brand Crisis",
    steps: [
      "1. [01 Social Listening]: Monitor live tweet/IG stream, quote-tweet cascade (2.4k RTs), and keyword spikes (#AuraOutage +1,420%).",
      "2. [02 Response Studio]: Test crisis statement against brand tone guidelines (accountability vs defensiveness) and preview thread.",
      "3. [03 Crisis Command]: Dispatch on-the-record statements to Tier-1 press, watch sentiment recovery dial surge from 28% to 86%, and generate PR Report!",
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
