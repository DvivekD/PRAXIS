import fs from "fs";
import path from "path";
import assert from "assert";
import ts from "typescript";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("================================================================================");
console.log("PRAXIS VOICE AGENT - ADVERSARIAL STRESS TEST & EMPIRICAL HARNESS");
console.log("Target: apps/web/lib/voice/geminiLive.ts");
console.log("================================================================================\n");

// 1. Transpile geminiLive.ts for sandboxed Node execution
const geminiLivePath = path.resolve(__dirname, "../lib/voice/geminiLive.ts");
const sourceCode = fs.readFileSync(geminiLivePath, "utf8");

const { outputText: jsCode } = ts.transpileModule(sourceCode, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    removeComments: false,
  },
});

function loadModule(globals = {}, mockGoogleGenAI = null) {
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

const summary = {
  passed: 0,
  failed: 0,
  bugs: [],
};

function recordBug(name, description, evidence) {
  summary.failed++;
  summary.bugs.push({ name, description, evidence });
  console.log(`❌ [CONFIRMED BUG] ${name}`);
  console.log(`   ${description}`);
  console.log(`   Evidence: ${evidence}\n`);
}

function recordPass(testName) {
  summary.passed++;
  console.log(`✓ [PASS] ${testName}`);
}

// ============================================================================
// STRESS SUITE 1: Web Audio Resampling Stress & Frequency Analysis
// ============================================================================
console.log("--- STRESS SUITE 1: Resampling from Unusual Hardware Rates ---");
{
  const { resampleTo16k } = loadModule();

  // 1.1 Identity 16kHz
  const in16k = new Float32Array([0.1, -0.5, 0.9, -0.9]);
  const out16k = resampleTo16k(in16k, 16000, 16000);
  assert.strictEqual(out16k, in16k, "Identity 16kHz should return same instance");
  recordPass("1.1: 16kHz identity returns exact buffer");

  // 1.2 Unusual rates: 44.1kHz, 48kHz, 96kHz, 8kHz, 192kHz
  const rates = [44100, 48000, 96000, 8000, 192000];
  for (const rate of rates) {
    const inputDurationSec = 0.1; // 100ms
    const inputLength = Math.round(rate * inputDurationSec);
    const input = new Float32Array(inputLength);
    // 440 Hz Sine wave
    for (let i = 0; i < inputLength; i++) {
      input[i] = Math.sin((2 * Math.PI * 440 * i) / rate);
    }

    const output = resampleTo16k(input, rate, 16000);
    const expectedOutputLen = Math.round(inputLength / (rate / 16000));
    assert.strictEqual(
      output.length,
      expectedOutputLen,
      `Rate ${rate}Hz should produce ${expectedOutputLen} samples, got ${output.length}`
    );

    // Verify all output samples are within valid range [-1.0, 1.0] and contain no NaNs
    for (let i = 0; i < output.length; i++) {
      assert.ok(!isNaN(output[i]), `Sample ${i} at rate ${rate}Hz must not be NaN`);
      assert.ok(
        output[i] >= -1.0001 && output[i] <= 1.0001,
        `Sample ${i} at rate ${rate}Hz (${output[i]}) exceeded [-1, 1]`
      );
    }
    recordPass(`1.2: Resampling from ${rate}Hz (down/up-sampling length & range valid)`);
  }

  // 1.3 Upsampling boundary check (8kHz -> 16kHz, ratio 0.5)
  // Ensure the tail sample does not access out of bounds or produce NaN
  const tiny8k = new Float32Array([0.2, 0.8]);
  const upsampled = resampleTo16k(tiny8k, 8000, 16000);
  assert.strictEqual(upsampled.length, 4);
  assert.ok(Math.abs(upsampled[0] - 0.2) < 1e-6);
  assert.ok(Math.abs(upsampled[1] - 0.5) < 1e-6);
  assert.ok(Math.abs(upsampled[2] - 0.8) < 1e-6);
  assert.ok(Math.abs(upsampled[3] - 0.8) < 1e-6); // Clamped tail
  recordPass("1.3: 8kHz upsampling tail clamping and interpolation precision verified");

  // 1.4 Empty buffer handling
  const empty = new Float32Array(0);
  const outEmpty = resampleTo16k(empty, 48000, 16000);
  assert.strictEqual(outEmpty.length, 0);
  recordPass("1.4: Empty audio buffer handled safely without error");

  // 1.5 Odd buffer size stress test
  const odd = new Float32Array(1337);
  for (let i = 0; i < odd.length; i++) odd[i] = (i % 2 === 0 ? 0.5 : -0.5);
  const outOdd = resampleTo16k(odd, 44100, 16000);
  assert.strictEqual(outOdd.length, Math.round(1337 / (44100 / 16000)));
  assert.ok(!isNaN(outOdd[outOdd.length - 1]));
  recordPass("1.5: Odd buffer sizes resample without NaN or off-by-one errors");
}

// ============================================================================
// STRESS SUITE 2: Audio Buffer Extremes & PCM Conversion
// ============================================================================
console.log("\n--- STRESS SUITE 2: Audio Buffer Extremes & PCM Conversion ---");
{
  const { floatTo16BitPCM } = loadModule();

  // 2.1 Silence (all 0s)
  const silence = new Float32Array(100);
  const silencePcm = floatTo16BitPCM(silence);
  const silenceView = new DataView(silencePcm);
  let allZero = true;
  for (let i = 0; i < silence.length; i++) {
    if (silenceView.getInt16(i * 2, true) !== 0) allZero = false;
  }
  assert.strictEqual(allZero, true, "Silence buffer must convert to all zero PCM bytes");
  recordPass("2.1: Silence (all 0s) converts to 0x0000");

  // 2.2 Full volume boundaries (1.0 and -1.0)
  const fullVolume = new Float32Array([1.0, -1.0, 1.0, -1.0]);
  const fvView = new DataView(floatTo16BitPCM(fullVolume));
  assert.strictEqual(fvView.getInt16(0, true), 32767);
  assert.strictEqual(fvView.getInt16(2, true), -32768);
  assert.strictEqual(fvView.getInt16(4, true), 32767);
  assert.strictEqual(fvView.getInt16(6, true), -32768);
  recordPass("2.2: Full volume (1.0 and -1.0) maps precisely to 32767 and -32768");

  // 2.3 Hard Clipping (>1.0 and <-1.0)
  const clipped = new Float32Array([1.5, 2.0, 50.0, 1e9, -1.5, -2.0, -50.0, -1e9]);
  const clipView = new DataView(floatTo16BitPCM(clipped));
  for (let i = 0; i < 4; i++) {
    assert.strictEqual(clipView.getInt16(i * 2, true), 32767, `Positive clip index ${i} must be 32767`);
  }
  for (let i = 4; i < 8; i++) {
    assert.strictEqual(clipView.getInt16(i * 2, true), -32768, `Negative clip index ${i} must be -32768`);
  }
  recordPass("2.3: Hard clipping values (>1.0 and <-1.0) clamp safely without integer overflow");

  // 2.4 Extreme IEEE-754 Floats: NaN, +Infinity, -Infinity, Subnormals
  const weirdFloats = new Float32Array([
    NaN,
    Infinity,
    -Infinity,
    1e-40,
    -1e-40,
  ]);
  const weirdView = new DataView(floatTo16BitPCM(weirdFloats));
  assert.strictEqual(weirdView.getInt16(0, true), 0, "NaN must safely convert to 0");
  assert.strictEqual(weirdView.getInt16(2, true), 32767, "+Infinity must clamp to 32767");
  assert.strictEqual(weirdView.getInt16(4, true), -32768, "-Infinity must clamp to -32768");
  assert.strictEqual(weirdView.getInt16(6, true), 0, "Subnormal float must convert to 0");
  assert.strictEqual(weirdView.getInt16(8, true), 0, "Negative subnormal float must convert to 0");
  recordPass("2.4: NaN, +/-Infinity, and subnormal floats convert safely without runtime exceptions");
}

// ============================================================================
// STRESS SUITE 3: Microphones Denied or Unavailable
// ============================================================================
console.log("\n--- STRESS SUITE 3: Microphone Permission and Device Errors ---");
async function testMicFailures() {
  const errorsToTest = [
    { name: "NotAllowedError", message: "Permission denied by user" },
    { name: "NotFoundError", message: "Requested audio capture device not found" },
    { name: "NotReadableError", message: "Microphone is in use by another program" },
  ];

  for (const errDef of errorsToTest) {
    const errorFetch = async () => ({
      ok: true,
      json: async () => ({
        token: "tok_mic_test",
        config: { model: "gemini-2.0-flash-exp" },
      }),
    });

    class MockGoogleGenAI {
      constructor() {
        this.live = {
          connect: async () => ({
            sendRealtimeInput: () => {},
            sendToolResponse: () => {},
            close: () => {},
          }),
        };
      }
    }

    const globals = {
      window: {
        AudioContext: class {
          constructor() { this.state = "running"; }
          createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
          createScriptProcessor() { return { connect() {}, disconnect() {} }; }
          createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
          close() { this.state = "closed"; }
        },
      },
      navigator: {
        mediaDevices: {
          getUserMedia: async () => {
            const err = new Error(errDef.message);
            err.name = errDef.name;
            throw err;
          },
        },
      },
      fetch: errorFetch,
    };

    const mod = loadModule(globals, MockGoogleGenAI);
    const { VoiceAgent } = mod;
    const agent = new VoiceAgent({ mode: "persona" });

    const statusTransitions = [];
    const events = {
      onAudioChunk: () => {},
      onTranscript: () => {},
      onToolCall: () => {},
      onStatusChange: (status, detail) => statusTransitions.push({ status, detail }),
      onInterrupted: () => {},
    };

    await agent.connect(events);

    // CHALLENGE: Check state coherence!
    // If onStatusChange("error", ...) was emitted, does agent.getStatus() match?
    const emittedError = statusTransitions.some((s) => s.status === "error");
    const currentStatus = agent.getStatus();
    const isConnected = agent.isConnected();

    if (emittedError && currentStatus === "connected") {
      recordBug(
        `State Incoherence on Microphone Failure (${errDef.name})`,
        `startMic() threw ${errDef.name}. onStatusChange("error") was emitted, but agent.getStatus() remains "connected" and isConnected() remains true. The session is left dangling without a mic.`,
        `agent.getStatus() === "${currentStatus}", isConnected() === ${isConnected}, events emitted: ${JSON.stringify(statusTransitions)}`
      );
    } else {
      recordPass(`3.1: Graceful state handling for ${errDef.name}`);
    }
  }
}
await testMicFailures();

// ============================================================================
// STRESS SUITE 4: Multiple Rapid connect() / disconnect() Race Conditions
// ============================================================================
console.log("\n--- STRESS SUITE 4: Rapid connect() / disconnect() Race Conditions ---");

// Test 4.1: Disconnect while fetch("/api/voice/session") is pending
async function testDisconnectDuringFetch() {
  let abortSignalReceived = null;
  const slowFetch = (url, opts) => {
    abortSignalReceived = opts.signal;
    return new Promise((resolve, reject) => {
      opts.signal.addEventListener("abort", () => {
        const err = new Error("The user aborted a request.");
        err.name = "AbortError";
        reject(err);
      });
    });
  };

  const globals = {
    fetch: slowFetch,
  };

  const mod = loadModule(globals);
  const { VoiceAgent } = mod;
  const agent = new VoiceAgent({ mode: "persona" });

  const statuses = [];
  const events = {
    onAudioChunk: () => {},
    onTranscript: () => {},
    onToolCall: () => {},
    onStatusChange: (status, detail) => statuses.push({ status, detail }),
    onInterrupted: () => {},
  };

  let connectError = null;
  const connectPromise = agent.connect(events).catch((e) => {
    connectError = e;
  });

  // User immediately disconnects
  await agent.disconnect();
  await connectPromise;

  const finalStatus = agent.getStatus();

  // CHALLENGE: If user called disconnect(), final status should be "disconnected", NOT "error",
  // and no unhandled AbortError should be thrown!
  if (finalStatus === "error" || connectError?.name === "AbortError") {
    recordBug(
      "AbortError Leak & Status Corruption on Rapid Disconnect during Fetch",
      `When disconnect() is called while token fetch is in flight, disconnect() sets abortController = null. In connect()'s catch block, this.abortController?.signal.aborted evaluates to falsy, causing the AbortError to be treated as a fatal failure, re-thrown, and overwriting agent status to "error".`,
      `agent.getStatus() === "${finalStatus}", connectError: ${connectError?.name}: ${connectError?.message}`
    );
  } else {
    recordPass("4.1: Clean disconnect during fetch without AbortError leak");
  }
}
await testDisconnectDuringFetch();

// Test 4.2: Disconnect while ai.live.connect() is awaiting (WebSocket handshake)
async function testDisconnectDuringLiveConnect() {
  let liveConnectResolve = null;
  let sessionClosed = false;

  class MockSession {
    constructor() { this.closed = false; }
    close() { this.closed = true; sessionClosed = true; }
    sendRealtimeInput() {}
  }

  class MockGoogleGenAI {
    constructor() {
      this.live = {
        connect: () => new Promise((resolve) => {
          liveConnectResolve = () => resolve(new MockSession());
        }),
      };
    }
  }

  const globals = {
    fetch: async () => ({
      ok: true,
      json: async () => ({ token: "tok_test", config: { model: "gemini-2.0-flash-exp" } }),
    }),
    window: {
      AudioContext: class {
        constructor() { this.state = "running"; }
        createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
        createScriptProcessor() { return { connect() {}, disconnect() {} }; }
        createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
        close() { this.state = "closed"; }
      },
    },
    navigator: {
      mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
      },
    },
  };

  const mod = loadModule(globals, MockGoogleGenAI);
  const { VoiceAgent } = mod;
  const agent = new VoiceAgent({ mode: "persona" });

  let connectError = null;
  const connectPromise = agent.connect({
    onAudioChunk: () => {},
    onTranscript: () => {},
    onToolCall: () => {},
    onStatusChange: () => {},
    onInterrupted: () => {},
  }).catch((e) => {
    connectError = e;
  });

  // Give microtasks time to finish fetch and reach ai.live.connect
  await new Promise((r) => setTimeout(r, 20));

  // User disconnects while live.connect is awaiting
  await agent.disconnect();
  assert.strictEqual(agent.getStatus(), "disconnected", "Immediate status should be disconnected");

  // Now live.connect resolves late
  liveConnectResolve();
  await connectPromise;

  const finalStatus = agent.getStatus();

  if (connectError instanceof TypeError && connectError.message.includes("onStatusChange")) {
    recordBug(
      "Fatal TypeError Crash on Disconnect during ai.live.connect",
      `When disconnect() is called while ai.live.connect is in flight, disconnect() sets this.events = null. When ai.live.connect resolves, connect() executes this.events.onStatusChange("connected") without null-checking, throwing a fatal TypeError and leaking the WebSocket connection.`,
      `connectError: ${connectError?.stack}`
    );
  } else if (finalStatus !== "disconnected" || !sessionClosed) {
    recordBug(
      "WebSocket Session Leak on Disconnect during ai.live.connect",
      `Delayed session resolution was not cancelled or closed, leaving agent in "${finalStatus}" status with sessionClosed === ${sessionClosed}.`,
      `finalStatus: ${finalStatus}, sessionClosed: ${sessionClosed}`
    );
  } else {
    recordPass("4.2: Disconnect during ai.live.connect handshake cleans up without crash");
  }
}
await testDisconnectDuringLiveConnect();

