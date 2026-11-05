"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SocialCommandEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onComplete: () => void;
  demoMode: boolean;
}

export default function SocialCommandEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
}: SocialCommandEnvironmentProps) {
  const [sentiment, setSentiment] = useState(28); // 0-100 (28 = Hostile)
  const [selectedResponse, setSelectedResponse] = useState<number | null>(null);
  const [published, setPublished] = useState(false);
  const [mentions, setMentions] = useState([
    {
      user: "Sarah Jenkins (@tech_sarah)",
      handle: "@tech_sarah",
      avatar: "SJ",
      text: "Are you kidding me @AuraCommerce? You literally charged my card TWICE for a single coat and your checkout crashed, and you tweet 'shop till you drop'?? Read the room!! 😡",
      time: "1m ago",
      likes: "2.4k",
      sentiment: "negative",
    },
    {
      user: "E-Commerce Watch (@ecommerce_fail)",
      handle: "@ecommerce_fail",
      avatar: "EW",
      text: "Aura Commerce having a full checkout meltdown on Black Friday eve while their social scheduler posts hype tweets. Avoid buying right now.",
      time: "3m ago",
      likes: "890",
      sentiment: "negative",
    },
    {
      user: "Marcus Chen (@mchen_dev)",
      handle: "@mchen_dev",
      avatar: "MC",
      text: "Double charge glitch confirmed on @AuraCommerce checkout. Looks like a race condition in payment idempotency.",
      time: "5m ago",
      likes: "412",
      sentiment: "negative",
    },
  ]);

  const responseOptions = [
    {
      id: 1,
      title: "Transparent & Accountable (Recommended)",
      text: "We hear you loud and clear. Our checkout experienced a concurrency bug causing duplicate pending debits for a small set of orders. The bug has been fixed, zero data was compromised, and all duplicate authorizations are being automatically voided right now. We are deeply sorry for the stress heading into Black Friday.",
      isOptimal: true,
    },
    {
      id: 2,
      title: "Defensive (Blame Third-Party Banks)",
      text: "The issue is due to external card network delays and high traffic from credit card issuers, not our system. Please take it up with your bank before posting online.",
      isOptimal: false,
    },
    {
      id: 3,
      title: "Dismissive Corporate Boilerplate",
      text: "We are aware of minor latency and thank our community for their patience. Our Black Friday discounts remain active!",
      isOptimal: false,
    },
  ];

  const handlePublish = (optId: number) => {
    setSelectedResponse(optId);
    setPublished(true);

    const chosen = responseOptions.find((o) => o.id === optId);
    if (chosen?.isOptimal) {
      setSentiment(86);
      onAction(`[VICTORY] Brand Lead published authentic crisis statement: "${chosen.text.substring(0, 100)}...". Sentiment surged to 86% Positive.`);

      // Add positive incoming tweets
      setTimeout(() => {
        setMentions((prev) => [
          {
            user: "Sarah Jenkins (@tech_sarah)",
            handle: "@tech_sarah",
            avatar: "SJ",
            text: "Appreciate the fast, honest accountability and auto-void @AuraCommerce. That's how you handle an outage. Reordering now 👍",
            time: "Just now",
            likes: "1.2k",
            sentiment: "positive",
          },
          {
            user: "Marcus Chen (@mchen_dev)",
            handle: "@mchen_dev",
            avatar: "MC",
            text: "Solid crisis communication from @AuraCommerce. Clear technical root cause and automated remedy.",
            time: "Just now",
            likes: "540",
            sentiment: "positive",
          },
          ...prev,
        ]);
      }, 600);

      setTimeout(() => {
        onComplete();
      }, 3400);
    } else {
      setSentiment(14);
      onAction(`[BRAND_ACTION] Defensive reply published. Sentiment dropped to 14% Hostile.`);
    }
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
        gridTemplateColumns: "1fr 420px",
        overflow: "hidden",
      }}
    >
      {/* LEFT: MENTIONS FEED & VIRAL TWEET */}
      <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid #1e293b", background: "#05070d" }}>
        {/* Header */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #1e293b", background: "#080c14", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>📱</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
              AURA BRAND COMMAND // LIVE MENTIONS
            </span>
          </div>
          <span style={{ fontSize: 10, background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
            🔥 VIRAL CRISIS DETECTED
          </span>
        </div>

        {/* Viral Scheduled Tweet that sparked the outrage */}
        <div style={{ padding: 16, background: "#0b101c", borderBottom: "1px solid #1e293b" }}>
          <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>
            INCITING POST (SCHEDULED TWEET):
          </div>
          <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, marginBottom: 6 }}>
            @AuraCommerce: "Ready to splurge this Black Friday? Shop till you drop! 🛍️✨"
          </div>
          <div style={{ fontSize: 10, color: "#64748b" }}>
            Sent 15m ago • 2,410 Retweets • 8,920 Quote Tweets (94% Negative Sentiment)
          </div>
        </div>

        {/* Live Mentions Stream */}
        <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {mentions.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: m.sentiment === "positive" ? "rgba(34,197,94,0.08)" : "#0b101c",
                border: m.sentiment === "positive" ? "1px solid #22c55e" : "1px solid #1e293b",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: m.sentiment === "positive" ? "#22c55e" : "#fff" }}>
                  {m.user}
                </span>
                <span style={{ fontSize: 10, color: "#64748b" }}>{m.time}</span>
              </div>
              <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5, marginBottom: 6 }}>
                {m.text}
              </div>
              <div style={{ fontSize: 10, color: "#64748b" }}>❤️ {m.likes}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* RIGHT: SENTIMENT DIAL & RESPONSE COMPOSER */}
      <div style={{ background: "#080c16", display: "flex", flexDirection: "column" }}>
        {/* Sentiment Dial Gauge */}
        <div style={{ padding: 20, borderBottom: "1px solid #1e293b", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 12 }}>
            REAL-TIME PUBLIC SENTIMENT
          </div>

          <div style={{ position: "relative", width: 180, height: 100, margin: "0 auto" }}>
            <svg viewBox="0 0 180 100" style={{ width: "100%", height: "100%" }}>
              {/* Dial track */}
              <path d="M 20,90 A 70,70 0 0,1 160,90" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
              {/* Dial active arc */}
              <motion.path
                d="M 20,90 A 70,70 0 0,1 160,90"
                fill="none"
                stroke={sentiment > 60 ? "#22c55e" : sentiment > 40 ? "#f59e0b" : "#ef4444"}
                strokeWidth="12"
                strokeDasharray="220"
                strokeDashoffset={220 - (sentiment / 100) * 220}
                strokeLinecap="round"
                animate={{ strokeDashoffset: 220 - (sentiment / 100) * 220 }}
                transition={{ duration: 0.8 }}
              />
            </svg>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: sentiment > 60 ? "#22c55e" : "#ef4444" }}>
                {sentiment}%
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>
                {sentiment > 60 ? "SUPPORTIVE" : "HOSTILE"}
              </div>
            </div>
          </div>
        </div>

        {/* Brand Guidelines */}
        <div style={{ padding: 14, background: "#0b101c", borderBottom: "1px solid #1e293b", fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>Brand Voice Guidelines:</span>
          <div>1. Own the glitch directly. Never blame users or external banks.</div>
          <div>2. State immediate resolution: all double authorizations auto-refunded.</div>
        </div>

        {/* Response Chooser */}
        <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>
            Select Crisis Response Tweet:
          </div>

          {responseOptions.map((opt) => (
            <div
              key={opt.id}
              onClick={() => handlePublish(opt.id)}
              style={{
                padding: 12,
                background: selectedResponse === opt.id ? "rgba(34,197,94,0.15)" : "#0b101c",
                border: selectedResponse === opt.id ? "1px solid #22c55e" : "1px solid #1e293b",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: opt.isOptimal ? "#22c55e" : "#f59e0b", marginBottom: 4 }}>
                {opt.title}
              </div>
              <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.4 }}>
                "{opt.text}"
              </div>
            </div>
          ))}

          <AnimatePresence>
            {published && sentiment > 60 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  marginTop: 10,
                  padding: 12,
                  background: "rgba(34,197,94,0.15)",
                  border: "1px solid #22c55e",
                  borderRadius: 6,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: "#22c55e" }}>
                  🎉 PR CRISIS DEFUSED!
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>
                  Community sentiment turned supportive. Routing to evaluation...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
