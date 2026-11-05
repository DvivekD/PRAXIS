"use client";

import { GoogleGenAI, Modality } from "@google/genai";
import type { LiveServerMessage, Session } from "@google/genai";

export type VoiceAgentStatus = "disconnected" | "connecting" | "connected" | "error";
export type VoiceAgentRole = "user" | "model";

export interface VoiceToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface VoiceAgentEvents {
  onAudioChunk: (base64Pcm: string) => void;
  onTranscript: (role: VoiceAgentRole, text: string) => void;
  onToolCall: (name: string, args: Record<string, unknown>, id?: string) => void;
  onStatusChange: (status: VoiceAgentStatus, detail?: string) => void;
  onInterrupted: () => void;
  onTurnComplete?: () => void;
}

export interface VoiceAgentOptions {
  mode: "persona" | "guide" | "interviewer";
  systemInstruction?: string;
  voice?: string;
  tools?: VoiceToolDeclaration[];
  domain?: string;
  problemTitle?: string;
  scenario?: string;
  personaName?: string;
}

interface SessionApiSuccessResponse {
  token: string;
  config: {
    model: string;
    systemInstruction: string;
    voice: string;
    tools?: VoiceToolDeclaration[];
  };
}

interface SessionApiErrorResponse {
  error?: string;
}

/**
 * Linearly resamples a Float32Array audio buffer from inputSampleRate down to targetSampleRate (e.g. 16,000 Hz).
 */
export function resampleTo16k(
  input: Float32Array,
  inputSampleRate: number,
  targetSampleRate: number = 16000
): Float32Array {
  if (inputSampleRate === targetSampleRate) {
    return input;
  }
  const ratio = inputSampleRate / targetSampleRate;
  const outputLength = Math.round(input.length / ratio);
  const result = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const originalPos = i * ratio;
    const index = Math.floor(originalPos);
    const frac = originalPos - index;
    const nextIndex = Math.min(index + 1, input.length - 1);
    result[i] = input[index] * (1 - frac) + input[nextIndex] * frac;
  }

  return result;
}

/**
 * Converts Float32 audio samples in [-1.0, 1.0] to 16-bit signed Linear PCM little-endian.
 */
export function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;

  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, val, true); // true = little-endian
  }

  return buffer;
}

/**
 * Encodes an ArrayBuffer of binary PCM bytes to Base64 string.
 * Supports both Node.js environment and browser environments.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64");
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a Base64 string into an ArrayBuffer of binary bytes.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Typed client wrapper for Gemini Live bidirectional voice streaming.
 */
export class VoiceAgent {
  private options: VoiceAgentOptions;
  private status: VoiceAgentStatus = "disconnected";
  private events: VoiceAgentEvents | null = null;
  private session: Session | null = null;
  private abortController: AbortController | null = null;
  private isDisconnecting: boolean = false;

  // Web Audio microphone capture nodes & stream
  private micStream: MediaStream | null = null;
  private micAudioContext: AudioContext | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micProcessorNode: ScriptProcessorNode | null = null;
  private silenceGainNode: GainNode | null = null;
  private isMicActive: boolean = false;
  private isModelSpeaking: boolean = false;
  private lastSpeechTime: number = 0;

  constructor(options: VoiceAgentOptions) {
    this.options = options;
  }

