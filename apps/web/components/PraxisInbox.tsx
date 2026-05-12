"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Mock Data ---
export interface PraxisEmail {
  id: string;
  sender: string;
  role: string;
  avatar: string;
  subject: string;
  snippet: string;
  time: string;
  date: string;
  unread: boolean;
  content: string;
}

const MOCK_EMAILS: PraxisEmail[] = [
  {
    id: "1",
    sender: "Taylor Brooks",
    role: "CEO",
    avatar: "TB",
    subject: "URGENT: Pricing Model Pivot",
    snippet: "Team, the board just approved our pivot to usage-based pricing. We need to roll this out by Q3.",
    time: "10:42 AM",
    date: "Today",
    unread: true,
    content: `Team,

The board just approved our pivot to usage-based pricing. We need to roll this out by Q3.

I know our largest enterprise client won't be happy, but we have to push through to ensure long-term sustainability and align our value metrics with actual usage.

Please prepare a migration strategy immediately. We need a cohesive plan that mitigates churn risk while hitting the new revenue targets.

Best,
Taylor`,
  },
  {
    id: "2",
    sender: "Sam Jenkins",
    role: "VP Engineering",
    avatar: "SJ",
    subject: "Re: Q3 Roadmap Feasibility",
    snippet: "Just a heads up, if we're doing the pricing pivot, we have to drop the new Analytics Dashboard...",
    time: "09:15 AM",
    date: "Today",
    unread: false,
    content: `Hey,

Just a heads up: if we're doing the pricing pivot, we absolutely have to drop the new Analytics Dashboard from the Q3 roadmap.

We simply do not have the engineering bandwidth to do both. The billing infrastructure changes required for usage-based pricing are massive.

We need a firm decision on prioritization by Friday. Let me know what you want to cut.

- Sam`,
  },
  {
    id: "3",
    sender: "Jordan Mitchell",
    role: "VP Sales",
    avatar: "JM",
    subject: "Enterprise Client Churn Risk - Acme Corp",
    snippet: "I just got off the phone with Acme Corp. They caught wind of the pricing changes...",
    time: "Yesterday",
    date: "Yesterday",
    unread: false,
    content: `All,

I just got off the phone with Acme Corp. They caught wind of the upcoming pricing changes and they are not happy.

They are currently on the unlimited legacy plan and are threatening to walk if we force them onto a usage-based tier. They account for 12% of our ARR.

We need a solid grandfathering strategy or a massive discount package prepared before my next call with them on Tuesday.

Thoughts?

Jordan`,
  },
  {
    id: "4",
    sender: "Riley Kim",
    role: "Data Lead",
    avatar: "RK",
    subject: "Usage Metrics Discrepancy",
    snippet: "Looking at the initial models for the new pricing tiers, I'm seeing a 15% discrepancy in...",
    time: "Yesterday",
    date: "Yesterday",
    unread: false,
    content: `Hi Team,

Looking at the initial models for the new pricing tiers, I'm seeing a 15% discrepancy in how we track API calls vs how the billing engine measures them.

If we roll out the usage-based pricing with these numbers, we'll either be undercharging or facing severe customer disputes.

I need Product to clarify exactly which endpoints constitute a "billable event" before we can fix the pipeline.

Thanks,
Riley`,
  }
];

const FOLDERS = [
  { id: "inbox", label: "Inbox", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
  ), count: 1 },
  { id: "starred", label: "Starred", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
  ) },
  { id: "sent", label: "Sent", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
  ) },
  { id: "drafts", label: "Drafts", icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
  ) },
];

