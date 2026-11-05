"use client";

import React, { useState } from "react";
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
  const [activeEmailId, setActiveEmailId] = useState<string | null>("email_1");
  const [activeFolder, setActiveFolder] = useState<"inbox" | "starred" | "sent" | "drafts">("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [customReply, setCustomReply] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
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

  const [starredIds, setStarredIds] = useState<Record<string, boolean>>({
    email_1: true,
    email_2: true,
  });

  const activeEmail = emails.find((e) => e.id === activeEmailId);

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredEmails = emails.filter((item) => {
    if (activeFolder === "starred") return !!starredIds[item.id];
    if (activeFolder === "sent") return false;
    if (activeFolder === "drafts") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.subject.toLowerCase().includes(q) ||
        item.sender.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const decisionCount = Object.keys(decisions).length;
  const isTriageComplete = decisionCount >= 3;

  const handleSendCompose = () => {
    if (!composeTo.trim()) return;
    onAction(`[GMAIL_COMPOSE] To: ${composeTo} | Subject: "${composeSubject}" | Body: "${composeBody.slice(0, 80)}..."`);
    setIsComposeOpen(false);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
  };

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
      }, 2400);
    } catch (err) {
      console.error("Protocol dispatch error:", err);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#111318",
        color: "#e2e2e9",
        fontFamily: "'Roboto', 'Google Sans', 'Inter', -apple-system, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ─── GOOGLE GMAIL SUB-HEADER ──────────────────────────── */}
      <div
        style={{
          height: 56,
          padding: "0 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "#1a1c22",
        }}
      >
        {/* Left: Gmail branding & workspace badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="24" height="19" viewBox="0 0 24 19" fill="none">
            <path d="M1.5 17.5V4.5L12 11.5L22.5 4.5V17.5C22.5 18.05 22.05 18.5 21.5 18.5H2.5C1.95 18.5 1.5 18.05 1.5 17.5Z" fill="#EA4335" />
            <path d="M22.5 4.5L12 11.5L1.5 4.5V2.5C1.5 1.95 1.95 1.5 2.5 1.5H21.5C22.05 1.5 22.5 1.95 22.5 2.5V4.5Z" fill="#FBBC04" />
            <path d="M1.5 4.5L12 11.5L7 15L1.5 11V4.5Z" fill="#4285F4" />
            <path d="M22.5 4.5L12 11.5L17 15L22.5 11V4.5Z" fill="#34A853" />
          </svg>
          <span style={{ fontSize: 17, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px" }}>Gmail</span>
          <span style={{ fontSize: 11, background: "rgba(138,180,248,0.18)", color: "#8ab4f8", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
            Aura Executive Suite
          </span>
        </div>

        {/* Center: Search input */}
        <div style={{ flex: 1, maxWidth: 540, margin: "0 24px" }}>
          <div
            style={{
              background: "#26282f",
              borderRadius: 24,
              height: 38,
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              gap: 10,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search stakeholder emails, bugs, or alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: 13,
                fontFamily: "inherit",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 12 }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Quick Protocol Dispatcher trigger */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setIsProtocolModalOpen(true)}
            style={{
              background: isTriageComplete ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "rgba(37,99,235,0.2)",
              color: isTriageComplete ? "#ffffff" : "#93c5fd",
              border: isTriageComplete ? "1px solid #3b82f6" : "1px solid rgba(59,130,246,0.3)",
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: isTriageComplete ? "0 2px 10px rgba(37,99,235,0.4)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            <span>🚨</span>
            <span>Dispatch Protocol ({decisionCount}/{emails.length || 5})</span>
          </button>
        </div>
      </div>

      {/* ─── MAIN GMAIL WORKSPACE (SIDEBAR + CONTENT) ───────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Sidebar */}
        <div
          style={{
            width: 240,
            background: "#14161d",
            padding: "16px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Authentic Compose Button */}
          <button
            onClick={() => setIsComposeOpen(true)}
            style={{
              background: "#c2e7ff",
              color: "#001d35",
              border: "none",
              borderRadius: 16,
              height: 48,
              padding: "0 20px",
              fontSize: 14,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
              marginBottom: 12,
              transition: "transform 0.1s ease",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Compose</span>
          </button>

          {/* Nav Links */}
          <div
            onClick={() => {
              setActiveFolder("inbox");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 14px",
              height: 34,
              borderRadius: 17,
              background: activeFolder === "inbox" ? "#004a77" : "transparent",
              color: activeFolder === "inbox" ? "#c2e7ff" : "#c4c7c5",
              fontWeight: activeFolder === "inbox" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
              <span>Inbox</span>
            </div>
            <span style={{ fontSize: 11, background: "rgba(255,255,255,0.1)", padding: "1px 6px", borderRadius: 8 }}>
              {emails.filter((e) => e.unread).length}
            </span>
          </div>

          <div
            onClick={() => setActiveFolder("starred")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 14px",
              height: 34,
              borderRadius: 17,
              background: activeFolder === "starred" ? "#004a77" : "transparent",
              color: activeFolder === "starred" ? "#c2e7ff" : "#c4c7c5",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Starred</span>
          </div>

          {/* Labels section */}
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#71717a",
                padding: "0 14px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: 8,
              }}
            >
              Categories
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", fontSize: 12, color: "#cbd5e1" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
              <span>Sev-1 Incidents</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", fontSize: 12, color: "#cbd5e1" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
              <span>VIP Merchants</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", fontSize: 12, color: "#cbd5e1" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8" }} />
              <span>Executive / CEO</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", fontSize: 12, color: "#cbd5e1" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
              <span>Growth Marketing</span>
            </div>
          </div>

          {/* Launch triage status widget */}
          <div
            style={{
              marginTop: "auto",
              padding: 12,
              background: "#1a1c24",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#93c5fd", marginBottom: 4 }}>
              Triage Status: {decisionCount}/{emails.length || 5}
            </div>
            <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, (decisionCount / (emails.length || 5)) * 100)}%`,
                  height: "100%",
                  background: isTriageComplete ? "#22c55e" : "#3b82f6",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
              {isTriageComplete ? "✓ Ready to dispatch launch protocol" : "Review and resolve all urgent items"}
            </div>
          </div>
        </div>

        {/* Middle: Email List Pane */}
        <div
          style={{
            width: 360,
            background: "#181a22",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Email count banner */}
          <div
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              fontSize: 12,
              color: "#94a3b8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{filteredEmails.length} Conversations</span>
            <span style={{ color: "#22c55e", fontWeight: 600 }}>
              {decisionCount} Triaged
            </span>
          </div>

          {/* List items */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredEmails.map((item) => {
              const isSelected = item.id === activeEmailId;
              const hasDecided = !!decisions[item.id];
              const isStarred = !!starredIds[item.id];

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveEmailId(item.id)}
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: isSelected ? "#232632" : item.unread ? "#1c1e28" : "transparent",
                    borderLeft: isSelected ? "3px solid #8ab4f8" : "3px solid transparent",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        onClick={(e) => toggleStar(e, item.id)}
                        style={{ color: isStarred ? "#fbbc04" : "#64748b", fontSize: 14 }}
                      >
                        {isStarred ? "★" : "☆"}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: item.unread ? 700 : 500,
                          color: item.unread ? "#fff" : "#cbd5e1",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 190,
                        }}
                      >
                        {item.sender}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{item.time}</span>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: item.unread ? 600 : 400,
                      color: item.unread ? "#e2e8f0" : "#94a3b8",
                      marginBottom: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.subject}
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
                    {item.preview}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {item.priority === "urgent" && (
                      <span
                        style={{
                          fontSize: 9,
                          background: "rgba(239,68,68,0.2)",
                          color: "#f87171",
                          padding: "1px 6px",
                          borderRadius: 3,
                          fontWeight: 700,
                        }}
                      >
                        SEV-1
                      </span>
                    )}
                    {hasDecided && (
                      <span
                        style={{
                          fontSize: 9,
                          background: "rgba(34,197,94,0.15)",
                          border: "1px solid #22c55e",
                          color: "#22c55e",
                          padding: "1px 6px",
                          borderRadius: 3,
                          fontWeight: 700,
                        }}
                      >
                        ✓ RESOLVED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Email Detail & Smart Triage Pane */}
        <div style={{ flex: 1, background: "#1b1d26", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {activeEmail ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
              {/* Detail Header / Actions */}
              <div
                style={{
                  height: 48,
                  padding: "0 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: "#1f222c",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    onClick={(e) => toggleStar(e, activeEmail.id)}
                    style={{
                      cursor: "pointer",
                      color: starredIds[activeEmail.id] ? "#fbbc04" : "#94a3b8",
                      fontSize: 16,
                    }}
                  >
                    {starredIds[activeEmail.id] ? "★" : "☆"}
                  </span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{activeEmail.role}</span>
                </div>

                {/* Convert to Linear Issue button */}
                <button
                  onClick={() => onConvertEmailToIssue(activeEmail)}
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.4)",
                    color: "#a5b4fc",
                    padding: "4px 12px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "background 0.15s ease",
                  }}
                  title="Export email context into Linear backlog"
                >
                  <span>📋</span>
                  <span>Convert to Linear User Story</span>
                </button>
              </div>

              {/* Thread Content */}
              <div style={{ padding: "24px 28px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "#fff", lineHeight: 1.3 }}>
                    {activeEmail.subject}
                  </h2>
                  <span
                    style={{
                      fontSize: 11,
                      background: activeEmail.priority === "urgent" ? "rgba(239,68,68,0.2)" : "rgba(138,180,248,0.15)",
                      color: activeEmail.priority === "urgent" ? "#f87171" : "#93c5fd",
                      padding: "3px 10px",
                      borderRadius: 4,
                      fontWeight: 600,
                    }}
                  >
                    {activeEmail.priority === "urgent" ? "Urgent Escalation" : "General Request"}
                  </span>
                </div>

                {/* Sender info */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "#3b82f6",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    {activeEmail.sender[0]}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{activeEmail.sender}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>&lt;{activeEmail.email}&gt;</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#71717a" }}>to me (Product Manager // Black Friday Lead)</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>{activeEmail.time}</div>
                </div>

                {/* Body */}
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: "#cbd5e1",
                    whiteSpace: "pre-wrap",
                    marginBottom: 28,
                    background: "#161820",
                    padding: 20,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  {activeEmail.body}
                </div>

                {/* ─── GMAIL SMART REPLY PILLS ──────────────────────── */}
                <div
                  style={{
                    background: "#222530",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#8ab4f8",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Smart Reply / Strategic Decision Pills</span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {activeEmail.options.map((opt, i) => {
                      const isChosen = decisions[activeEmail.id] === opt.label;
                      return (
                        <button
                          key={i}
                          onClick={() => onSelectOption(activeEmail.id, opt.label)}
                          style={{
                            padding: "9px 16px",
                            background: isChosen ? "#004a77" : "#2a2d3a",
                            border: isChosen ? "1px solid #8ab4f8" : "1px solid rgba(255,255,255,0.1)",
                            color: isChosen ? "#c2e7ff" : "#e2e8f0",
                            borderRadius: 18,
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span>{isChosen ? "✓" : "↩"}</span>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ─── AUTHENTIC GMAIL REPLY COMPOSER CARD ───────────── */}
                <div
                  style={{
                    background: "#242733",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8ab4f8" strokeWidth="2">
                      <polyline points="9 17 4 12 9 7" />
                      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                    </svg>
                    <span style={{ fontSize: 13, color: "#8ab4f8", fontWeight: 600 }}>
                      Send direct reply to {activeEmail.sender}
                    </span>
                  </div>

                  <textarea
                    value={customReply}
                    onChange={(e) => setCustomReply(e.target.value)}
                    placeholder="Type executive rationale or custom directives (e.g. Enforcing deployment freeze and prioritizing checkout idempotency fix)..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "#181a24",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 13,
                      marginBottom: 12,
                      outline: "none",
                      fontFamily: "inherit",
                      resize: "none",
                    }}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      onClick={() => {
                        if (!customReply.trim()) return;
                        onAction(`[GMAIL_REPLY] To: ${activeEmail.sender} | Decision: "${customReply}"`);
                        setCustomReply("");
                      }}
                      style={{
                        background: "#0b57d0",
                        color: "#fff",
                        border: "none",
                        borderRadius: 18,
                        padding: "8px 20px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Send Message
                    </button>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      Decision logged: {decisions[activeEmail.id] || "Pending choice"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
              Select a conversation from the left to view details
            </div>
          )}
        </div>
      </div>

      {/* ─── AUTHENTIC GMAIL COMPOSE MODAL ─────────────────────── */}
      <AnimatePresence>
        {isComposeOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            style={{
              position: "absolute",
              bottom: 0,
              right: 32,
              width: 520,
              height: 480,
              background: "#242733",
              borderRadius: "12px 12px 0 0",
              boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              flexDirection: "column",
              zIndex: 990,
              overflow: "hidden",
            }}
          >
            {/* Modal Title Bar */}
            <div
              style={{
                height: 40,
                background: "#1e212c",
                padding: "0 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>New Executive Message</span>
              <button
                onClick={() => setIsComposeOpen(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            {/* Inputs */}
            <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <input
                type="text"
                placeholder="Recipients (e.g. alex.chen@aura.commerce, taylor.brooks@aura.commerce)"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fff",
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <input
                type="text"
                placeholder="Subject"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              />
            </div>

            {/* Body */}
            <textarea
              placeholder="Compose strategic directive or escalation instructions..."
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              style={{
                flex: 1,
                padding: 14,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#e2e8f0",
                fontSize: 13,
                lineHeight: 1.6,
                fontFamily: "inherit",
                resize: "none",
              }}
            />

            {/* Footer */}
            <div
              style={{
                height: 52,
                padding: "0 14px",
                background: "#1e212c",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <button
                onClick={handleSendCompose}
                style={{
                  background: "#0b57d0",
                  color: "#fff",
                  border: "none",
                  borderRadius: 18,
                  padding: "8px 24px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Send
              </button>
              <div style={{ display: "flex", gap: 12, color: "#94a3b8", fontSize: 14 }}>
                <span>A</span>
                <span>📎</span>
                <span>🔗</span>
                <span>😊</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              style={{
                width: 600,
                background: "#181a24",
                borderRadius: 12,
                border: "1px solid rgba(59,130,246,0.3)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(30,41,59,0.5))",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🚨</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, color: "#fff", fontWeight: 700 }}>
                      Black Friday Launch Protocol Dispatcher
                    </h3>
                    <p style={{ margin: 0, fontSize: 11, color: "#93c5fd" }}>
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
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase" }}>
                  Launch Gates & Risk Containment
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#e2e8f0", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={deployFreeze}
                      onChange={(e) => setDeployFreeze(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
                    />
                    <span>
                      <strong>Enforce Deployment Freeze:</strong> Hold Taylor Brooks' gift card banner release until checkout fix is stable.
                    </span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#e2e8f0", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={sev1Escalated}
                      onChange={(e) => setSev1Escalated(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
                    />
                    <span>
                      <strong>Sev-1 Priority Assignment:</strong> Assign checkout double-charge idempotency fix to Alex Chen in Engineering.
                    </span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#e2e8f0", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={marketingBlastPaused}
                      onChange={(e) => setMarketingBlastPaused(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
                    />
                    <span>
                      <strong>Pause Marketing Surge:</strong> Hold Chloe Zhao's 500,000 promotional email campaign to prevent traffic overload.
                    </span>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#e2e8f0", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={merchantReassured}
                      onChange={(e) => setMerchantReassured(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
                    />
                    <span>
                      <strong>Merchant Assurance:</strong> Provide Marcus Vance at Nordic Goods with formal containment and zero-data-loss SLA.
                    </span>
                  </label>
                </div>

                {/* Executive Summary */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                    Executive Rationale & Strategy Summary:
                  </div>
                  <textarea
                    value={executiveSummary}
                    onChange={(e) => setExecutiveSummary(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: 10,
                      background: "#11131a",
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

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button
                    onClick={() => setIsProtocolModalOpen(false)}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.15)",
                      color: "#94a3b8",
                      padding: "8px 16px",
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleDispatchProtocol}
                    disabled={protocolSubmitted}
                    style={{
                      background: protocolSubmitted ? "#22c55e" : "#2563eb",
                      color: "#fff",
                      border: "none",
                      padding: "8px 22px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: protocolSubmitted ? "default" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>{protocolSubmitted ? "✓ Dispatched" : "Publish & Finalize Triage"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
