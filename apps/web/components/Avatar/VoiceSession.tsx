"use client";

import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import AvatarScene from "./AvatarScene";
import {
  VoiceAgent,
  VoiceAgentStatus,
  VoiceAgentRole,
  base64ToArrayBuffer,
} from "../../lib/voice/geminiLive";

export type VoiceSessionStatus = "disconnected" | "connecting" | "connected" | "error";
export type VoiceSessionMode = "persona" | "guide";

export interface TranscriptMessage {
  id: string;
  role: VoiceAgentRole;
  text: string;
  timestamp: number;
}

export interface VoiceSessionProps {
  /** Voice session operation mode. Default: "persona" */
  mode?: VoiceSessionMode;
  /** Active domain skin for 3D avatar and persona context ("engineering", "sales", "product", "data", "onboarding"). Default: "engineering" */
  domain?: string;
  /** Assessment problem title for simulation contextualization */
  problemTitle?: string;
  /** Scenario description for simulation contextualization */
  scenario?: string;
  /** Specific persona name to roleplay (in persona mode) */
  personaName?: string;
  /** Prebuilt voice name (e.g. "Aoede" for persona, "Puck" for guide) */
  voice?: string;
  /** Custom system instruction override */
  systemInstruction?: string;
  /** Optional existing AnalyserNode passed by parent; if omitted, VoiceSession creates and manages its own */
  analyserNode?: AnalyserNode | null;
  /** Callback notifying parent when internal AnalyserNode is created or ready */
  onAnalyserNodeCreated?: (node: AnalyserNode) => void;
  /** Alias callback for interop with existing simulation page hooks */
  onAnalyserReady?: (analyser: AnalyserNode) => void;
  /** Callback fired on real-time transcript updates from user or model */
  onTranscript?: (role: VoiceAgentRole, text: string) => void;
  /** Callback fired when candidate completes a full spoken turn */
  onUserTurn?: (text: string) => void;
  /** Callback fired when Gemini Live emits a tool/function call */
  onToolCall?: (name: string, args: Record<string, unknown>, id?: string) => void;
  /** Convenience callback for coach events logged in guide mode (e.g. log_event tool) */
  onCoachEvent?: (event: string, detail: string) => void;
  /** Callback fired when connection status transitions */
  onStatusChange?: (status: VoiceSessionStatus, detail?: string) => void;
  /** Whether to render embedded 3D AvatarScene. Default: true */
  showAvatar?: boolean;
  /** Compact docking layout for embedding in narrow panels or headers. Default: false */
  compact?: boolean;
  /** Automatically connect to voice session on mount. Default: false */
  autoConnect?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Custom inline style overrides */
  style?: React.CSSProperties;
}

export const OUTPUT_SAMPLE_RATE = 24000; // Gemini Live 2.0 Flash output is 24kHz mono 16-bit Linear PCM

interface WebkitAudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

/**
 * Decodes a Base64-encoded 16-bit signed Linear PCM chunk (little-endian, 24kHz)
 * into a single-channel Web Audio AudioBuffer with samples normalized to [-1.0, 1.0].
 */
export function decodeBase64PcmToAudioBuffer(
  audioCtx: AudioContext,
  base64Pcm: string,
  sampleRate: number = OUTPUT_SAMPLE_RATE
): AudioBuffer | null {
  try {
    const arrayBuffer = base64ToArrayBuffer(base64Pcm);
    const numSamples = Math.floor(arrayBuffer.byteLength / 2);
    if (numSamples === 0) {
      return null;
    }

    const dataView = new DataView(arrayBuffer);
    const float32 = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const int16 = dataView.getInt16(i * 2, true); // true = little-endian
      float32[i] = int16 < 0 ? int16 / 32768.0 : int16 / 32767.0;
    }

    const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
    audioBuffer.getChannelData(0).set(float32);
    return audioBuffer;
  } catch (err) {
    console.warn("[VoiceSession] Error decoding PCM audio chunk:", err);
    return null;
  }
}

