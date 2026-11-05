"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { VoiceSession, type VoiceSessionHandle } from "../../Avatar/VoiceSession";

// Dynamically import AvatarScene with SSR disabled to prevent Three.js canvas hydration mismatch
const AvatarScene = dynamic(() => import("../../Avatar/AvatarScene"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020307",
        color: "#f59e0b",
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      [ OBSERVER CORE INITIALIZING... ]
    </div>
  ),
});

export interface TranscriptMessage {
  id: string;
  sender: "Sam" | "You";
  text: string;
  time: string;
  tag?: string;
}

interface SpeechRecognitionResultItem {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultItemList {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResultItemList;
  [index: number]: SpeechRecognitionResultItemList;
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export interface SalesDealState {
  accountName: string;
  prospectName: string;
  prospectRole: string;
  contractValue: number;
  dealStage: "Discovery" | "Needs Analysis" | "Proposal / Quote" | "Negotiation / Review" | "Closed Won";
  bookedSlot: string | null;
  objectionsResolved: string[];
  notes: string;
  calculatedDiscount: number;
  contractTermYears: number;
  slaTier: "Standard" | "Enterprise High-Concurrency" | "Mission-Critical 99.999%";
  proposalSubmitted: boolean;
  activeSubEnv: "call" | "pitch" | "crm";
  transcripts?: TranscriptMessage[];
  callDuration?: number;
  currentSlide?: number;
  buyIns?: { sam: number; elena: number; marcus: number };
  prospectReaction?: string | null;
  includeWarRoom?: boolean;
  includeFailover?: boolean;
  paymentTerms?: "annual_prepay" | "net_30";
  emailSent?: boolean;
}

export interface LiveSalesCallSubEnvProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, unknown>) => Promise<unknown>;
  onComplete: () => void;
  demoMode: boolean;
  voiceSessionRef?: React.RefObject<VoiceSessionHandle | null>;
  voiceMode?: "off" | "persona" | "guide";
  setVoiceMode?: React.Dispatch<React.SetStateAction<"off" | "persona" | "guide">>;
  analyserNode?: AnalyserNode | null;
  dealState: SalesDealState;
  updateDealState: (partial: Partial<SalesDealState>) => void;
  onNavigateToSubEnv?: (subEnv: "call" | "pitch" | "crm") => void;
}

const INITIAL_SAM_TRANSCRIPT: TranscriptMessage[] = [
  {
    id: "m-1",
    sender: "Sam",
    text: "Hello? Yes, this is Sam Jenkins. Look, I only have 8 minutes between board prep. We've got $14M projected over Black Friday and our engineering team flagged high checkout latency during our peak load drill. Why shouldn't we migrate to CommerceCloud before we sign this $250k renewal?",
    time: "00:03",
    tag: "CRITICAL OBJECTION",
  },
];

