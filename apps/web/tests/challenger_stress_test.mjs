import fs from "fs";
import path from "path";
import assert from "assert";
import ts from "typescript";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("================================================================================");
console.log("PRAXIS VOICE AGENT - ADVERSARIAL CHALLENGER STRESS SUITE");
console.log("Target: apps/web/lib/voice/geminiLive.ts");
console.log("================================================================================\n");

// 1. Transpile geminiLive.ts
const geminiLivePath = path.resolve(__dirname, "../lib/voice/geminiLive.ts");
const sourceCode = fs.readFileSync(geminiLivePath, "utf8");

const { outputText: jsCode } = ts.transpileModule(sourceCode, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    removeComments: false,
  },
});

function loadGeminiLiveModule(globals = {}, mockGoogleGenAI = null) {
  const customRequire = (id) => {
    if (id === "@google/genai") {
      return {
        GoogleGenAI:
          mockGoogleGenAI ||
          class MockGoogleGenAI {
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

let totalChallenges = 0;
let passedChallenges = 0;

function runTest(name, fn) {
  totalChallenges++;
  try {
    fn();
    passedChallenges++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalChallenges++;
  try {
    await fn();
    passedChallenges++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

// ============================================================================
// SUITE 1: ADVERSARIAL SERVER MESSAGE EVENT DISPATCHING
// ============================================================================
console.log("--- Challenge Suite 1: Server Message Event Handling & Edge Cases ---");

{
  const mod = loadGeminiLiveModule();
  const { VoiceAgent } = mod;

  // 1.1 Multi-part Model Turn with Mixed Audio, Text, and Thinking Suppression
  runTest("1.1 Model turn with multiple audio chunks, text parts, and thought blocks", () => {
    const agent = new VoiceAgent({ mode: "persona" });
    const audioChunks = [];
    const transcripts = [];

    agent.events = {
      onAudioChunk: (c) => audioChunks.push(c),
      onTranscript: (r, t) => transcripts.push({ r, t }),
      onToolCall: () => {},
      onStatusChange: () => {},
      onInterrupted: () => {},
    };

    agent.handleServerMessage({
      serverContent: {
        modelTurn: {
          parts: [
            { inlineData: { data: "chunk1", mimeType: "audio/pcm;rate=24000" } },
            { text: "Internal thought process", thought: true }, // Gemini thinking model block
            { text: "Spoken text part 1" },
            { inlineData: { data: "chunk2", mimeType: "audio/pcm;rate=24000" }, text: "Spoken text part 2" },
          ],
        },
      },
    });

    assert.strictEqual(audioChunks.length, 2, "Expected exactly 2 audio chunks");
    assert.deepStrictEqual(audioChunks, ["chunk1", "chunk2"]);
    assert.strictEqual(transcripts.length, 2, "Thought block must be suppressed from transcript");
    assert.deepStrictEqual(transcripts, [
      { r: "model", t: "Spoken text part 1" },
      { r: "model", t: "Spoken text part 2" },
    ]);
  });

  // 1.2 Interruption Barge-in Edge Cases
  runTest("1.2 Barge-in: interrupted true vs false vs undefined", () => {
    const agent = new VoiceAgent({ mode: "persona" });
    let interruptedCount = 0;

    agent.events = {
      onAudioChunk: () => {},
      onTranscript: () => {},
      onToolCall: () => {},
      onStatusChange: () => {},
      onInterrupted: () => interruptedCount++,
    };

    // interrupted: true
    agent.handleServerMessage({ serverContent: { interrupted: true } });
    assert.strictEqual(interruptedCount, 1);

    // interrupted: false
    agent.handleServerMessage({ serverContent: { interrupted: false } });
    assert.strictEqual(interruptedCount, 1, "interrupted: false must NOT fire onInterrupted");

    // interrupted: undefined
    agent.handleServerMessage({ serverContent: { turnComplete: true } });
    assert.strictEqual(interruptedCount, 1, "missing interrupted must NOT fire onInterrupted");
  });

  // 1.3 Speech Transcription: User & Model Edge Cases
  runTest("1.3 Input & Output transcription edge cases (empty strings, whitespace)", () => {
    const agent = new VoiceAgent({ mode: "persona" });
    const transcripts = [];

    agent.events = {
      onAudioChunk: () => {},
      onTranscript: (role, text) => transcripts.push({ role, text }),
      onToolCall: () => {},
      onStatusChange: () => {},
      onInterrupted: () => {},
    };

    // Empty text in inputTranscription should not produce empty events
    agent.handleServerMessage({ serverContent: { inputTranscription: { text: "" } } });
    assert.strictEqual(transcripts.length, 0);

    // Valid user speech
    agent.handleServerMessage({ serverContent: { inputTranscription: { text: "Candidate query" } } });
    assert.strictEqual(transcripts.length, 1);
    assert.deepStrictEqual(transcripts[0], { role: "user", text: "Candidate query" });

    // Output transcription (model speech-to-text)
    agent.handleServerMessage({ serverContent: { outputTranscription: { text: "Model reply transcribed" } } });
    assert.strictEqual(transcripts.length, 2);
    assert.deepStrictEqual(transcripts[1], { role: "model", text: "Model reply transcribed" });
  });

  // 1.4 Parallel and Malformed Tool Calls
  runTest("1.4 Tool calls: multiple parallel calls, missing args/id defaults, missing name", () => {
    const agent = new VoiceAgent({ mode: "guide" });
    const toolCalls = [];

    agent.events = {
      onAudioChunk: () => {},
      onTranscript: () => {},
      onToolCall: (name, args, id) => toolCalls.push({ name, args, id }),
      onStatusChange: () => {},
      onInterrupted: () => {},
    };

    agent.handleServerMessage({
      toolCall: {
        functionCalls: [
          // Normal call
          { id: "call_1", name: "log_event", args: { event: "hint_given", detail: "loop hint" } },
          // Missing args & id
          { name: "ping" },
          // Null args
          { id: "call_3", name: "check_state", args: null },
          // Missing name (should be skipped)
          { id: "call_4", args: { foo: "bar" } },
        ],
      },
    });

    assert.strictEqual(toolCalls.length, 3, "Only calls with name should be dispatched");
    assert.deepStrictEqual(toolCalls[0], {
      name: "log_event",
      args: { event: "hint_given", detail: "loop hint" },
      id: "call_1",
    });
    assert.deepStrictEqual(toolCalls[1], {
      name: "ping",
      args: {},
      id: "",
    });
    assert.deepStrictEqual(toolCalls[2], {
      name: "check_state",
      args: {},
      id: "call_3",
    });
  });

  // 1.5 Compound Server Message
  runTest("1.5 Compound server message containing audio, transcripts, tool call and turnComplete simultaneously", () => {
    const agent = new VoiceAgent({ mode: "guide" });
    const recorded = {
      audio: [],
      transcripts: [],
      tools: [],
      interrupted: 0,
      turnComplete: 0,
    };

    agent.events = {
      onAudioChunk: (c) => recorded.audio.push(c),
      onTranscript: (r, t) => recorded.transcripts.push({ r, t }),
      onToolCall: (n, a, id) => recorded.tools.push({ n, a, id }),
      onStatusChange: () => {},
      onInterrupted: () => recorded.interrupted++,
      onTurnComplete: () => recorded.turnComplete++,
    };

    agent.handleServerMessage({
      serverContent: {
        modelTurn: {
          parts: [{ inlineData: { data: "base64audio" } }],
        },
        inputTranscription: { text: "Candidate voice" },
        outputTranscription: { text: "Guide voice" },
        interrupted: true,
        turnComplete: true,
      },
      toolCall: {
        functionCalls: [{ id: "call_guide", name: "log_event", args: { event: "nudge" } }],
      },
    });

    assert.strictEqual(recorded.audio.length, 1);
    assert.strictEqual(recorded.transcripts.length, 2);
    assert.strictEqual(recorded.tools.length, 1);
    assert.strictEqual(recorded.interrupted, 1);
    assert.strictEqual(recorded.turnComplete, 1);
  });

  // 1.6 Consumer Callback Exception Isolation
  runTest("1.6 Callback exception safety: error in onAudioChunk does not crash dispatcher", () => {
    const agent = new VoiceAgent({ mode: "persona" });
    agent.events = {
      onAudioChunk: () => {
        throw new Error("Consumer audio buffer full / playback exception");
      },
      onTranscript: () => {},
      onToolCall: () => {},
      onStatusChange: () => {},
      onInterrupted: () => {},
    };

    // Must not rethrow and crash
    assert.doesNotThrow(() => {
      agent.handleServerMessage({
        serverContent: {
          modelTurn: { parts: [{ inlineData: { data: "chunk" } }] },
        },
      });
    });
  });
}

// ============================================================================
// SUITE 2: ADVERSARIAL CLIENT TRANSMISSIONS & CONTRACTS
// ============================================================================
console.log("\n--- Challenge Suite 2: Client Inputs (pushContext, sendToolResponse) ---");

{
  const mod = loadGeminiLiveModule();
  const { VoiceAgent } = mod;

  runTest("2.1 pushContext prefix formatting and edge cases", () => {
    const agent = new VoiceAgent({ mode: "guide" });
    const sent = [];
    agent.session = { sendRealtimeInput: (p) => sent.push(p) };
    agent.status = "connected";

    // Unprefixed
    agent.pushContext("candidate executed npm test");
    assert.strictEqual(sent[0].text, "[CONTEXT] candidate executed npm test");

    // Already prefixed
    agent.pushContext("[CONTEXT] already formatted");
    assert.strictEqual(sent[1].text, "[CONTEXT] already formatted");

    // Whitespace with prefix
    agent.pushContext("[CONTEXT]   with spacing");
    assert.strictEqual(sent[2].text, "[CONTEXT]   with spacing");

    // Disconnected state should safely warn and not crash
    agent.status = "disconnected";
    assert.doesNotThrow(() => agent.pushContext("ignored message"));
    assert.strictEqual(sent.length, 3, "Disconnected pushContext must not transmit");
  });

  runTest("2.2 sendToolResponse conforms strictly to Gemini API FunctionResponse schema", () => {
    const agent = new VoiceAgent({ mode: "guide" });
    const responses = [];
    agent.session = { sendToolResponse: (p) => responses.push(p) };
    agent.status = "connected";

    // 1. Object result (e.g. { event: "logged", timestamp: 12345 })
    agent.sendToolResponse("log_event", "call_123", { event: "logged", timestamp: 12345 });
    assert.strictEqual(responses.length, 1);
    assert.deepStrictEqual(responses[0], {
      functionResponses: [
        {
          id: "call_123",
          name: "log_event",
          response: { event: "logged", timestamp: 12345 },
        },
      ],
    });

    // 2. Primitive string result ("OK")
    agent.sendToolResponse("ack", "call_456", "OK");
    assert.strictEqual(responses.length, 2);
    assert.deepStrictEqual(responses[1], {
      functionResponses: [
        {
          id: "call_456",
          name: "ack",
          response: { result: "OK" },
        },
      ],
    });

    // 3. Primitive boolean result (false)
    agent.sendToolResponse("is_allowed", "call_789", false);
    assert.strictEqual(responses.length, 3);
    assert.deepStrictEqual(responses[2], {
      functionResponses: [
        {
          id: "call_789",
          name: "is_allowed",
          response: { result: false },
        },
      ],
    });

    // 4. Primitive number result (0)
    agent.sendToolResponse("get_count", "call_101", 0);
    assert.strictEqual(responses.length, 4);
    assert.deepStrictEqual(responses[3], {
      functionResponses: [
        {
          id: "call_101",
          name: "get_count",
          response: { result: 0 },
        },
      ],
    });

    // 5. Null result
    agent.sendToolResponse("clear", "call_202", null);
    assert.strictEqual(responses.length, 5);
    assert.deepStrictEqual(responses[4], {
      functionResponses: [
        {
          id: "call_202",
          name: "clear",
          response: { result: null },
        },
      ],
    });

    // 6. Disconnected guard
    agent.status = "disconnected";
    assert.throws(
      () => agent.sendToolResponse("log_event", "id", {}),
      /Cannot send tool response: session not connected/
    );
  });

  runTest("2.3 sendAudioChunk streaming protocol compliance", () => {
    const agent = new VoiceAgent({ mode: "persona" });
    const audioInputs = [];
    agent.session = { sendRealtimeInput: (p) => audioInputs.push(p) };
    agent.status = "connected";

    agent.sendAudioChunk("SGVsbG8gV29ybGQ=");
    assert.strictEqual(audioInputs.length, 1);
    assert.deepStrictEqual(audioInputs[0], {
      audio: {
        data: "SGVsbG8gV29ybGQ=",
        mimeType: "audio/pcm;rate=16000",
      },
    });

    // When disconnected, should safely no-op
    agent.status = "disconnected";
    assert.doesNotThrow(() => agent.sendAudioChunk("SGVsbG8="));
    assert.strictEqual(audioInputs.length, 1);
  });
}

// ============================================================================
// SUITE 3: RESOURCE LEAK VERIFICATION & LIFECYCLE ROBUSTNESS
// ============================================================================
console.log("\n--- Challenge Suite 3: Leak-Free Teardown & Lifecycle Stress ---");

await runAsyncTest("3.1 Teardown completeness: all tracks stopped, nodes disconnected, contexts closed", async () => {
  const stoppedTracks = [];
  const disconnectedNodes = [];
  let audioContextClosed = false;
  let sessionClosed = false;
  let audioStreamEndSent = false;

  class MockAudioTrack {
    constructor(id) {
      this.id = id;
    }
    stop() {
      stoppedTracks.push(this.id);
    }
  }

  const mockStream = {
    getTracks: () => [
      new MockAudioTrack("mic_left"),
      new MockAudioTrack("mic_right"),
      new MockAudioTrack("mic_virtual"),
    ],
  };

  class MockNode {
    constructor(name) {
      this.name = name;
      this.onaudioprocess = () => {};
      this.gain = { value: 1 };
    }
    connect() {}
    disconnect() {
      disconnectedNodes.push(this.name);
    }
  }

  class MockAudioContext {
    constructor() {
      this.sampleRate = 48000;
      this.state = "running";
      this.destination = {};
    }
    createMediaStreamSource() {
      return new MockNode("MediaStreamAudioSourceNode");
    }
    createScriptProcessor() {
      return new MockNode("ScriptProcessorNode");
    }
    createGain() {
      return new MockNode("GainNode");
    }
    async close() {
      audioContextClosed = true;
      this.state = "closed";
    }
  }

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      token: "auth_tokens/test_token",
      config: { model: "gemini-2.0-flash-exp", voice: "Puck" },
    }),
  });

  class MockGoogleGenAI {
    constructor() {
      this.live = {
        connect: async () => ({
          sendRealtimeInput: (p) => {
            if (p.audioStreamEnd) audioStreamEndSent = true;
          },
          sendToolResponse: () => {},
          close: () => {
            sessionClosed = true;
          },
        }),
      };
    }
  }

  const globals = {
    window: { AudioContext: MockAudioContext },
    navigator: {
      mediaDevices: {
        getUserMedia: async () => mockStream,
      },
    },
    fetch: mockFetch,
  };

  const mod = loadGeminiLiveModule(globals, MockGoogleGenAI);
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "guide" });
  const statusEvents = [];

  await agent.connect({
    onAudioChunk: () => {},
    onTranscript: () => {},
    onToolCall: () => {},
    onStatusChange: (status) => statusEvents.push(status),
    onInterrupted: () => {},
  });

  assert.strictEqual(agent.isConnected(), true);
  assert.strictEqual(agent.getStatus(), "connected");

  // Now trigger full disconnect
  await agent.disconnect();

  assert.strictEqual(agent.getStatus(), "disconnected");
  assert.strictEqual(agent.isConnected(), false);
  assert.strictEqual(statusEvents[statusEvents.length - 1], "disconnected");

  // 1. All 3 tracks must be stopped
  assert.strictEqual(stoppedTracks.length, 3, "All media stream tracks must be stopped");
  assert.deepStrictEqual(stoppedTracks, ["mic_left", "mic_right", "mic_virtual"]);

  // 2. All 3 audio nodes disconnected
  assert.ok(disconnectedNodes.includes("ScriptProcessorNode"));
  assert.ok(disconnectedNodes.includes("MediaStreamAudioSourceNode"));
  assert.ok(disconnectedNodes.includes("GainNode"));

  // 3. AudioContext closed
  assert.strictEqual(audioContextClosed, true, "AudioContext must be explicitly closed");

  // 4. Session closed
  assert.strictEqual(sessionClosed, true, "Session WebSocket must be closed");

  // 5. audioStreamEnd notification sent before teardown
  assert.strictEqual(audioStreamEndSent, true, "audioStreamEnd: true sent to notify server");
});

await runAsyncTest("3.2 Idempotent disconnect: calling disconnect() multiple times concurrently and sequentially", async () => {
  const mod = loadGeminiLiveModule({
    window: {},
    navigator: {},
    fetch: async () => ({
      ok: true,
      json: async () => ({ token: "auth_tokens/test", config: {} }),
    }),
  });
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "persona" });
  // Disconnect on unstarted agent
  await assert.doesNotReject(async () => {
    await agent.disconnect();
    await agent.disconnect();
  });

  // Concurrent disconnects
  await assert.doesNotReject(async () => {
    await Promise.all([agent.disconnect(), agent.disconnect(), agent.disconnect()]);
  });
  assert.strictEqual(agent.getStatus(), "disconnected");
});

