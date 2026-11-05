"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import SocialListeningSubEnv from "./Brand/SocialListeningSubEnv";
import BrandContentStudioSubEnv from "./Brand/BrandContentStudioSubEnv";
import CrisisCommandSubEnv from "./Brand/CrisisCommandSubEnv";
import type { BrandMention, PressInquiry, PublishedStatement } from "./Brand/types";

const AvatarScene = dynamic(() => import("../Avatar/AvatarScene"), { ssr: false });

interface SocialCommandEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, unknown>) => Promise<unknown>;
  onComplete: () => void;
  demoMode: boolean;
  analyserNode?: AnalyserNode | null;
  initialSubEnv?: number;
  onSubEnvChange?: (sub: number) => void;
}

const INITIAL_MENTIONS: BrandMention[] = [
  {
    id: "m-01",
    platform: "twitter",
    author: "Sarah Jenkins (@tech_sarah)",
    handle: "@tech_sarah",
    avatar: "SJ",
    verified: true,
    followerCount: "28.4k",
    text: "Are you kidding me @AuraCommerce? You literally charged my card TWICE for a single coat and your checkout crashed (#AuraOutage), and you tweet 'shop till you drop'?? Read the room!! 😡 #chargedtwice #AuraOutage",
    timestamp: "2m ago",
    likes: "2.4k",
    retweets: "812",
    sentiment: "hostile",
    reachImpact: "CRITICAL",
  },
  {
    id: "m-02",
    platform: "twitter",
    author: "E-Commerce Watch (@ecommerce_fail)",
    handle: "@ecommerce_fail",
    avatar: "EW",
    verified: true,
    followerCount: "64.2k",
    text: "Aura Commerce having a full checkout crash meltdown on Black Friday eve while their social scheduler posts hype tweets. Avoid buying right now! #boycottAura #AuraOutage",
    timestamp: "4m ago",
    likes: "890",
    retweets: "340",
    sentiment: "hostile",
    reachImpact: "HIGH",
  },
  {
    id: "m-03",
    platform: "twitter",
    author: "Marcus Chen (@mchen_dev)",
    handle: "@mchen_dev",
    avatar: "MC",
    verified: true,
    followerCount: "14.2k",
    text: "Double charge glitch confirmed on @AuraCommerce checkout. Looks like a race condition in payment idempotency token generation. Urgent refund idempotency patch needed. #checkoutcrash",
    timestamp: "6m ago",
    likes: "412",
    retweets: "95",
    sentiment: "negative",
    reachImpact: "MODERATE",
  },
  {
    id: "m-04",
    platform: "instagram",
    author: "Retail Insider (@retail_insider)",
    handle: "@retail_insider",
    avatar: "RI",
    verified: true,
    followerCount: "112k",
    text: "Customer service wait times exceed 45 minutes on Aura Commerce as hundreds report duplicate debits right before Black Friday drops. #checkoutcrash #chargedtwice",
    timestamp: "8m ago",
    likes: "1.8k",
    sentiment: "negative",
    reachImpact: "HIGH",
  },
  {
    id: "m-05",
    platform: "reddit",
    author: "u/shopper_david",
    handle: "r/shopping",
    avatar: "SD",
    verified: false,
    followerCount: "1.2k",
    text: "Charged $180 twice on Aura Commerce. Their promo tweets are active but support is radio silent. Boycott Aura until refunds land! #boycottAura #AuraOutage",
    timestamp: "11m ago",
    likes: "320",
    sentiment: "hostile",
    reachImpact: "MODERATE",
  },
];

