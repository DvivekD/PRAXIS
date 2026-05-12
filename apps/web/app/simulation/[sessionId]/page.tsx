"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { sendMessageAction } from "../../../actions/eval";
import Editor from "@monaco-editor/react";

const AvatarScene = dynamic(() => import("../../../components/Avatar/AvatarScene"), { ssr: false });

// Domain-specific color schemes
const DOMAIN_THEMES: Record<string, { accent: string; accentDim: string; label: string }> = {
  engineering: { accent: "#00ff41", accentDim: "rgba(0,255,65,0.15)", label: "ENGINEERING" },
  sales: { accent: "#f59e0b", accentDim: "rgba(245,158,11,0.15)", label: "SALES" },
  product: { accent: "#818cf8", accentDim: "rgba(129,140,248,0.15)", label: "PRODUCT" },
  data: { accent: "#06b6d4", accentDim: "rgba(6,182,212,0.15)", label: "DATA" },
};

function SimulationContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const skin = searchParams.get("skin") || "ide";
  const domain = searchParams.get("domain") || "engineering";

  const theme = DOMAIN_THEMES[domain] || DOMAIN_THEMES.engineering;

  const [messages, setMessages] = useState<{ role: string; content: string; persona?: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cognitiveLoad, setCognitiveLoad] = useState(50);
  const [turns, setTurns] = useState(0);
  const [activeTab, setActiveTab] = useState<"chat" | "code" | "terminal">("chat");
  const [activePerson, setActivePerson] = useState({ name: "Agent", role: "Stakeholder", escalation: 0 });
  const [dimensions, setDimensions] = useState<Record<string, number>>({});
  const [codeContent, setCodeContent] = useState("");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [bootPhase, setBootPhase] = useState(0); // 0 = booting, 1-N = lines appearing, -1 = done
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalStage, setTerminalStage] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const turnStartTime = useRef(Date.now());

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Boot-up animation
  useEffect(() => {
    const envLines: Record<string, string[]> = {
      engineering: [
        "[ PRAXIS ] Initializing Engineering Environment...",
        "[ PRAXIS ] Loading IDE kernel ━━━━━━━━━━━━━ OK",
        "[ PRAXIS ] Mounting code sandbox ━━━━━━━━━━ OK",
        "[ PRAXIS ] Spawning terminal emulator ━━━━━ OK",
        `[ PRAXIS ] Connecting to stakeholder: Alex Chen (PM)`,
        "[ PRAXIS ] Observer Layer 1 ━━━━━━━━━━━━━━ ACTIVE",
        "[ PRAXIS ] Persona Layer 2 ━━━━━━━━━━━━━━ ACTIVE",
        "[ PRAXIS ] Cognitive tracker online ━━━━━━ READY",
        "",
        "▶ ENVIRONMENT READY — SIMULATION STARTING",
      ],
      sales: [
        "[ PRAXIS ] Initializing Sales Roleplay Environment...",
        "[ PRAXIS ] Loading voice synthesis engine ━━ OK",
        "[ PRAXIS ] Mounting 3D avatar pipeline ━━━━ OK",
        "[ PRAXIS ] Loading negotiation scenario ━━━ OK",
        `[ PRAXIS ] Connecting to stakeholder: Jordan Mitchell (VP Sales)`,
        "[ PRAXIS ] Observer Layer 1 ━━━━━━━━━━━━━━ ACTIVE",
        "[ PRAXIS ] Persona Layer 2 ━━━━━━━━━━━━━━ ACTIVE",
        "[ PRAXIS ] Escalation tracker online ━━━━━ READY",
        "",
        "▶ ENVIRONMENT READY — ROLEPLAY STARTING",
      ],
      product: [
        "[ PRAXIS ] Initializing Product Strategy Environment...",
        "[ PRAXIS ] Loading stakeholder graph ━━━━━━ OK",
        "[ PRAXIS ] Mounting decision framework ━━━ OK",
        "[ PRAXIS ] Loading competitive analysis ━━━ OK",
        `[ PRAXIS ] Connecting to stakeholder: Taylor Brooks (CEO)`,
        "[ PRAXIS ] Observer Layer 1 ━━━━━━━━━━━━━━ ACTIVE",
        "[ PRAXIS ] Persona Layer 2 ━━━━━━━━━━━━━━ ACTIVE",
        "[ PRAXIS ] Communication tracker online ━━ READY",
        "",
        "▶ ENVIRONMENT READY — SIMULATION STARTING",
      ],
      data: [
        "[ PRAXIS ] Initializing Data Pipeline Environment...",
        "[ PRAXIS ] Loading SQL workspace ━━━━━━━━━━ OK",
        "[ PRAXIS ] Mounting query analyzer ━━━━━━━ OK",
        "[ PRAXIS ] Loading dataset schemas ━━━━━━━ OK",
        `[ PRAXIS ] Connecting to stakeholder: Riley Kim (Platform Lead)`,
        "[ PRAXIS ] Observer Layer 1 ━━━━━━━━━━━━━━ ACTIVE",
        "[ PRAXIS ] Persona Layer 2 ━━━━━━━━━━━━━━ ACTIVE",
        "[ PRAXIS ] Efficiency tracker online ━━━━━ READY",
        "",
        "▶ ENVIRONMENT READY — SIMULATION STARTING",
      ],
    };

    const lines = envLines[domain] || envLines.engineering;
    let lineIndex = 0;

    const interval = setInterval(() => {
      if (lineIndex < lines.length) {
        setBootLines(prev => [...prev, lines[lineIndex]]);
        setBootPhase(lineIndex + 1);
        lineIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => setBootPhase(-1), 600); // Small delay before transitioning
      }
    }, 180);

    return () => clearInterval(interval);
  }, [domain]);

  // Initialize session from state passed through localStorage or initial fetch
  useEffect(() => {
    const stored = localStorage.getItem(`praxis_session_${sessionId}`);
    if (stored) {
      const state = JSON.parse(stored);
      if (state.messages) setMessages(state.messages.map((m: any) => ({ ...m, persona: m.role === "assistant" ? state.activePersona?.name : undefined })));
      if (state.setupCode) setCodeContent(state.setupCode);
      if (state.activePersona) setActivePerson(state.activePersona);
      if (state.skinType === "ide") {
        setTerminalOutput([
          `$ praxis --domain ${domain} --session ${sessionId.slice(0, 8)}`,
          "",
          `[PRAXIS] Simulation environment initialized`,
          `[PRAXIS] Domain: ${domain.toUpperCase()}`,
          `[PRAXIS] Skin: ${skin.toUpperCase()}`,
          `[PRAXIS] Observer: ACTIVE — tracking 8 process dimensions`,
          "",
        ]);
      }
      setSessionStarted(true);
    } else {
      setMessages([
        { role: "assistant", content: `Welcome to your ${domain} simulation. I'll brief you on the situation shortly. What questions do you have?`, persona: "Agent" },
      ]);
      setSessionStarted(true);
    }
  }, [sessionId, domain, skin]);

  // ─── Boot-up screen ───────────────────────────────────────
  if (bootPhase >= 0) {
    return (
      <div style={{ height: "100vh", width: "100vw", background: "#020202", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace" }}>
        <div style={{ width: "100%", maxWidth: 600, padding: "0 24px" }}>
          <div style={{ fontSize: 10, color: theme.accent, textTransform: "uppercase", letterSpacing: "3px", marginBottom: 24, textAlign: "center" }}>
            ◈ PRAXIS // {theme.label} ENVIRONMENT
          </div>
          <div style={{ background: "#050505", border: `1px solid ${theme.accent}30`, padding: 20, minHeight: 280 }}>
            {bootLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  fontSize: 12,
                  lineHeight: 2,
                  color: line?.includes("OK") || line?.includes("ACTIVE") || line?.includes("READY")
                    ? theme.accent
                    : line?.includes("▶")
                    ? "#fff"
                    : line?.includes("Connecting")
                    ? "#f59e0b"
                    : "#666",
                  fontWeight: line?.includes("▶") ? 700 : 400,
                }}
              >
                {line || "\u00A0"}
              </motion.div>
            ))}
            {bootPhase > 0 && bootPhase <= 8 && (
              <span style={{ color: theme.accent, animation: "blink 1s step-end infinite" }}>▌</span>
            )}
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 12, height: 2, background: "#1a1a1a", overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${Math.min(100, bootPhase * 11)}%` }}
              style={{ height: "100%", background: theme.accent }}
            />
          </div>
        </div>
        <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
      </div>
    );
  }

  const submitMessage = async (messageContent: string) => {
    setLoading(true);
    const timeOnTurn = (Date.now() - turnStartTime.current) / 1000;
    turnStartTime.current = Date.now();

    try {
      const currentState = {
        messages,
        cognitiveLoadScore: cognitiveLoad,
        resolutionTurns: turns,
        currentScenario: localStorage.getItem(`praxis_session_${sessionId}`) ? JSON.parse(localStorage.getItem(`praxis_session_${sessionId}`)!).currentScenario : "",
        problemTitle: localStorage.getItem(`praxis_session_${sessionId}`) ? JSON.parse(localStorage.getItem(`praxis_session_${sessionId}`)!).problemTitle : "",
        contextVariables: localStorage.getItem(`praxis_session_${sessionId}`) ? JSON.parse(localStorage.getItem(`praxis_session_${sessionId}`)!).contextVariables : {},
        setupCode: codeContent,
        agentPrompt: localStorage.getItem(`praxis_session_${sessionId}`) ? JSON.parse(localStorage.getItem(`praxis_session_${sessionId}`)!).agentPrompt : "",
        skinType: skin,
        dimensionalScores: dimensions,
        processSignals: localStorage.getItem(`praxis_session_${sessionId}`) ? JSON.parse(localStorage.getItem(`praxis_session_${sessionId}`)!).processSignals : {},
        activePersona: activePerson,
      };

      const data = await sendMessageAction(sessionId, messageContent, {
        flightTimeVariance: Math.random() * 80 + 20,
        pauseCount: Math.floor(Math.random() * 4),
        wordsPerMinute: 55 + Math.random() * 45,
        timeOnCurrentTurn: timeOnTurn,
        backspaceRatio: Math.random() * 0.2,
        tabSwitchCount: Math.floor(Math.random() * 3),
        codeEditCount: skin === "ide" ? Math.floor(Math.random() * 5) : 0,
      }, currentState);

      if (domain === "sales" && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.rate = 1.05;
        utterance.pitch = 0.95;
        window.speechSynthesis.speak(utterance);
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response,
        persona: data.persona?.name || "Agent",
      }]);
      setCognitiveLoad(data.state.cognitiveLoadScore);
      setTurns(data.state.resolutionTurns);
      if (data.persona) setActivePerson(data.persona);
      if (data.state.dimensionalScores) setDimensions(data.state.dimensionalScores);

      if (data.isComplete) {
        setTimeout(() => router.push(`/results/${sessionId}`), 2000);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "assistant", content: "Connection issue. Can you rephrase your approach?", persona: "System" }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const content = input;
    setMessages(prev => [...prev, { role: "user", content }]);
    setInput("");
    submitMessage(content);
  };

  const handleInteract = (actionText: string) => {
    if (loading) return;
    const content = `[ACTION] ${actionText}`;
    setMessages(prev => [...prev, { role: "user", content }]);
    submitMessage(content);
  };

  const handleTerminalCommand = () => {
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalInput("");
    
    setTerminalOutput(prev => {
      const newOut = [...prev, `$ ${cmd}`];
      
      if (cmd === "npm run debug" && terminalStage === 0) {
        setTerminalStage(1);
        newOut.push("[PRAXIS] Running debugger...");
        newOut.push("[PRAXIS] Found 1 memory leak in distributed rate limiter.");
        newOut.push("[PRAXIS] Awaiting system restart to apply patch.");
      } else if (cmd === "pm2 restart all" && terminalStage === 1) {
        setTerminalStage(2);
        newOut.push("[PRAXIS] Restarting all services...");
        newOut.push("[PRAXIS] PASS — System stable.");
        newOut.push("[VICTORY] Routing to evaluation metrics...");
        
        handleInteract("[VICTORY] Candidate solved problem via terminal commands.");
        setTimeout(() => router.push(`/results/${sessionId}`), 2500);
      } else if (cmd === "npm run debug" || cmd === "pm2 restart all") {
        newOut.push(`[PRAXIS] ERROR: Command out of sequence. Check system state.`);
      } else {
        newOut.push(`[PRAXIS] Command not recognized: ${cmd}`);
      }
      return newOut;
    });
  };

  const cogColor = cognitiveLoad > 70 ? "#ef4444" : cognitiveLoad > 40 ? "#f59e0b" : "#22c55e";
  const escalationColor = activePerson.escalation >= 2 ? "#ef4444" : activePerson.escalation >= 1 ? "#f59e0b" : "#22c55e";

  const gridLayout = "60fr 40fr";
  const availableTabs = skin === "roleplay" ? ["chat"] : ["chat", "code", "terminal"];

  return (
    <div style={{ height: "100vh", width: "100vw", display: "grid", gridTemplateColumns: gridLayout, background: "#020202", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden" }}>

      {/* LEFT PANEL */}
      <div style={{ display: "flex", flexDirection: "column", borderRight: `1px solid ${theme.accent}20` }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${theme.accent}20`, background: "#050505" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, background: theme.accent, boxShadow: `0 0 8px ${theme.accent}` }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", textTransform: "uppercase" }}>PRAXIS // {theme.label}</span>
            <span style={{ fontSize: 10, padding: "2px 6px", background: theme.accentDim, color: theme.accent, fontWeight: 700 }}>LIVE</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#666" }}>TURN {turns}/10</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, background: cogColor, boxShadow: `0 0 6px ${cogColor}` }} />
              <span style={{ fontSize: 11, color: cogColor }}>LOAD {cognitiveLoad}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, background: escalationColor, boxShadow: `0 0 6px ${escalationColor}` }} />
              <span style={{ fontSize: 11, color: escalationColor }}>ESC {activePerson.escalation}/3</span>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        {availableTabs.length > 1 && (
          <div style={{ display: "flex", borderBottom: `1px solid ${theme.accent}20`, background: "#050505" }}>
            {availableTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                style={{
                  padding: "8px 16px", fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "1px",
                  color: activeTab === tab ? theme.accent : "#444",
                  background: "transparent", border: "none", cursor: "pointer",
                  borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : "2px solid transparent",
                }}
              >
                {tab === "chat" ? "◆ STAKEHOLDER" : tab === "code" ? "◇ EDITOR" : "▪ TERMINAL"}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {activeTab === "chat" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      maxWidth: "85%",
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      padding: "10px 14px",
                      background: msg.role === "user" ? `${theme.accent}15` : "#0a0a0a",
                      border: `1px solid ${msg.role === "user" ? `${theme.accent}40` : "#222"}`,
                      fontSize: 13, lineHeight: 1.7, color: "#ccc",
                    }}
                  >
                    {msg.role === "assistant" && (
                      <div style={{ fontSize: 10, color: theme.accent, fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>
                        {msg.persona || activePerson.name} — {activePerson.role}
                      </div>
                    )}
                    {msg.content}
                  </motion.div>
                ))}
                {loading && (
                  <div style={{ alignSelf: "flex-start", padding: "10px 14px", background: "#0a0a0a", border: "1px solid #222" }}>
                    <span style={{ color: theme.accent, animation: "blink 1s step-end infinite" }}>▌</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ padding: "12px 16px", borderTop: `1px solid ${theme.accent}20`, display: "flex", gap: 8 }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder={`Respond to ${activePerson.name}...`}
                  style={{ flex: 1, padding: "10px 14px", border: `1px solid ${theme.accent}30`, background: "#050505", color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  style={{ padding: "10px 20px", border: "none", background: theme.accent, color: "#000", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}
                >
                  SEND
                </motion.button>
              </div>
            </>
          )}

          {activeTab === "code" && (
            <div style={{ flex: 1, padding: 0 }}>
              <Editor
                height="100%"
                theme="vs-dark"
                language={domain === "data" ? "sql" : "javascript"}
                value={codeContent}
                onChange={(value) => setCodeContent(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  padding: { top: 16 }
                }}
              />
            </div>
          )}

          {activeTab === "terminal" && (
            <div style={{ flex: 1, padding: 16, fontSize: 12, color: "#666", lineHeight: 1.8, overflowY: "auto", background: "#020202", display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1 }}>
                {terminalOutput.map((line, i) => (
                  <div key={i} style={{ color: line.includes("FAIL") || line.includes("ERROR") ? "#ef4444" : line.includes("PASS") || line.includes("ACTIVE") ? "#00ff41" : line.includes("VICTORY") ? theme.accent : line.startsWith("$") ? theme.accent : "#555" }}>
                    {line || "\u00A0"}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", color: theme.accent, marginTop: 8 }}>
                <span style={{ marginRight: 8 }}>$</span>
                <input 
                  value={terminalInput}
                  onChange={e => setTerminalInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleTerminalCommand()}
                  autoFocus
                  style={{ 
                    flex: 1, 
                    background: "transparent", 
                    border: "none", 
                    outline: "none", 
                    color: "#fff", 
                    fontFamily: "inherit", 
                    fontSize: 12 
                  }} 
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ display: "flex", flexDirection: "column", background: "#050505" }}>

        {/* 3D Avatar */}
        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          <AvatarScene analyserNode={null} domain={domain} onInteract={handleInteract} />
          {/* Persona badge overlay */}
          <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, padding: "8px 12px", background: "rgba(0,0,0,0.8)", border: `1px solid ${theme.accent}30` }}>
            <div style={{ fontSize: 10, color: theme.accent, fontWeight: 700, textTransform: "uppercase" }}>{activePerson.name}</div>
            <div style={{ fontSize: 10, color: "#666" }}>{activePerson.role}</div>
          </div>
        </div>

        {/* Observer Panel */}
        <div style={{ padding: 16, borderTop: `1px solid ${theme.accent}20`, background: "#020202" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: theme.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 10 }}>◈ OBSERVER — PROCESS SIGNALS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              { label: "Cognitive Load", value: `${cognitiveLoad}%`, color: cogColor },
              { label: "Turns", value: `${turns}/10`, color: theme.accent },
              { label: "Escalation", value: `${activePerson.escalation}/3`, color: escalationColor },
              { label: "Clarity", value: `${dimensions.communication || 50}`, color: (dimensions.communication || 50) > 70 ? "#22c55e" : "#f59e0b" },
              { label: "Approach", value: `${dimensions.approachQuality || 50}`, color: (dimensions.approachQuality || 50) > 70 ? "#22c55e" : "#f59e0b" },
              { label: "Efficiency", value: `${dimensions.efficiency || 50}`, color: (dimensions.efficiency || 50) > 70 ? "#22c55e" : "#f59e0b" },
            ].map(signal => (
              <div key={signal.label} style={{ padding: "6px 8px", background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
                <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase" }}>{signal.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: signal.color }}>{signal.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense fallback={<div style={{ background: "#020202", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#00ff41", fontFamily: "'JetBrains Mono', monospace" }}>[ INITIALIZING_SIMULATION ]</div>}>
      <SimulationContent />
    </Suspense>
  );
}