await runAsyncTest("3.3 Abort in flight: disconnect() during connect() fetch aborts request cleanly", async () => {
  let abortSignalReceived = false;

  const mockFetch = async (url, opts) => {
    return new Promise((resolve, reject) => {
      opts.signal.addEventListener("abort", () => {
        abortSignalReceived = true;
        reject(new Error("The operation was aborted"));
      });
      // Deliberately delay response
      setTimeout(() => {
        resolve({
          ok: true,
          json: async () => ({ token: "auth_tokens/t", config: {} }),
        });
      }, 500);
    });
  };

  const mod = loadGeminiLiveModule({
    window: {},
    navigator: {},
    fetch: mockFetch,
  });
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "persona" });

  const connectPromise = agent.connect({
    onAudioChunk: () => {},
    onTranscript: () => {},
    onToolCall: () => {},
    onStatusChange: () => {},
    onInterrupted: () => {},
  });

  // Immediately disconnect while fetch is pending
  await agent.disconnect();

  try {
    await connectPromise;
  } catch (err) {
    // Expected abort error or handled silently
  }

  assert.strictEqual(abortSignalReceived, true, "Fetch AbortSignal must be triggered");
  assert.strictEqual(agent.getStatus(), "disconnected");
});

// ============================================================================
// SUITE 4: AUDIO MATHEMATICS & ENCODING INVARIANTS
// ============================================================================
console.log("\n--- Challenge Suite 4: Audio Math & Resampling Invariants ---");