const INITIAL_PRESS_INQUIRIES: PressInquiry[] = [
  {
    id: "press-01",
    outlet: "TechCrunch",
    journalist: "Sarah Koenig",
    email: "sarah.k@techcrunch.com",
    outletTier: "Tier 1 (Tech)",
    deadline: "12m",
    deadlineMinutes: 12,
    urgency: "CRITICAL",
    queryText: "Hearing reports of 10k+ duplicate debits during Black Friday checkout launch. Will Aura Commerce issue an on-the-record comment before our 17:30 publication deadline?",
    status: "pending",
  },
  {
    id: "press-02",
    outlet: "Bloomberg Retail",
    journalist: "Jason Del Rey",
    email: "jdelrey@bloomberg.net",
    outletTier: "Tier 1 (Financial)",
    deadline: "18m",
    deadlineMinutes: 18,
    urgency: "CRITICAL",
    queryText: "Aura Commerce payment gateway failure — is customer financial data compromised? Requesting urgent statement on financial liability and auto-refund procedures.",
    status: "pending",
  },
  {
    id: "press-03",
    outlet: "The Verge / Platformer",
    journalist: "Casey Newton",
    email: "casey@platformer.news",
    outletTier: "Tier 1 (Media)",
    deadline: "25m",
    deadlineMinutes: 25,
    urgency: "HIGH",
    queryText: "Social media backlash against scheduled marketing tweet during active checkout outage. Requesting comment on internal communications protocols.",
    status: "pending",
  },
];

