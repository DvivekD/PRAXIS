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
  email: string;
  role: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  unread: boolean;
  starred: boolean;
  priority: "urgent" | "normal";
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
      email: "jordan.mitchell@aura.commerce",
      role: "Customer Support Lead",
      subject: "URGENT: 3 customers charged twice on checkout (Cart Glitch)",
      preview: "We have multiple users reporting duplicate card deductions within 10 seconds...",
      body: `Hey Product Team,

Our support queue just lit up. Within the past 15 minutes, three high-value shoppers were double-charged on Black Friday checkout (Error reference: ERR_DOUBLE_CHARGE_TX). 

One of them is furious and threatened to post on Twitter. Should we treat this as a one-off or escalate this as a company-wide Sev-1 to Alex Chen in Engineering?

Need your call ASAP before queue SLA breaches.

Best,
Jordan Mitchell
Customer Support Lead // Aura Commerce`,
      time: "2:48 PM",
      unread: true,
      starred: true,
      priority: "urgent",
      options: [
        { label: "Declare Sev-1 & route to Alex in Engineering", action: "Escalated to Engineering as Sev-1", isOptimal: true },
        { label: "Tell support to issue manual refunds and wait", action: "Instructed support to issue piecemeal refunds", isOptimal: false },
      ],
    },
    {
      id: "email_2",
      sender: "Marcus Vance",
      email: "marcus@nordicgoods.co",
      role: "VP Merchant (Nordic Goods)",
      subject: "Payment anomalies on our storefront — please advise immediately",
      preview: "Our checkout transactions are throwing ERR_DOUBLE_CHARGE_TX...",
      body: `Hi Product Team,

We are seeing checkout anomalies on our Nordic Goods storefront heading into Black Friday. Our finance team spotted duplicate authorizations with transaction code ERR_DOUBLE_CHARGE_TX.

If this isn't stabilized immediately, we will be forced to pause our store on Aura and redirect traffic to Shopify. Please confirm what steps you are taking.

Regards,
Marcus Vance
VP Retail & Operations, Nordic Goods`,
      time: "2:42 PM",
      unread: true,
      starred: false,
      priority: "urgent",
      options: [
        { label: "Reassure VIP: Patch in progress, zero risk of data loss", action: "Reassured VIP merchant with active Sev-1 containment", isOptimal: true },
        { label: "Offer a $500 platform credit to delay decision", action: "Offered generic credit without technical explanation", isOptimal: false },
      ],
    },
    {
      id: "email_3",
      sender: "Taylor Brooks",
      email: "taylor.brooks@aura.commerce",
      role: "Chief Executive Officer",
      subject: "Can we push the gift card feature before the midnight rush?",
      preview: "Marketing says it will increase AOV by 15%, let's ship it now...",
      body: `Team,

I know it's T-minus 6 hours to Black Friday, but marketing is strongly advising that we launch the new Gift Card promo banner tonight to bump AOV by 15%.

Can we push this to production right now or should we hold? What's your call?

Taylor Brooks
CEO, Aura Commerce`,
      time: "2:35 PM",
      unread: true,
      starred: false,
      priority: "normal",
      options: [
        { label: "Hold: Freeze all deployments until checkout bug is fixed", action: "Enforced deployment freeze to protect checkout reliability", isOptimal: true },
        { label: "Ship it: Fast-track the gift card feature to production", action: "Approved risky deploy during active outage", isOptimal: false },
      ],
    },
    {
      id: "email_4",
      sender: "Chloe Zhao",
      email: "chloe.zhao@aura.commerce",
      role: "Head of Growth Marketing",
      subject: "Ready to blast 500,000 Black Friday promotional emails",
      preview: "Campaign scheduled for top of the hour. Final confirmation needed...",
      body: `Hi,

Our 500,000 user Black Friday promotional email blast is scheduled to fire at the top of the hour. This will drive a 10x surge to the checkout funnel.

Confirming we have the green light to send?

Chloe Zhao
Head of Growth Marketing`,
      time: "2:20 PM",
      unread: false,
      starred: false,
      priority: "normal",
      options: [
        { label: "Hold email blast until checkout fix is verified", action: "Paused promotional blast to prevent funnel overload", isOptimal: true },
        { label: "Send as scheduled to maximize top-of-funnel traffic", action: "Sent blast, flooding buggy checkout", isOptimal: false },
      ],
    },
  ]);

  const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState("");
  const [published, setPublished] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<"inbox" | "starred" | "sent">("inbox");

  const activeEmail = emails.find((e) => e.id === activeEmailId);

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEmails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, starred: !item.starred } : item))
    );
  };

  const handleSelectOption = (emailId: string, actionText: string) => {
    setDecisions((prev) => ({ ...prev, [emailId]: actionText }));
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, unread: false } : e))
    );
    onAction(`[GMAIL_DECISION] Re: "${activeEmail?.subject}" -> Decision: ${actionText}`);
  };

  const handlePublishProtocol = () => {
    setPublished(true);
    onAction(
      `[VICTORY] Product Manager published Black Friday triage protocol via Gmail. Decisions: ${JSON.stringify(
        decisions
      )}. Summary: "${summary || "Prioritized Sev-1 checkout fix over feature releases."}"`
    );
    setTimeout(() => {
      onComplete();
    }, 2800);
  };

  const filteredEmails = emails.filter((item) => {
    if (activeFolder === "starred") return item.starred;
    if (searchQuery) {
      return (
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.body.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const decisionCount = Object.keys(decisions).length;
  const allDecided = decisionCount >= 3;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#111318",
        color: "#e2e2e9",
        fontFamily: "'Roboto', 'Google Sans', 'Inter', -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ─── GOOGLE GMAIL TOP HEADER ──────────────────────────── */}
      <div
        style={{
          height: 64,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "#1e1f24",
        }}
      >
        {/* Left Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer", padding: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Authentic Gmail Logo Icon */}
            <svg width="28" height="22" viewBox="0 0 24 19" fill="none">
              <path d="M1.5 17.5V4.5L12 11.5L22.5 4.5V17.5C22.5 18.05 22.05 18.5 21.5 18.5H2.5C1.95 18.5 1.5 18.05 1.5 17.5Z" fill="#EA4335" />
              <path d="M22.5 4.5L12 11.5L1.5 4.5V2.5C1.5 1.95 1.95 1.5 2.5 1.5H21.5C22.05 1.5 22.5 1.95 22.5 2.5V4.5Z" fill="#FBBC04" />
              <path d="M1.5 4.5L12 11.5L7 15L1.5 11V4.5Z" fill="#4285F4" />
              <path d="M22.5 4.5L12 11.5L17 15L22.5 11V4.5Z" fill="#34A853" />
            </svg>
            <span style={{ fontSize: 20, fontWeight: 500, color: "#e2e2e9", letterSpacing: "-0.5px" }}>Gmail</span>
            <span style={{ fontSize: 11, background: "rgba(138,180,248,0.15)", color: "#8ab4f8", padding: "2px 8px", borderRadius: 4, marginLeft: 6, fontWeight: 500 }}>
              Aura Workspace
            </span>
          </div>
        </div>

        {/* Center: Gmail Search Bar */}
        <div style={{ flex: 1, maxWidth: 680, margin: "0 32px" }}>
          <div
            style={{
              background: "#282a30",
              borderRadius: 28,
              height: 44,
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              gap: 12,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4c7c5" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              type="text"
              placeholder="Search in mail"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#e2e2e9",
                fontSize: 14,
                fontFamily: "inherit",
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}>✕</button>
            )}
          </div>
        </div>

        {/* Right: Apps & Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Help / Support Icon */}
          <button style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer", padding: 6, borderRadius: "50%" }} title="Support">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          {/* Settings Icon */}
          <button style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer", padding: 6, borderRadius: "50%" }} title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Google Apps (9-dot grid) */}
          <button style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer", padding: 6, borderRadius: "50%" }} title="Google apps">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#c4c7c5">
              <circle cx="5" cy="5" r="2" />
              <circle cx="12" cy="5" r="2" />
              <circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
              <circle cx="5" cy="19" r="2" />
              <circle cx="12" cy="19" r="2" />
              <circle cx="19" cy="19" r="2" />
            </svg>
          </button>

          {/* User Profile Avatar */}
          <div
            title="Google Account: Product Manager (pm@aura.commerce)"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#0b57d0",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
            }}
          >
            PM
          </div>
        </div>
      </div>

      {/* ─── MAIN GMAIL WORKSPACE (SIDEBAR + MAIL CONTENT) ──────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT GMAIL SIDEBAR */}
        <div style={{ width: 256, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 8, background: "#111318" }}>
          {/* Compose Button */}
          <button
            style={{
              background: "#c2e7ff",
              color: "#001d35",
              border: "none",
              borderRadius: 16,
              height: 56,
              padding: "0 24px",
              fontSize: 14,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              marginBottom: 12,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Compose
          </button>

          {/* Navigation Folders */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div
              onClick={() => { setActiveFolder("inbox"); setActiveEmailId(null); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                height: 36,
                borderRadius: 18,
                background: activeFolder === "inbox" ? "#004a77" : "transparent",
                color: activeFolder === "inbox" ? "#c2e7ff" : "#c4c7c5",
                fontWeight: activeFolder === "inbox" ? 700 : 500,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
                <span>Inbox</span>
              </div>
              <span style={{ fontSize: 12 }}>{emails.filter((e) => e.unread).length}</span>
            </div>

            <div
              onClick={() => { setActiveFolder("starred"); setActiveEmailId(null); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "0 16px",
                height: 36,
                borderRadius: 18,
                background: activeFolder === "starred" ? "#004a77" : "transparent",
                color: activeFolder === "starred" ? "#c2e7ff" : "#c4c7c5",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              <span>Starred</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 16px", height: 36, color: "#c4c7c5", fontSize: 14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <span>Snoozed</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 16px", height: 36, color: "#c4c7c5", fontSize: 14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              <span>Sent</span>
            </div>
          </div>

          {/* Labels */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8e918f", padding: "0 16px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
              Labels
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 16px", fontSize: 13, color: "#c4c7c5" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
              <span>Sev-1 Incidents</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 16px", fontSize: 13, color: "#c4c7c5" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8" }} />
              <span>Black Friday Prep</span>
            </div>
          </div>
        </div>

        {/* RIGHT GMAIL MAIN CONTAINER */}
        <div style={{ flex: 1, background: "#1b1c20", margin: "8px 16px 16px 0", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* EMAIL LIST VIEW */}
          {!activeEmail ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Action Toolbar */}
              <div style={{ height: 48, padding: "0 16px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <input type="checkbox" style={{ accentColor: "#8ab4f8", cursor: "pointer" }} />
                <button style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer" }}>↻</button>
                <div style={{ fontSize: 12, color: "#8e918f" }}>
                  Triage Progress: <strong style={{ color: "#22c55e" }}>{decisionCount} / {emails.length} Decided</strong>
                </div>
              </div>

              {/* Tabs Bar */}
              <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ padding: "14px 24px", color: "#8ab4f8", borderBottom: "3px solid #8ab4f8", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <span>Primary</span>
                  <span style={{ fontSize: 11, background: "#8ab4f8", color: "#001d35", padding: "1px 6px", borderRadius: 10 }}>{emails.filter(e => e.unread).length}</span>
                </div>
                <div style={{ padding: "14px 24px", color: "#8e918f", fontSize: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <span>Promotions</span>
                </div>
                <div style={{ padding: "14px 24px", color: "#8e918f", fontSize: 14 }}>
                  <span>Updates</span>
                </div>
              </div>

              {/* Email List Rows */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {filteredEmails.map((item) => {
                  const hasDecided = !!decisions[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveEmailId(item.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0 16px",
                        height: 48,
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        background: item.unread ? "#212228" : "transparent",
                        cursor: "pointer",
                        fontSize: 14,
                        transition: "background 0.1s",
                      }}
                    >
                      <input type="checkbox" style={{ marginRight: 12, accentColor: "#8ab4f8" }} onClick={(e) => e.stopPropagation()} />
                      <span
                        onClick={(e) => toggleStar(e, item.id)}
                        style={{ marginRight: 16, cursor: "pointer", color: item.starred ? "#fbbc04" : "#5f6368", fontSize: 16 }}
                      >
                        {item.starred ? "★" : "☆"}
                      </span>

                      <div style={{ width: 180, fontWeight: item.unread ? 700 : 400, color: item.unread ? "#fff" : "#c4c7c5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.sender}
                      </div>

                      <div style={{ flex: 1, display: "flex", gap: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <span style={{ fontWeight: item.unread ? 700 : 400, color: item.unread ? "#fff" : "#c4c7c5" }}>
                          {item.subject}
                        </span>
                        <span style={{ color: "#8e918f" }}>— {item.preview}</span>
                      </div>

                      {hasDecided && (
                        <span style={{ fontSize: 11, background: "rgba(34,197,94,0.15)", border: "1px solid #22c55e", color: "#22c55e", padding: "1px 8px", borderRadius: 4, marginRight: 16 }}>
                          ✓ Logged
                        </span>
                      )}

                      <div style={{ width: 70, textAlign: "right", fontSize: 12, color: item.unread ? "#fff" : "#8e918f", fontWeight: item.unread ? 700 : 400 }}>
                        {item.time}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* EMAIL THREAD DETAIL VIEW */
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
              {/* Detail Toolbar */}
              <div
                style={{
                  height: 48,
                  padding: "0 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  background: "#1e1f24",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button
                    onClick={() => setActiveEmailId(null)}
                    style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer", display: "flex", alignItems: "center", padding: 6, borderRadius: "50%" }}
                    title="Back to Inbox"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  </button>

                  <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.12)" }} />

                  {/* Archive */}
                  <button style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer", padding: 6 }} title="Archive">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8" /><rect width="22" height="5" x="1" y="3" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
                  </button>
                  {/* Report Spam */}
                  <button style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer", padding: 6 }} title="Report spam">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  </button>
                  {/* Delete */}
                  <button style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer", padding: 6 }} title="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                  {/* Mark as unread */}
                  <button style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer", padding: 6 }} title="Mark as unread">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" /><polyline points="22,6 12,13 2,6" /></svg>
                  </button>
                  {/* Add star */}
                  <button
                    onClick={(e) => toggleStar(e, activeEmail.id)}
                    style={{ background: "none", border: "none", color: activeEmail.starred ? "#fbbc04" : "#c4c7c5", cursor: "pointer", padding: 6 }}
                    title={activeEmail.starred ? "Starred" : "Not starred"}
                  >
                    {activeEmail.starred ? "★" : "☆"}
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#8e918f" }}>
                  <span>1 of {emails.length}</span>
                  <button style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer" }}>‹</button>
                  <button style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer" }}>›</button>
                </div>
              </div>

              {/* Thread Content */}
              <div style={{ padding: "24px 32px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: "#e2e2e9" }}>
                    {activeEmail.subject}
                  </h1>
                  <span style={{ fontSize: 12, background: activeEmail.priority === "urgent" ? "rgba(239,68,68,0.2)" : "rgba(138,180,248,0.2)", color: activeEmail.priority === "urgent" ? "#f87171" : "#8ab4f8", padding: "3px 10px", borderRadius: 4, fontWeight: 500 }}>
                    {activeEmail.priority === "urgent" ? "Sev-1 Priority" : "Standard"}
                  </span>
                </div>

                {/* Sender Metadata Bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#4285f4", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>
                    {activeEmail.sender[0]}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{activeEmail.sender}</span>
                      <span style={{ fontSize: 12, color: "#8e918f" }}>&lt;{activeEmail.email}&gt;</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#8e918f" }}>to me ({activeEmail.role})</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 12, color: "#8e918f" }}>{activeEmail.time}</div>
                </div>

                {/* Email Body Text */}
                <div style={{ fontSize: 14, lineHeight: 1.7, color: "#c4c7c5", whiteSpace: "pre-wrap", marginBottom: 32 }}>
                  {activeEmail.body}
                </div>

                {/* GMAIL SMART REPLY DECISION CHIPS */}
                <div style={{ background: "#212228", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18, marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#8ab4f8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                    <span>Gmail Smart Decision Reply:</span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {activeEmail.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectOption(activeEmail.id, opt.label)}
                        style={{
                          padding: "10px 18px",
                          background: decisions[activeEmail.id] === opt.label ? "#004a77" : "#282a30",
                          border: decisions[activeEmail.id] === opt.label ? "1px solid #8ab4f8" : "1px solid rgba(255,255,255,0.12)",
                          color: decisions[activeEmail.id] === opt.label ? "#c2e7ff" : "#e2e2e9",
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>↩</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AUTHENTIC GMAIL REPLY COMPOSER CARD */}
                <div style={{ background: "#282a30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8ab4f8" strokeWidth="2"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                    <span style={{ fontSize: 13, color: "#8ab4f8", fontWeight: 500 }}>
                      Reply to {activeEmail.sender}
                    </span>
                    <span style={{ fontSize: 12, color: "#8e918f" }}>
                      &lt;{activeEmail.email}&gt;
                    </span>
                  </div>

                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Type executive rationale or notes here (e.g. Freezing all deployments and escalating checkout idempotency fix to Engineering)..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "#1e1f24",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      color: "#fff",
                      fontSize: 13,
                      marginBottom: 14,
                      outline: "none",
                      fontFamily: "inherit",
                      resize: "none",
                      lineHeight: 1.5,
                    }}
                  />

                  {/* Gmail Reply Bottom Bar: Send Button + Tool Icons */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Split Send Button */}
                      <button
                        onClick={handlePublishProtocol}
                        disabled={published}
                        style={{
                          background: published ? "#22c55e" : "#0b57d0",
                          color: published ? "#000" : "#fff",
                          border: "none",
                          borderRadius: 24,
                          padding: "10px 24px",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: published ? "default" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }}
                      >
                        <span>{published ? "✓ DISPATCHED" : "Send"}</span>
                        {!published && <span style={{ fontSize: 10 }}>▼</span>}
                      </button>

                      <span style={{ fontSize: 12, color: "#8e918f" }}>
                        {allDecided ? "✓ 4/4 triage items resolved" : `${decisionCount}/4 decisions logged`}
                      </span>
                    </div>

                    {/* Authentic Formatting Toolbar Icons */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#c4c7c5" }}>
                      <span title="Formatting options" style={{ cursor: "pointer", fontSize: 14, fontWeight: 700 }}>A</span>
                      <span title="Attach files" style={{ cursor: "pointer" }}>📎</span>
                      <span title="Insert link" style={{ cursor: "pointer" }}>🔗</span>
                      <span title="Insert emoji" style={{ cursor: "pointer" }}>😊</span>
                      <span title="Insert files using Drive" style={{ cursor: "pointer" }}>▲</span>
                      <span title="Insert photo" style={{ cursor: "pointer" }}>🖼️</span>
                      <span title="Toggle confidential mode" style={{ cursor: "pointer" }}>🔒</span>
                      <button
                        onClick={() => setSummary("")}
                        style={{ background: "none", border: "none", color: "#c4c7c5", cursor: "pointer", padding: 4 }}
                        title="Discard draft"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
