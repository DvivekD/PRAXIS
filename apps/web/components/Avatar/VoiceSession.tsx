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
  /** Specific persona role to roleplay */
  personaRole?: string;
  /** Simulation session ID */
  sessionId?: string;
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
  /** Alias callback for simulation page */
  onAnalyserNodeReady?: (analyser: AnalyserNode) => void;
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
  /** Initial engine: 'live' or 'fallback'. Default: 'live' */
  initialEngine?: "live" | "fallback";
  /** Custom fallback reply generator */
  onFallbackReply?: (userText: string) => Promise<string> | string;
  /** Additional CSS class name */
  className?: string;
  /** Custom inline style overrides */
  style?: React.CSSProperties;
}

export const OUTPUT_SAMPLE_RATE = 24000; // Gemini Live 2.0 Flash output is 24kHz mono 16-bit Linear PCM

interface WebkitAudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
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

interface SpeechRecognitionErrorEventLike {
  readonly error: string;
  readonly message?: string;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
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

/**
 * Sample-accurate sequential Web Audio playback queue for 24kHz Base64 PCM chunks.
 * Encapsulates timeline offsets, jitter lead buffering, active source tracking, onended nulling, and instantaneous barge-in cancellation.
 */
export class AudioPlaybackQueue {
  private audioCtx: AudioContext;
  private gainNode: GainNode;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private onSpeakingChange?: (isSpeaking: boolean) => void;

  constructor(
    audioCtx: AudioContext,
    gainNode: GainNode,
    onSpeakingChange?: (isSpeaking: boolean) => void
  ) {
    this.audioCtx = audioCtx;
    this.gainNode = gainNode;
    this.onSpeakingChange = onSpeakingChange;
    this.nextStartTime = audioCtx ? audioCtx.currentTime : 0;
  }

  public scheduleChunk(
    base64Pcm: string,
    sampleRate: number = OUTPUT_SAMPLE_RATE
  ): { source: AudioBufferSourceNode; startTime: number; endTime: number; duration: number } | null {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      return null;
    }

    const audioBuffer = decodeBase64PcmToAudioBuffer(this.audioCtx, base64Pcm, sampleRate);
    if (!audioBuffer) {
      return null;
    }

    const now = this.audioCtx.currentTime;
    const startTime = Math.max(now + 0.02, this.nextStartTime);

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    this.activeSources.add(source);
    this.onSpeakingChange?.(true);

    source.onended = () => {
      source.onended = null;
      this.activeSources.delete(source);
      try {
        source.disconnect();
      } catch {}
      if (this.activeSources.size === 0) {
        this.onSpeakingChange?.(false);
      }
    };

    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;

    return {
      source,
      startTime,
      endTime: this.nextStartTime,
      duration: audioBuffer.duration,
    };
  }

  public stopAll(): void {
    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSources.clear();
    this.onSpeakingChange?.(false);

    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.nextStartTime = this.audioCtx.currentTime;
    } else {
      this.nextStartTime = 0;
    }
  }

  public getNextStartTime(): number {
    return this.nextStartTime;
  }

  public getActiveSourceCount(): number {
    return this.activeSources.size;
  }

  public resetTimeline(): void {
    this.nextStartTime =
      this.audioCtx && this.audioCtx.state !== "closed" ? this.audioCtx.currentTime : 0;
  }
}

/**
 * Accumulates streaming candidate speech transcript chunks and flushes full spoken turns
 * to the parent evaluation pipeline.
 */
export class SpokenTurnBuffer {
  private buffer: string = "";
  private onTurnComplete?: (text: string) => void;

  constructor(onTurnComplete?: (text: string) => void) {
    this.onTurnComplete = onTurnComplete;
  }

  public append(chunk: string): void {
    const trimmed = chunk.trim();
    if (!trimmed) return;
    this.buffer += (this.buffer ? " " : "") + trimmed;
  }

  public flush(): string {
    const text = this.buffer.trim();
    if (text) {
      this.buffer = "";
      this.onTurnComplete?.(text);
      return text;
    }
    return "";
  }

  public getBuffer(): string {
    return this.buffer;
  }

  public clear(): void {
    this.buffer = "";
  }
}