export default function SocialCommandEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
  analyserNode = null,
  initialSubEnv = 1,
  onSubEnvChange,
}: SocialCommandEnvironmentProps) {
  const getSubKey = (num: number): "listening" | "studio" | "command" => {
    if (num === 2) return "studio";
    if (num === 3) return "command";
    return "listening";
  };

  const [activeSubEnv, setActiveSubEnv] = useState<"listening" | "studio" | "command">(getSubKey(initialSubEnv));

  const handleNavigate = (sub: "listening" | "studio" | "command") => {
    setActiveSubEnv(sub);
    if (onSubEnvChange) {
      onSubEnvChange(sub === "studio" ? 2 : sub === "command" ? 3 : 1);
    }
  };

  useEffect(() => {
    if (initialSubEnv) setActiveSubEnv(getSubKey(initialSubEnv));
  }, [initialSubEnv]);
  const [sentiment, setSentiment] = useState<number>(28); // 0-100 (28 = Hostile)
  const [mentions, setMentions] = useState<BrandMention[]>(INITIAL_MENTIONS);
  const [pressInquiries, setPressInquiries] = useState<PressInquiry[]>(INITIAL_PRESS_INQUIRIES);
  const [publishedStatement, setPublishedStatement] = useState<PublishedStatement | null>(null);
  const [showObserverHud, setShowObserverHud] = useState<boolean>(true);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(18 * 60 + 42); // Crisis t+18m

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `T+${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#05070e",
        color: "#fff",
        fontFamily: "'JetBrains Mono', -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ─── TOP MASTER HUD ─── */}
      <header
        style={{
          height: 52,
          background: "#080c16",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          zIndex: 20,
        }}
      >
        {/* Scope Branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: sentiment > 60 ? "#22c55e" : "#ec4899",
                boxShadow: `0 0 10px ${sentiment > 60 ? "#22c55e" : "#ec4899"}`,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 900, color: "#fff", letterSpacing: "1px" }}>
              AURA COMMERCE // SCOPE 7: THE VIRAL BRAND CRISIS
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
              fontWeight: 800,
            }}
          >
            CRISIS {formatElapsed(elapsedSeconds)}
          </span>
        </div>

        {/* 3 Sub-Environment Tab Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => handleNavigate("listening")}
            style={{
              background: activeSubEnv === "listening" ? "rgba(236,72,153,0.2)" : "#0b101c",
              border: activeSubEnv === "listening" ? "1px solid #ec4899" : "1px solid #1e293b",
              color: activeSubEnv === "listening" ? "#ec4899" : "#94a3b8",
              fontSize: 11,
              fontWeight: 800,
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            01 // SOCIAL LISTENING & SENTIMENT
          </button>

          <button
            onClick={() => handleNavigate("studio")}
            style={{
              background: activeSubEnv === "studio" ? "rgba(236,72,153,0.2)" : "#0b101c",
              border: activeSubEnv === "studio" ? "1px solid #ec4899" : "1px solid #1e293b",
              color: activeSubEnv === "studio" ? "#ec4899" : "#94a3b8",
              fontSize: 11,
              fontWeight: 800,
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            02 // RESPONSE STUDIO
          </button>

          <button
            onClick={() => handleNavigate("command")}
            style={{
              background: activeSubEnv === "command" ? "rgba(236,72,153,0.2)" : "#0b101c",
              border: activeSubEnv === "command" ? "1px solid #ec4899" : "1px solid #1e293b",
              color: activeSubEnv === "command" ? "#ec4899" : "#94a3b8",
              fontSize: 11,
              fontWeight: 800,
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            03 // CRISIS COMMAND & PRESS
          </button>
        </div>

        {/* Real-time Status & 3D Observer Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Sentiment Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: sentiment > 60 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              border: sentiment > 60 ? "1px solid #22c55e" : "1px solid #ef4444",
              padding: "4px 10px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 800,
              color: sentiment > 60 ? "#22c55e" : "#ef4444",
            }}
          >
            <span>{sentiment > 60 ? "💚" : "🔥"}</span>
            <span>SENTIMENT: {sentiment}% ({sentiment > 60 ? "SUPPORTIVE" : "HOSTILE"})</span>
          </div>

          {/* 3D Observer HUD Toggle Button */}
          <button
            onClick={() => setShowObserverHud(!showObserverHud)}
            style={{
              background: showObserverHud ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.06)",
              border: showObserverHud ? "1px solid #ec4899" : "1px solid #334155",
              color: showObserverHud ? "#ec4899" : "#cbd5e1",
              fontSize: 10,
              fontWeight: 800,
              padding: "5px 12px",
              borderRadius: 4,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>◈</span>
            <span>{showObserverHud ? "HIDE 3D OBSERVER" : "SHOW 3D OBSERVER"}</span>
          </button>
        </div>
      </header>

      {/* ─── MAIN WORKSPACE AREA WITH OPTIONAL 3D OBSERVER HUD ─── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Active Sub-Environment View */}
        <div style={{ flex: 1, height: "100%", overflow: "hidden" }}>
          {activeSubEnv === "listening" && (
            <SocialListeningSubEnv
              sessionId={sessionId}
              sentiment={sentiment}
              setSentiment={setSentiment}
              mentions={mentions}
              setMentions={setMentions}
              pressInquiries={pressInquiries}
              setPressInquiries={setPressInquiries}
              publishedStatement={publishedStatement}
              setPublishedStatement={setPublishedStatement}
              onAction={onAction}
              onComplete={onComplete}
              demoMode={demoMode}
              navigateToSubEnv={handleNavigate}
            />
          )}

          {activeSubEnv === "studio" && (
            <BrandContentStudioSubEnv
              sessionId={sessionId}
              sentiment={sentiment}
              setSentiment={setSentiment}
              mentions={mentions}
              setMentions={setMentions}
              pressInquiries={pressInquiries}
              setPressInquiries={setPressInquiries}
              publishedStatement={publishedStatement}
              setPublishedStatement={setPublishedStatement}
              onAction={onAction}
              onComplete={onComplete}
              demoMode={demoMode}
              navigateToSubEnv={handleNavigate}
            />
          )}

          {activeSubEnv === "command" && (
            <CrisisCommandSubEnv
              sessionId={sessionId}
              sentiment={sentiment}
              setSentiment={setSentiment}
              mentions={mentions}
              setMentions={setMentions}
              pressInquiries={pressInquiries}
              setPressInquiries={setPressInquiries}
              publishedStatement={publishedStatement}
              setPublishedStatement={setPublishedStatement}
              onAction={onAction}
              onComplete={onComplete}
              demoMode={demoMode}
              navigateToSubEnv={handleNavigate}
            />
          )}
        </div>

        {/* ─── CLEAN 3D OBSERVER AVATAR / SCENE HUD PANEL ─── */}
        <AnimatePresence>
          {showObserverHud && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{
                height: "100%",
                background: "#04060c",
                borderLeft: "1px solid #1e293b",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                zIndex: 10,
              }}
            >
              {/* Observer HUD Header */}
              <div
                style={{
                  padding: "10px 14px",
                  background: "#070b16",
                  borderBottom: "1px solid #1e293b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "#ec4899", fontWeight: 900 }}>◈ OBSERVER NODE</span>
                  <span style={{ fontSize: 9, background: "rgba(236,72,153,0.15)", color: "#ec4899", padding: "1px 5px", borderRadius: 3 }}>
                    LAYER 1
                  </span>
                </div>
                <button
                  onClick={() => setShowObserverHud(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#64748b",
                    fontSize: 14,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 3D Avatar Scene Embedded */}
              <div style={{ width: "100%", height: 260, position: "relative", background: "#020202" }}>
                <AvatarScene analyserNode={analyserNode} domain="brand" onInteract={onAction} />
              </div>

              {/* Cognitive Telemetry & Heuristics */}
              <div style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 800, letterSpacing: "0.5px" }}>
                  META-COGNITIVE TELEMETRY:
                </div>

                {/* Behavioral Meters */}
                <div style={{ background: "#080c18", border: "1px solid #1e293b", borderRadius: 6, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#cbd5e1", marginBottom: 3 }}>
                    <span>Accountability Calibration</span>
                    <span style={{ color: publishedStatement?.isOptimal ? "#22c55e" : "#f59e0b", fontWeight: 800 }}>
                      {publishedStatement?.isOptimal ? "96%" : "Testing"}
                    </span>
                  </div>
                  <div style={{ height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
                    <div
                      style={{
                        width: publishedStatement?.isOptimal ? "96%" : "45%",
                        height: "100%",
                        background: publishedStatement?.isOptimal ? "#22c55e" : "#f59e0b",
                      }}
                    />
                  </div>
                </div>

                <div style={{ background: "#080c18", border: "1px solid #1e293b", borderRadius: 6, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#cbd5e1", marginBottom: 3 }}>
                    <span>Media Response Velocity</span>
                    <span style={{ color: "#38bdf8", fontWeight: 800 }}>
                      {pressInquiries.filter((p) => p.status === "responded").length} / {pressInquiries.length} answered
                    </span>
                  </div>
                  <div style={{ height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${(pressInquiries.filter((p) => p.status === "responded").length / pressInquiries.length) * 100}%`,
                        height: "100%",
                        background: "#38bdf8",
                      }}
                    />
                  </div>
                </div>

                <div style={{ background: "#080c18", border: "1px solid #1e293b", borderRadius: 6, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#cbd5e1", marginBottom: 3 }}>
                    <span>Public Sentiment Equilibrium</span>
                    <span style={{ color: sentiment > 60 ? "#22c55e" : "#ef4444", fontWeight: 800 }}>
                      {sentiment}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${sentiment}%`,
                        height: "100%",
                        background: sentiment > 60 ? "#22c55e" : "#ef4444",
                      }}
                    />
                  </div>
                </div>

                {/* Active Observer Log */}
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>
                    ACTIVE HEURISTIC OBSERVATIONS:
                  </div>
                  <div style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div>• Maya Lin tracking crisis communication transparency.</div>
                    <div>• Viral quote-tweet velocity monitored at 412 mentions/min.</div>
                    {publishedStatement && (
                      <div style={{ color: publishedStatement.isOptimal ? "#22c55e" : "#f59e0b" }}>
                        • Statement broadcasted: {publishedStatement.isOptimal ? "Transparent root cause admitted." : "Suboptimal tone detected."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
