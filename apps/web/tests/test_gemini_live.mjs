import fs from "fs";
import path from "path";
import assert from "assert";
import ts from "typescript";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("==========================================================");
console.log("PRAXIS VOICE AGENT - MILESTONE 2 UNIT TEST SUITE");
console.log("Testing: apps/web/lib/voice/geminiLive.ts");
console.log("==========================================================\n");

// 1. Transpile geminiLive.ts to CommonJS for dynamic sandboxed testing
const geminiLivePath = path.resolve(__dirname, "../lib/voice/geminiLive.ts");
const sourceCode = fs.readFileSync(geminiLivePath, "utf8");

const { outputText: jsCode } = ts.transpileModule(sourceCode, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    removeComments: false,
  },
});

// Helper to instantiate the module with custom environment & mocks
function loadGeminiLiveModule(globals = {}, mockGoogleGenAI = null) {
  const customRequire = (id) => {
    if (id === "@google/genai") {
      return {
        GoogleGenAI: mockGoogleGenAI || class MockGoogleGenAI {
          constructor(opts) {
            this.opts = opts;
            this.live = {
              connect: async () => ({
                sendRealtimeInput: () => {},
                sendToolResponse: () => {},
                close: () => {},
              }),
            };
          }
        },
        Modality: { AUDIO: "AUDIO", TEXT: "TEXT" },
      };
    }
    return import(id);
  };

  const moduleObj = { exports: {} };
  const mockGlobal = {
    Buffer,
    btoa: (str) => Buffer.from(str, "binary").toString("base64"),
    atob: (b64) => Buffer.from(b64, "base64").toString("binary"),
    window: globals.window || undefined,
    navigator: globals.navigator || undefined,
    fetch: globals.fetch || undefined,
    console,
    ...globals,
  };

  const fn = new Function(
    "exports",
    "module",
    "require",
    "window",
    "navigator",
    "fetch",
    "globalThis",
    jsCode
  );

  fn(
    moduleObj.exports,
    moduleObj,
    customRequire,
    mockGlobal.window,
    mockGlobal.navigator,
    mockGlobal.fetch,
    mockGlobal
  );

  return moduleObj.exports;
}

// ============================================================================
// TEST SUITE 1: Resampling Mathematics & Linear Interpolation
// ============================================================================
console.log("--- Test Suite 1: Audio Resampling & Linear Interpolation ---");
{
  const mod = loadGeminiLiveModule();
  const { resampleTo16k } = mod;

  // 1.1 Identity at 16,000 Hz
  const sample16k = new Float32Array([0.1, -0.2, 0.5, -0.8]);
  const resampled16k = resampleTo16k(sample16k, 16000, 16000);
  assert.strictEqual(resampled16k, sample16k, "16kHz input should return original array directly");
  console.log("✓ 1.1: 16kHz identity passed");

  // 1.2 Downsample from 48,000 Hz (ratio 3.0)
  const input48k = new Float32Array(4800);
  for (let i = 0; i < input48k.length; i++) {
    input48k[i] = Math.sin((2 * Math.PI * 440 * i) / 48000);
  }
  const resampled48k = resampleTo16k(input48k, 48000, 16000);
  assert.strictEqual(resampled48k.length, 1600, "4800 samples at 48kHz must downsample to 1600 samples at 16kHz");
  assert.strictEqual(resampled48k[0], input48k[0], "Sample 0 must match directly");
  console.log("✓ 1.2: 48kHz downsampling length and initial value verified");

  // 1.3 Downsample from 44,100 Hz (ratio 2.75625)
  const input44k = new Float32Array(4410);
  const resampled44k = resampleTo16k(input44k, 44100, 16000);
  const expectedLength = Math.round(4410 / (44100 / 16000));
  assert.strictEqual(resampled44k.length, expectedLength, "44.1kHz downsampling must match expected calculated length");
  console.log("✓ 1.3: 44.1kHz downsampling length verified");

  // 1.4 Linear Interpolation Value Accuracy
  // Given input [0, 1] at 32kHz, downsampling to 16kHz (ratio 2) with length 1:
  // originalPos for i=0 is 0. Expected result[0] = input[0] = 0.
  // With ratio 2 and input [0, 1, 2, 3]:
  const ramp = new Float32Array([0, 10, 20, 30]);
  const resampledRamp = resampleTo16k(ramp, 32000, 16000);
  assert.strictEqual(resampledRamp.length, 2);
  assert.strictEqual(resampledRamp[0], 0);
  assert.strictEqual(resampledRamp[1], 20);
  console.log("✓ 1.4: Interpolation accuracy on ramp signal verified");
}

