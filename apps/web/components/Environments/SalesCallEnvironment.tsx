"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { VoiceSessionHandle } from "../Avatar/VoiceSession";

interface SalesCallEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onComplete: () => void;
  demoMode: boolean;
  voiceSessionRef?: React.RefObject<VoiceSessionHandle | null>;
  voiceMode?: "off" | "persona" | "guide";
  setVoiceMode?: React.Dispatch<React.SetStateAction<"off" | "persona" | "guide">>;
  analyserNode?: AnalyserNode | null;
}

export default function SalesCallEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
  voiceSessionRef,
  voiceMode = "off",
  setVoiceMode,
}: SalesCallEnvironmentProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Goals
  const [goalUncover, setGoalUncover] = useState(false);
  const [goalAddress, setGoalAddress] = useState(false);
  const [goalBook, setGoalBook] = useState(false);

  // Chat/Voice Transcript
  const [transcripts, setTranscripts] = useState<Array<{ sender: "Sam" | "You"; text: string; time: string }>>([
    {
      sender: "Sam",
      text: "Hello? Yes, this is Sam Jenkins. Look, I've only got a couple minutes. We're very hesitant about renewing our trial for Black Friday given the checkout glitches we saw earlier.",
      time: "00:03",
    },
  ]);
  const [textInput, setTextInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendUtterance = async (userText: string) => {
    if (!userText.trim()) return;
    const timeStr = formatTimer(callDuration);
    setTranscripts((prev) => [...prev, { sender: "You", text: userText, time: timeStr }]);
    setTextInput("");

    // Send through evaluation pipeline
    onAction(`[SALES_CALL] You: "${userText}"`);

    // Intelligent discovery goal detection
    const lower = userText.toLowerCase();
    let replyText = "";

    if (lower.includes("reservation") || lower.includes("concern") || lower.includes("hesitant") || lower.includes("why") || lower.includes("problem")) {
      setGoalUncover(true);
      replyText = "Honestly, our biggest fear is our flash sale crashing at midnight. We can't afford a single duplicate charge or dropped cart when 50,000 shoppers hit us.";
    } else if (lower.includes("sla") || lower.includes("concurrency") || lower.includes("fix") || lower.includes("guarantee") || lower.includes("atomic") || lower.includes("99.99")) {
      setGoalAddress(true);
      replyText = "That's reassuring to hear. If you've resolved the concurrency race condition with atomic claims and have 99.99% uptime guaranteed, that addresses our primary blocker.";
    } else if (lower.includes("demo") || lower.includes("calendar") || lower.includes("meeting") || lower.includes("tomorrow") || lower.includes("lock in") || lower.includes("time")) {
      replyText = "I'm open to locking that in. What time slots do you have open on your calendar tomorrow?";
    } else {
      replyText = "I understand. Tell me more about how your team ensures zero double-charges during peak traffic?";
    }

    // Simulate Sam's reply with audio synthesis or fallback
    setIsSpeaking(true);
    setTimeout(() => {
      setIsSpeaking(false);
      setTranscripts((prev) => [...prev, { sender: "Sam", text: replyText, time: formatTimer(callDuration + 2) }]);

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          const utt = new SpeechSynthesisUtterance(replyText);
          utt.rate = 1.05;
          utt.pitch = 0.95;
          window.speechSynthesis.speak(utt);
        } catch {}
      }
    }, 700);
  };

  const handleBookMeeting = (slot: string) => {
    setSelectedSlot(slot);
    setBookingConfirmed(true);
    setGoalBook(true);
    setGoalUncover(true);
    setGoalAddress(true);

    onAction(`[VICTORY] Candidate booked Black Friday renewal meeting with Sam Jenkins for ${slot}`);

    setTranscripts((prev) => [
      ...prev,
      {
        sender: "Sam",
        text: `Perfect! I've accepted ${slot}. I appreciate your responsiveness on the checkout reliability. See you tomorrow!`,
        time: formatTimer(callDuration + 3),
      },
    ]);

    setTimeout(() => {
      onComplete();
    }, 3200);
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
        gridTemplateColumns: "300px 1fr 340px",
        overflow: "hidden",
      }}
    >
      {/* LEFT COLUMN: Prospect Card & Notes */}
      <div
        style={{
          borderRight: "1px solid #1e293b",
          background: "#0b101c",
          display: "flex",
          flexDirection: "column",
          padding: 16,
        }}
      >
        <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 12 }}>
          [ AURA CRM // PROSPECT PROFILE ]
        </div>

        {/* Prospect Card */}
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                color: "#000",
                fontSize: 16,
              }}
            >
              SJ
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Sam Jenkins</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>VP Retail, Nordic Goods</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
            <div>
              <span style={{ color: "#64748b" }}>Deal Size:</span>
              <div style={{ color: "#22c55e", fontWeight: 700 }}>$250,000 ARR</div>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Trial Status:</span>
              <div style={{ color: "#f59e0b", fontWeight: 700 }}>Lapsed / At Risk</div>
            </div>
          </div>
        </div>

        {/* Briefing Box */}
        <div
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid #f59e0b40",
            borderRadius: 6,
            padding: 10,
            marginBottom: 16,
            fontSize: 11,
            color: "#cbd5e1",
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>Call Objective:</div>
          Sam is skeptical about platform reliability before Black Friday. Ask about their main reservation, mention the new atomic checkout fix, and lock in a 15-minute meeting tomorrow.
        </div>

        {/* Mid-call Scratchpad */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 6 }}>
            Mid-Call Notes:
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type notes mid-call (e.g. key objections, budget, tech requirements)..."
            style={{
              flex: 1,
              background: "#060911",
              border: "1px solid #1e293b",
              borderRadius: 6,
              padding: 10,
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 11,
              resize: "none",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* CENTER COLUMN: Active Softphone Console */}
      <div style={{ display: "flex", flexDirection: "column", background: "#05070d" }}>
        {/* Softphone Header */}
        <div
          style={{
            padding: "12px 20px",
            background: "#0b101c",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              ACTIVE CALL: Sam Jenkins (Nordic Goods)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>
              ⏱ {formatTimer(callDuration)}
            </div>
            <button
              onClick={() => {
                if (setVoiceMode) {
                  setVoiceMode((prev) => (prev === "off" ? "persona" : "off"));
                }
              }}
              style={{
                padding: "5px 12px",
                background: voiceMode !== "off" ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)",
                border: voiceMode !== "off" ? "1px solid #22c55e" : "1px solid #334155",
                color: voiceMode !== "off" ? "#22c55e" : "#94a3b8",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>🎙</span>
              <span>{voiceMode !== "off" ? "[ VOICE: ACTIVE ]" : "[ VOICE: OFF ]"}</span>
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{
                padding: "5px 12px",
                background: isMuted ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)",
                border: isMuted ? "1px solid #ef4444" : "1px solid #334155",
                color: isMuted ? "#ef4444" : "#94a3b8",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {isMuted ? "[ 🔇 MUTED ]" : "[ 🔊 MUTE ]"}
            </button>
          </div>
        </div>

        {/* Waveform / Visualizer Bar */}
        <div
          style={{
            height: 60,
            background: "#080c16",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {[4, 12, 28, 42, 22, 34, 18, 48, 30, 15, 38, 20, 10].map((h, i) => (
            <motion.div
              key={i}
              animate={{
                height: isSpeaking ? [8, h, 8] : isMuted ? 4 : [6, 14, 6],
              }}
              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.05 }}
              style={{
                width: 4,
                background: isSpeaking ? "#f59e0b" : "#38bdf8",
                borderRadius: 2,
              }}
            />
          ))}
          <span style={{ fontSize: 11, color: isSpeaking ? "#f59e0b" : "#64748b", marginLeft: 12 }}>
            {isSpeaking ? "Sam Jenkins is speaking..." : isMuted ? "Your mic is muted" : "Listening..."}
          </span>
        </div>

        {/* Live Scrolling Transcript */}
        <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {transcripts.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                alignSelf: t.sender === "You" ? "flex-end" : "flex-start",
                maxWidth: "75%",
                background: t.sender === "You" ? "rgba(56,189,248,0.12)" : "rgba(245,158,11,0.08)",
                border: t.sender === "You" ? "1px solid #38bdf840" : "1px solid #f59e0b30",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: t.sender === "You" ? "#38bdf8" : "#f59e0b" }}>
                  {t.sender === "You" ? "You (Aura Account Exec)" : "Sam Jenkins (Nordic Goods)"}
                </span>
                <span style={{ fontSize: 9, color: "#64748b" }}>{t.time}</span>
              </div>
              <div style={{ fontSize: 13, color: "#f8fafc", lineHeight: 1.5 }}>{t.text}</div>
            </motion.div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        {/* Quick Discovery Buttons + Fallback Input */}
        <div style={{ padding: 12, background: "#0b101c", borderTop: "1px solid #1e293b" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto", paddingBottom: 4 }}>
            <button
              onClick={() => handleSendUtterance("What is your biggest reservation regarding Black Friday scale?")}
              style={{
                fontSize: 10,
                padding: "5px 10px",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.4)",
                color: "#f59e0b",
                borderRadius: 4,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                letterSpacing: "0.5px",
                transition: "all 0.15s ease",
              }}
            >
              [ 💡 ASK // CORE_RESERVATION ]
            </button>
            <button
              onClick={() => handleSendUtterance("We resolved the concurrency race condition with atomic locks and 99.99% uptime.")}
              style={{
                fontSize: 10,
                padding: "5px 10px",
                background: "rgba(56,189,248,0.08)",
                border: "1px solid rgba(56,189,248,0.4)",
                color: "#38bdf8",
                borderRadius: 4,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                letterSpacing: "0.5px",
                transition: "all 0.15s ease",
              }}
            >
              [ 🛡 EXPLAIN // CONCURRENCY_SLA ]
            </button>
            <button
              onClick={() => handleSendUtterance("Can we lock in 15 minutes with our lead architect tomorrow to review the architecture?")}
              style={{
                fontSize: 10,
                padding: "5px 10px",
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.4)",
                color: "#22c55e",
                borderRadius: 4,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
                letterSpacing: "0.5px",
                transition: "all 0.15s ease",
              }}
            >
              [ 📅 PROPOSE // TECHNICAL_DEMO ]
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendUtterance(textInput);
            }}
            style={{ display: "flex", gap: 8 }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Speak via mic or type discovery question to Sam..."
              style={{
                flex: 1,
                background: "#05070d",
                border: "1px solid #334155",
                borderRadius: 6,
                padding: "8px 12px",
                color: "#fff",
                fontSize: 12,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                background: "rgba(245,158,11,0.15)",
                border: "1px solid #f59e0b",
                color: "#f59e0b",
                fontWeight: 800,
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.5px",
                boxShadow: "0 0 10px rgba(245,158,11,0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease",
              }}
            >
              <span>[ TRANSMIT ▶ ]</span>
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Discovery Goals & Mini Booking Calendar */}
      <div
        style={{
          borderLeft: "1px solid #1e293b",
          background: "#0b101c",
          display: "flex",
          flexDirection: "column",
          padding: 16,
        }}
      >
        <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 12 }}>
          [ CALL GOALS & LOCK-IN ]
        </div>

        {/* Discovery Goals Checkbox list */}
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8 }}>
            Stage Milestones:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: goalUncover ? "#22c55e" : "#64748b" }}>
              <span>{goalUncover ? "✓" : "○"}</span>
              <span style={{ textDecoration: goalUncover ? "line-through" : "none" }}>
                Uncover Black Friday fear
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: goalAddress ? "#22c55e" : "#64748b" }}>
              <span>{goalAddress ? "✓" : "○"}</span>
              <span style={{ textDecoration: goalAddress ? "line-through" : "none" }}>
                Present concurrency SLA
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: goalBook ? "#22c55e" : "#64748b" }}>
              <span>{goalBook ? "✓" : "○"}</span>
              <span style={{ textDecoration: goalBook ? "line-through" : "none" }}>
                Book Technical Lock-in
              </span>
            </div>
          </div>
        </div>

        {/* Mini Calendar Booking Widget */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8 }}>
            Select Open Calendar Slot:
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {["Tomorrow, 10:00 AM EST", "Tomorrow, 2:00 PM EST", "Tomorrow, 4:30 PM EST"].map((slot) => (
              <button
                key={slot}
                onClick={() => handleBookMeeting(slot)}
                disabled={bookingConfirmed}
                style={{
                  padding: "10px 12px",
                  background: selectedSlot === slot ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.02)",
                  border: selectedSlot === slot ? "1px solid #22c55e" : "1px solid #1e293b",
                  borderRadius: 4,
                  color: selectedSlot === slot ? "#22c55e" : "#f8fafc",
                  textAlign: "left",
                  fontSize: 11,
                  fontFamily: "inherit",
                  letterSpacing: "0.5px",
                  cursor: bookingConfirmed ? "default" : "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: selectedSlot === slot ? "0 0 12px rgba(34,197,94,0.25)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <span>[ 📅 {slot} ]</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: selectedSlot === slot ? "#22c55e" : "#f59e0b" }}>
                  {selectedSlot === slot ? "[ CONFIRMED ]" : "[ AVAILABLE ▶ ]"}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {bookingConfirmed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid #22c55e",
                  borderRadius: 8,
                  padding: 14,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>🎉</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#22c55e", marginBottom: 4 }}>
                  RENEWAL MEETING CONFIRMED!
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>
                  $250k contract locked in with Sam Jenkins. Routing to evaluation metrics...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