{
  const mod = loadGeminiLiveModule();
  const { resampleTo16k, floatTo16BitPCM, arrayBufferToBase64, base64ToArrayBuffer } = mod;

  // 4.1 Resample edge cases
  runTest("4.1 resampleTo16k handles boundary cases and sample rates", () => {
    // Empty buffer
    const empty = new Float32Array(0);
    const resampledEmpty = resampleTo16k(empty, 48000, 16000);
    assert.strictEqual(resampledEmpty.length, 0);

    // Single sample
    const single = new Float32Array([0.75]);
    const resampledSingle = resampleTo16k(single, 48000, 16000);
    assert.strictEqual(resampledSingle.length, 0); // 1 / 3 = 0.33 -> round = 0

    // High sample rate 96kHz (ratio 6)
    const buf96k = new Float32Array(9600);
    const resampled96k = resampleTo16k(buf96k, 96000, 16000);
    assert.strictEqual(resampled96k.length, 1600);

    // Non-integer ratio 44.1kHz -> 16kHz
    const buf44k = new Float32Array(44100); // 1 sec at 44.1kHz
    const resampled44k = resampleTo16k(buf44k, 44100, 16000);
    assert.strictEqual(resampled44k.length, 16000, "1 sec at 44.1kHz must produce exactly 16000 samples");
  });

  // 4.2 floatTo16BitPCM clamping and precision
  runTest("4.2 floatTo16BitPCM boundary clamping, extremes, and little-endian representation", () => {
    const input = new Float32Array([
      Number.POSITIVE_INFINITY, // should clamp to 1.0 -> 32767
      Number.NEGATIVE_INFINITY, // should clamp to -1.0 -> -32768
      1000.0,                   // clamp to 32767
      -1000.0,                  // clamp to -32768
      0.0,                      // 0
      0.00003,                  // tiny positive
      -0.00003,                 // tiny negative
    ]);

    const pcmBuffer = floatTo16BitPCM(input);
    assert.strictEqual(pcmBuffer.byteLength, input.length * 2);

    const view = new DataView(pcmBuffer);
    assert.strictEqual(view.getInt16(0, true), 32767);
    assert.strictEqual(view.getInt16(2, true), -32768);
    assert.strictEqual(view.getInt16(4, true), 32767);
    assert.strictEqual(view.getInt16(6, true), -32768);
    assert.strictEqual(view.getInt16(8, true), 0);
  });

  // 4.3 Base64 Round-trip on arbitrary binary data
  runTest("4.3 Base64 roundtrip on random and boundary-sized byte arrays", () => {
    for (const size of [0, 1, 2, 3, 4, 15, 16, 17, 1024, 65536]) {
      const original = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        original[i] = (i * 37 + 13) & 0xff;
      }
      const b64 = arrayBufferToBase64(original.buffer);
      const decodedBuffer = base64ToArrayBuffer(b64);
      const decoded = new Uint8Array(decodedBuffer);
      assert.strictEqual(decoded.length, original.length, `Length mismatch on size ${size}`);
      assert.deepStrictEqual(Array.from(decoded), Array.from(original), `Content mismatch on size ${size}`);
    }
  });
}

console.log("\n================================================================================");
console.log(`CHALLENGE RESULTS: ${passedChallenges}/${totalChallenges} ADVERSARIAL STRESS TESTS PASSED!`);
console.log("================================================================================\n");