// ============================================================================
// TEST SUITE 2: Float32 to 16-bit Signed Little-Endian PCM Conversion
// ============================================================================
console.log("\n--- Test Suite 2: 16-bit Signed Little-Endian PCM Conversion ---");
{
  const mod = loadGeminiLiveModule();
  const { floatTo16BitPCM } = mod;

  const testFloats = new Float32Array([
    0.0,       // zero -> 0
    1.0,       // max positive -> 32767 (0x7FFF)
    -1.0,      // max negative -> -32768 (0x8000)
    0.5,       // mid positive -> ~16383 (0x3FFF)
    -0.5,      // mid negative -> -16384 (0xC000)
    1.5,       // clamped positive -> 32767
    -2.0,      // clamped negative -> -32768
  ]);

  const buffer = floatTo16BitPCM(testFloats);
  assert.strictEqual(buffer.byteLength, testFloats.length * 2, "Buffer byteLength must be exactly 2x sample count");

  const view = new DataView(buffer);
  assert.strictEqual(view.getInt16(0, true), 0, "0.0 must map to 0");
  assert.strictEqual(view.getInt16(2, true), 32767, "1.0 must map to 32767");
  assert.strictEqual(view.getInt16(4, true), -32768, "-1.0 must map to -32768");
  assert.strictEqual(view.getInt16(6, true), 16383, "0.5 must map to 16383");
  assert.strictEqual(view.getInt16(8, true), -16384, "-0.5 must map to -16384");
  assert.strictEqual(view.getInt16(10, true), 32767, ">1.0 must clamp to 32767");
  assert.strictEqual(view.getInt16(12, true), -32768, "<-1.0 must clamp to -32768");

  // Verify Little-Endian Byte Layout explicitly
  // -32768 is 0x8000 -> LE bytes are [0x00, 0x80]
  const bytes = new Uint8Array(buffer);
  assert.strictEqual(bytes[4], 0x00, "Little-endian low byte of -32768 must be 0x00");
  assert.strictEqual(bytes[5], 0x80, "Little-endian high byte of -32768 must be 0x80");

  console.log("✓ 2.1: Float32 to 16-bit PCM conversion, clamping, and little-endian ordering verified");
}

// ============================================================================
// TEST SUITE 3: Base64 Encoding & Roundtrip
// ============================================================================
console.log("\n--- Test Suite 3: Base64 ArrayBuffer Roundtrip ---");
{
  const mod = loadGeminiLiveModule();
  const { arrayBufferToBase64, base64ToArrayBuffer } = mod;

  const rawBytes = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
  const b64 = arrayBufferToBase64(rawBytes.buffer);
  assert.strictEqual(typeof b64, "string");

  const restoredBuffer = base64ToArrayBuffer(b64);
  const restoredBytes = new Uint8Array(restoredBuffer);
  assert.deepStrictEqual(Array.from(restoredBytes), Array.from(rawBytes), "Decoded bytes must match original");

  console.log("✓ 3.1: Base64 encoding and decoding roundtrip verified");
}

// ============================================================================
// TEST SUITE 4: Class Instantiation & Initial State Contracts
// ============================================================================
console.log("\n--- Test Suite 4: VoiceAgent Instantiation & State Contracts ---");
{
  const mod = loadGeminiLiveModule();
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({
    mode: "persona",
    domain: "engineering",
    problemTitle: "Refactor Cache",
    scenario: "Candidate is tasked with caching",
    personaName: "Alex",
  });

  assert.strictEqual(agent.getStatus(), "disconnected", "Initial status must be 'disconnected'");
  assert.strictEqual(agent.isConnected(), false, "Initial isConnected() must be false");

  console.log("✓ 4.1: Initial VoiceAgent state contracts verified");
}

