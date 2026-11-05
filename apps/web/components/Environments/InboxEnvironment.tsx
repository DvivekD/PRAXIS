"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InboxEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onComplete: () => void;
  demoMode: boolean;
}

interface EmailItem {
  id: string;
  sender: string;
  role: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  unread: boolean;
  priority: "urgent" | "normal" | "low";
  options: Array<{ label: string; action: string; isOptimal?: boolean }>;
}

export default function InboxEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
}: InboxEnvironmentProps) {
  const [emails, setEmails] = useState<EmailItem[]>([
    {
      id: "email_1",
      sender: "Jordan Mitchell",
      role: "Customer Support Lead",
      subject: "URGENT: 3 customers charged twice on checkout (Cart Glitch)",
      preview: "We have multiple users reporting duplicate card deductions within 10 seconds...",
      body: `Hey Product Team,

Our support queue just lit up. Within the past 15 minutes, three high-value shoppers were double-charged on Black Friday checkout (Error reference: ERR_DOUBLE_CHARGE_TX). 

One of them is furious and threatened to post on Twitter. Should we treat this as a one-off or escalate this as a company-wide Sev-1 to Alex Chen in Engineering?`,
      time: "2m ago",
      unread: true,
      priority: "urgent",
      options: [
        { label: "Declare Sev-1 & route to Alex in Engineering", action: "Escalated to Engineering as Sev-1", isOptimal: true },
        { label: "Tell support to issue manual refunds and wait", action: "Instructed support to issue piecemeal refunds", isOptimal: false },
      ],
    },
    {
      id: "email_2",
      sender: "Marcus Vance",
      role: "VIP Merchant (Nordic Goods)",
      subject: "Payment anomalies on our storefront — please advise immediately",
      preview: "Our checkout transactions are throwing ERR_DOUBLE_CHARGE_TX...",
      body: `Hi,

We are seeing checkout anomalies on our Nordic Goods storefront heading into Black Friday. Our finance team spotted duplicate authorizations with transaction code ERR_DOUBLE_CHARGE_TX.

If this isn't stabilized immediately, we will be forced to pause our store on Aura and redirect traffic to Shopify. Please confirm what steps you are taking.`,
      time: "5m ago",
      unread: true,
      priority: "urgent",
      options: [
        { label: "Reassure VIP: Patch in progress, zero risk of data loss", action: "Reassured VIP merchant with active Sev-1 containment", isOptimal: true },
        { label: "Offer a $500 platform credit to delay decision", action: "Offered generic credit without technical explanation", isOptimal: false },
      ],
    },
    {
      id: "email_3",
      sender: "Taylor Brooks",
      role: "Chief Executive Officer",
      subject: "Can we push the gift card feature before the midnight rush?",
      preview: "Marketing says it will increase AOV by 15%, let's ship it now...",
      body: `Team,

I know it's T-minus 6 hours to Black Friday, but marketing is strongly advising that we launch the new Gift Card promo banner tonight to bump AOV by 15%.

Can we push this to production right now or should we hold? What's your call?`,
      time: "8m ago",
      unread: true,
      priority: "normal",
      options: [
        { label: "Hold: Freeze all deployments until checkout bug is fixed", action: "Enforced deployment freeze to protect checkout reliability", isOptimal: true },
        { label: "Ship it: Fast-track the gift card feature to production", action: "Approved risky deploy during active outage", isOptimal: false },
      ],
    },
    {
      id: "email_4",
      sender: "Chloe Zhao",
      role: "Head of Growth Marketing",
      subject: "Ready to blast 500,000 Black Friday promotional emails",
      preview: "Campaign scheduled for top of the hour. Final confirmation needed...",
      body: `Hi!

Our 500,000 user Black Friday promotional email blast is scheduled to fire at the top of the hour. This will drive a 10x surge to the checkout funnel.

Confirming we have the green light to send?`,
      time: "12m ago",
      unread: false,
      priority: "normal",
      options: [
        { label: "Hold email blast until checkout fix is verified", action: "Paused promotional blast to prevent funnel overload", isOptimal: true },
        { label: "Send as scheduled to maximize top-of-funnel traffic", action: "Sent blast, flooding buggy checkout", isOptimal: false },
      ],
    },
  ]);

  const [selectedEmailId, setSelectedEmailId] = useState<string>("email_1");
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState("");
  const [published, setPublished] = useState(false);

  const activeEmail = emails.find((e) => e.id === selectedEmailId) || emails[0];

  const handleSelectOption = (emailId: string, actionText: string) => {
    setDecisions((prev) => ({ ...prev, [emailId]: actionText }));
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, unread: false } : e))
    );
    onAction(`[INBOX_DECISION] Re: "${activeEmail.subject}" -> Decision: ${actionText}`);
  };

  const handlePublishProtocol = () => {
    setPublished(true);
    onAction(
      `[VICTORY] Product Manager published Black Friday triage protocol. Decisions: ${JSON.stringify(
        decisions
      )}. Summary: "${summary || "Prioritized Sev-1 checkout fix over feature releases."}"`
    );
    setTimeout(() => {
      onComplete();
    }, 2800);
  };

  const decisionCount = Object.keys(decisions).length;
  const allDecided = decisionCount >= 3;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#080c14",
        color: "#fff",
        fontFamily: "'Inter', -apple-system, sans-serif",
        display: "grid",
        gridTemplateColumns: "220px 360px 1fr",
        overflow: "hidden",
      }}
    >
      {/* LEFT NAVIGATION */}
      <div
        style={{
          background: "#05070d",
          borderRight: "1px solid #1e293b",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 800, letterSpacing: "1.5px", marginBottom: 20 }}>
          [ AURA INBOX // PM ]
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(129,140,248,0.12)",
              border: "1px solid #818cf840",
              borderRadius: 6,
              color: "#818cf8",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>📥 Inbox</span>
            <span style={{ fontSize: 10, background: "#818cf8", color: "#000", padding: "1px 6px", borderRadius: 100 }}>
              {emails.filter((e) => e.unread).length}
            </span>
          </div>
          <div style={{ padding: "8px 12px", color: "#64748b", fontSize: 12 }}>📤 Sent</div>
          <div style={{ padding: "8px 12px", color: "#64748b", fontSize: 12 }}>⚡ Sev-1 Incidents</div>
          <div style={{ padding: "8px 12px", color: "#64748b", fontSize: 12 }}>📋 Black Friday Roadmap</div>
        </div>

        {/* Triage Progress */}
        <div style={{ background: "#0b101c", border: "1px solid #1e293b", borderRadius: 6, padding: 12 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>Triage Completed:</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", marginBottom: 4 }}>
            {decisionCount} / {emails.length} Decisions
          </div>
          <div style={{ height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${(decisionCount / emails.length) * 100}%`,
                background: "#818cf8",
              }}
            />
          </div>
        </div>
      </div>

      {/* CENTER EMAIL LIST */}
      <div
        style={{
          borderRight: "1px solid #1e293b",
          background: "#080c16",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #1e293b",
            fontSize: 12,
            fontWeight: 700,
            color: "#94a3b8",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>EXECUTIVE INBOX</span>
          <span style={{ color: "#ef4444" }}>● T-MINUS 6H TO SALE</span>
        </div>

        {emails.map((email) => {
          const isSelected = email.id === selectedEmailId;
          const hasDecided = !!decisions[email.id];

          return (
            <div
              key={email.id}
              onClick={() => setSelectedEmailId(email.id)}
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #1e293b",
                background: isSelected ? "rgba(129,140,248,0.08)" : email.unread ? "#0b1120" : "transparent",
                borderLeft: isSelected ? "3px solid #818cf8" : "3px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: email.unread ? 800 : 600, color: "#fff" }}>
                  {email.sender}
                </span>
                <span style={{ fontSize: 10, color: "#64748b" }}>{email.time}</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: email.unread ? 700 : 500,
                  color: email.priority === "urgent" ? "#f87171" : "#cbd5e1",
                  marginBottom: 4,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {email.subject}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginBottom: 6,
                }}
              >
                {email.preview}
              </div>

              {hasDecided && (
                <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>
                  ✓ Decision logged
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RIGHT READING PANE & TRIAGE CONTROLS */}
      <div style={{ display: "flex", flexDirection: "column", background: "#05070d", overflowY: "auto" }}>
        {/* Email Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b", background: "#090d18" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                {activeEmail.subject}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                From: <span style={{ color: "#818cf8", fontWeight: 700 }}>{activeEmail.sender}</span> ({activeEmail.role})
              </div>
            </div>
            {activeEmail.priority === "urgent" && (
              <span style={{ fontSize: 10, background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid #ef4444", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                HIGH PRIORITY
              </span>
            )}
          </div>
        </div>

        {/* Email Body */}
        <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto", fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
          {activeEmail.body}
        </div>

        {/* Triage Decision Box */}
        <div style={{ padding: 20, background: "#090d18", borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
            Make Executive Decision:
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {activeEmail.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelectOption(activeEmail.id, opt.label)}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  background: decisions[activeEmail.id] === opt.label ? "rgba(129,140,248,0.2)" : "#0f172a",
                  border: decisions[activeEmail.id] === opt.label ? "1px solid #818cf8" : "1px solid #334155",
                  color: decisions[activeEmail.id] === opt.label ? "#818cf8" : "#f8fafc",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
              >
                {decisions[activeEmail.id] === opt.label ? "✓ " : ""}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Incident Summary & Submit */}
          {allDecided && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ borderTop: "1px dashed #334155", paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 6 }}>
                1-Sentence Executive Rationale:
              </div>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="e.g. Freezing marketing/features to contain checkout Sev-1 bug before Black Friday..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#060911",
                  border: "1px solid #334155",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: 11,
                  marginBottom: 12,
                  outline: "none",
                }}
              />
              <button
                onClick={handlePublishProtocol}
                disabled={published}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: published ? "#22c55e" : "linear-gradient(135deg, #6366f1, #818cf8)",
                  border: "none",
                  color: published ? "#000" : "#fff",
                  fontWeight: 800,
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: published ? "default" : "pointer",
                }}
              >
                {published ? "✓ PROTOCOL PUBLISHED — ROUTING..." : "🚀 PUBLISH BLACK FRIDAY TRIAGE PROTOCOL"}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