// Test 4.3: Multiple rapid sequential connect() calls
async function testConcurrentConnectCalls() {
  let liveConnectCalls = 0;
  class MockGoogleGenAI {
    constructor() {
      this.live = {
        connect: async () => {
          liveConnectCalls++;
          await new Promise((r) => setTimeout(r, 30));
          return { close: () => {}, sendRealtimeInput: () => {} };
        },
      };
    }
  }

  const globals = {
    fetch: async () => {
      await new Promise((r) => setTimeout(r, 20));
      return {
        ok: true,
        json: async () => ({ token: "tok_test", config: {} }),
      };
    },
    window: {
      AudioContext: class {
        constructor() { this.state = "running"; }
        createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
        createScriptProcessor() { return { connect() {}, disconnect() {} }; }
        createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
        close() { this.state = "closed"; }
      },
    },
    navigator: {
      mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
      },
    },
  };

  const mod = loadModule(globals, MockGoogleGenAI);
  const { VoiceAgent } = mod;
  const agent = new VoiceAgent({ mode: "persona" });

  const events = {
    onAudioChunk: () => {},
    onTranscript: () => {},
    onToolCall: () => {},
    onStatusChange: () => {},
    onInterrupted: () => {},
  };

  // Launch 3 connect calls synchronously
  const p1 = agent.connect(events);
  const p2 = agent.connect(events);
  const p3 = agent.connect(events);

  await Promise.all([p1, p2, p3]);

  // Only 1 live session should have been initiated
  assert.strictEqual(liveConnectCalls, 1, "Concurrent connect() calls must not initiate multiple live sessions");
  recordPass("4.3: Concurrent connect() calls guarded against duplicate sessions");
}
await testConcurrentConnectCalls();