export interface VoiceSessionHandle {
  /** Pushes contextual telemetry/text to the active Gemini Live session (prefixed with [CONTEXT]) */
  pushContext: (text: string) => void;
  /** Initiates connection to voice session */
  connect: () => Promise<void>;
  /** Alias for connect() matching simulation page naming */
  connectVoice: () => Promise<void>;
  /** Disconnects active voice session and tears down Web Audio resources */
  disconnect: () => Promise<void>;
  /** Alias for disconnect() matching simulation page naming */
  disconnectVoice: () => Promise<void>;
  /** Toggles microphone mute state */
  toggleMute: () => Promise<void>;
  /** Returns true if the microphone is currently muted */
  isMuted: () => boolean;
  /** Returns current session status */
  getStatus: () => VoiceSessionStatus;
  /** Returns the active AnalyserNode used for audio visualization/lip-sync */
  getAnalyserNode: () => AnalyserNode | null;
  /** Prompts the model to speak a proactive spoken response to an action or milestone */
  speakProactiveContext: (prompt: string) => void;
  /** Speaks custom text using TTS and drives the 3D visualizer */
  speakText: (text: string) => void;
  /** Switches between Gemini Live and Local STT/TTS fallback engine */
  switchEngine: (engine: "live" | "fallback") => void;
  /** Returns current active engine */
  getEngine: () => "live" | "fallback";
}

