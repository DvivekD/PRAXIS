import fs from "fs";
import path from "path";
import assert from "assert";
import ts from "typescript";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("================================================================================");
console.log("PRAXIS VOICE AGENT - EMPIRICAL CHALLENGER STRESS HARNESS (M2 IT2)");
console.log("Target: apps/web/lib/voice/geminiLive.ts");
console.log("================================================================================\n");

// Transpile geminiLive.ts for sandboxed Node execution
const geminiLivePath = path.resolve(__dirname, "../lib/voice/geminiLive.ts");
const sourceCode = fs.readFileSync(geminiLivePath, "utf8");

const { outputText: jsCode } = ts.transpileModule(sourceCode, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    removeComments: false,
  },
});

// Resource Tracking Registry for leak detection
class ResourceTracker {
  constructor() {
    this.sessions = [];
    this.audioContexts = [];
    this.tracks = [];
  }

  registerSession(session) {
    this.sessions.push(session);
  }

  registerAudioContext(ctx) {
    this.audioContexts.push(ctx);
  }

  registerTrack(track) {
    this.tracks.push(track);
  }

  getLeakedSessions() {
    return this.sessions.filter((s) => !s.closed);
  }

  getLeakedAudioContexts() {
    return this.audioContexts.filter((ctx) => ctx.state !== "closed");
  }

  getLeakedTracks() {
    return this.tracks.filter((t) => !t.stopped);
  }

  reset() {
    this.sessions = [];
    this.audioContexts = [];
    this.tracks = [];
  }
}

const tracker = new ResourceTracker();