// ============================================================================
// TEST SUITE 5: Server Message Event Dispatching
// ============================================================================
console.log("\n--- Test Suite 5: Server Message Event Dispatching ---");
{
  const mod = loadGeminiLiveModule();
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "guide" });

  const eventsRecorded = {
    audioChunks: [],
    transcripts: [],
    toolCalls: [],
    statuses: [],
    interruptedCount: 0,
    turnCompleteCount: 0,
  };

  const events = {
    onAudioChunk: (chunk) => eventsRecorded.audioChunks.push(chunk),
    onTranscript: (role, text) => eventsRecorded.transcripts.push({ role, text }),
    onToolCall: (name, args, id) => eventsRecorded.toolCalls.push({ name, args, id }),
    onStatusChange: (status, detail) => eventsRecorded.statuses.push({ status, detail }),
    onInterrupted: () => eventsRecorded.interruptedCount++,
    onTurnComplete: () => eventsRecorded.turnCompleteCount++,
  };

  // Set internal events via reflection / prototype method
  agent.events = events;

  // 5.1 Test Audio Chunk Dispatch
  agent.handleServerMessage({
    serverContent: {
      modelTurn: {
        parts: [
          { inlineData: { data: "base64audio123", mimeType: "audio/pcm;rate=24000" } },
        ],
      },
    },
  });
  assert.strictEqual(eventsRecorded.audioChunks.length, 1);
  assert.strictEqual(eventsRecorded.audioChunks[0], "base64audio123");
  console.log("✓ 5.1: onAudioChunk dispatch verified");

  // 5.2 Test Interruption / Barge-in Dispatch
  agent.handleServerMessage({
    serverContent: {
      interrupted: true,
    },
  });
  assert.strictEqual(eventsRecorded.interruptedCount, 1);
  console.log("✓ 5.2: onInterrupted barge-in dispatch verified");

  // 5.3 Test Input Transcription (User Speech-to-Text)
  agent.handleServerMessage({
    serverContent: {
      inputTranscription: { text: "Hello from candidate" },
    },
  });
  assert.strictEqual(eventsRecorded.transcripts.length, 1);
  assert.deepStrictEqual(eventsRecorded.transcripts[0], { role: "user", text: "Hello from candidate" });
  console.log("✓ 5.3: onTranscript(user) dispatch verified");

  // 5.4 Test Output Transcription (Model Speech-to-Text)
  agent.handleServerMessage({
    serverContent: {
      outputTranscription: { text: "Hello, I am your guide." },
    },
  });
  assert.strictEqual(eventsRecorded.transcripts.length, 2);
  assert.deepStrictEqual(eventsRecorded.transcripts[1], { role: "model", text: "Hello, I am your guide." });
  console.log("✓ 5.4: onTranscript(model) dispatch verified");

  // 5.5 Test Turn Complete
  agent.handleServerMessage({
    serverContent: {
      turnComplete: true,
    },
  });
  assert.strictEqual(eventsRecorded.turnCompleteCount, 1);
  console.log("✓ 5.5: onTurnComplete dispatch verified");

  // 5.6 Test Tool Call Dispatch
  agent.handleServerMessage({
    toolCall: {
      functionCalls: [
        {
          id: "call_abc123",
          name: "log_event",
          args: { event: "idle_nudge", detail: "Candidate inactive for 60s" },
        },
      ],
    },
  });
  assert.strictEqual(eventsRecorded.toolCalls.length, 1);
  assert.deepStrictEqual(eventsRecorded.toolCalls[0], {
    name: "log_event",
    args: { event: "idle_nudge", detail: "Candidate inactive for 60s" },
    id: "call_abc123",
  });
  console.log("✓ 5.6: onToolCall dispatch with function call ID verified");
}