export default function LiveSalesCallSubEnv({
  sessionId,
  onAction,
  onComplete,
  demoMode,
  voiceMode = "off",
  setVoiceMode,
  analyserNode,
  dealState,
  updateDealState,
  onNavigateToSubEnv,
}: LiveSalesCallSubEnvProps) {
  const [isObserverFullScreen, setIsObserverFullScreen] = useState(false);
  const [callDuration, setCallDuration] = useState(dealState.callDuration ?? 14);
  const [isMuted, setIsMuted] = useState(false);
  const [notes, setNotes] = useState(dealState.notes || "");
  const [textInput, setTextInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showObserverHUD, setShowObserverHUD] = useState(true);

  // Audio Context management to prevent AudioContext pool exhaustion
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Discovery goals state synced with dealState
  const [goalUncover, setGoalUncover] = useState(dealState.objectionsResolved.includes("uncover_fear"));
  const [goalSla, setGoalSla] = useState(dealState.objectionsResolved.includes("concurrency_sla"));
  const [goalCompetitor, setGoalCompetitor] = useState(dealState.objectionsResolved.includes("competitor_fud"));
  const [goalBook, setGoalBook] = useState(Boolean(dealState.bookedSlot));

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>(
    dealState.transcripts && dealState.transcripts.length > 0
      ? dealState.transcripts
      : INITIAL_SAM_TRANSCRIPT
  );

  // Keep notes synchronized if dealState.notes updates externally
  useEffect(() => {
    if (dealState.notes !== undefined && dealState.notes !== notes) {
      setNotes(dealState.notes);
    }
  }, [dealState.notes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Call timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => {
        const next = prev + 1;
        updateDealState({ callDuration: next });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [updateDealState]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  const [isMicListening, setIsMicListening] = useState(false);
  const speechRecRef = useRef<ISpeechRecognition | null>(null);

  // Cleanup Web Audio, Speech Recognition & Speech on unmount
  useEffect(() => {
    return () => {
      if (speechRecRef.current) {
        try {
          speechRecRef.current.onend = null;
          speechRecRef.current.stop();
        } catch {}
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        try {
          audioCtxRef.current.close().catch(() => {});
        } catch {}
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  // Play synthetic fallback tone via Web Audio when SpeechSynthesis is disabled or unavailable
  const playAudioCue = useCallback(
    (type: "speak" | "victory") => {
      const ctx = getAudioContext();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "victory") {
          osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
          osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
          osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3); // G5
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        } else {
          osc.type = "sine";
          osc.frequency.setValueAtTime(320, ctx.currentTime);
          gain.gain.setValueAtTime(0.06, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        }
      } catch {
        // AudioContext policy catch
      }
    },
    [getAudioContext]
  );

  // Voice synthesis with fallback and 3D avatar audio visualizer driver
  const speakSamUtterance = useCallback(
    (text: string) => {
      setIsSpeaking(true);
      playAudioCue("speak");

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.05;
          utterance.pitch = 0.92; // Authoritative executive pitch

          let oscNode: OscillatorNode | null = null;
          let gainNode: GainNode | null = null;
          if (analyserNode && analyserNode.context instanceof AudioContext && analyserNode.context.state !== "closed") {
            try {
              const ctx = analyserNode.context;
              if (ctx.state === "suspended") void ctx.resume();
              oscNode = ctx.createOscillator();
              gainNode = ctx.createGain();
              oscNode.type = "sawtooth";
              oscNode.frequency.setValueAtTime(210, ctx.currentTime);
              gainNode.gain.setValueAtTime(0.003, ctx.currentTime);
              oscNode.connect(gainNode);
              gainNode.connect(analyserNode);
              oscNode.start();
            } catch {}
          }

          const cleanupSpeech = () => {
            setIsSpeaking(false);
            try {
              if (oscNode) {
                oscNode.stop();
                oscNode.disconnect();
              }
              if (gainNode) {
                gainNode.disconnect();
              }
            } catch {}
          };

          utterance.onend = cleanupSpeech;
          utterance.onerror = cleanupSpeech;
          window.speechSynthesis.speak(utterance);
          return;
        } catch {
          // fallback below
        }
      }
      setTimeout(() => setIsSpeaking(false), 2200);
    },
    [analyserNode, playAudioCue]
  );

  /**
   * Toggles microphone speech recognition so candidate can speak naturally to Sam.
   */
  const toggleMicListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const win = window as unknown as SpeechRecognitionWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      alert("Web Speech API is not supported in this browser environment. Please type your objection response.");
      return;
    }

    if (isMicListening) {
      if (speechRecRef.current) {
        try { speechRecRef.current.stop(); } catch {}
        speechRecRef.current = null;
      }
      setIsMicListening(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsMicListening(true);
      };

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        let text = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res && res[0]) {
            text += res[0].transcript;
          }
        }
        setTextInput(text);
      };

      rec.onerror = () => {
        setIsMicListening(false);
      };

      rec.onend = () => {
        setIsMicListening(false);
        speechRecRef.current = null;
      };

      rec.start();
      speechRecRef.current = rec;
    } catch {
      setIsMicListening(false);
    }
  }, [isMicListening]);

  const handleSendUtterance = async (userText: string) => {
    if (!userText.trim()) return;
    const timeStr = formatTimer(callDuration);
    const newMsg: TranscriptMessage = {
      id: `u-${Date.now()}`,
      sender: "You",
      text: userText,
      time: timeStr,
    };
    const updatedTranscripts = [...transcripts, newMsg];
    setTranscripts(updatedTranscripts);
    setTextInput("");

    // Telemetry action
    await onAction(`[SALES_CALL] You: "${userText}"`, {
      domain: "sales",
      callDuration,
      sessionId,
    });

    const lower = userText.toLowerCase();
    let replyText = "";
    let objectionTag = "DISCOVERY RESPONSE";
    const newResolved = [...dealState.objectionsResolved];

    const isRootCauseQuery =
      lower.includes("fear") ||
      lower.includes("reservation") ||
      lower.includes("concern") ||
      lower.includes("drill") ||
      lower.includes("what happened") ||
      lower.includes("risk") ||
      lower.includes("why") ||
      lower.includes("hesitant") ||
      lower.includes("cancel") ||
      lower.includes("cancelling") ||
      lower.includes("glitch") ||
      lower.includes("latency") ||
      lower.includes("issue") ||
      lower.includes("problem") ||
      lower.includes("fail") ||
      lower.includes("black friday");

    const isSlaOrConcurrencyQuery =
      lower.includes("atomic") ||
      lower.includes("sla") ||
      lower.includes("isolation") ||
      lower.includes("concurrency") ||
      lower.includes("99.99") ||
      lower.includes("lock") ||
      lower.includes("duplicate") ||
      lower.includes("debit") ||
      lower.includes("charge") ||
      lower.includes("idempotency") ||
      lower.includes("race") ||
      lower.includes("collision") ||
      lower.includes("guarantee") ||
      lower.includes("fix");

    const isCompetitorQuery =
      lower.includes("commercecloud") ||
      lower.includes("shopify") ||
      lower.includes("competitor") ||
      lower.includes("take rate") ||
      lower.includes("gmv") ||
      lower.includes("tps") ||
      lower.includes("fee") ||
      lower.includes("tax") ||
      lower.includes("migration") ||
      lower.includes("migrate");

    const isCalendarQuery =
      lower.includes("calendar") ||
      lower.includes("tomorrow") ||
      lower.includes("demo") ||
      lower.includes("meeting") ||
      lower.includes("architect") ||
      lower.includes("deck") ||
      lower.includes("pitch") ||
      lower.includes("schedule") ||
      lower.includes("book") ||
      lower.includes("time") ||
      lower.includes("slot") ||
      lower.includes("sync");

    if (
      isRootCauseQuery &&
      !lower.includes("commercecloud") &&
      !lower.includes("shopify") &&
      !lower.includes("calendar") &&
      !lower.includes("tomorrow")
    ) {
      setGoalUncover(true);
      if (!newResolved.includes("uncover_fear")) newResolved.push("uncover_fear");
      replyText =
        "The root concern is transaction collisions. When 80,000 shoppers drop orders simultaneously at 00:00 UTC, a lock contention spike caused 18 duplicate charges in staging. If that happens live, our brand reputation is destroyed.";
      objectionTag = "ROOT CAUSE UNCOVERED";
    } else if (
      isSlaOrConcurrencyQuery &&
      !lower.includes("commercecloud") &&
      !lower.includes("calendar") &&
      !lower.includes("tomorrow")
    ) {
      setGoalSla(true);
      if (!newResolved.includes("concurrency_sla")) newResolved.push("concurrency_sla");
      replyText =
        "An atomic status claim before card dispatch with zero-double-charge guarantees? That does eliminate the duplicate debit vulnerability. What SLA uptime penalty credit are you willing to put on paper in the renewal proposal?";
      objectionTag = "SLA INQUIRY";
    } else if (isCompetitorQuery && !lower.includes("calendar") && !lower.includes("tomorrow")) {
      setGoalCompetitor(true);
      if (!newResolved.includes("competitor_fud")) newResolved.push("competitor_fud");
      replyText =
        "Good point on CommerceCloud's 1.25% GMV penalty and plugin architecture. On $14M that's $175,000 in unexpected platform tax. If Aura guarantees 120,000 TPS natively without GMV cuts, the math favors staying.";
      objectionTag = "COMPETITOR REBUTTAL";
    } else if (isCalendarQuery) {
      replyText =
        "I'm willing to inspect your technical pitch deck and proposal. Select a slot on my calendar right now, and bring your lead architect.";
      objectionTag = "COMMITMENT OPEN";
    } else {
      replyText =
        "I hear you, but walk me through the concrete guarantees. Can your engineering team prove sub-15ms checkout response under 100k concurrent requests?";
      objectionTag = "TECHNICAL CHALLENGE";
    }

    updateDealState({
      objectionsResolved: newResolved,
      transcripts: updatedTranscripts,
      callDuration,
    });

    // Simulate Sam's realistic response delay
    setTimeout(() => {
      const samMsg: TranscriptMessage = {
        id: `sam-${Date.now()}`,
        sender: "Sam",
        text: replyText,
        time: formatTimer(callDuration + 2),
        tag: objectionTag,
      };
      setTranscripts((prev) => {
        const withSam = [...prev, samMsg];
        updateDealState({ transcripts: withSam, callDuration: callDuration + 2 });
        return withSam;
      });
      speakSamUtterance(replyText);
    }, 650);
  };

  const handleBookMeeting = async (slot: string) => {
    setGoalBook(true);
    setGoalUncover(true);
    setGoalSla(true);
    setGoalCompetitor(true);

    playAudioCue("victory");

    await onAction(
      `[SALES_CALL_BOOKED] Technical Lock-in Meeting scheduled with Sam Jenkins for ${slot}`,
      {
        slot,
        sessionId,
        stage: "Needs Analysis",
      }
    );

    const confirmationText = `Locked in! I've accepted ${slot}. Prepare your architecture slides and the formal $250k renewal proposal. Let's head into the Pitch Room.`;

    const samBookingMsg: TranscriptMessage = {
      id: `sam-book-${Date.now()}`,
      sender: "Sam",
      text: confirmationText,
      time: formatTimer(callDuration + 2),
      tag: "MEETING LOCKED IN",
    };

    const finalTranscripts = [...transcripts, samBookingMsg];
    setTranscripts(finalTranscripts);

    updateDealState({
      bookedSlot: slot,
      dealStage: "Needs Analysis",
      objectionsResolved: Array.from(
        new Set([...dealState.objectionsResolved, "uncover_fear", "concurrency_sla", "competitor_fud"])
      ),
      transcripts: finalTranscripts,
      callDuration: callDuration + 2,
    });

    speakSamUtterance(confirmationText);
  };

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "grid",
        gridTemplateColumns: "310px 1fr 340px",
        background: "#060911",
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', -apple-system, monospace",
        overflow: "hidden",
      }}
    >
      {/* ──────────────── LEFT PANEL: Prospect Profile, Battlecards, Scratchpad ──────────────── */}
      <div
        style={{
          borderRight: "1px solid #1e293b",
          background: "#0a0f1d",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 12,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#f59e0b", letterSpacing: "1.5px", fontWeight: 800 }}>
            [ PROSPECT DOSSIER // NORDIC GOODS ]
          </span>
          <span
            style={{
              fontSize: 9,
              padding: "2px 6px",
              background: "rgba(239,68,68,0.15)",
              border: "1px solid #ef4444",
              color: "#ef4444",
              borderRadius: 3,
              fontWeight: 800,
            }}
          >
            CHURN RISK: 88%
          </span>
        </div>

        {/* Prospect Header Card */}
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f59e0b, #b45309)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                color: "#000",
                fontSize: 16,
                boxShadow: "0 0 12px rgba(245,158,11,0.35)",
              }}
            >
              SJ
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Sam Jenkins</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>VP of Retail & E-Commerce</div>
              <div style={{ fontSize: 10, color: "#38bdf8" }}>Nordic Goods Inc. ($14M Black Friday GMV)</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, borderTop: "1px solid #1e293b", paddingTop: 10 }}>
            <div>
              <span style={{ color: "#64748b", fontSize: 10 }}>Annual Contract:</span>
              <div style={{ color: "#22c55e", fontWeight: 800, fontSize: 13 }}>$250,000 ARR</div>
            </div>
            <div>
              <span style={{ color: "#64748b", fontSize: 10 }}>Renewal Window:</span>
              <div style={{ color: "#f59e0b", fontWeight: 800, fontSize: 13 }}>5 Days Remaining</div>
            </div>
          </div>
        </div>

        {/* Key Objections Battlecards */}
        <div
          style={{
            background: "rgba(245,158,11,0.05)",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: 6,
            padding: 10,
            fontSize: 11,
          }}
        >
          <div style={{ color: "#f59e0b", fontWeight: 800, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <span>⚡</span>
            <span>CRITICAL OBJECTIONS & TALKING POINTS</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 14, color: "#cbd5e1", lineHeight: 1.5, fontSize: 11 }}>
            <li>
              <strong style={{ color: "#fff" }}>Concurrency Glitches:</strong> Stress test experienced 18 duplicate debits. Mention atomic claim architecture.
            </li>
            <li>
              <strong style={{ color: "#fff" }}>CommerceCloud FUD:</strong> Competitor charges 1.25% GMV fee ($175k tax) vs Aura&apos;s 0% take rate.
            </li>
            <li>
              <strong style={{ color: "#fff" }}>Primary Goal:</strong> Lock in 15-min Technical Demo for tomorrow to present tailored pitch deck.
            </li>
          </ul>
        </div>

        {/* Live Mid-Call Scratchpad */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 120 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>
              Live Call Scratchpad (Auto-syncs to CRM):
            </span>
            <span style={{ fontSize: 9, color: "#22c55e" }}>LIVE SYNC</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              updateDealState({ notes: e.target.value });
            }}
            placeholder="Type key customer notes mid-call (e.g. Sam wants 99.99% uptime SLA penalty credit, CTO concerned about lock contention)..."
            style={{
              flex: 1,
              background: "#050811",
              border: "1px solid #1e293b",
              borderRadius: 6,
              padding: 10,
              color: "#f8fafc",
              fontFamily: "inherit",
              fontSize: 11,
              lineHeight: 1.5,
              resize: "none",
              outline: "none",
            }}
          />
        </div>

        {/* Next Step Navigation CTA */}
        {onNavigateToSubEnv && (
          <button
            onClick={() => onNavigateToSubEnv("pitch")}
            style={{
              padding: "10px 14px",
              background: "rgba(56,189,248,0.12)",
              border: "1px solid #38bdf8",
              color: "#38bdf8",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "all 0.15s ease",
            }}
          >
            <span>[ 02 — PITCH ROOM // ASSEMBLE DECK ]</span>
            <span>▶</span>
          </button>
        )}
      </div>

      {/* ──────────────── CENTER PANEL: Softphone Voice Console & Transcripts ──────────────── */}
      <div style={{ display: "flex", flexDirection: "column", background: "#05070f" }}>
        {/* Softphone Control Bar */}
        <div
          style={{
            padding: "12px 20px",
            background: "#0a0f1d",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ position: "relative", display: "flex", height: 12, width: 12 }}>
              <span
                style={{
                  backgroundColor: "#22c55e",
                  animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                  position: "absolute",
                  display: "inline-flex",
                  height: "100%",
                  width: "100%",
                  borderRadius: "9999px",
                  opacity: 0.75,
                }}
              />
              <span
                style={{
                  backgroundColor: "#22c55e",
                  position: "relative",
                  display: "inline-flex",
                  borderRadius: "9999px",
                  height: 12,
                  width: 12,
                }}
              />
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <span>CONNECTED: Sam Jenkins (Nordic Goods)</span>
                <span style={{ fontSize: 10, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 3 }}>
                  $250K RENEWAL
                </span>
              </div>
              <div style={{ fontSize: 10, color: "#64748b" }}>Direct Inbound VoIP // TLS 1.3 Encrypted</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#f59e0b",
                background: "rgba(245,158,11,0.1)",
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              ⏱ {formatTimer(callDuration)}
            </div>

            <button
              onClick={() => {
                if (setVoiceMode) {
                  setVoiceMode((prev) => (prev === "off" ? "persona" : "off"));
                }
              }}
              style={{
                padding: "6px 12px",
                background: voiceMode !== "off" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)",
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
              <span>{voiceMode !== "off" ? "[ LIVE AI VOICE: ON ]" : "[ LIVE AI VOICE: OFF ]"}</span>
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{
                padding: "6px 12px",
                background: isMuted ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.03)",
                border: isMuted ? "1px solid #ef4444" : "1px solid #334155",
                color: isMuted ? "#ef4444" : "#94a3b8",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {isMuted ? "[ 🔇 MIC MUTED ]" : "[ 🔊 MIC ACTIVE ]"}
            </button>
          </div>
        </div>

        {/* Real-Time Waveform Equalizer */}
        <div
          style={{
            height: 64,
            background: "#080c18",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {[10, 24, 45, 18, 55, 32, 48, 20, 60, 36, 18, 42, 28, 50, 22, 14, 38, 12].map((height, idx) => (
              <motion.div
                key={idx}
                animate={{
                  height: isSpeaking ? [8, height, 8] : isMuted ? 4 : [6, 16, 6],
                }}
                transition={{
                  repeat: Infinity,
                  duration: isSpeaking ? 0.45 : 1.2,
                  delay: idx * 0.04,
                  ease: "easeInOut",
                }}
                style={{
                  width: 4,
                  background: isSpeaking ? "#f59e0b" : isMuted ? "#64748b" : "#38bdf8",
                  borderRadius: 2,
                  boxShadow: isSpeaking ? "0 0 8px rgba(245,158,11,0.5)" : "none",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontSize: 11,
                color: isSpeaking ? "#f59e0b" : isMuted ? "#ef4444" : "#64748b",
                fontWeight: 700,
              }}
            >
              {isSpeaking
                ? "▶ Sam Jenkins is speaking (Nordic Goods)..."
                : isMuted
                ? "✕ Microphone muted (click to unmute)"
                : "● Line open — ready to pitch solutions"}
            </span>

            <button
              onClick={() => setShowObserverHUD(!showObserverHUD)}
              style={{
                fontSize: 10,
                background: "transparent",
                border: "1px solid #334155",
                color: showObserverHUD ? "#f59e0b" : "#64748b",
                padding: "3px 8px",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {showObserverHUD ? "[ HIDE 3D OBSERVER ]" : "[ SHOW 3D OBSERVER ]"}
            </button>
          </div>
        </div>

        {/* Real-Time Transcript Stream */}
        <div
          style={{
            flex: 1,
            padding: 20,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {transcripts.map((msg) => {
            const isYou = msg.sender === "You";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  alignSelf: isYou ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  background: isYou ? "rgba(56,189,248,0.12)" : "rgba(245,158,11,0.08)",
                  border: isYou ? "1px solid rgba(56,189,248,0.35)" : "1px solid rgba(245,158,11,0.3)",
                  borderRadius: 8,
                  padding: "12px 16px",
                  boxShadow: isYou ? "0 4px 20px rgba(56,189,248,0.05)" : "0 4px 20px rgba(245,158,11,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: isYou ? "#38bdf8" : "#f59e0b",
                      }}
                    >
                      {isYou ? "You (Aura Senior AE)" : "Sam Jenkins (Nordic Goods VP)"}
                    </span>
                    {msg.tag && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          background: isYou ? "rgba(56,189,248,0.2)" : "rgba(245,158,11,0.2)",
                          color: isYou ? "#38bdf8" : "#f59e0b",
                          padding: "1px 6px",
                          borderRadius: 3,
                        }}
                      >
                        {msg.tag}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 9, color: "#64748b" }}>{msg.time}</span>
                </div>
                <div style={{ fontSize: 13, color: "#f8fafc", lineHeight: 1.6, letterSpacing: "0.2px" }}>
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
          <div ref={transcriptEndRef} />
        </div>

        {/* Quick Objection Prompts & Text Input */}
        <div style={{ padding: 14, background: "#0a0f1d", borderTop: "1px solid #1e293b" }}>
          {/* Battlecard quick-trigger buttons */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 10,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            <button
              onClick={() => handleSendUtterance("What was the exact failure mode you observed during your peak drill?")}
              style={battlecardBtnStyle("#f59e0b")}
            >
              [ 💡 DISCOVER // ROOT_PAIN_POINT ]
            </button>
            <button
              onClick={() =>
                handleSendUtterance("We resolved the concurrency race with atomic status claims before card dispatch, guaranteeing zero duplicate debits.")
              }
              style={battlecardBtnStyle("#38bdf8")}
            >
              [ 🛡 EXPLAIN // ATOMIC_ISOLATION_SLA ]
            </button>
            <button
              onClick={() =>
                handleSendUtterance(
                  "CommerceCloud charges a 1.25% GMV fee ($175k on your $14M GMV) and lacks atomic order reservations. Aura gives you 120,000 native TPS at 0% GMV take."
                )
              }
              style={battlecardBtnStyle("#ec4899")}
            >
              [ ⚔️ REBUT // COMMERCECLOUD_FUD ]
            </button>
            <button
              onClick={() =>
                handleSendUtterance("Let's lock in 15 minutes tomorrow with our lead architect to inspect the benchmarks and finalize the renewal proposal.")
              }
              style={battlecardBtnStyle("#22c55e")}
            >
              [ 📅 LOCK_IN // TECHNICAL_DEMO ]
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendUtterance(textInput);
            }}
            style={{ display: "flex", gap: 10 }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Speak via microphone or type objection rebuttal to Sam..."
              style={{
                flex: 1,
                background: "#050811",
                border: "1px solid #334155",
                borderRadius: 6,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 12,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              type="button"
              onClick={toggleMicListening}
              style={{
                padding: "10px 14px",
                background: isMicListening ? "rgba(239,68,68,0.25)" : "rgba(56,189,248,0.15)",
                border: isMicListening ? "1px solid #ef4444" : "1px solid #38bdf8",
                color: isMicListening ? "#f87171" : "#38bdf8",
                fontWeight: 800,
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: isMicListening ? "0 0 15px rgba(239,68,68,0.4)" : "0 0 10px rgba(56,189,248,0.2)",
              }}
              title={isMicListening ? "Microphone active — click to stop" : "Click to speak to Sam Jenkins via microphone"}
            >
              <span>{isMicListening ? "🔴 LISTENING..." : "🎙 SPEAK TO SAM"}</span>
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 18px",
                background: "rgba(245,158,11,0.2)",
                border: "1px solid #f59e0b",
                color: "#f59e0b",
                fontWeight: 800,
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 0 12px rgba(245,158,11,0.25)",
              }}
            >
              <span>[ TRANSMIT ▶ ]</span>
            </button>
          </form>
        </div>
      </div>

      {/* ──────────────── RIGHT PANEL: 3D Observer HUD & Booking Calendar ──────────────── */}
      <div
        style={{
          borderLeft: "1px solid #1e293b",
          background: "#0a0f1d",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 14,
          overflowY: "auto",
        }}
      >
        {/* 3D Observer Avatar Scene */}
        {showObserverHUD && (
          <div
            style={{
              background: "#050811",
              border: "1px solid #334155",
              borderRadius: 8,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                background: "rgba(245,158,11,0.1)",
                borderBottom: "1px solid rgba(245,158,11,0.2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 800, letterSpacing: "1px" }}>
                [ 3D OBSERVER CORE // SALES ]
              </span>
              <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 700 }}>● EVALUATING</span>
            </div>

            <div style={{ height: 160, position: "relative" }}>
              <AvatarScene analyserNode={analyserNode || null} domain="sales" />

              {/* Maximize to full-screen button */}
              <button
                onClick={() => setIsObserverFullScreen(true)}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "rgba(10, 15, 30, 0.8)",
                  border: "1px solid #f59e0b",
                  color: "#fde68a",
                  padding: "3px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  backdropFilter: "blur(6px)",
                  zIndex: 10,
                }}
                title="Maximize 3D Observer to Full Screen with Live Voice"
              >
                <span>⛶</span>
                <span>MAXIMIZE FULL SCREEN</span>
              </button>
            </div>

            {/* Heuristic Evaluation Telemetry */}
            <div style={{ padding: 10, background: "#0a0e1a", borderTop: "1px solid #1e293b", fontSize: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#64748b" }}>Trust Index:</span>
                <span style={{ color: "#22c55e", fontWeight: 800 }}>
                  {goalSla && goalCompetitor ? "92% (High)" : goalUncover ? "68% (Building)" : "41% (At Risk)"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#64748b" }}>Active Listening:</span>
                <span style={{ color: "#38bdf8", fontWeight: 800 }}>88% Optimal</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Objection Mastery:</span>
                <span style={{ color: "#f59e0b", fontWeight: 800 }}>
                  {[goalUncover, goalSla, goalCompetitor, goalBook].filter(Boolean).length} / 4 Goals
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Discovery Goals Milestone Checklist */}
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 800, letterSpacing: "1px", marginBottom: 10 }}>
            [ STAGE MILESTONES // DISCOVERY ]
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: goalUncover ? "#22c55e" : "#64748b" }}>
              <span>{goalUncover ? "✓" : "○"}</span>
              <span style={{ textDecoration: goalUncover ? "line-through" : "none" }}>
                Uncover Black Friday fear & drill data
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: goalSla ? "#22c55e" : "#64748b" }}>
              <span>{goalSla ? "✓" : "○"}</span>
              <span style={{ textDecoration: goalSla ? "line-through" : "none" }}>
                Present atomic SLA & zero-double-charge fix
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: goalCompetitor ? "#22c55e" : "#64748b" }}>
              <span>{goalCompetitor ? "✓" : "○"}</span>
              <span style={{ textDecoration: goalCompetitor ? "line-through" : "none" }}>
                Rebut CommerceCloud 1.25% take rate FUD
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: goalBook ? "#22c55e" : "#64748b" }}>
              <span>{goalBook ? "✓" : "○"}</span>
              <span style={{ textDecoration: goalBook ? "line-through" : "none" }}>
                Lock in Technical Demo Slot
              </span>
            </div>
          </div>
        </div>

        {/* Booking Calendar Widget */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 800, letterSpacing: "1px" }}>
            [ SAM&apos;S OPEN CALENDAR SLOTS ]
          </div>

          {[
            "Tomorrow, 10:00 AM EST (Architecture Review)",
            "Tomorrow, 2:00 PM EST (Executive Pitch)",
            "Tomorrow, 4:30 PM EST (Final Terms Review)",
          ].map((slot) => {
            const isSelected = dealState.bookedSlot === slot;
            return (
              <button
                key={slot}
                onClick={() => handleBookMeeting(slot)}
                style={{
                  padding: "10px 12px",
                  background: isSelected ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.03)",
                  border: isSelected ? "1px solid #22c55e" : "1px solid #1e293b",
                  borderRadius: 6,
                  color: isSelected ? "#22c55e" : "#f8fafc",
                  textAlign: "left",
                  fontSize: 11,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 0 12px rgba(34,197,94,0.2)" : "none",
                }}
              >
                <span>📅 {slot}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: isSelected ? "#22c55e" : "#f59e0b" }}>
                  {isSelected ? "[ BOOKED ✓ ]" : "[ SELECT ▶ ]"}
                </span>
              </button>
            );
          })}

          <AnimatePresence>
            {dealState.bookedSlot && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid #22c55e",
                  borderRadius: 8,
                  padding: 12,
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: "#22c55e", marginBottom: 4 }}>
                  🎉 TECHNICAL DEMO CONFIRMED
                </div>
                <div style={{ fontSize: 10, color: "#cbd5e1", lineHeight: 1.4, marginBottom: 8 }}>
                  Sam Jenkins accepted {dealState.bookedSlot}. Proceed to Room 02 to build your pitch deck & pricing proposal.
                </div>
                {onNavigateToSubEnv && (
                  <button
                    onClick={() => onNavigateToSubEnv("pitch")}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#22c55e",
                      border: "none",
                      color: "#000",
                      fontWeight: 900,
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      letterSpacing: "0.5px",
                    }}
                  >
                    PROCEED TO PITCH ROOM 02 ▶
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Full-Screen Immersive 3D Observer Live Overlay (Matching /test-avatar) */}
      {isObserverFullScreen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            background: "#080603",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top Bar with Status and Minimize Button */}
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 24,
              right: 24,
              zIndex: 100,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(5, 8, 16, 0.85)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                padding: "8px 18px",
                borderRadius: 24,
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                boxShadow: "0 0 15px rgba(245, 158, 11, 0.2)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#f59e0b",
                  boxShadow: "0 0 12px #f59e0b",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b", letterSpacing: "1px" }}>
                3D OBSERVER LIVE // FULL SCREEN
              </span>
            </div>

            <button
              onClick={() => setIsObserverFullScreen(false)}
              style={{
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#f8fafc",
                padding: "8px 18px",
                borderRadius: 24,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
              }}
            >
              <span style={{ color: "#ef4444", fontWeight: 900 }}>✕</span>
              <span>MINIMIZE TO WORKSPACE</span>
            </button>
          </div>

          {/* Full Screen Live Voice Session (Identical to /test-avatar) */}
          <div style={{ flex: 1, width: "100%", height: "100%", position: "relative" }}>
            <VoiceSession
              domain="sales"
              problemTitle="Scope 2 Sales: High-Stakes Renewal Objection Handling"
              scenario="Sam Jenkins from Nordic Goods is threatening not to renew their $250k contract due to Black Friday downtime risks."
              autoConnect={true}
              initialEngine="live"
              showAvatar={true}
              compact={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const battlecardBtnStyle = (color: string) => ({
  fontSize: 10,
  padding: "6px 12px",
  background: `${color}15`,
  border: `1px solid ${color}60`,
  color: color,
  borderRadius: 4,
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  fontFamily: "inherit",
  letterSpacing: "0.5px",
  transition: "all 0.15s ease",
});