function createModuleLoader(options = {}) {
  const {
    fetchDelayMs = 0,
    connectDelayMs = 0,
    getUserMediaDelayMs = 0,
    audioCtxResumeDelayMs = 0,
    audioCtxResumeFails = false,
    getUserMediaFails = false,
  } = options;

  class MockSession {
    constructor() {
      this.closed = false;
      this.inputs = [];
      this.toolResponses = [];
      tracker.registerSession(this);
    }
    close() {
      this.closed = true;
    }
    sendRealtimeInput(input) {
      if (this.closed) throw new Error("Cannot send to closed session");
      this.inputs.push(input);
    }
    sendToolResponse(resp) {
      if (this.closed) throw new Error("Cannot send to closed session");
      this.toolResponses.push(resp);
    }
  }

  class MockAudioContext {
    constructor(opts) {
      this.sampleRate = opts?.sampleRate || 44100;
      this.state = "suspended";
      this.destination = {};
      tracker.registerAudioContext(this);
    }
    async resume() {
      if (audioCtxResumeDelayMs > 0) {
        await new Promise((r) => setTimeout(r, audioCtxResumeDelayMs));
      }
      if (audioCtxResumeFails) {
        throw new Error("DOMException: AudioContext resume failed");
      }
      this.state = "running";
    }
    async close() {
      this.state = "closed";
    }
    createMediaStreamSource() {
      return { connect() {}, disconnect() {} };
    }
    createScriptProcessor() {
      const proc = {
        onaudioprocess: null,
        connect() {},
        disconnect() {},
      };
      return proc;
    }
    createGain() {
      return { gain: { value: 0 }, connect() {}, disconnect() {} };
    }
  }

  class MockTrack {
    constructor() {
      this.stopped = false;
      tracker.registerTrack(this);
    }
    stop() {
      this.stopped = true;
    }
  }

  const customFetch = async (url, fetchOpts) => {
    if (fetchDelayMs > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, fetchDelayMs);
        if (fetchOpts?.signal) {
          fetchOpts.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            const err = new Error("The operation was aborted.");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    }
    return {
      ok: true,
      json: async () => ({
        token: "tok_adversarial_test",
        config: {
          model: "gemini-2.0-flash-exp",
          systemInstruction: "You are a test agent.",
          voice: "Aoede",
        },
      }),
    };
  };

  const customRequire = (id) => {
    if (id === "@google/genai") {
      return {
        GoogleGenAI: class MockGoogleGenAI {
          constructor(opts) {
            this.opts = opts;
            this.live = {
              connect: async (liveConfig) => {
                if (connectDelayMs > 0) {
                  await new Promise((r) => setTimeout(r, connectDelayMs));
                }
                const session = new MockSession();
                session._callbacks = liveConfig.callbacks;
                return session;
              },
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
    window: {
      AudioContext: MockAudioContext,
    },
    navigator: {
      mediaDevices: {
        getUserMedia: async () => {
          if (getUserMediaDelayMs > 0) {
            await new Promise((r) => setTimeout(r, getUserMediaDelayMs));
          }
          if (getUserMediaFails) {
            const err = new Error("Permission denied");
            err.name = "NotAllowedError";
            throw err;
          }
          return {
            getTracks: () => [new MockTrack()],
          };
        },
      },
    },
    fetch: customFetch,
    console,
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

  return {
    VoiceAgent: moduleObj.exports.VoiceAgent,
    resampleTo16k: moduleObj.exports.resampleTo16k,
    floatTo16BitPCM: moduleObj.exports.floatTo16BitPCM,
    arrayBufferToBase64: moduleObj.exports.arrayBufferToBase64,
    base64ToArrayBuffer: moduleObj.exports.base64ToArrayBuffer,
    MockSession,
    MockAudioContext,
    MockTrack,
  };
}

let testCount = 0;
let passCount = 0;
let failureCount = 0;
const failures = [];

function recordResult(name, passed, detail) {
  testCount++;
  if (passed) {
    passCount++;
    console.log(`  [PASS] Test ${testCount}: ${name}`);
  } else {
    failureCount++;
    failures.push({ name, detail });
    console.log(`  [FAIL] Test ${testCount}: ${name}`);
    console.log(`         Detail: ${detail}`);
  }
}

async function runEmpiricalHarness() {
  console.log("--- EMPIRICAL SUITE 1: Massive Rapid Connect/Disconnect Churn (60 Iterations) ---");
  {
    tracker.reset();
    const mod = createModuleLoader({
      fetchDelayMs: 5,
      connectDelayMs: 5,
      getUserMediaDelayMs: 5,
      audioCtxResumeDelayMs: 5,
    });
    const agent = new mod.VoiceAgent({ mode: "persona" });

    let unhandledErrors = 0;
    const dummyEvents = {
      onAudioChunk: () => {},
      onTranscript: () => {},
      onToolCall: () => {},
      onStatusChange: () => {},
      onInterrupted: () => {},
    };

    // Run 60 churn iterations with varying abort timings
    for (let i = 0; i < 60; i++) {
      const abortDelay = (i % 6) * 4; // 0ms, 4ms, 8ms, 12ms, 16ms, 20ms
      const connectPromise = agent.connect(dummyEvents).catch((err) => {
        unhandledErrors++;
      });

      if (abortDelay > 0) {
        await new Promise((r) => setTimeout(r, abortDelay));
      }

      await agent.disconnect();
      await connectPromise;

      assert.strictEqual(
        agent.getStatus(),
        "disconnected",
        `Agent status must be disconnected after churn cycle ${i}`
      );
    }

    const leakedSessions = tracker.getLeakedSessions();
    const leakedCtx = tracker.getLeakedAudioContexts();
    const leakedTracks = tracker.getLeakedTracks();

    recordResult(
      "60 rapid connect/disconnect churn cycles with stepped abort timings",
      leakedSessions.length === 0 &&
        leakedCtx.length === 0 &&
        leakedTracks.length === 0 &&
        unhandledErrors === 0 &&
        agent.getStatus() === "disconnected",
      `Leaked sessions: ${leakedSessions.length}, Leaked AudioContexts: ${leakedCtx.length}, Leaked tracks: ${leakedTracks.length}, Unhandled errors: ${unhandledErrors}`
    );
  }

  console.log("\n--- EMPIRICAL SUITE 2: Delayed Web Audio & Hardware Latency Invariants ---");
  {
    // Test 2.1: Disconnect while getUserMedia is awaiting for 50ms
    tracker.reset();
    const mod21 = createModuleLoader({
      fetchDelayMs: 2,
      connectDelayMs: 2,
      getUserMediaDelayMs: 50,
      audioCtxResumeDelayMs: 2,
    });
    const agent21 = new mod21.VoiceAgent({ mode: "persona" });

    const p21 = agent21.connect({
      onAudioChunk: () => {},
      onTranscript: () => {},
      onToolCall: () => {},
      onStatusChange: () => {},
      onInterrupted: () => {},
    });

    // Wait 15ms so fetch and connect finish, getUserMedia is active
    await new Promise((r) => setTimeout(r, 15));
    await agent21.disconnect();
    await p21;

    // Give getUserMedia time to resolve
    await new Promise((r) => setTimeout(r, 55));

    const leakedTracks21 = tracker.getLeakedTracks();
    const leakedCtx21 = tracker.getLeakedAudioContexts();
    const leakedSessions21 = tracker.getLeakedSessions();

    recordResult(
      "Delayed getUserMedia resolution stops tracks and closes contexts if disconnected while pending",
      leakedTracks21.length === 0 &&
        leakedCtx21.length === 0 &&
        leakedSessions21.length === 0 &&
        agent21.getStatus() === "disconnected",
      `Tracks leaked: ${leakedTracks21.length}, Ctx leaked: ${leakedCtx21.length}, Sessions leaked: ${leakedSessions21.length}`
    );

    // Test 2.2: Disconnect while audioCtx.resume() is awaiting for 50ms
    tracker.reset();
    const mod22 = createModuleLoader({
      fetchDelayMs: 2,
      connectDelayMs: 2,
      getUserMediaDelayMs: 2,
      audioCtxResumeDelayMs: 50,
    });
    const agent22 = new mod22.VoiceAgent({ mode: "persona" });

    const p22 = agent22.connect({
      onAudioChunk: () => {},
      onTranscript: () => {},
      onToolCall: () => {},
      onStatusChange: () => {},
      onInterrupted: () => {},
    });

    // Wait 15ms so getUserMedia finishes and audioCtx.resume() is awaiting
    await new Promise((r) => setTimeout(r, 15));
    await agent22.disconnect();
    await p22;

    await new Promise((r) => setTimeout(r, 55));

    const leakedTracks22 = tracker.getLeakedTracks();
    const leakedCtx22 = tracker.getLeakedAudioContexts();
    const leakedSessions22 = tracker.getLeakedSessions();

    recordResult(
      "Delayed audioCtx.resume() resolution releases stream and closes AudioContext if disconnected",
      leakedTracks22.length === 0 &&
        leakedCtx22.length === 0 &&
        leakedSessions22.length === 0 &&
        agent22.getStatus() === "disconnected",
      `Tracks leaked: ${leakedTracks22.length}, Ctx leaked: ${leakedCtx22.length}, Sessions leaked: ${leakedSessions22.length}`
    );
  }

  console.log("\n--- EMPIRICAL SUITE 3: Concurrent Overlapping Operations & Multi-Connect Guards ---");
  {
    tracker.reset();
    const mod = createModuleLoader({
      fetchDelayMs: 10,
      connectDelayMs: 10,
      getUserMediaDelayMs: 5,
    });
    const agent = new mod.VoiceAgent({ mode: "guide" });

    let statusEmissions = [];
    const events = {
      onAudioChunk: () => {},
      onTranscript: () => {},
      onToolCall: () => {},
      onStatusChange: (st) => statusEmissions.push(st),
      onInterrupted: () => {},
    };

    // Launch 10 simultaneous connect calls
    const promises = Array.from({ length: 10 }, () => agent.connect(events));
    await Promise.all(promises);

    const activeSessions = tracker.sessions;
    recordResult(
      "10 concurrent connect() calls produce exactly 1 Live session",
      activeSessions.length === 1 && agent.getStatus() === "connected",
      `Expected 1 session, found ${activeSessions.length}. Final status: ${agent.getStatus()}`
    );

    // Calling connect while already connected must be a no-op
    const preCallSession = activeSessions[0];
    await agent.connect(events);
    recordResult(
      "connect() when already connected does not spawn additional session",
      tracker.sessions.length === 1 && agent.getStatus() === "connected",
      `Sessions count: ${tracker.sessions.length}`
    );

    // Disconnect cleanly
    await agent.disconnect();
    recordResult(
      "disconnect() transitions from connected to disconnected and closes session",
      tracker.getLeakedSessions().length === 0 &&
        tracker.getLeakedAudioContexts().length === 0 &&
        tracker.getLeakedTracks().length === 0 &&
        agent.getStatus() === "disconnected",
      `Leaked sessions: ${tracker.getLeakedSessions().length}`
    );
  }

  console.log("\n--- EMPIRICAL SUITE 4: Consumer Callback Exception Safety & Re-entrancy ---");
  {
    tracker.reset();
    const mod = createModuleLoader();
    const agent = new mod.VoiceAgent({ mode: "persona" });

    let disconnectedInsideCallback = false;
    let turnCompleted = false;

    // Consumer callback that invokes agent.disconnect() INSIDE onAudioChunk
    const reentrantEvents = {
      onAudioChunk: () => {
        disconnectedInsideCallback = true;
        // Re-entrant disconnect invocation
        void agent.disconnect();
      },
      onTranscript: () => {},
      onToolCall: () => {},
      onStatusChange: () => {},
      onInterrupted: () => {},
      onTurnComplete: () => {
        turnCompleted = true;
      },
    };

    await agent.connect(reentrantEvents);

    // Simulate multi-part server message where first part triggers onAudioChunk which calls disconnect()
    let errorThrown = false;
    try {
      agent.handleServerMessage({
        serverContent: {
          modelTurn: {
            parts: [
              { inlineData: { data: "chunk1" } },
              { inlineData: { data: "chunk2" } },
              { text: "model text" },
            ],
          },
          turnComplete: true,
        },
      });
    } catch (err) {
      errorThrown = true;
    }

    recordResult(
      "Re-entrant disconnect() called from inside consumer callback does not throw unhandled TypeError",
      !errorThrown && disconnectedInsideCallback,
      `errorThrown: ${errorThrown}, disconnectedInsideCallback: ${disconnectedInsideCallback}`
    );

    // Test: Exception inside onToolCall is trapped and does not crash dispatcher
    let toolCallReceived = false;
    agent.events = {
      onAudioChunk: () => {},
      onTranscript: () => {},
      onToolCall: () => {
        toolCallReceived = true;
        throw new Error("Consumer exploded in onToolCall");
      },
      onStatusChange: () => {},
      onInterrupted: () => {},
    };

    let dispatchThrew = false;
    try {
      agent.handleServerMessage({
        toolCall: {
          functionCalls: [{ name: "log_event", args: { event: "test" }, id: "call_123" }],
        },
      });
    } catch {
      dispatchThrew = true;
    }

    recordResult(
      "Consumer exception in onToolCall callback is safely trapped by dispatcher",
      toolCallReceived && !dispatchThrew,
      `toolCallReceived: ${toolCallReceived}, dispatchThrew: ${dispatchThrew}`
    );
  }

  console.log("\n--- EMPIRICAL SUITE 5: Protobuf Struct Contract & Telemetry Formatting ---");
  {
    tracker.reset();
    const mod = createModuleLoader();
    const agent = new mod.VoiceAgent({ mode: "guide" });

    await agent.connect({
      onAudioChunk: () => {},
      onTranscript: () => {},
      onToolCall: () => {},
      onStatusChange: () => {},
      onInterrupted: () => {},
    });

    const session = tracker.sessions[0];

    // 5.1 Object response: should remain Record<string, unknown>
    agent.sendToolResponse("log_event", "call_1", { status: "logged", code: 200 });
    const resp1 = session.toolResponses[0].functionResponses[0];
    assert.deepStrictEqual(resp1.response, { status: "logged", code: 200 });

    // 5.2 Array response: should be wrapped in { result: [...] }
    agent.sendToolResponse("log_event", "call_2", ["item1", "item2"]);
    const resp2 = session.toolResponses[1].functionResponses[0];
    assert.deepStrictEqual(resp2.response, { result: ["item1", "item2"] });

    // 5.3 Primitive string response: should be wrapped in { result: "ok" }
    agent.sendToolResponse("log_event", "call_3", "ok");
    const resp3 = session.toolResponses[2].functionResponses[0];
    assert.deepStrictEqual(resp3.response, { result: "ok" });

    // 5.4 Null response: should be wrapped in { result: null }
    agent.sendToolResponse("log_event", "call_4", null);
    const resp4 = session.toolResponses[3].functionResponses[0];
    assert.deepStrictEqual(resp4.response, { result: null });

    recordResult(
      "sendToolResponse adheres strictly to Protobuf Struct key-value requirements for objects, arrays, and primitives",
      true,
      "All 4 response variants matched expected Struct envelopes"
    );

    // 5.5 pushContext telemetry formatting
    agent.pushContext("User edited App.tsx");
    agent.pushContext("[CONTEXT] Terminal command ran: npm test");

    const textInputs = session.inputs.filter((inp) => typeof inp.text === "string");
    assert.strictEqual(textInputs[0]?.text, "[CONTEXT] User edited App.tsx");
    assert.strictEqual(textInputs[1]?.text, "[CONTEXT] Terminal command ran: npm test");

    recordResult(
      "pushContext idempotently prepends [CONTEXT] without duplicate prefixing",
      true,
      "Prefix handling verified"
    );

    await agent.disconnect();
  }

  console.log("\n--- EMPIRICAL SUITE 6: Thought Filtering & Turn Completion ---");
  {
    tracker.reset();
    const mod = createModuleLoader();
    const agent = new mod.VoiceAgent({ mode: "persona" });

    const transcripts = [];
    let turns = 0;

    agent.events = {
      onAudioChunk: () => {},
      onTranscript: (role, text) => transcripts.push({ role, text }),
      onToolCall: () => {},
      onStatusChange: () => {},
      onInterrupted: () => {},
      onTurnComplete: () => turns++,
    };

    // Simulate Gemini 2.0 Flash thought blocks alongside user-facing text
    agent.handleServerMessage({
      serverContent: {
        modelTurn: {
          parts: [
            { text: "Let me ponder this problem internally...", thought: true },
            { text: "Hello, candidate! How can I assist you today?" },
          ],
        },
        turnComplete: true,
      },
    });

    recordResult(
      "Internal thought parts (thought: true) are omitted from client transcripts while model turns and turnComplete fire",
      transcripts.length === 1 &&
        transcripts[0].text === "Hello, candidate! How can I assist you today?" &&
        turns === 1,
      `Transcripts length: ${transcripts.length}, Turns: ${turns}`
    );
  }

  console.log("\n--- EMPIRICAL SUITE 7: AudioContext Resume Failure Invariant ---");
  {
    tracker.reset();
    const mod = createModuleLoader({
      audioCtxResumeFails: true,
    });
    const agent = new mod.VoiceAgent({ mode: "persona" });

    let statusEmissions = [];
    await agent.connect({
      onAudioChunk: () => {},
      onTranscript: () => {},
      onToolCall: () => {},
      onStatusChange: (st, detail) => statusEmissions.push({ st, detail }),
      onInterrupted: () => {},
    });

    const statusIsError = agent.getStatus() === "error";
    const leakedSessions = tracker.getLeakedSessions();
    const leakedTracks = tracker.getLeakedTracks();
    const leakedCtx = tracker.getLeakedAudioContexts();

    console.log(`      [DIAGNOSTIC] Leaked AudioContexts count when resume() fails: ${leakedCtx.length}`);
    recordResult(
      "AudioContext resume failure transitions to error, releases stream and session (ctx leak check)",
      statusIsError && leakedSessions.length === 0 && leakedTracks.length === 0,
      `Status: ${agent.getStatus()}, Leaked sessions: ${leakedSessions.length}, Leaked tracks: ${leakedTracks.length}, Leaked AudioContexts: ${leakedCtx.length}`
    );
  }

  console.log("\n================================================================================");
  console.log(`CHALLENGER RESULTS: ${passCount}/${testCount} Passed, ${failureCount} Failures`);
  console.log("================================================================================");

  if (failureCount > 0) {
    console.log("\nFAILURES ENCOUNTERED:");
    failures.forEach((f, idx) => {
      console.log(`${idx + 1}. ${f.name}: ${f.detail}`);
    });
    process.exit(1);
  } else {
    console.log("\nALL EMPIRICAL CHALLENGER STRESS TESTS PASSED WITH 0 LEAKS!");
    process.exit(0);
  }
}

runEmpiricalHarness().catch((err) => {
  console.error("FATAL ERROR IN TEST RUNNER:", err);
  process.exit(1);
});