export default function PraxisInbox({
  themeAccent = "#818cf8",
  onReply
}: {
  themeAccent?: string,
  onReply?: (subject: string) => void
}) {
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>("1");

  const selectedEmail = MOCK_EMAILS.find(e => e.id === selectedEmailId);

  return (
    <div style={{
      display: "flex",
      flex: 1,
      height: "100%",
      background: "rgba(5, 5, 5, 0.4)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      color: "#e4e4e7",
      fontFamily: "'Inter', -apple-system, sans-serif",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Background ambient glows */}
      <div style={{
        position: "absolute",
        top: "-10%",
        left: "-10%",
        width: "50%",
        height: "50%",
        background: `radial-gradient(circle, ${themeAccent}15 0%, transparent 70%)`,
        filter: "blur(60px)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* --- LEFT SIDEBAR: FOLDERS --- */}
      <div style={{
        width: 240,
        background: "rgba(10, 10, 10, 0.6)",
        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        zIndex: 1
      }}>
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${themeAccent}40` }}
          whileTap={{ scale: 0.98 }}
          style={{
            background: `linear-gradient(135deg, ${themeAccent}, ${themeAccent}dd)`,
            color: "#000",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "12px 20px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.5px",
            boxShadow: `0 4px 20px ${themeAccent}20`
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Compose
        </motion.button>

        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.3)", marginBottom: 12, paddingLeft: 12, fontWeight: 600 }}>
          Mailbox
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {FOLDERS.map(folder => {
            const isActive = activeFolder === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: isActive ? `${themeAccent}15` : "transparent",
                  border: "1px solid",
                  borderColor: isActive ? `${themeAccent}30` : "transparent",
                  borderRadius: 10,
                  color: isActive ? themeAccent : "#a1a1aa",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="folder-active-bg"
                    style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: themeAccent }}
                  />
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}>
                  <span style={{ display: "flex", opacity: isActive ? 1 : 0.6 }}>{folder.icon}</span>
                  {folder.label}
                </div>
                {folder.count && (
                  <span style={{
                    background: isActive ? themeAccent : "rgba(255,255,255,0.1)",
                    color: isActive ? "#000" : "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 100,
                    zIndex: 1
                  }}>
                    {folder.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* --- MIDDLE: EMAIL LIST --- */}
      <div style={{
        width: 380,
        background: "rgba(12, 12, 12, 0.4)",
        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1
      }}>
        <div style={{
          padding: "24px 20px 16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(10, 10, 10, 0.5)",
          backdropFilter: "blur(10px)"
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", letterSpacing: "-0.5px" }}>Inbox</div>
          <button style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 6, transition: "background 0.2s" }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l-5.94-5.94"/></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
          {MOCK_EMAILS.map((email) => {
            const isSelected = selectedEmailId === email.id;
            return (
              <motion.div
                key={email.id}
                onClick={() => setSelectedEmailId(email.id)}
                whileHover={!isSelected ? { background: "rgba(255, 255, 255, 0.03)" } : {}}
                style={{
                  padding: "16px",
                  borderRadius: 12,
                  marginBottom: 8,
                  border: "1px solid",
                  borderColor: isSelected ? `${themeAccent}50` : "transparent",
                  background: isSelected ? `${themeAccent}08` : "transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  position: "relative"
                }}
              >
                {email.unread && !isSelected && (
                  <div style={{ position: "absolute", left: 8, top: 22, width: 6, height: 6, borderRadius: "50%", background: themeAccent }} />
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, paddingLeft: email.unread && !isSelected ? 10 : 0 }}>
                  <div style={{ fontSize: 14, fontWeight: email.unread ? 600 : 500, color: email.unread ? "#fff" : "#e4e4e7" }}>
                    {email.sender}
                  </div>
                  <div style={{ fontSize: 11, color: isSelected ? themeAccent : "#71717a", fontWeight: email.unread ? 500 : 400 }}>
                    {email.time}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: email.unread ? 600 : 400, color: email.unread ? "#fff" : "#a1a1aa", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingLeft: email.unread && !isSelected ? 10 : 0 }}>
                  {email.subject}
                </div>
                <div style={{ fontSize: 12, color: "#71717a", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5, paddingLeft: email.unread && !isSelected ? 10 : 0 }}>
                  {email.snippet}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* --- RIGHT: DETAIL VIEW --- */}
      <div style={{
        flex: 1,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        position: "relative",
        zIndex: 1
      }}>
        <AnimatePresence mode="wait">
          {selectedEmail ? (
            <motion.div
              key={selectedEmail.id}
              initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ padding: "40px 48px", display: "flex", flexDirection: "column", minHeight: "100%", maxWidth: 800, margin: "0 auto", width: "100%" }}
            >
              {/* Email Header */}
              <div style={{ marginBottom: 40 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "0 0 32px 0", lineHeight: 1.3, letterSpacing: "-0.5px" }}>
                  {selectedEmail.subject}
                </h1>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: `linear-gradient(135deg, ${themeAccent}20, transparent)`,
                      border: `1px solid ${themeAccent}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: themeAccent, fontWeight: 600, fontSize: 16,
                      boxShadow: `inset 0 0 20px ${themeAccent}10`
                    }}>
                      {selectedEmail.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                        {selectedEmail.sender}
                        <span style={{ fontSize: 11, fontWeight: 500, color: themeAccent, background: `${themeAccent}15`, border: `1px solid ${themeAccent}30`, padding: "2px 8px", borderRadius: 100 }}>
                          {selectedEmail.role}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#71717a", marginTop: 4 }}>
                        to <span style={{ color: "#a1a1aa" }}>Product Team</span>, <span style={{ color: "#a1a1aa" }}>me</span> <span style={{ fontSize: 10 }}>▾</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 12, color: "#71717a", fontWeight: 500 }}>{selectedEmail.date}, {selectedEmail.time}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa", width: 36, height: 36, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
                        onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                      </button>
                      <button style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa", width: 36, height: 36, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
                        onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div style={{
                flex: 1,
                fontSize: 15,
                lineHeight: 1.8,
                color: "#d4d4d8",
                whiteSpace: "pre-wrap",
                fontFamily: "'Inter', sans-serif"
              }}>
                {selectedEmail.content}
              </div>

              {/* Reply Box */}
              <div style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <div style={{
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  background: "rgba(0, 0, 0, 0.3)",
                  padding: 20,
                  cursor: "text",
                  transition: "border-color 0.2s",
                  boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)"
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = `${themeAccent}50`}
                onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"}
                >
                  <div style={{ fontSize: 14, color: "#71717a", marginBottom: 20 }}>Click here to reply...</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onReply && onReply(selectedEmail.subject)}
                      style={{
                        background: themeAccent,
                        color: "#000",
                        border: "none",
                        padding: "10px 24px",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: `0 4px 14px ${themeAccent}30`
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                      Reply in Chat
                    </motion.button>
                    <motion.button
                      whileHover={{ background: "rgba(255,255,255,0.05)" }}
                      style={{
                        background: "transparent",
                        color: "#e4e4e7",
                        border: "1px solid rgba(255,255,255,0.2)",
                        padding: "10px 24px",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7"></polyline><path d="M4 18v-2a4 4 0 0 1 4-4h12"></path></svg>
                      Forward
                    </motion.button>
                  </div>
                </div>
              </div>

            </motion.div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 14 }}>
              Select an item to read
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