// ============================================================================
// STRESS SUITE 5: Barge-in 'interrupted' Signal & Continuous Streaming
// ============================================================================
console.log("\n--- STRESS SUITE 5: Barge-in 'interrupted' Signal & Streaming ---");
{
  const mod = loadModule();
  const { VoiceAgent } = mod;
  const agent = new VoiceAgent({ mode: "persona" });

  const audioChunksReceived = [];
  let interruptionCount = 0;
  let transcripts = [];

  agent.events = {
    onAudioChunk: (chunk) => audioChunksReceived.push(chunk),
    onTranscript: (role, text) => transcripts.push({ role, text }),
    onToolCall: () => {},
    onStatusChange: () => {},
    onInterrupted: () => {
      interruptionCount++;
      // Downstream audio player flushes pending buffer on interruption
      audioChunksReceived.length = 0;
    },
  };

  // 5.1 Simulate model streaming audio
  agent.handleServerMessage({
    serverContent: {
      modelTurn: {
        parts: [{ inlineData: { data: "pcm_chunk_1" } }],
      },
    },
  });
  agent.handleServerMessage({
    serverContent: {
      modelTurn: {
        parts: [{ inlineData: { data: "pcm_chunk_2" } }],
      },
    },
  });
  assert.strictEqual(audioChunksReceived.length, 2);

  // 5.2 Server emits barge-in interruption signal while candidate speaks over model
  agent.handleServerMessage({
    serverContent: {
      interrupted: true,
    },
  });
  assert.strictEqual(interruptionCount, 1);
  assert.strictEqual(audioChunksReceived.length, 0, "Playback buffer flushed on interrupted");
  recordPass("5.1 & 5.2: Barge-in interruption triggers callback and flushes buffer");

  // 5.3 Combined modelTurn and interrupted in same server message
  agent.handleServerMessage({
    serverContent: {
      modelTurn: {
        parts: [{ inlineData: { data: "chunk_cut_off" } }],
      },
      interrupted: true,
    },
  });
  assert.strictEqual(interruptionCount, 2);
  assert.strictEqual(audioChunksReceived.length, 0, "Combined turn + interrupted flushed atomically");
  recordPass("5.3: Combined modelTurn and interrupted handled in correct sequence");

  // 5.4 Error resilience: exception inside onInterrupted callback must not crash agent
  agent.events.onInterrupted = () => {
    throw new Error("Consumer audio playback context crash");
  };
  let handledCleanly = true;
  try {
    agent.handleServerMessage({
      serverContent: { interrupted: true },
    });
  } catch {
    handledCleanly = false;
  }
  assert.strictEqual(handledCleanly, true, "Exceptions inside onInterrupted must not escape handleServerMessage");
  recordPass("5.4: Exception inside onInterrupted trapped by error boundary");
}

console.log("\n================================================================================");
console.log(`STRESS TEST SUMMARY: ${summary.passed} Passed, ${summary.failed} Bugs Confirmed`);
console.log("================================================================================");

if (summary.bugs.length > 0) {
  console.log("\nCONFIRMED BUGS SUMMARY:");
  summary.bugs.forEach((b, idx) => {
    console.log(`${idx + 1}. [${b.name}]: ${b.description}`);
  });
  process.exit(1);
} else {
  console.log("\nAll adversarial stress tests passed!");
  process.exit(0);
}