// ============================================================================
// TEST SUITE 6: Client Transmissions (pushContext, sendToolResponse)
// ============================================================================
console.log("\n--- Test Suite 6: Client Transmissions ---");
{
  const mod = loadGeminiLiveModule();
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "guide" });

  const sentRealtimeInputs = [];
  const sentToolResponses = [];

  const mockSession = {
    sendRealtimeInput: (params) => sentRealtimeInputs.push(params),
    sendToolResponse: (params) => sentToolResponses.push(params),
    close: () => {},
  };

  agent.session = mockSession;
  agent.status = "connected";

  // 6.1 pushContext formats with [CONTEXT] prefix
  agent.pushContext("t+30s: candidate opened terminal");
  assert.strictEqual(sentRealtimeInputs.length, 1);
  assert.strictEqual(sentRealtimeInputs[0].text, "[CONTEXT] t+30s: candidate opened terminal");

  // 6.2 pushContext does not duplicate existing [CONTEXT] prefix
  agent.pushContext("[CONTEXT] already prefixed context");
  assert.strictEqual(sentRealtimeInputs.length, 2);
  assert.strictEqual(sentRealtimeInputs[1].text, "[CONTEXT] already prefixed context");
  console.log("✓ 6.1 & 6.2: pushContext prefix handling verified");

  // 6.3 sendAudioChunk sends audio object with 16kHz PCM mimeType
  agent.sendAudioChunk("mockBase64PcmData");
  assert.strictEqual(sentRealtimeInputs.length, 3);
  assert.deepStrictEqual(sentRealtimeInputs[2], {
    audio: {
      data: "mockBase64PcmData",
      mimeType: "audio/pcm;rate=16000",
    },
  });
  console.log("✓ 6.3: sendAudioChunk transmission verified");

  // 6.4 sendToolResponse includes functionResponses with ID
  agent.sendToolResponse("log_event", "call_abc123", { status: "logged" });
  assert.strictEqual(sentToolResponses.length, 1);
  assert.deepStrictEqual(sentToolResponses[0], {
    functionResponses: [
      {
        id: "call_abc123",
        name: "log_event",
        response: { status: "logged" },
      },
    ],
  });
  console.log("✓ 6.4: sendToolResponse with ID and object response verified");

  // 6.5 sendToolResponse throws if not connected
  agent.status = "disconnected";
  assert.throws(
    () => agent.sendToolResponse("log_event", "id1", "val"),
    /Cannot send tool response: session not connected/
  );
  console.log("✓ 6.5: sendToolResponse disconnected guard verified");
}