  public getStatus(): VoiceAgentStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === "connected" && this.session !== null;
  }

  /**
   * Connects to the Gemini Live session using an ephemeral token minted by the Next.js API route.
   */
  public async connect(events: VoiceAgentEvents): Promise<void> {
    if (this.status === "connecting" || this.status === "connected") {
      console.warn("[VoiceAgent] connect() called while already connecting or connected");
      return;
    }

    this.events = events;
    this.status = "connecting";
    this.events?.onStatusChange("connecting");
    this.abortController = new AbortController();
    const abortSignal = this.abortController.signal;

    try {
      // 1. Fetch ephemeral session token from Next.js API route
      const response = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortSignal,
        body: JSON.stringify({
          mode: this.options.mode,
          domain: this.options.domain,
          problemTitle: this.options.problemTitle,
          scenario: this.options.scenario,
          personaName: this.options.personaName,
        }),
      });

      if (!response.ok) {
        let errDetail = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errJson = (await response.json()) as SessionApiErrorResponse;
          if (errJson?.error) {
            errDetail = errJson.error;
          }
        } catch {
          // If response body is not JSON, retain HTTP status message
        }
        throw new Error(errDetail);
      }

      const sessionData = (await response.json()) as SessionApiSuccessResponse;
      const { token, config } = sessionData;

      if (!token) {
        throw new Error("Invalid session response: ephemeral token missing");
      }

      // Guard: Check if disconnect or abort occurred while fetch was awaiting
      if (
        this.getStatus() === "disconnected" ||
        this.isDisconnecting ||
        abortSignal.aborted ||
        !this.events
      ) {
        return;
      }

      // 2. Initialize GoogleGenAI SDK with ephemeral access token in v1alpha
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      });

      // 3. Prepare Live connection parameters
      const tools = config.tools || this.options.tools;
      const defaultVoice =
        this.options.mode === "guide"
          ? "Puck"
          : this.options.mode === "interviewer"
          ? "Charon"
          : "Aoede";
      const voice =
        config.voice ||
        this.options.voice ||
        defaultVoice;
      const systemInstruction =
        config.systemInstruction || this.options.systemInstruction;
      const model = config.model || "gemini-2.5-flash-native-audio-latest";

      // 4. Open bidirectional WebSocket Live session
      const session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
          systemInstruction: systemInstruction
            ? { parts: [{ text: systemInstruction }] }
            : undefined,
          tools:
            tools && tools.length > 0
              ? [{ functionDeclarations: tools }]
              : undefined,
        },
        callbacks: {
          onopen: () => {
            // WebSocket connection established
          },
          onmessage: (msg: LiveServerMessage) => {
            this.handleServerMessage(msg);
          },
          onerror: (e: ErrorEvent) => {
            const errorMsg = e.message || "Live session WebSocket error";
            console.error("[VoiceAgent] Live WebSocket error:", errorMsg);
            this.events?.onStatusChange("error", errorMsg);
          },
          onclose: (e: CloseEvent) => {
            if (!this.isDisconnecting) {
              const reason = e.reason || "Live session connection closed";
              console.log("[VoiceAgent] Live WebSocket closed by server:", e.code, reason);
              this.stopMic();
              this.session = null;
              this.status = "disconnected";
              this.events?.onStatusChange("disconnected", reason);
            }
          },
        },
      });

      // Guard: If disconnect() occurred while ai.live.connect() was in flight, cleanly close session
      if (
        this.getStatus() === "disconnected" ||
        this.isDisconnecting ||
        abortSignal.aborted ||
        !this.events
      ) {
        try {
          session.close();
        } catch {
          // Socket may already be closing or closed
        }
        return;
      }

      this.session = session;
      this.status = "connected";
      this.events?.onStatusChange("connected");

      // 5. Automatically activate microphone input capture
      try {
        await this.startMic();
      } catch (micErr) {
        if (
          this.getStatus() === "disconnected" ||
          this.isDisconnecting ||
          abortSignal.aborted
        ) {
          return;
        }
        const micErrMsg = micErr instanceof Error ? micErr.message : String(micErr);
        console.warn("[VoiceAgent] Microphone initialization warning:", micErrMsg);
        this.status = "error";
        this.events?.onStatusChange("error", `Microphone error: ${micErrMsg}`);
        await this.cleanup();
        return;
      }
    } catch (err) {
      if (
        abortSignal.aborted ||
        this.getStatus() === "disconnected" ||
        this.isDisconnecting ||
        (err instanceof Error &&
          (err.name === "AbortError" || err.message.toLowerCase().includes("abort")))
      ) {
        return;
      }
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[VoiceAgent] Connection failure:", errorMsg);
      await this.cleanup();
      this.status = "error";
      this.events?.onStatusChange("error", errorMsg);
      throw err;
    }
  }

  /**
   * Captures microphone audio at 16kHz mono 16-bit Linear PCM and streams it to the Live session.
   */
  public async startMic(): Promise<void> {
    if (this.isMicActive) {
      return;
    }

    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error("getUserMedia is not supported in this environment");
    }

    // Stop any existing capture nodes before starting anew
    this.stopMic();

    // 1. Request microphone input with acoustic cancellation and noise suppression
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Guard against race condition: if user cancelled/disconnected while permission prompt was pending
    if (this.getStatus() === "disconnected" || this.isDisconnecting || !this.session) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    this.micStream = stream;

    // 2. Initialize AudioContext (with fallback to default hardware rate)
    type WebkitAudioContextWindow = typeof window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextClass =
      window.AudioContext ||
      (window as WebkitAudioContextWindow).webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error("Web Audio API AudioContext is not supported in this browser");
    }

    let audioCtx: AudioContext;
    try {
      audioCtx = new AudioContextClass({ sampleRate: 16000 });
    } catch {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    // Guard: Check if disconnect occurred while resuming AudioContext
    if (this.getStatus() === "disconnected" || this.isDisconnecting || !this.session) {
      stream.getTracks().forEach((track) => track.stop());
      if (audioCtx.state !== "closed") {
        void audioCtx.close();
      }
      return;
    }

    this.micAudioContext = audioCtx;

    // 3. Construct Web Audio processing graph
    const sourceNode = audioCtx.createMediaStreamSource(stream);
    this.micSourceNode = sourceNode;

    const bufferSize = 1024; // Ultra-low latency audio processing buffer (64ms at 16kHz vs 256ms)
    const processorNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
    this.micProcessorNode = processorNode;

    // Silence gain routes audio through the graph without feeding local speakers
    const silenceGain = audioCtx.createGain();
    silenceGain.gain.value = 0;
    this.silenceGainNode = silenceGain;

    // 4. Resample & encode on each audio processing buffer with error shielding
    processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
      try {
        if (!this.isMicActive || !this.session || this.status !== "connected") {
          return;
        }

        const inputBuffer = e.inputBuffer;
        if (!inputBuffer || inputBuffer.numberOfChannels === 0) {
          return;
        }

        const inputChannelData = inputBuffer.getChannelData(0);
        if (!inputChannelData || inputChannelData.length === 0) {
          return;
        }

        // Noise gate & Voice Activity Detection (RMS energy)
        let sumSquares = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sumSquares += inputChannelData[i] * inputChannelData[i];
        }
        const rms = Math.sqrt(sumSquares / inputChannelData.length);

        // Acoustic echo / speaker feedback protection:
        // While model is actively outputting audio, allow intentional user barge-in (rms >= 0.02)
        // while suppressing light speaker acoustic feedback bleed.
        if (this.isModelSpeaking) {
          if (rms < 0.02) {
            return;
          }
          this.lastSpeechTime = Date.now();
        } else {
          // Model is silent: ultra-sensitive conversational gate (0.002) with snappy 220ms hangover
          if (rms >= 0.002) {
            this.lastSpeechTime = Date.now();
          } else if (Date.now() - this.lastSpeechTime > 220) {
            // Ambient silence below gate
            return;
          }
        }

        const resampled = resampleTo16k(inputChannelData, audioCtx.sampleRate, 16000);
        const pcmBuffer = floatTo16BitPCM(resampled);
        const base64Audio = arrayBufferToBase64(pcmBuffer);

        try {
          this.session.sendRealtimeInput({
            audio: {
              data: base64Audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch (sendErr) {
          console.warn("[VoiceAgent] Audio chunk transmission failed:", sendErr);
        }
      } catch (procErr) {
        console.warn("[VoiceAgent] Audio processing error in onaudioprocess:", procErr);
      }
    };

    sourceNode.connect(processorNode);
    processorNode.connect(silenceGain);
    silenceGain.connect(audioCtx.destination);

    this.isMicActive = true;
  }

  /**
   * Cleanly stops microphone capture and releases audio hardware.
   */
  public stopMic(): void {
    this.isMicActive = false;

    if (this.micProcessorNode) {
      try {
        this.micProcessorNode.onaudioprocess = null;
        this.micProcessorNode.disconnect();
      } catch (err) {
        console.warn("[VoiceAgent] micProcessorNode disconnect warning:", err);
      }
      this.micProcessorNode = null;
    }

    if (this.micSourceNode) {
      try {
        this.micSourceNode.disconnect();
      } catch (err) {
        console.warn("[VoiceAgent] micSourceNode disconnect warning:", err);
      }
      this.micSourceNode = null;
    }

    if (this.silenceGainNode) {
      try {
        this.silenceGainNode.disconnect();
      } catch (err) {
        console.warn("[VoiceAgent] silenceGainNode disconnect warning:", err);
      }
      this.silenceGainNode = null;
    }

    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
      } catch (err) {
        console.warn("[VoiceAgent] micStream stop warning:", err);
      }
      this.micStream = null;
    }

    if (this.micAudioContext) {
      if (this.micAudioContext.state !== "closed") {
        try {
          void this.micAudioContext.close();
        } catch (err) {
          console.warn("[VoiceAgent] micAudioContext close warning:", err);
        }
      }
      this.micAudioContext = null;
    }

    if (this.session && this.status === "connected") {
      try {
        this.session.sendRealtimeInput({ audioStreamEnd: true });
      } catch {
        // Socket may already be closing or closed
      }
    }
  }

  /**
   * Directly sends a Base64-encoded 16kHz PCM audio chunk to the Live session.
   */
  public sendAudioChunk(base64Pcm: string): void {
    if (!this.session || this.status !== "connected") {
      return;
    }
    this.session.sendRealtimeInput({
      audio: {
        data: base64Pcm,
        mimeType: "audio/pcm;rate=16000",
      },
    });
  }

  /**
   * Injects telemetry or candidate context updates into the active Live session.
   */
  public pushContext(text: string): void {
    if (!this.session || this.status !== "connected") {
      console.warn("[VoiceAgent] Cannot pushContext: session not connected");
      return;
    }
    const formatted = text.startsWith("[CONTEXT]") ? text : `[CONTEXT] ${text}`;
    this.session.sendRealtimeInput({ text: formatted });
  }

  /**
   * Sets whether the model is actively outputting audio through local speakers.
   * Used for acoustic feedback suppression so speaker output does not falsely trigger barge-in.
   */
  public setModelSpeaking(speaking: boolean): void {
    this.isModelSpeaking = speaking;
  }

  /**
   * Prompts the model to speak a proactive turn in response to candidate actions or milestones.
   */
  public speakProactiveContext(prompt: string): void {
    if (!this.session || this.status !== "connected") {
      return;
    }
    try {
      this.session.sendClientContent({
        turns: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        turnComplete: true,
      });
    } catch (err) {
      console.warn("[VoiceAgent] speakProactiveContext failed:", err);
    }
  }

  /**
   * Responds to a tool call (function call) emitted by Gemini Live.
   */
  public sendToolResponse(name: string, id: string, result: unknown): void {
    if (!this.session || this.status !== "connected") {
      throw new Error("Cannot send tool response: session not connected");
    }

    const responsePayload: Record<string, unknown> =
      typeof result === "object" && result !== null && !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : { result };

    this.session.sendToolResponse({
      functionResponses: [
        {
          id,
          name,
          response: responsePayload,
        },
      ],
    });
  }

  /**
   * Cleanly disconnects the Live session, halts microphone capture, and releases all resources.
   */
  public async disconnect(): Promise<void> {
    if (this.isDisconnecting) {
      return;
    }
    this.isDisconnecting = true;

    try {
      if (this.abortController) {
        try {
          this.abortController.abort();
        } catch {}
      }
      await this.cleanup();
    } catch (cleanupErr) {
      console.warn("[VoiceAgent] Disconnect cleanup warning:", cleanupErr);
    } finally {
      this.status = "disconnected";
      this.isDisconnecting = false;
      this.abortController = null;
      try {
        this.events?.onStatusChange("disconnected");
      } catch {}
      this.events = null;
    }
  }

  private async cleanup(): Promise<void> {
    this.stopMic();

    if (this.session) {
      try {
        this.session.close();
      } catch (closeErr) {
        console.warn("[VoiceAgent] Session close warning:", closeErr);
      }
      this.session = null;
    }

    this.isModelSpeaking = false;
    this.lastSpeechTime = 0;
  }

  /**
   * Dispatches incoming server WebSocket messages to the registered VoiceAgentEvents callbacks.
   * Ensures text and audio chunks are reliably dispatched without dropping turns.
   */
  private handleServerMessage(msg: LiveServerMessage): void {
    if (!this.events) {
      return;
    }

    try {
      // 1. Model Audio Chunks & Transcript Parts from serverContent
      if (msg.serverContent) {
        if (msg.serverContent.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            // Audio chunk dispatch
            if (part.inlineData?.data) {
              try {
                this.events.onAudioChunk(part.inlineData.data);
              } catch (audioErr) {
                console.error("[VoiceAgent] onAudioChunk error:", audioErr);
              }
            }
            // Model text part dispatch (filter out model thoughts)
            if (part.text && !("thought" in part && Boolean((part as { thought?: boolean }).thought))) {
              try {
                this.events.onTranscript("model", part.text);
              } catch (textErr) {
                console.error("[VoiceAgent] onTranscript (modelTurn text) error:", textErr);
              }
            }
          }
        }

        // 2. Interruption / Barge-in
        if (msg.serverContent.interrupted) {
          try {
            this.events.onInterrupted();
          } catch (intErr) {
            console.error("[VoiceAgent] onInterrupted error:", intErr);
          }
        }

        // 3. User Speech-to-Text Transcription
        if (msg.serverContent.inputTranscription?.text) {
          const userText = msg.serverContent.inputTranscription.text;
          if (userText) {
            try {
              this.events.onTranscript("user", userText);
            } catch (userTextErr) {
              console.error("[VoiceAgent] onTranscript (inputTranscription) error:", userTextErr);
            }
          }
        }

        // 4. Model Speech-to-Text Transcription
        if (msg.serverContent.outputTranscription?.text) {
          const modelText = msg.serverContent.outputTranscription.text;
          if (modelText) {
            try {
              this.events.onTranscript("model", modelText);
            } catch (modelTextErr) {
              console.error("[VoiceAgent] onTranscript (outputTranscription) error:", modelTextErr);
            }
          }
        }

        // 5. Turn Complete or Generation Complete
        if (
          msg.serverContent.turnComplete ||
          (msg.serverContent as unknown as { generationComplete?: boolean }).generationComplete
        ) {
          try {
            this.events.onTurnComplete?.();
          } catch (tcErr) {
            console.error("[VoiceAgent] onTurnComplete error:", tcErr);
          }
        }
      }

      // Fallback: If no serverContent.modelTurn.parts was received, check top-level getters
      if (!msg.serverContent?.modelTurn?.parts) {
        if (msg.data) {
          try {
            this.events.onAudioChunk(msg.data);
          } catch (audioErr) {
            console.error("[VoiceAgent] onAudioChunk (msg.data) error:", audioErr);
          }
        }
        if (msg.text) {
          try {
            this.events.onTranscript("model", msg.text);
          } catch (textErr) {
            console.error("[VoiceAgent] onTranscript (msg.text) error:", textErr);
          }
        }
      }

      // 6. Tool Calls (Function Calls)
      if (msg.toolCall?.functionCalls) {
        for (const call of msg.toolCall.functionCalls) {
          if (call.name) {
            const args = (call.args as Record<string, unknown>) || {};
            const id = call.id || "";
            try {
              this.events.onToolCall(call.name, args, id);
            } catch (toolErr) {
              console.error("[VoiceAgent] onToolCall error:", toolErr);
            }
          }
        }
      }
    } catch (dispatchErr) {
      console.error("[VoiceAgent] Error dispatching server message:", dispatchErr);
    }
  }
}