export interface VoiceSessionHandle {
  pushContext: (text: string) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => Promise<void>;
  getStatus: () => VoiceSessionStatus;
  getAnalyserNode: () => AnalyserNode | null;
}

export const VoiceSession = forwardRef<VoiceSessionHandle, VoiceSessionProps>(function VoiceSession({
  mode = "persona",
  domain = "engineering",
  problemTitle = "Technical Assessment Simulation",
  scenario = "Live technical interview simulation",
  personaName,
  voice,
  systemInstruction,
  analyserNode: externalAnalyser,
  onAnalyserNodeCreated,
  onAnalyserReady,
  onTranscript,
  onUserTurn,
  onToolCall,
  onCoachEvent,
  onStatusChange,
  showAvatar = true,
  compact = false,
  autoConnect = false,
  className,
  style,
}: VoiceSessionProps, ref): React.JSX.Element {
  const [status, setStatus] = useState<VoiceSessionStatus>("disconnected");
  const [internalAnalyser, setInternalAnalyser] = useState<AnalyserNode | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentTranscripts, setRecentTranscripts] = useState<TranscriptMessage[]>([]);

  const agentRef = useRef<VoiceAgent | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);

  // Web Audio playback scheduling queue
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Accumulation buffer for candidate speech turn
  const userTranscriptBufferRef = useRef<string>("");
  const isConnectingRef = useRef<boolean>(false);

  // Active AnalyserNode resolution: external override takes precedence, fallback to internally created
  const activeAnalyser = externalAnalyser !== undefined ? externalAnalyser : internalAnalyser;

  /**
   * Initializes the Web Audio playback graph:
   * AudioBufferSourceNode -> GainNode -> AnalyserNode -> AudioContext.destination
   */
  const initAudioGraph = useCallback((): {
    audioCtx: AudioContext;
    gainNode: GainNode;
    analyserNode: AnalyserNode;
  } => {
    let audioCtx = audioContextRef.current;
    if (
      externalAnalyser &&
      externalAnalyser.context instanceof AudioContext &&
      externalAnalyser.context.state !== "closed"
    ) {
      audioCtx = externalAnalyser.context;
      audioContextRef.current = audioCtx;
    } else if (!audioCtx || audioCtx.state === "closed") {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as WebkitAudioWindow).webkitAudioContext;
      if (!AudioCtxClass) {
        throw new Error("Web Audio API is not supported in this browser environment.");
      }
      audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;
    }

    let gainNode = gainNodeRef.current;
    if (!gainNode || gainNode.context !== audioCtx) {
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 1.0;
      gainNodeRef.current = gainNode;
    }

    let analyser = externalAnalyser || analyserNodeRef.current;
    if (!analyser || analyser.context !== audioCtx) {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserNodeRef.current = analyser;
      setInternalAnalyser(analyser);
      onAnalyserReady?.(analyser);
      onAnalyserNodeCreated?.(analyser);
    }

    try {
      gainNode.disconnect();
    } catch {}
    try {
      analyser.disconnect();
    } catch {}

    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    return { audioCtx, gainNode, analyserNode: analyser };
  }, [externalAnalyser, onAnalyserReady, onAnalyserNodeCreated]);

  /**
   * Stops all active and queued AudioBufferSourceNodes, disconnecting them cleanly.
   */
  const stopAllPlayback = useCallback(() => {
    for (const source of activeSourcesRef.current) {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch {}
    }
    activeSourcesRef.current.clear();
    setIsSpeaking(false);

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
  }, []);

  /**
   * Flushes accumulated candidate speech turn to parent evaluation pipeline.
   */
  const flushUserTurn = useCallback(() => {
    const text = userTranscriptBufferRef.current.trim();
    if (text) {
      onUserTurn?.(text);
      userTranscriptBufferRef.current = "";
    }
  }, [onUserTurn]);

  /**
   * Schedules a decoded Base64 PCM audio chunk onto the Web Audio timeline.
   */
  const scheduleAudioChunk = useCallback(
    (base64Pcm: string) => {
      // First model speech chunk confirms that the user turn completed
      flushUserTurn();

      const audioCtx = audioContextRef.current;
      const gainNode = gainNodeRef.current;
      if (!audioCtx || !gainNode || audioCtx.state === "closed") {
        return;
      }

      const audioBuffer = decodeBase64PcmToAudioBuffer(audioCtx, base64Pcm);
      if (!audioBuffer) {
        return;
      }

      const now = audioCtx.currentTime;
      const startTime = Math.max(now + 0.02, nextStartTimeRef.current);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNode);

      activeSourcesRef.current.add(source);
      setIsSpeaking(true);

      source.onended = () => {
        activeSourcesRef.current.delete(source);
        try {
          source.disconnect();
        } catch {}
        if (activeSourcesRef.current.size === 0) {
          setIsSpeaking(false);
        }
      };

      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
    },
    [flushUserTurn]
  );

  /**
   * Handles barge-in / interruption: immediately stops playback so model voice stops speaking.
   */
  const handleInterrupted = useCallback(() => {
    stopAllPlayback();
  }, [stopAllPlayback]);

  /**
   * Handles tool call dispatch and automated acknowledgement.
   */
  const handleToolCall = useCallback(
    (name: string, args: Record<string, unknown>, id?: string) => {
      onToolCall?.(name, args, id);
      if (name === "log_event") {
        const eventStr = typeof args.event === "string" ? args.event : "coaching_event";
        const detailStr =
          typeof args.detail === "string" ? args.detail : JSON.stringify(args);
        onCoachEvent?.(eventStr, detailStr);
        if (id && agentRef.current) {
          try {
            agentRef.current.sendToolResponse(name, id, { status: "logged" });
          } catch (err) {
            console.warn("[VoiceSession] Error responding to tool call:", err);
          }
        }
      }
    },
    [onToolCall, onCoachEvent]
  );

  /**
   * Disconnects active session and halts audio playback.
   */
  const disconnectVoice = useCallback(async () => {
    stopAllPlayback();
    userTranscriptBufferRef.current = "";

    if (agentRef.current) {
      const agent = agentRef.current;
      agentRef.current = null;
      try {
        await agent.disconnect();
      } catch (err) {
        console.warn("[VoiceSession] Error during agent disconnect:", err);
      }
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        await audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    gainNodeRef.current = null;
    analyserNodeRef.current = null;
    setInternalAnalyser(null);
    setIsMuted(false);
    setIsSpeaking(false);
    setStatus("disconnected");
    onStatusChange?.("disconnected");
  }, [stopAllPlayback, onStatusChange]);

  /**
   * Connects to Gemini Live session.
   */
  const connectVoice = useCallback(async () => {
    if (status === "connecting" || status === "connected" || isConnectingRef.current) {
      return;
    }
    isConnectingRef.current = true;
    setErrorMessage(null);
    setStatus("connecting");
    onStatusChange?.("connecting");

    try {
      // 1. Initialize Web Audio playback graph and resume from user gesture
      const { audioCtx } = initAudioGraph();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      nextStartTimeRef.current = audioCtx.currentTime;

      // 2. Instantiate VoiceAgent
      const agent = new VoiceAgent({
        mode,
        systemInstruction,
        voice,
        domain,
        problemTitle,
        scenario,
        personaName,
      });
      agentRef.current = agent;

      // 3. Connect with event callbacks
      await agent.connect({
        onAudioChunk: (base64) => {
          scheduleAudioChunk(base64);
        },
        onTranscript: (role, text) => {
          if (role === "user") {
            userTranscriptBufferRef.current +=
              (userTranscriptBufferRef.current ? " " : "") + text.trim();
          } else {
            // Model started transcript -> flush user turn
            flushUserTurn();
          }
          onTranscript?.(role, text);

          setRecentTranscripts((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === role) {
              return [
                ...prev.slice(0, prev.length - 1),
                { ...last, text: last.text + " " + text },
              ];
            }
            const newEntry: TranscriptMessage = {
              id: Math.random().toString(36).substring(2, 9),
              role,
              text,
              timestamp: Date.now(),
            };
            return [...prev.slice(-2), newEntry];
          });
        },
        onInterrupted: () => {
          handleInterrupted();
        },
        onTurnComplete: () => {
          flushUserTurn();
        },
        onToolCall: (name, args, id) => {
          handleToolCall(name, args, id);
        },
        onStatusChange: (newStatus, detail) => {
          setStatus(newStatus);
          onStatusChange?.(newStatus, detail);
          if (newStatus === "error" && detail) {
            setErrorMessage(detail);
          }
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[VoiceSession] Connection failure:", msg);
      setStatus("error");
      setErrorMessage(msg);
      onStatusChange?.("error", msg);
      await disconnectVoice();
    } finally {
      isConnectingRef.current = false;
    }
  }, [
    status,
    initAudioGraph,
    mode,
    systemInstruction,
    voice,
    domain,
    problemTitle,
    scenario,
    personaName,
    scheduleAudioChunk,
    flushUserTurn,
    handleInterrupted,
    handleToolCall,
    onTranscript,
    onStatusChange,
    disconnectVoice,
  ]);

  /**
   * Toggles microphone mute state via VoiceAgent hardware controls.
   */
  const toggleMute = useCallback(async () => {
    const agent = agentRef.current;
    if (!agent || status !== "connected") {
      return;
    }

    if (isMuted) {
      try {
        await agent.startMic();
        setIsMuted(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[VoiceSession] Failed to unmute microphone:", msg);
        setErrorMessage("Microphone reactivation failed: " + msg);
      }
    } else {
      agent.stopMic();
      setIsMuted(true);
    }
  }, [isMuted, status]);

  useImperativeHandle(ref, () => ({
    pushContext: (text: string) => {
      agentRef.current?.pushContext(text);
    },
    connect: connectVoice,
    disconnect: disconnectVoice,
    toggleMute,
    getStatus: () => status,
    getAnalyserNode: () => activeAnalyser,
  }), [connectVoice, disconnectVoice, toggleMute, status, activeAnalyser]);

  // Handle autoConnect
  useEffect(() => {
    if (autoConnect && status === "disconnected") {
      void connectVoice();
    }
  }, [autoConnect, status, connectVoice]);

  // Bulletproof cleanup on component unmount
  useEffect(() => {
    return () => {
      stopAllPlayback();
      if (agentRef.current) {
        const agent = agentRef.current;
        agentRef.current = null;
        void agent.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
      gainNodeRef.current = null;
      analyserNodeRef.current = null;
    };
  }, [stopAllPlayback]);

  // Status visual attributes
  const getStatusColor = (): string => {
    if (status === "error") return "#ef4444";
    if (status === "connecting") return "#f59e0b";
    if (status === "connected") {
      if (isMuted) return "#f43f5e";
      if (isSpeaking) return "#06b6d4";
      return "#22c55e";
    }
    return "#71717a";
  };

  const getStatusLabel = (): string => {
    if (status === "error") return "Error";
    if (status === "connecting") return "Connecting...";
    if (status === "connected") {
      if (isMuted) return "Mic Muted";
      if (isSpeaking) return `Speaking (${mode.toUpperCase()})`;
      return `Listening (${mode.toUpperCase()})`;
    }
    return "Ready";
  };

  const statusColor = getStatusColor();
  const statusLabel = getStatusLabel();
  const isPulsing =
    status === "connecting" || (status === "connected" && !isMuted);

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        backgroundColor: showAvatar ? "transparent" : "#050505",
        ...style,
      }}
    >
      <style>{`
        @keyframes praxisPulse {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.4); opacity: 0.4; }
        }
        @keyframes praxisSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* 3D Scene Viewport */}
      {showAvatar && (
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <AvatarScene analyserNode={activeAnalyser} domain={domain} />
        </div>
      )}

      {/* Floating Transcripts Strip */}
      {recentTranscripts.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: compact ? 70 : 92,
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            maxWidth: 580,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 15,
            pointerEvents: "none",
          }}
        >
          {recentTranscripts.map((entry) => {
            const isUser = entry.role === "user";
            return (
              <div
                key={entry.id}
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  backgroundColor: isUser
                    ? "rgba(16, 185, 129, 0.15)"
                    : "rgba(15, 23, 42, 0.85)",
                  border: isUser
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 12,
                  padding: "8px 14px",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: isUser ? "#34d399" : "#38bdf8",
                  }}
                >
                  {isUser ? "Candidate (You)" : personaName || "AI Observer"}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#f4f4f5",
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                  }}
                >
                  {entry.text}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Error Banner with Retry */}
      {errorMessage && (
        <div
          style={{
            position: "absolute",
            bottom: compact ? 72 : 94,
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            maxWidth: 580,
            backgroundColor: "rgba(30, 10, 10, 0.95)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: 12,
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            zIndex: 18,
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 16px rgba(239, 68, 68, 0.2)",
          }}
        >
          <div
            style={{
              color: "#fca5a5",
              fontSize: 12,
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={errorMessage}
          >
            ⚠️ {errorMessage}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              onClick={connectVoice}
              style={{
                backgroundColor: "#ef4444",
                color: "#ffffff",
                border: "none",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Retry
            </button>
            <button
              onClick={() => setErrorMessage(null)}
              style={{
                backgroundColor: "transparent",
                color: "#fca5a5",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                padding: "0 4px",
                lineHeight: 1,
              }}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Cybernetic Control Dock */}
      <div
        style={{
          position: "absolute",
          bottom: compact ? 12 : 20,
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(10, 10, 15, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          padding: compact ? "6px 14px" : "10px 20px",
          borderRadius: 32,
          display: "flex",
          alignItems: "center",
          gap: compact ? 10 : 16,
          zIndex: 20,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Status Indicator Dot & Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", width: 10, height: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: statusColor,
              }}
            />
            {isPulsing && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: statusColor,
                  animation: "praxisPulse 1.8s infinite ease-out",
                }}
              />
            )}
          </div>
          <span
            style={{
              color: "#e4e4e7",
              fontFamily: "monospace",
              fontSize: 12,
              letterSpacing: "0.5px",
              whiteSpace: "nowrap",
            }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Domain Badge */}
        {!compact && (
          <div
            style={{
              fontSize: 10,
              fontFamily: "monospace",
              color: "rgba(255, 255, 255, 0.4)",
              borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
              paddingLeft: 12,
              textTransform: "uppercase",
            }}
          >
            {domain}
          </div>
        )}

        {/* Action Controls */}
        {status === "disconnected" || status === "error" ? (
          <button
            onClick={connectVoice}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              borderRadius: 20,
              border: "1px solid rgba(16, 185, 129, 0.4)",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)",
              transition: "transform 0.1s ease, filter 0.1s ease",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Connect Voice
          </button>
        ) : status === "connecting" ? (
          <button
            disabled
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 16px",
              borderRadius: 20,
              border: "1px solid rgba(245, 158, 11, 0.3)",
              backgroundColor: "rgba(245, 158, 11, 0.2)",
              color: "#fbbf24",
              fontSize: 12,
              fontWeight: 600,
              cursor: "not-allowed",
              fontFamily: "inherit",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ animation: "praxisSpin 1s linear infinite" }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Connecting...
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Mic Mute / Unmute Button */}
            <button
              onClick={toggleMute}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 20,
                border: isMuted
                  ? "1px solid rgba(244, 63, 94, 0.5)"
                  : "1px solid rgba(255, 255, 255, 0.2)",
                backgroundColor: isMuted
                  ? "rgba(244, 63, 94, 0.2)"
                  : "rgba(255, 255, 255, 0.1)",
                color: isMuted ? "#fb7185" : "#ffffff",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background-color 0.15s ease",
              }}
            >
              {isMuted ? (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  <span>Mute</span>
                </>
              )}
            </button>

            {/* Disconnect Button */}
            <button
              onClick={disconnectVoice}
              title="End Voice Session"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid rgba(239, 68, 68, 0.4)",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 2px 10px rgba(220, 38, 38, 0.3)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.11-8.69 2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default VoiceSession;