// ============================================================================
// TEST SUITE 7: End-to-End Connection, Web Audio Mock & Leak-Free Disconnect
// ============================================================================
console.log("\n--- Test Suite 7: Connection Handshake & Leak-Free Teardown ---");
async function runLifecycleTests() {
  const stoppedTracks = [];
  const closedAudioContexts = [];
  const disconnectedNodes = [];
  let sessionClosed = false;
  let googleGenAiOptions = null;
  let liveConnectParams = null;

  class MockAudioTrack {
    stop() {
      stoppedTracks.push(this);
    }
  }

  const mockStream = {
    getTracks: () => [new MockAudioTrack(), new MockAudioTrack()],
  };

  class MockScriptProcessor {
    constructor() {
      this.onaudioprocess = null;
    }
    connect(dest) {}
    disconnect() {
      disconnectedNodes.push("ScriptProcessorNode");
    }
  }

  class MockGain {
    constructor() {
      this.gain = { value: 1 };
    }
    connect(dest) {}
    disconnect() {
      disconnectedNodes.push("GainNode");
    }
  }

  class MockMediaStreamSource {
    connect(dest) {}
    disconnect() {
      disconnectedNodes.push("MediaStreamSourceNode");
    }
  }

  class MockAudioContext {
    constructor(opts) {
      this.sampleRate = opts?.sampleRate || 48000;
      this.state = "running";
      this.destination = {};
    }
    createMediaStreamSource(stream) {
      return new MockMediaStreamSource();
    }
    createScriptProcessor(bufSize, inCh, outCh) {
      return new MockScriptProcessor();
    }
    createGain() {
      return new MockGain();
    }
    async close() {
      this.state = "closed";
      closedAudioContexts.push(this);
    }
  }

  class MockGoogleGenAI {
    constructor(opts) {
      googleGenAiOptions = opts;
      this.live = {
        connect: async (params) => {
          liveConnectParams = params;
          return {
            sendRealtimeInput: () => {},
            sendToolResponse: () => {},
            close: () => {
              sessionClosed = true;
            },
          };
        },
      };
    }
  }

  const mockFetch = async (url, options) => {
    assert.strictEqual(url, "/api/voice/session");
    const reqBody = JSON.parse(options.body);
    assert.strictEqual(reqBody.mode, "persona");
    assert.strictEqual(reqBody.domain, "engineering");

    return {
      ok: true,
      status: 200,
      json: async () => ({
        token: "auth_tokens/test_ephemeral_token_12345",
        config: {
          model: "gemini-2.0-flash-exp",
          systemInstruction: "You are the engineering persona",
          voice: "Aoede",
        },
      }),
    };
  };

  const globals = {
    window: {
      AudioContext: MockAudioContext,
    },
    navigator: {
      mediaDevices: {
        getUserMedia: async (constraints) => {
          assert.strictEqual(constraints.audio.sampleRate, 16000);
          return mockStream;
        },
      },
    },
    fetch: mockFetch,
  };

  const mod = loadGeminiLiveModule(globals, MockGoogleGenAI);
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({
    mode: "persona",
    domain: "engineering",
    problemTitle: "API Refactor",
    scenario: "Review PR",
  });

  const statuses = [];
  await agent.connect({
    onAudioChunk: () => {},
    onTranscript: () => {},
    onToolCall: () => {},
    onStatusChange: (status) => statuses.push(status),
    onInterrupted: () => {},
  });

  // Verify connection assertions
  assert.deepStrictEqual(statuses, ["connecting", "connected"]);
  assert.strictEqual(agent.getStatus(), "connected");
  assert.strictEqual(agent.isConnected(), true);

  // Verify GoogleGenAI was instantiated with ephemeral token and v1alpha
  assert.strictEqual(googleGenAiOptions.apiKey, "auth_tokens/test_ephemeral_token_12345");
  assert.deepStrictEqual(googleGenAiOptions.httpOptions, { apiVersion: "v1alpha" });

  // Verify Live Connect parameters
  assert.strictEqual(liveConnectParams.model, "gemini-2.0-flash-exp");
  assert.strictEqual(
    liveConnectParams.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,
    "Aoede"
  );
  console.log("✓ 7.1: Ephemeral token authentication and Live handshake verified");

  // 7.2 Execute leak-free disconnect
  await agent.disconnect();

  assert.strictEqual(agent.getStatus(), "disconnected");
  assert.strictEqual(agent.isConnected(), false);
  assert.strictEqual(statuses[statuses.length - 1], "disconnected");

  // Verify leak-free hardware release
  assert.strictEqual(stoppedTracks.length, 2, "All media stream tracks must be stopped via track.stop()");
  assert.ok(disconnectedNodes.includes("ScriptProcessorNode"), "ScriptProcessorNode must be disconnected");
  assert.ok(disconnectedNodes.includes("MediaStreamSourceNode"), "MediaStreamSourceNode must be disconnected");
  assert.ok(disconnectedNodes.includes("GainNode"), "GainNode must be disconnected");
  assert.strictEqual(closedAudioContexts.length, 1, "AudioContext must be closed");
  assert.strictEqual(sessionClosed, true, "Live session WebSocket must be closed");

  console.log("✓ 7.2: Leak-free teardown (tracks stopped, nodes disconnected, AudioContext closed, session closed) verified");
}

await runLifecycleTests();

// ============================================================================
// TEST SUITE 8: Error Boundary & Resilience
// ============================================================================
console.log("\n--- Test Suite 8: Error Boundary & Resilience ---");
async function runErrorTests() {
  const errorFetch = async () => ({
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    json: async () => ({ error: "Token minting rate limit exceeded" }),
  });

  const globals = {
    window: {},
    navigator: {},
    fetch: errorFetch,
  };

  const mod = loadGeminiLiveModule(globals);
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "persona" });
  const statuses = [];

  let thrown = false;
  try {
    await agent.connect({
      onAudioChunk: () => {},
      onTranscript: () => {},
      onToolCall: () => {},
      onStatusChange: (status, detail) => statuses.push({ status, detail }),
      onInterrupted: () => {},
    });
  } catch (err) {
    thrown = true;
    assert.strictEqual(err.message, "Token minting rate limit exceeded");
  }

  assert.strictEqual(thrown, true, "connect() must throw on token route error");
  assert.strictEqual(agent.getStatus(), "error");
  const errorStatus = statuses.find((s) => s.status === "error");
  assert.ok(errorStatus, "onStatusChange('error') must be dispatched");
  assert.strictEqual(errorStatus.detail, "Token minting rate limit exceeded");

  console.log("✓ 8.1: API error boundary and graceful status transition verified");
}

await runErrorTests();

console.log("\n==========================================================");
console.log("ALL MILESTONE 2 TESTS PASSED SUCCESSFULLY! (8/8 Suites)");
console.log("==========================================================");
