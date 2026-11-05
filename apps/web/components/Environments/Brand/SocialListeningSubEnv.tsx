"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BrandCrisisSubEnvProps, BrandMention, SocialPlatform, KeywordSpike } from "./types";
import { submitBrandCrisisAction } from "../../../actions/eval";

const INITIAL_KEYWORD_SPIKES: KeywordSpike[] = [
  { keyword: "#AuraOutage", count: "18.4k", change: "+1,420%", isSpike: true, severity: "critical" },
  { keyword: "charged twice", count: "12.1k", change: "+890%", isSpike: true, severity: "critical" },
  { keyword: "checkout crash", count: "8.9k", change: "+650%", isSpike: true, severity: "high" },
  { keyword: "boycott Aura", count: "4.2k", change: "+340%", isSpike: true, severity: "high" },
  { keyword: "refund idempotency", count: "3.1k", change: "+520%", isSpike: true, severity: "moderate" },
];

export default function SocialListeningSubEnv({
  sessionId,
  sentiment,
  mentions,
  setMentions,
  onAction,
  demoMode,
  navigateToSubEnv,
}: BrandCrisisSubEnvProps) {
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | "all">("all");
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "hostile" | "positive">("all");
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  // Periodic streaming simulation
  useEffect(() => {
    if (!isStreaming) return;

    const streamInterval = setInterval(() => {
      // If sentiment is positive (>60), stream positive responses, else hostile complaints
      const isPositiveMode = sentiment > 60;
      const newItems: BrandMention[] = isPositiveMode
        ? [
            {
              id: `stream-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              platform: "twitter",
              author: "Alex Morgan (@alexm_tech)",
              handle: "@alexm_tech",
              avatar: "AM",
              verified: true,
              followerCount: "42.1k",
              text: "Aura Commerce just proved how to handle a Sev-1 outage. Transparent root cause explanation and automated card voiding. Respect! 👏 #AuraOutage",
              timestamp: "Just now",
              likes: "420",
              retweets: "86",
              sentiment: "positive",
              reachImpact: "HIGH",
            },
            {
              id: `stream-ig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              platform: "instagram",
              author: "Devon Reed (@devon_style)",
              handle: "@devon_style",
              avatar: "DR",
              verified: false,
              followerCount: "12.8k",
              text: "Checked my banking app and the duplicate pending charge was already voided! That was scary fast. Thank you @AuraCommerce ❤️ #chargedtwice",
              timestamp: "Just now",
              likes: "310",
              sentiment: "positive",
              reachImpact: "MODERATE",
            },
          ]
        : [
            {
              id: `stream-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              platform: "twitter",
              author: "Elena Vasquez (@elena_ux)",
              handle: "@elena_ux",
              avatar: "EV",
              verified: true,
              followerCount: "19.4k",
              text: "Wait did @AuraCommerce seriously schedule a 'Shop Till You Drop' tweet while hundreds of shoppers are getting charged twice?! Read the room!! 🤬 #AuraOutage #chargedtwice",
              timestamp: "Just now",
              likes: "612",
              retweets: "180",
              sentiment: "hostile",
              reachImpact: "HIGH",
            },
            {
              id: `stream-rd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              platform: "reddit",
              author: "u/payment_engineer",
              handle: "r/ecommerce",
              avatar: "PE",
              verified: false,
              followerCount: "8.1k",
              text: "Aura checkout crash race condition: payment idempotency token unverified before credit card debit. Urgent refund idempotency fix needed! #AuraOutage #boycottAura",
              timestamp: "Just now",
              likes: "245",
              sentiment: "negative",
              reachImpact: "MODERATE",
            },
          ];

      const itemToAdd = newItems[Math.floor(Math.random() * newItems.length)];
      setMentions((prev) => [itemToAdd, ...prev.slice(0, 24)]);
    }, demoMode ? 4000 : 7000);

    return () => clearInterval(streamInterval);
  }, [isStreaming, sentiment, demoMode, setMentions]);

  // Flag mention action
  const handleFlagMention = async (mention: BrandMention) => {
    setFlaggedIds((prev) => new Set(prev).add(mention.id));
    await onAction(
      `[BRAND_LISTENING] Flagged high-impact viral mention from ${mention.handle} (${mention.followerCount} followers) for prioritized PR triage.`
    );
    try {
      await submitBrandCrisisAction(sessionId, {
        actionType: "FLAG_MENTION",
        outlet: mention.handle,
        statementText: mention.text,
      });
    } catch (e: unknown) {
      console.warn("Telemetry submission fallback:", e);
    }
  };

  // Filter mentions
  const filteredMentions = mentions.filter((m) => {
    if (platformFilter !== "all" && m.platform !== platformFilter) return false;
    if (sentimentFilter === "hostile" && m.sentiment !== "hostile" && m.sentiment !== "negative") return false;
    if (sentimentFilter === "positive" && m.sentiment !== "positive") return false;
    if (selectedKeyword) {
      const kwNorm = selectedKeyword.toLowerCase().replace(/#/g, "").trim();
      const textNorm = m.text.toLowerCase();
      const kwWords = kwNorm.split(/\s+/);
      const matches = kwWords.every((w) => textNorm.includes(w)) || textNorm.includes(kwNorm);
      if (!matches) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const textNorm = m.text.toLowerCase();
      const authorNorm = m.author.toLowerCase();
      const handleNorm = m.handle.toLowerCase();
      if (!textNorm.includes(q) && !authorNorm.includes(q) && !handleNorm.includes(q)) return false;
    }
    return true;
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        height: "100%",
        width: "100%",
        background: "#05070e",
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', -apple-system, monospace",
        overflow: "hidden",
      }}
    >
      {/* ─── LEFT: LIVE SOCIAL STREAM & INCITING VIRAL INCIDENT ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #1e293b",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Stream Control Bar */}
        <div
          style={{
            padding: "12px 20px",
            background: "#080c18",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  height: 10,
                  width: 10,
                  borderRadius: "50%",
                  backgroundColor: isStreaming ? "#22c55e" : "#eab308",
                  boxShadow: isStreaming ? "0 0 10px #22c55e" : "none",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "1px" }}>
                LIVE SOCIAL LISTENING // STREAM INGEST
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                background: "rgba(236,72,153,0.15)",
                color: "#ec4899",
                border: "1px solid rgba(236,72,153,0.3)",
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 700,
              }}
            >
              412 MENTIONS/MIN
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Live Search Input Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#050814",
                border: "1px solid #1e293b",
                borderRadius: 4,
                padding: "3px 8px",
              }}
            >
              <span style={{ fontSize: 10, color: "#64748b" }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mentions, @handle..."
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#f8fafc",
                  fontSize: 10,
                  outline: "none",
                  fontFamily: "'JetBrains Mono', monospace",
                  width: 140,
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: 9,
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setIsStreaming(!isStreaming)}
              style={{
                background: isStreaming ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.08)",
                border: isStreaming ? "1px solid #22c55e" : "1px solid #334155",
                color: isStreaming ? "#22c55e" : "#94a3b8",
                fontSize: 10,
                padding: "4px 10px",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {isStreaming ? "● STREAM ACTIVE" : "⏸ PAUSED"}
            </button>
            {navigateToSubEnv && (
              <button
                onClick={() => navigateToSubEnv("studio")}
                style={{
                  background: "#ec4899",
                  border: "none",
                  color: "#fff",
                  fontSize: 11,
                  padding: "5px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                }}
              >
                GO TO RESPONSE STUDIO ▶
              </button>
            )}
          </div>
        </div>

        {/* Inciting Viral Tweet & Quote-Tweet Tracker */}
        <div
          style={{
            padding: "16px 20px",
            background: "#0c1222",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🔥</span>
              <span style={{ fontSize: 11, fontWeight: 900, color: "#ef4444", letterSpacing: "1px" }}>
                INCITING CRISIS EVENT // VIRAL QUOTE-TWEET CASCADE
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                background: "rgba(239,68,68,0.2)",
                color: "#f87171",
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 800,
              }}
            >
              +380 QTs/MIN VELOCITY
            </span>
          </div>

          <div
            style={{
              background: "#070a14",
              border: "1px solid #334155",
              borderRadius: 6,
              padding: "12px 14px",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#ec4899",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 900,
                  color: "#fff",
                }}
              >
                AC
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>Aura Commerce</span>
              <span style={{ fontSize: 10, color: "#38bdf8" }}>✓ Verified Brand</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>@AuraCommerce • 18m ago</span>
            </div>
            <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>
              "Ready to splurge this Black Friday? Shop till you drop! 🛍️✨ Deals launch at midnight!"
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                paddingTop: 8,
                borderTop: "1px solid #1e293b",
                fontSize: 11,
              }}
            >
              <div>
                <div style={{ color: "#64748b", fontSize: 9 }}>RETWEETS</div>
                <div style={{ fontWeight: 800, color: "#fff" }}>2,410</div>
              </div>
              <div>
                <div style={{ color: "#ef4444", fontSize: 9 }}>QUOTE TWEETS</div>
                <div style={{ fontWeight: 900, color: "#ef4444" }}>8,920 (94% Neg)</div>
              </div>
              <div>
                <div style={{ color: "#64748b", fontSize: 9 }}>REACH</div>
                <div style={{ fontWeight: 800, color: "#fff" }}>1.4M Potential</div>
              </div>
              <div>
                <div style={{ color: "#f59e0b", fontSize: 9 }}>SENTIMENT IMPACT</div>
                <div style={{ fontWeight: 800, color: "#f59e0b" }}>-72% Plummet</div>
              </div>
            </div>
          </div>

          {/* Quick Filter Bar */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>PLATFORM:</span>
            {(["all", "twitter", "instagram", "threads", "reddit"] as const).map((plat) => (
              <button
                key={plat}
                onClick={() => setPlatformFilter(plat)}
                style={{
                  background: platformFilter === plat ? "rgba(236,72,153,0.2)" : "#0f172a",
                  border: platformFilter === plat ? "1px solid #ec4899" : "1px solid #1e293b",
                  color: platformFilter === plat ? "#ec4899" : "#94a3b8",
                  padding: "3px 8px",
                  borderRadius: 4,
                  fontSize: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {plat === "all" ? "All Channels" : plat}
              </button>
            ))}

            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginLeft: 8 }}>MOOD:</span>
            <button
              onClick={() => setSentimentFilter(sentimentFilter === "hostile" ? "all" : "hostile")}
              style={{
                background: sentimentFilter === "hostile" ? "rgba(239,68,68,0.2)" : "#0f172a",
                border: sentimentFilter === "hostile" ? "1px solid #ef4444" : "1px solid #1e293b",
                color: sentimentFilter === "hostile" ? "#ef4444" : "#94a3b8",
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 10,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              🔥 Hostile Only
            </button>
            <button
              onClick={() => setSentimentFilter(sentimentFilter === "positive" ? "all" : "positive")}
              style={{
                background: sentimentFilter === "positive" ? "rgba(34,197,94,0.2)" : "#0f172a",
                border: sentimentFilter === "positive" ? "1px solid #22c55e" : "1px solid #1e293b",
                color: sentimentFilter === "positive" ? "#22c55e" : "#94a3b8",
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 10,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              💚 Supportive Only
            </button>
          </div>
        </div>

        {/* Mentions Feed */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "#05070e",
          }}
        >
          <AnimatePresence>
            {filteredMentions.map((m) => {
              const isFlagged = flaggedIds.has(m.id);
              const isPositive = m.sentiment === "positive";
              const isHostile = m.sentiment === "hostile" || m.sentiment === "negative";

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    background: isPositive
                      ? "rgba(34,197,94,0.06)"
                      : isFlagged
                      ? "rgba(236,72,153,0.08)"
                      : "#0b101e",
                    border: isPositive
                      ? "1px solid rgba(34,197,94,0.3)"
                      : isFlagged
                      ? "1px solid #ec4899"
                      : "1px solid #1e293b",
                    borderRadius: 8,
                    padding: 14,
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: isPositive ? "#15803d" : "#1e293b",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 800,
                          border: isPositive ? "1px solid #22c55e" : "1px solid #475569",
                        }}
                      >
                        {m.avatar}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{m.author}</span>
                          {m.verified && <span style={{ fontSize: 10, color: "#38bdf8" }}>✓</span>}
                          <span style={{ fontSize: 10, color: "#64748b" }}>{m.handle}</span>
                        </div>
                        <div style={{ fontSize: 9, color: "#64748b" }}>
                          {m.followerCount} followers • Platform: {m.platform.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontWeight: 800,
                          background: isPositive
                            ? "rgba(34,197,94,0.15)"
                            : isHostile
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(148,163,184,0.15)",
                          color: isPositive ? "#22c55e" : isHostile ? "#ef4444" : "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        {m.sentiment}
                      </span>
                      <span style={{ fontSize: 10, color: "#64748b" }}>{m.timestamp}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "#e2e8f0", lineHeight: 1.5, marginBottom: 8 }}>
                    {m.text}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#64748b" }}>
                      <span>❤️ {m.likes}</span>
                      {m.retweets && <span>🔁 {m.retweets}</span>}
                      {m.reachImpact && (
                        <span style={{ color: m.reachImpact === "CRITICAL" ? "#ef4444" : "#f59e0b" }}>
                          ⚡ {m.reachImpact} REACH
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => handleFlagMention(m)}
                        disabled={isFlagged}
                        style={{
                          background: isFlagged ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.05)",
                          border: isFlagged ? "1px solid #ec4899" : "1px solid #334155",
                          color: isFlagged ? "#ec4899" : "#cbd5e1",
                          fontSize: 9,
                          padding: "3px 8px",
                          borderRadius: 4,
                          cursor: isFlagged ? "default" : "pointer",
                          fontWeight: 700,
                        }}
                      >
                        {isFlagged ? "🚩 FLAGGED FOR PR" : "FLAG INFLUENCER"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── RIGHT: KEYWORD SPIKES & SENTIMENT GAUGE ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "#070a14",
          borderLeft: "1px solid #1e293b",
          height: "100%",
          overflowY: "auto",
        }}
      >
        {/* Animated Sentiment Gauge */}
        <div style={{ padding: 20, borderBottom: "1px solid #1e293b", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800, marginBottom: 8, letterSpacing: "1px" }}>
            REAL-TIME SENTIMENT GAUGE
          </div>

          <div style={{ position: "relative", width: 200, height: 110, margin: "0 auto" }}>
            <svg viewBox="0 0 200 110" style={{ width: "100%", height: "100%" }}>
              {/* Dial Track */}
              <path
                d="M 25,100 A 75,75 0 0,1 175,100"
                fill="none"
                stroke="#1e293b"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Dial Fill */}
              <motion.path
                d="M 25,100 A 75,75 0 0,1 175,100"
                fill="none"
                stroke={sentiment > 60 ? "#22c55e" : sentiment > 40 ? "#f59e0b" : "#ef4444"}
                strokeWidth="14"
                strokeDasharray="235"
                strokeDashoffset={235 - (sentiment / 100) * 235}
                strokeLinecap="round"
                animate={{ strokeDashoffset: 235 - (sentiment / 100) * 235 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </svg>

            <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center" }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: sentiment > 60 ? "#22c55e" : sentiment > 40 ? "#f59e0b" : "#ef4444",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {sentiment}%
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: sentiment > 60 ? "#22c55e" : "#ef4444",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {sentiment > 60 ? "SUPPORTIVE RECOVERY" : "HOSTILE OUTCRY"}
              </div>
            </div>
          </div>

          {/* Breakdown percentage bar */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>
              <span>Hostile: {sentiment > 60 ? "4%" : "68%"}</span>
              <span>Neutral: {sentiment > 60 ? "10%" : "18%"}</span>
              <span>Positive: {sentiment > 60 ? "86%" : "14%"}</span>
            </div>
            <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "#1e293b" }}>
              <div style={{ width: sentiment > 60 ? "4%" : "68%", background: "#ef4444" }} />
              <div style={{ width: sentiment > 60 ? "10%" : "18%", background: "#94a3b8" }} />
              <div style={{ width: sentiment > 60 ? "86%" : "14%", background: "#22c55e" }} />
            </div>
          </div>
        </div>

        {/* Keyword Volume Spikes Panel */}
        <div style={{ padding: 18, borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#fff", fontWeight: 800, letterSpacing: "0.5px" }}>
              KEYWORD VOLUME SPIKES
            </div>
            <span style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700 }}>PAST 60 MINS</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {INITIAL_KEYWORD_SPIKES.map((kw, i) => {
              const isSelected = selectedKeyword === kw.keyword;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedKeyword(isSelected ? null : kw.keyword)}
                  style={{
                    padding: "8px 12px",
                    background: isSelected ? "rgba(236,72,153,0.15)" : "#0b101c",
                    border: isSelected ? "1px solid #ec4899" : "1px solid #1e293b",
                    borderRadius: 4,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{kw.keyword}</div>
                    <div style={{ fontSize: 9, color: "#64748b" }}>{kw.count} mentions</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: kw.severity === "critical" ? "#ef4444" : "#f59e0b",
                      }}
                    >
                      {kw.change}
                    </div>
                    <div style={{ fontSize: 8, color: "#64748b", textTransform: "uppercase" }}>{kw.severity}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedKeyword && (
            <button
              onClick={() => setSelectedKeyword(null)}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "4px 8px",
                background: "transparent",
                border: "1px dashed #64748b",
                color: "#94a3b8",
                fontSize: 10,
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Clear Keyword Filter ({selectedKeyword})
            </button>
          )}
        </div>

        {/* Brand Voice Guidelines Brief */}
        <div style={{ padding: 18, background: "#060913", flex: 1 }}>
          <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 800, marginBottom: 8 }}>
            BRAND VOICE CRISIS PROTOCOL:
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 6 }}>
            <div>
              <strong style={{ color: "#fff" }}>1. Own the Glitch:</strong> Acknowledge concurrency bug immediately. Never blame bank networks or card schemes.
            </div>
            <div>
              <strong style={{ color: "#fff" }}>2. Concrete Remediation:</strong> Announce automated pending debit voiding with zero customer effort required.
            </div>
            <div>
              <strong style={{ color: "#fff" }}>3. Pause Schedulers:</strong> Immediately silence promotional discount posts while the Sev-1 is ongoing.
            </div>
          </div>

          {navigateToSubEnv && (
            <button
              onClick={() => navigateToSubEnv("studio")}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "10px",
                background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.5px",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(236,72,153,0.3)",
              }}
            >
              OPEN RESPONSE STUDIO [ 02 ] ▶
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
