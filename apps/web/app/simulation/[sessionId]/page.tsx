"use client";

import { useEffect, useRef, useState, Suspense, useCallback } from "react";
import type { VoiceSessionHandle } from "../../../components/Avatar/VoiceSession";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { sendMessageAction } from "../../../actions/eval";
import { VoiceSession } from "../../../components/Avatar/VoiceSession";

// 7 Dedicated Domain Environments
import TerminalEnvironment from "../../../components/Environments/TerminalEnvironment";
import SalesCallEnvironment from "../../../components/Environments/SalesCallEnvironment";
import InboxEnvironment from "../../../components/Environments/InboxEnvironment";
import DataWorkspaceEnvironment from "../../../components/Environments/DataWorkspaceEnvironment";
import WarRoomEnvironment from "../../../components/Environments/WarRoomEnvironment";
import HelpdeskEnvironment from "../../../components/Environments/HelpdeskEnvironment";
import SocialCommandEnvironment from "../../../components/Environments/SocialCommandEnvironment";
import DemoPitchGuide from "../../../components/Environments/DemoPitchGuide";

const DOMAIN_THEMES: Record<string, { accent: string; accentDim: string; label: string }> = {
  engineering: { accent: "#00ff41", accentDim: "rgba(0,255,65,0.15)", label: "ENGINEERING // TERMINAL" },
  sales: { accent: "#f59e0b", accentDim: "rgba(245,158,11,0.15)", label: "SALES // CALL CONSOLE" },
  product: { accent: "#818cf8", accentDim: "rgba(129,140,248,0.15)", label: "PRODUCT // INBOX" },
  data: { accent: "#06b6d4", accentDim: "rgba(6,182,212,0.15)", label: "DATA // SQL STUDIO" },
  sre: { accent: "#ef4444", accentDim: "rgba(239,68,68,0.15)", label: "SRE // INCIDENT WAR ROOM" },
  support: { accent: "#10b981", accentDim: "rgba(16,185,129,0.15)", label: "CUSTOMER SUPPORT // HELPDESK" },
  brand: { accent: "#ec4899", accentDim: "rgba(236,72,153,0.15)", label: "BRAND & SOCIAL // CRISIS DESK" },
};

function SimulationContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = (params?.sessionId as string) || "";
  const domainRaw = (searchParams?.get("domain") || "engineering").toLowerCase();
  const skin = searchParams?.get("skin") || "ide";
  const demoParam = searchParams?.get("demo");
  const demoMode = demoParam === "true" || demoParam === "1";

  // Normalize domain
  const domain = DOMAIN_THEMES[domainRaw] ? domainRaw : "engineering";
  const theme = DOMAIN_THEMES[domain];

  // ─── ALL HOOKS MUST RESIDE AT THE TOP LEVEL (RULES OF HOOKS) ───
  const [scenarioDesc, setScenarioDesc] = useState("");
  const [problemTitle, setProblemTitle] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string; persona?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [cognitiveLoad, setCognitiveLoad] = useState(50);
  const [turns, setTurns] = useState(0);
  const [activePerson, setActivePerson] = useState({ name: "Alex Chen", role: "Lead SRE", escalation: 0 });
  const [dimensions, setDimensions] = useState<Record<string, number>>({});
  const [codeContent, setCodeContent] = useState("");
  const [bootPhase, setBootPhase] = useState(0); // 0 = boot, >0 = lines, -1 = ready
  const [bootLines, setBootLines] = useState<string[]>([]);

  // Voice agent states
  const [voiceMode, setVoiceMode] = useState<"off" | "persona" | "guide">(domain === "sales" ? "persona" : "off");
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const voiceSessionRef = useRef<VoiceSessionHandle>(null);

  // Telemetry refs
  const turnStartTime = useRef(Date.now());
  const codeEditCountRef = useRef(0);
  const lastCodePushTimeRef = useRef(0);
  const lastActivityTimeRef = useRef(Date.now());
  const simulationStartTimeRef = useRef(Date.now());
  const lastIdlePushedTimeRef = useRef(0);

  // 1. Submit message telemetry callback
  const submitMessage = useCallback(async (messageContent: string, fromVoice: boolean = false) => {
    setLoading(true);
    const timeOnTurn = (Date.now() - turnStartTime.current) / 1000;
    turnStartTime.current = Date.now();
    lastActivityTimeRef.current = Date.now();

    try {
      let cached: any = {};
      try {
        const item = typeof window !== "undefined" && sessionId ? localStorage.getItem(`praxis_session_${sessionId}`) : null;
        if (item) cached = JSON.parse(item);
      } catch {}

      const currentState = {
        messages,
        cognitiveLoadScore: cognitiveLoad,
        resolutionTurns: turns,
        currentScenario: cached.currentScenario || scenarioDesc || "",
        problemTitle: cached.problemTitle || problemTitle || "",
        contextVariables: cached.contextVariables || {},
        setupCode: codeContent,
        agentPrompt: cached.agentPrompt || "",
        skinType: skin,
        dimensionalScores: dimensions,
        processSignals: cached.processSignals || {},
        activePersona: activePerson,
      };

      const data = await sendMessageAction(
        sessionId,
        messageContent,
        {
          flightTimeVariance: Math.random() * 80 + 20,
          pauseCount: Math.floor(Math.random() * 4),
          wordsPerMinute: 55 + Math.random() * 45,
          timeOnCurrentTurn: timeOnTurn,
          backspaceRatio: Math.random() * 0.2,
          tabSwitchCount: Math.floor(Math.random() * 2),
          codeEditCount: codeEditCountRef.current,
        },
        currentState
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          persona: data.persona?.name || activePerson.name,
        },
      ]);
      setCognitiveLoad(data.state.cognitiveLoadScore);
      setTurns(data.state.resolutionTurns);
      if (data.persona) setActivePerson(data.persona);
      if (data.state.dimensionalScores) setDimensions(data.state.dimensionalScores);

      if (data.isComplete) {
        setTimeout(() => router.push(`/results/${sessionId}`), 2000);
      }
    } catch (err) {
      console.error("[PRAXIS] Telemetry dispatch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, messages, cognitiveLoad, turns, scenarioDesc, problemTitle, codeContent, skin, dimensions, activePerson, router]);

  // 2. Action interaction callback
  const handleInteract = useCallback(async (actionText: string) => {
    setMessages((prev) => [...prev, { role: "user", content: actionText }]);
    await submitMessage(actionText);
  }, [submitMessage]);

  // 3. Voice turn callback
  const handleVoiceUserTurn = useCallback(async (spokenText: string) => {
    if (!spokenText.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: spokenText }]);
    await submitMessage(spokenText, true);
  }, [submitMessage]);

  // 4. Code editor telemetry debounce
  useEffect(() => {
    if (!codeContent) return;
    codeEditCountRef.current += 1;
    lastActivityTimeRef.current = Date.now();

    if (voiceMode !== "guide") return;

    const now = Date.now();
    if (now - lastCodePushTimeRef.current >= 15000) {
      lastCodePushTimeRef.current = now;
      const elapsed = Math.round((now - simulationStartTimeRef.current) / 1000);
      const idle = Math.round((now - lastActivityTimeRef.current) / 1000);
      const summary = `[CONTEXT] t+${elapsed}s: edited code (${codeEditCountRef.current} edits); idle ${idle}s`;
      voiceSessionRef.current?.pushContext(summary.slice(0, 195));
    }
  }, [codeContent, voiceMode]);

  // 5. Inactivity timer for proactive mentor voice
  useEffect(() => {
    if (voiceMode === "off") return;

    const interval = setInterval(() => {
      const now = Date.now();
      const idleMs = now - lastActivityTimeRef.current;
      if (idleMs >= 45000 && now - lastIdlePushedTimeRef.current >= 45000) {
        lastIdlePushedTimeRef.current = now;
        voiceSessionRef.current?.speakProactiveContext(
          `Candidate has been focused quietly for 45s on ${problemTitle || "the task"}. Speak a brief, encouraging 1-sentence thought or guiding question.`
        );
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [voiceMode, problemTitle]);

  // 6. Boot animation sequence
  useEffect(() => {
    const lines = [
      `[ AURA COMMERCE ] Initializing ${theme.label}...`,
      `[ AURA CLUSTER ] Node aura-prod-04 (T-minus 6h to Black Friday) ━━ OK`,
      `[ TELEMETRY ] Observer Layer 1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ACTIVE`,
      `[ EVALUATION ] Behavioral kernel tracking 8 dimensions ━━━━━━━━━ READY`,
      `▶ ENTERING WORK ENVIRONMENT: ${domain.toUpperCase()}`,
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < lines.length) {
        setBootLines((prev) => [...prev, lines[idx]]);
        setBootPhase(idx + 1);
        idx++;
      } else {
        clearInterval(interval);
        setTimeout(() => setBootPhase(-1), demoMode ? 100 : 350);
      }
    }, demoMode ? 80 : 160);

    return () => clearInterval(interval);
  }, [domain, theme.label, demoMode]);

  // 7. Initialize session from localStorage
  useEffect(() => {
    if (!sessionId) return;
    try {
      const stored = localStorage.getItem(`praxis_session_${sessionId}`);
      if (stored) {
        const state = JSON.parse(stored);
        if (state?.currentScenario) setScenarioDesc(state.currentScenario);
        if (state?.problemTitle) setProblemTitle(state.problemTitle);
        if (state?.activePersona) setActivePerson(state.activePersona);
        if (state?.cognitiveLoadScore) setCognitiveLoad(state.cognitiveLoadScore);
        if (state?.dimensionalScores) setDimensions(state.dimensionalScores);
      }
    } catch (e) {
      console.warn("[PRAXIS] Failed to parse stored state:", e);
    }
  }, [sessionId]);

  // ─── CONDITIONAL BOOT SCREEN (SAFE AFTER ALL HOOKS ARE DECLARED) ───
  if (bootPhase >= 0) {
    return (
      <div style={{ height: "100vh", width: "100vw", background: "#020307", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace" }}>
        <div style={{ width: "100%", maxWidth: 640, padding: "0 24px" }}>
          <div style={{ fontSize: 11, color: theme.accent, letterSpacing: "3px", marginBottom: 20, textAlign: "center", fontWeight: 800 }}>
            ◈ PRAXIS // {theme.label}
          </div>
          <div style={{ background: "#060911", border: `1px solid ${theme.accent}40`, padding: 24, minHeight: 220, borderRadius: 8 }}>
            {bootLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  fontSize: 12,
                  lineHeight: 2,
                  color: line.includes("OK") || line.includes("ACTIVE") || line.includes("READY") ? theme.accent : "#94a3b8",
                  fontWeight: line.includes("▶") ? 800 : 400,
                }}
              >
                {line}
              </motion.div>
            ))}
            {bootPhase > 0 && <span style={{ color: theme.accent }}>▌</span>}
          </div>
        </div>
      </div>
    );
  }

  // ─── DOMAIN ENVIRONMENT DISPATCH ───
  const renderDomainEnvironment = () => {
    switch (domain) {
      case "sales":
        return (
          <SalesCallEnvironment
            sessionId={sessionId}
            onAction={handleInteract}
            onComplete={() => router.push(`/results/${sessionId}`)}
            demoMode={demoMode}
            voiceSessionRef={voiceSessionRef}
            voiceMode={voiceMode}
            setVoiceMode={setVoiceMode}
            analyserNode={analyserNode}
          />
        );

      case "product":
        return (
          <InboxEnvironment
            sessionId={sessionId}
            onAction={handleInteract}
            onComplete={() => router.push(`/results/${sessionId}`)}
            demoMode={demoMode}
          />
        );

      case "data":
        return (
          <DataWorkspaceEnvironment
            sessionId={sessionId}
            onAction={handleInteract}
            onComplete={() => router.push(`/results/${sessionId}`)}
            demoMode={demoMode}
          />
        );

      case "sre":
        return (
          <WarRoomEnvironment
            sessionId={sessionId}
            onAction={handleInteract}
            onComplete={() => router.push(`/results/${sessionId}`)}
            demoMode={demoMode}
          />
        );

      case "support":
        return (
          <HelpdeskEnvironment
            sessionId={sessionId}
            onAction={handleInteract}
            onComplete={() => router.push(`/results/${sessionId}`)}
            demoMode={demoMode}
          />
        );

      case "brand":
        return (
          <SocialCommandEnvironment
            sessionId={sessionId}
            onAction={handleInteract}
            onComplete={() => router.push(`/results/${sessionId}`)}
            demoMode={demoMode}
          />
        );

      case "engineering":
      default:
        return (
          <TerminalEnvironment
            sessionId={sessionId}
            onAction={handleInteract}
            onComplete={() => router.push(`/results/${sessionId}`)}
            demoMode={demoMode}
          />
        );
    }
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Floating Pitch Walkthrough Cheat-Sheet for Judges */}
      <DemoPitchGuide
        domain={domain}
        onQuickSolve={() => {
          handleInteract(`[DEMO_QUICK_SOLVE] Candidate executed pitch walkthrough for ${domain}`);
          setTimeout(() => router.push(`/results/${sessionId}`), 2200);
        }}
      />

      {/* Primary Immersive Work Environment */}
      {renderDomainEnvironment()}

      {/* Hidden Persistent Voice Agent Container (Gemini Live WebSocket) */}
      <div style={{ display: "none" }}>
        <VoiceSession
          ref={voiceSessionRef}
          mode={voiceMode}
          sessionId={sessionId}
          personaName={activePerson.name}
          personaRole={activePerson.role}
          problemTitle={problemTitle}
          scenarioDesc={scenarioDesc}
          onUserTurn={handleVoiceUserTurn}
          onAnalyserNodeReady={setAnalyserNode}
        />
      </div>
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense
      fallback={
        <div style={{ height: "100vh", width: "100vw", background: "#020307", display: "flex", alignItems: "center", justifyContent: "center", color: "#00ff41", fontFamily: "'JetBrains Mono', monospace" }}>
          [ INITIALIZING_AURA_CLUSTER... ]
        </div>
      }
    >
      <SimulationContent />
    </Suspense>
  );
}