export const VoiceSession = forwardRef<VoiceSessionHandle, VoiceSessionProps>(function VoiceSession({
  mode = "persona",
  domain = "engineering",
  problemTitle = "Technical Assessment Simulation",
  scenario = "Live technical interview simulation",
  personaName,
  personaRole,
  sessionId,
  voice,
  systemInstruction,
  analyserNode: externalAnalyser,
  onAnalyserNodeCreated,
  onAnalyserReady,
  onAnalyserNodeReady,
  onTranscript,
  onUserTurn,
  onToolCall,
  onCoachEvent,
  onStatusChange,
  showAvatar = true,
  compact = false,
  autoConnect = false,
  initialEngine = "live",
  onFallbackReply,
  className,
  style,
}: VoiceSessionProps, ref): React.JSX.Element {
  const [status, setStatus] = useState<VoiceSessionStatus>("disconnected");
  const [engine, setEngine] = useState<"live" | "fallback">(initialEngine);
  const [internalAnalyser, setInternalAnalyser] = useState<AnalyserNode | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentTranscripts, setRecentTranscripts] = useState<TranscriptMessage[]>([]);

  const agentRef = useRef<VoiceAgent | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInternalAudioContextRef = useRef<boolean>(true);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const isInternalAnalyserRef = useRef<boolean>(true);

  // Audio playback queue & spoken turn buffer instances
  const queueRef = useRef<AudioPlaybackQueue | null>(null);
  const turnBufferRef = useRef<SpokenTurnBuffer>(new SpokenTurnBuffer(onUserTurn));
  const isConnectingRef = useRef<boolean>(false);

  // Local STT & TTS Driver refs
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const ttsDriverOscRef = useRef<OscillatorNode | null>(null);
  const ttsDriverGainRef = useRef<GainNode | null>(null);
  const ttsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep turn callback updated
  useEffect(() => {
    turnBufferRef.current = new SpokenTurnBuffer(onUserTurn);
  }, [onUserTurn]);

  // Active AnalyserNode resolution: external override takes precedence, fallback to internally created
  const activeAnalyser = externalAnalyser || internalAnalyser;

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
      if (
        isInternalAudioContextRef.current &&
        audioCtx &&
        audioCtx !== externalAnalyser.context &&
        audioCtx.state !== "closed"
      ) {
        try {
          void audioCtx.close();
        } catch {}
      }
      audioCtx = externalAnalyser.context;
      audioContextRef.current = audioCtx;
      isInternalAudioContextRef.current = false;
    } else if (!audioCtx || audioCtx.state === "closed") {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as WebkitAudioWindow).webkitAudioContext;
      if (!AudioCtxClass) {
        throw new Error("Web Audio API is not supported in this browser environment.");
      }
      audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;
      isInternalAudioContextRef.current = true;
    }

    let gainNode = gainNodeRef.current;
    if (!gainNode || gainNode.context !== audioCtx) {
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 1.0;
      gainNodeRef.current = gainNode;
    }

    let analyser = externalAnalyser || analyserNodeRef.current;
    if (externalAnalyser) {
      isInternalAnalyserRef.current = false;
    } else if (!analyser || analyser.context !== audioCtx) {
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserNodeRef.current = analyser;
      isInternalAnalyserRef.current = true;
      setInternalAnalyser(analyser);
      onAnalyserReady?.(analyser);
      onAnalyserNodeCreated?.(analyser);
      onAnalyserNodeReady?.(analyser);
    }

    try {
      gainNode.disconnect();
    } catch {}
    if (isInternalAnalyserRef.current && analyser) {
      try {
        analyser.disconnect();
      } catch {}
    }

    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    queueRef.current = new AudioPlaybackQueue(audioCtx, gainNode, (speaking) => {
      setIsSpeaking(speaking);
      agentRef.current?.setModelSpeaking?.(speaking);
    });

    return { audioCtx, gainNode, analyserNode: analyser };
  }, [externalAnalyser, onAnalyserReady, onAnalyserNodeCreated, onAnalyserNodeReady]);

  /**
   * Stops all active and queued AudioBufferSourceNodes, disconnecting them cleanly.
   */
  const stopAllPlayback = useCallback(() => {
    queueRef.current?.stopAll();
    setIsSpeaking(false);
  }, []);

  /**
   * Flushes accumulated candidate speech turn to parent evaluation pipeline.
   */
  const flushUserTurn = useCallback(() => {
    turnBufferRef.current.flush();
  }, []);

  /**
   * Schedules a decoded Base64 PCM audio chunk onto the Web Audio timeline.
   */
  const scheduleAudioChunk = useCallback(
    (base64Pcm: string) => {
      // First model speech chunk confirms that the user turn completed
      flushUserTurn();

      if (!queueRef.current) {
        const { audioCtx, gainNode } = initAudioGraph();
        queueRef.current = new AudioPlaybackQueue(audioCtx, gainNode, (speaking) => {
          setIsSpeaking(speaking);
          agentRef.current?.setModelSpeaking?.(speaking);
        });
      }

      queueRef.current?.scheduleChunk(base64Pcm);
    },
    [flushUserTurn, initAudioGraph]
  );

  /**
   * Stops local TTS frequency driver for 3D avatar lip-sync/pulse.
   */
  const stopTtsAudioDriver = useCallback(() => {
    try {
      if (ttsIntervalRef.current) {
        clearInterval(ttsIntervalRef.current);
        ttsIntervalRef.current = null;
      }
      if (ttsDriverOscRef.current) {
        ttsDriverOscRef.current.stop();
        ttsDriverOscRef.current.disconnect();
        ttsDriverOscRef.current = null;
      }
      if (ttsDriverGainRef.current) {
        ttsDriverGainRef.current.disconnect();
        ttsDriverGainRef.current = null;
      }
    } catch {}
  }, []);

  /**
   * Drives AnalyserNode frequency bins while Browser SpeechSynthesis is speaking,
   * guaranteeing the 3D Observer avatar pulses and moves in sync with local TTS audio.
   */
  const startTtsAudioDriver = useCallback((analyser: AnalyserNode | null) => {
    if (!analyser) return;
    try {
      const audioCtx = analyser.context as AudioContext;
      if (audioCtx.state === "suspended") {
        void audioCtx.resume();
      }
      stopTtsAudioDriver();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.0025, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(analyser);
      osc.start();
      ttsDriverOscRef.current = osc;
      ttsDriverGainRef.current = gain;

      let tick = 0;
      ttsIntervalRef.current = setInterval(() => {
        if (!ttsDriverOscRef.current || audioCtx.state === "closed") return;
        tick = (tick + 1) % 8;
        const targetFreq = 160 + (tick * 40) + (Math.sin(tick) * 25);
        try {
          ttsDriverOscRef.current.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.04);
        } catch {}
      }, 90);
    } catch {}
  }, [stopTtsAudioDriver]);

  /**
   * Speaks model responses via Browser SpeechSynthesis with natural cadence,
   * driving the 3D Avatar visualizer in real time.
   */
  const speakFallback = useCallback((textToSpeak: string) => {
    if (typeof window === "undefined" || !textToSpeak.trim()) return;
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 1.02;
        utterance.pitch = domain === "sales" ? 0.94 : 1.0;
        
        utterance.onstart = () => {
          setIsSpeaking(true);
          startTtsAudioDriver(activeAnalyser);
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          stopTtsAudioDriver();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          stopTtsAudioDriver();
        };
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setIsSpeaking(false);
      stopTtsAudioDriver();
    }
  }, [activeAnalyser, domain, startTtsAudioDriver, stopTtsAudioDriver]);

  /**
   * Contextual evaluator heuristic responder when running in local fallback engine.
   */
  const generateFallbackReply = useCallback(async (userText: string): Promise<string> => {
    if (onFallbackReply) {
      try {
        const customRes = await onFallbackReply(userText);
        if (customRes) return customRes;
      } catch {}
    }

    const lower = userText.toLowerCase();
    if (domain === "sales") {
      if (lower.includes("fear") || lower.includes("concern") || lower.includes("latency") || lower.includes("drill") || lower.includes("risk")) {
        return "The root issue is transaction collisions. When 80,000 shoppers check out simultaneously, a lock contention spike caused 18 duplicate charges in staging. If that happens live, our brand reputation is destroyed.";
      }
      if (lower.includes("sla") || lower.includes("atomic") || lower.includes("lock") || lower.includes("concurrency") || lower.includes("uptime")) {
        return "An atomic lock before card dispatch with zero duplicate charge guarantees sounds solid. What SLA uptime penalty credit will you commit to in the renewal contract?";
      }
      if (lower.includes("competitor") || lower.includes("commercecloud") || lower.includes("take rate") || lower.includes("price") || lower.includes("discount")) {
        return "CommerceCloud claims lower latency, but their 1.25% take rate adds over $175,000 in fees. If you can provide a multi-year volume discount and guaranteed SLA, we are ready to sign.";
      }
      if (lower.includes("demo") || lower.includes("meeting") || lower.includes("architect") || lower.includes("tomorrow") || lower.includes("schedule")) {
        return "Deal. Let's schedule 15 minutes tomorrow with our technical team to finalize the architecture review and lock in the renewal.";
      }
      return `I hear you on "${userText.slice(0, 45)}". Let's resolve the checkout concurrency and finalize our SLA terms today.`;
    }
    if (domain === "engineering") {
      if (lower.includes("hint") || lower.includes("look") || lower.includes("where") || lower.includes("help") || lower.includes("race")) {
        return "Investigate the order lock acquisition loop in orderProcessor.ts around line 42. Notice the concurrent thread contention without atomic rollback guards.";
      }
      return `Observer telemetry logged: "${userText.slice(0, 40)}". Review process locks, worker thread pools, and socket timeouts.`;
    }
    if (domain === "sre") {
      return "Notice the Grafana p99 latency spike on the payment gateway after the v2.4.1 deployment. Consider initiating a rollback to revision 3.";
    }
    if (domain === "data") {
      return "Inspect the JOIN between users and sessions for duplicate rows, and check the Airflow DAG transform node for schema drift.";
    }
    if (domain === "product") {
      return "Address the 42.8% checkout funnel drop-off on iOS Safari before modifying promotional banners.";
    }
    if (domain === "support") {
      return "Examine the duplicate gateway authorization for transaction 8819 and check for missing idempotency keys.";
    }
    if (domain === "brand") {
      return "Draft a transparent holding statement addressing checkout delay, and engage key tech influencers with empathy.";
    }
    return `Candidate, I copy: "${userText.slice(0, 40)}". Focus on root cause isolation and systematic verification.`;
  }, [domain, onFallbackReply]);

  /**
   * Starts local Web SpeechRecognition for zero-latency microphone transcription.
   */
  const startFallbackRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    const win = window as unknown as SpeechRecognitionWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn("[VoiceSession] Web SpeechRecognition is not supported in this browser.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = "";
        let finalChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res) {
            const transcript = res[0]?.transcript || "";
            if (res.isFinal) {
              finalChunk += transcript + " ";
            } else {
              interim += transcript;
            }
          }
        }

        // Barge-in: candidate started speaking -> cancel any ongoing TTS speech immediately
        if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
          stopTtsAudioDriver();
        }

        const candidateSpeech = (finalChunk || interim).trim();
        if (candidateSpeech) {
          onTranscript?.("user", candidateSpeech);
          turnBufferRef.current.append(candidateSpeech);
        }

        if (finalChunk.trim()) {
          const completedTurn = turnBufferRef.current.flush();
          if (completedTurn) {
            onUserTurn?.(completedTurn);
            void generateFallbackReply(completedTurn).then((reply) => {
              onTranscript?.("model", reply);
              setRecentTranscripts((prev) => [
                ...prev.slice(-3),
                { id: Math.random().toString(36).substring(2, 9), role: "user", text: completedTurn, timestamp: Date.now() },
                { id: Math.random().toString(36).substring(2, 9), role: "model", text: reply, timestamp: Date.now() }
              ]);
              speakFallback(reply);
            });
          }
        }
      };

      rec.onerror = (errEvent: SpeechRecognitionErrorEventLike) => {
        if (errEvent.error !== "no-speech" && errEvent.error !== "aborted") {
          console.warn("[VoiceSession] Speech recognition error:", errEvent.error);
        }
      };

      rec.onend = () => {
        // Automatically restart continuous recognition if session is connected, in fallback mode, and not muted
        if (recognitionRef.current === rec && !isMuted) {
          try { rec.start(); } catch {}
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.warn("[VoiceSession] Failed to start SpeechRecognition:", err);
    }
  }, [generateFallbackReply, isMuted, onTranscript, onUserTurn, speakFallback, stopTtsAudioDriver]);

  /**
   * Stops local Web SpeechRecognition cleanly.
   */
  const stopFallbackRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  /**
   * Handles barge-in / interruption: immediately stops playback so model voice stops speaking.
   */
  const handleInterrupted = useCallback(() => {
    stopAllPlayback();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopTtsAudioDriver();
  }, [stopAllPlayback, stopTtsAudioDriver]);

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
    stopFallbackRecognition();
    stopTtsAudioDriver();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    turnBufferRef.current.clear();

    if (agentRef.current) {
      const agent = agentRef.current;
      agentRef.current = null;
      try {
        await agent.disconnect();
      } catch (err) {
        console.warn("[VoiceSession] Error during agent disconnect:", err);
      }
    }

    if (
      isInternalAudioContextRef.current &&
      audioContextRef.current &&
      audioContextRef.current.state !== "closed"
    ) {
      try {
        await audioContextRef.current.close();
      } catch {}
    }
    audioContextRef.current = null;
    isInternalAudioContextRef.current = false;

    try {
      gainNodeRef.current?.disconnect();
    } catch {}
    if (isInternalAnalyserRef.current) {
      try {
        analyserNodeRef.current?.disconnect();
      } catch {}
    }

    gainNodeRef.current = null;
    analyserNodeRef.current = null;
    queueRef.current = null;
    setInternalAnalyser(null);
    setIsMuted(false);
    setIsSpeaking(false);
    setStatus("disconnected");
    onStatusChange?.("disconnected");
  }, [stopAllPlayback, stopFallbackRecognition, stopTtsAudioDriver, onStatusChange]);

  /**
   * Connects to Gemini Live session or Local STT/TTS Fallback.
   */
  const connectVoice = useCallback(async () => {
    if (status === "connecting" || status === "connected" || isConnectingRef.current) {
      return;
    }
    isConnectingRef.current = true;
    setErrorMessage(null);
    setStatus("connecting");
    onStatusChange?.("connecting");

    // Local Fallback Engine Mode
    if (engine === "fallback") {
      try {
        const { audioCtx } = initAudioGraph();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        setStatus("connected");
        onStatusChange?.("connected");
        startFallbackRecognition();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus("error");
        setErrorMessage(msg);
        onStatusChange?.("error", msg);
      } finally {
        isConnectingRef.current = false;
      }
      return;
    }

    try {
      // 1. Initialize Web Audio playback graph and resume from user gesture
      const { audioCtx } = initAudioGraph();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
      queueRef.current?.resetTimeline();

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
            turnBufferRef.current.append(text);
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
      await disconnectVoice();
      setStatus("error");
      setErrorMessage(msg);
      onStatusChange?.("error", msg);
    } finally {
      isConnectingRef.current = false;
    }
  }, [
    status,
    engine,
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
    startFallbackRecognition,
  ]);

  /**
   * Switches dynamically between Gemini Live and Local STT+TTS engine.
   */
  const switchEngine = useCallback((targetEngine: "live" | "fallback") => {
    setEngine(targetEngine);
    if (targetEngine === "fallback") {
      setErrorMessage(null);
      if (agentRef.current) {
        void agentRef.current.disconnect();
        agentRef.current = null;
      }
      initAudioGraph();
      setStatus("connected");
      onStatusChange?.("connected");
      startFallbackRecognition();
      speakFallback(domain === "sales" ? "Sam Jenkins here. Local speech channel online." : "Observer local speech channel active.");
    } else {
      stopFallbackRecognition();
      stopTtsAudioDriver();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      void connectVoice();
    }
  }, [connectVoice, domain, initAudioGraph, onStatusChange, speakFallback, startFallbackRecognition, stopFallbackRecognition, stopTtsAudioDriver]);

  /**
   * Toggles microphone mute state across either engine.
   */
  const toggleMute = useCallback(async () => {
    if (engine === "fallback") {
      if (isMuted) {
        setIsMuted(false);
        startFallbackRecognition();
      } else {
        setIsMuted(true);
        stopFallbackRecognition();
      }
      return;
    }

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
  }, [engine, isMuted, startFallbackRecognition, status, stopFallbackRecognition]);

  useImperativeHandle(ref, () => ({
    pushContext: (text: string) => {
      agentRef.current?.pushContext(text);
    },
    speakProactiveContext: (prompt: string) => {
      if (engine === "fallback" || !agentRef.current) {
        speakFallback(prompt);
      } else {
        agentRef.current?.speakProactiveContext?.(prompt);
      }
    },
    speakText: (text: string) => {
      speakFallback(text);
    },
    switchEngine,
    getEngine: () => engine,
    connect: connectVoice,
    connectVoice,
    disconnect: disconnectVoice,
    disconnectVoice,
    toggleMute,
    isMuted: () => isMuted,
    getStatus: () => status,
    getAnalyserNode: () => activeAnalyser,
  }), [connectVoice, disconnectVoice, toggleMute, isMuted, status, activeAnalyser, engine, speakFallback, switchEngine]);

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
      stopFallbackRecognition();
      stopTtsAudioDriver();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (agentRef.current) {
        const agent = agentRef.current;
        agentRef.current = null;
        void agent.disconnect();
      }
      if (
        isInternalAudioContextRef.current &&
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        void audioContextRef.current.close();
      }
      audioContextRef.current = null;
      isInternalAudioContextRef.current = false;

      try {
        gainNodeRef.current?.disconnect();
      } catch {}
      if (isInternalAnalyserRef.current) {
        try {
          analyserNodeRef.current?.disconnect();
        } catch {}
      }

      gainNodeRef.current = null;
      analyserNodeRef.current = null;
      queueRef.current = null;
    };
  }, [stopAllPlayback, stopFallbackRecognition, stopTtsAudioDriver]);

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
      const tag = engine === "fallback" ? "LOCAL" : mode.toUpperCase();
      if (isSpeaking) return `Speaking (${tag})`;
      return `Listening (${tag})`;
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
      {showAvatar && !compact && (
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

      {/* Error Banner with Retry & Local Fallback */}
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
              onClick={() => switchEngine("fallback")}
              style={{
                backgroundColor: "#38bdf8",
                color: "#050811",
                border: "none",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Use Local Fallback
            </button>
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

        {/* Engine Switch Pill */}
        <button
          onClick={() => switchEngine(engine === "live" ? "fallback" : "live")}
          title="Switch between Gemini Live WebSocket and Local Zero-Latency Speech Engine"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            background: engine === "fallback" ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${engine === "fallback" ? "#38bdf8" : "rgba(255,255,255,0.2)"}`,
            borderRadius: 12,
            color: engine === "fallback" ? "#38bdf8" : "#94a3b8",
            fontSize: 10,
            fontFamily: "monospace",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {engine === "fallback" ? "⚡ LOCAL STT/TTS" : "☁ LIVE"}
        </button>

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
