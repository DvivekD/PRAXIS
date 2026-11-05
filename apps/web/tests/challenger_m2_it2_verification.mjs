import fs from "fs";
import path from "path";
import assert from "assert";
import ts from "typescript";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("================================================================================");
console.log("PRAXIS VOICE AGENT - CHALLENGER ITERATION 2 VERIFICATION SUITE");
console.log("Target: apps/web/lib/voice/geminiLive.ts");
console.log("================================================================================\n");

// Unhandled rejection tracker to guarantee no unhandled rejections escape
const unhandledRejections = [];
process.on("unhandledRejection", (reason, promise) => {
  console.error("FATAL: Caught unhandledRejection:", reason);
  unhandledRejections.push(reason);
});

// Transpile geminiLive.ts into CommonJS
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

let testCount = 0;
let passedCount = 0;

function runTest(name, fn) {
  testCount++;
  try {
    fn();
    passedCount++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  testCount++;
  try {
    await fn();
    passedCount++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

// ============================================================================
// VERIFICATION AREA 1: PROTOBUF STRUCT SERIALIZATION IN sendToolResponse
// ============================================================================
console.log("--- Area 1: Protobuf Struct Serialization in sendToolResponse ---");

{
  const mod = loadGeminiLiveModule();
  const { VoiceAgent } = mod;

  runTest("1.1 Plain Object serialization", () => {
    const agent = new VoiceAgent({ mode: "guide" });
    const calls = [];
    agent.session = { sendToolResponse: (p) => calls.push(p) };
    agent.status = "connected";

    const inputObj = { status: "success", count: 42, metadata: { role: "admin" } };
    agent.sendToolResponse("test_tool", "call_1", inputObj);

    assert.strictEqual(calls.length, 1);
    const resp = calls[0].functionResponses[0];
    assert.strictEqual(resp.id, "call_1");
    assert.strictEqual(resp.name, "test_tool");
    assert.deepStrictEqual(resp.response, inputObj);
    assert.strictEqual(typeof resp.response, "object");
    assert.strictEqual(Array.isArray(resp.response), false);
    assert.notStrictEqual(resp.response, null);
    // JSON serializability check
    assert.strictEqual(JSON.stringify(resp.response), JSON.stringify(inputObj));
  });

  runTest("1.2 Empty Object serialization", () => {
    const agent = new VoiceAgent({ mode: "guide" });
    const calls = [];
    agent.session = { sendToolResponse: (p) => calls.push(p) };
    agent.status = "connected";

    agent.sendToolResponse("test_tool", "call_empty_obj", {});
    assert.strictEqual(calls.length, 1);
    const resp = calls[0].functionResponses[0];
    assert.deepStrictEqual(resp.response, {});
    assert.strictEqual(typeof resp.response, "object");
    assert.strictEqual(Array.isArray(resp.response), false);
  });

  runTest("1.3 Array serialization (wrapping in { result: [...] })", () => {
    const agent = new VoiceAgent({ mode: "guide" });
    const calls = [];
    agent.session = { sendToolResponse: (p) => calls.push(p) };
    agent.status = "connected";

    // Array of numbers
    agent.sendToolResponse("list_numbers", "call_arr1", [1, 2, 3]);
    // Array of objects
    agent.sendToolResponse("list_items", "call_arr2", [{ a: 1 }, { b: 2 }]);
    // Empty array
    agent.sendToolResponse("empty_list", "call_arr3", []);

    assert.strictEqual(calls.length, 3);

    // Call 1
    const resp1 = calls[0].functionResponses[0];
    assert.strictEqual(typeof resp1.response, "object");
    assert.strictEqual(Array.isArray(resp1.response), false);
    assert.deepStrictEqual(resp1.response, { result: [1, 2, 3] });

    // Call 2
    const resp2 = calls[1].functionResponses[0];
    assert.strictEqual(typeof resp2.response, "object");
    assert.strictEqual(Array.isArray(resp2.response), false);
    assert.deepStrictEqual(resp2.response, { result: [{ a: 1 }, { b: 2 }] });

    // Call 3
    const resp3 = calls[2].functionResponses[0];
    assert.strictEqual(typeof resp3.response, "object");
    assert.strictEqual(Array.isArray(resp3.response), false);
    assert.deepStrictEqual(resp3.response, { result: [] });
  });

  runTest("1.4 String serialization (wrapping in { result: string })", () => {
    const agent = new VoiceAgent({ mode: "persona" });
    const calls = [];
    agent.session = { sendToolResponse: (p) => calls.push(p) };
    agent.status = "connected";

    agent.sendToolResponse("str_tool", "call_str1", "Operation successful");
    agent.sendToolResponse("empty_str", "call_str2", "");

    assert.strictEqual(calls.length, 2);
    assert.deepStrictEqual(calls[0].functionResponses[0].response, { result: "Operation successful" });
    assert.deepStrictEqual(calls[1].functionResponses[0].response, { result: "" });
    assert.strictEqual(typeof calls[0].functionResponses[0].response, "object");
    assert.strictEqual(Array.isArray(calls[0].functionResponses[0].response), false);
  });

  runTest("1.5 Number serialization (positive, zero, negative, float)", () => {
    const agent = new VoiceAgent({ mode: "persona" });
    const calls = [];
    agent.session = { sendToolResponse: (p) => calls.push(p) };
    agent.status = "connected";

    agent.sendToolResponse("num_pos", "c1", 100);
    agent.sendToolResponse("num_zero", "c2", 0);
    agent.sendToolResponse("num_neg", "c3", -42.5);

    assert.strictEqual(calls.length, 3);
    assert.deepStrictEqual(calls[0].functionResponses[0].response, { result: 100 });
    assert.deepStrictEqual(calls[1].functionResponses[0].response, { result: 0 });
    assert.deepStrictEqual(calls[2].functionResponses[0].response, { result: -42.5 });
  });

  runTest("1.6 Null and undefined serialization", () => {
    const agent = new VoiceAgent({ mode: "persona" });
    const calls = [];
    agent.session = { sendToolResponse: (p) => calls.push(p) };
    agent.status = "connected";

    agent.sendToolResponse("null_tool", "c1", null);
    agent.sendToolResponse("undef_tool", "c2", undefined);

    assert.strictEqual(calls.length, 2);
    assert.deepStrictEqual(calls[0].functionResponses[0].response, { result: null });
    assert.deepStrictEqual(calls[1].functionResponses[0].response, { result: undefined });
    assert.strictEqual(typeof calls[0].functionResponses[0].response, "object");
    assert.notStrictEqual(calls[0].functionResponses[0].response, null);
  });

  runTest("1.7 Boolean serialization (true and false)", () => {
    const agent = new VoiceAgent({ mode: "guide" });
    const calls = [];
    agent.session = { sendToolResponse: (p) => calls.push(p) };
    agent.status = "connected";

    agent.sendToolResponse("bool_true", "c1", true);
    agent.sendToolResponse("bool_false", "c2", false);

    assert.strictEqual(calls.length, 2);
    assert.deepStrictEqual(calls[0].functionResponses[0].response, { result: true });
    assert.deepStrictEqual(calls[1].functionResponses[0].response, { result: false });
  });
}

// ============================================================================
// VERIFICATION AREA 2: IN-FLIGHT ABORT DURING TOKEN FETCH & HANDSHAKE
// ============================================================================
console.log("\n--- Area 2: In-Flight Abort During Token Fetch & Handshake ---");

await runAsyncTest("2.1 Abort during token fetch: getStatus() stays 'disconnected', no errors rethrown", async () => {
  let fetchAborted = false;
  const mockFetch = async (url, opts) => {
    return new Promise((resolve, reject) => {
      opts.signal.addEventListener("abort", () => {
        fetchAborted = true;
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        reject(err);
      });
      // 200ms delay to allow disconnect() to fire
      setTimeout(() => {
        resolve({
          ok: true,
          json: async () => ({ token: "auth_tokens/test", config: {} }),
        });
      }, 200);
    });
  };

  const mod = loadGeminiLiveModule({
    window: {},
    navigator: {},
    fetch: mockFetch,
  });
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "persona" });
  const statusEvents = [];

  const connectPromise = agent.connect({
    onAudioChunk: () => {},
    onTranscript: () => {},
    onToolCall: () => {},
    onStatusChange: (status) => statusEvents.push(status),
    onInterrupted: () => {},
  });

  assert.strictEqual(agent.getStatus(), "connecting");

  // Call disconnect while fetch is running
  await agent.disconnect();

  // connectPromise must resolve without throwing
  await assert.doesNotReject(async () => {
    await connectPromise;
  });

  assert.strictEqual(fetchAborted, true);
  assert.strictEqual(agent.getStatus(), "disconnected");
  assert.strictEqual(agent.isConnected(), false);
  assert.ok(statusEvents.includes("connecting"));
  assert.strictEqual(statusEvents[statusEvents.length - 1], "disconnected");
  assert.strictEqual(statusEvents.includes("error"), false, "Status 'error' must NOT be emitted on clean abort");
});

await runAsyncTest("2.2 Abort during ai.live.connect handshake: clean session close, no zombie connection", async () => {
  let sessionClosed = false;
  let handshakeStarted = false;
  let connectPromiseResolving = false;

  class MockGoogleGenAI {
    constructor(opts) {
      this.opts = opts;
      this.live = {
        connect: async () => {
          handshakeStarted = true;
          return new Promise((resolve) => {
            setTimeout(() => {
              connectPromiseResolving = true;
              resolve({
                sendRealtimeInput: () => {},
                sendToolResponse: () => {},
                close: () => {
                  sessionClosed = true;
                },
              });
            }, 50);
          });
        },
      };
    }
  }

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ token: "auth_tokens/test_tok", config: {} }),
  });

  const mod = loadGeminiLiveModule(
    {
      window: {},
      navigator: {},
      fetch: mockFetch,
    },
    MockGoogleGenAI
  );
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "guide" });
  const statusEvents = [];

  const connectPromise = agent.connect({
    onAudioChunk: () => {},
    onTranscript: () => {},
    onToolCall: () => {},
    onStatusChange: (status) => statusEvents.push(status),
    onInterrupted: () => {},
  });

  // Wait until handshake has started
  await new Promise((r) => setTimeout(r, 10));
  assert.strictEqual(handshakeStarted, true);

  // Disconnect while handshake is in-flight
  await agent.disconnect();

  assert.strictEqual(agent.getStatus(), "disconnected");

  // Await the connect() completion
  await assert.doesNotReject(async () => {
    await connectPromise;
  });

  // Verify post-handshake guard closed the incoming session
  assert.strictEqual(sessionClosed, true, "Zombie WebSocket session must be closed immediately");
  assert.strictEqual(agent.getStatus(), "disconnected");
  assert.strictEqual(agent.isConnected(), false);
  assert.strictEqual(statusEvents[statusEvents.length - 1], "disconnected");
  assert.strictEqual(statusEvents.includes("error"), false);
});

await runAsyncTest("2.3 Abort during microphone permission prompt: media stream stopped immediately", async () => {
  let tracksStopped = false;
  let userMediaStarted = false;
  let resolveUserMedia = null;

  const mockStream = {
    getTracks: () => [
      {
        stop: () => {
          tracksStopped = true;
        },
      },
    ],
  };

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ token: "auth_tokens/valid", config: {} }),
  });

  let sessionClosed = false;
  class MockGoogleGenAI {
    constructor() {
      this.live = {
        connect: async () => ({
          sendRealtimeInput: () => {},
          sendToolResponse: () => {},
          close: () => {
            sessionClosed = true;
          },
        }),
      };
    }
  }

  const globals = {
    window: {
      AudioContext: class {
        constructor() {
          this.state = "running";
        }
        createMediaStreamSource() {
          return { connect: () => {} };
        }
        createScriptProcessor() {
          return { connect: () => {}, disconnect: () => {} };
        }
        createGain() {
          return { gain: { value: 1 }, connect: () => {} };
        }
        close() {}
      },
    },
    navigator: {
      mediaDevices: {
        getUserMedia: async () => {
          userMediaStarted = true;
          return new Promise((r) => {
            resolveUserMedia = () => r(mockStream);
          });
        },
      },
    },
    fetch: mockFetch,
  };

  const mod = loadGeminiLiveModule(globals, MockGoogleGenAI);
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "persona" });
  const connectPromise = agent.connect({
    onAudioChunk: () => {},
    onTranscript: () => {},
    onToolCall: () => {},
    onStatusChange: () => {},
    onInterrupted: () => {},
  });

  // Wait until getUserMedia is pending
  while (!userMediaStarted) {
    await new Promise((r) => setTimeout(r, 5));
  }

  // User clicks disconnect while prompt is visible
  await agent.disconnect();
  assert.strictEqual(agent.getStatus(), "disconnected");

  // User subsequently grants permission in browser prompt
  resolveUserMedia();

  await assert.doesNotReject(async () => {
    await connectPromise;
  });

  assert.strictEqual(tracksStopped, true, "MediaStream tracks must be stopped after delayed grant");
  assert.strictEqual(sessionClosed, true, "Session must be closed");
  assert.strictEqual(agent.getStatus(), "disconnected");
});

await runAsyncTest("2.4 Flurry of rapid alternating connect() / disconnect() calls", async () => {
  const mod = loadGeminiLiveModule({
    window: {},
    navigator: {},
    fetch: async () => ({
      ok: true,
      json: async () => ({ token: "auth_tokens/rapid", config: {} }),
    }),
  });
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "persona" });
  const dummyEvents = {
    onAudioChunk: () => {},
    onTranscript: () => {},
    onToolCall: () => {},
    onStatusChange: () => {},
    onInterrupted: () => {},
  };

  // Launch 10 rapid alternating cycles
  for (let i = 0; i < 10; i++) {
    const p = agent.connect(dummyEvents);
    await agent.disconnect();
    await p;
  }

  assert.strictEqual(agent.getStatus(), "disconnected");
  assert.strictEqual(agent.isConnected(), false);
});

// ============================================================================
// VERIFICATION AREA 3: ERROR BOUNDARY & UNHANDLED REJECTIONS CHECK
// ============================================================================
console.log("\n--- Area 3: Resilience, Error Boundaries & Unhandled Rejections ---");

await runAsyncTest("3.1 HTTP 500 session fetch error sets status 'error' and emits event", async () => {
  const mod = loadGeminiLiveModule({
    window: {},
    navigator: {},
    fetch: async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ error: "Database unreachable" }),
    }),
  });
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "persona" });
  let errorDetail = "";
  const events = {
    onAudioChunk: () => {},
    onTranscript: () => {},
    onToolCall: () => {},
    onStatusChange: (status, detail) => {
      if (status === "error") errorDetail = detail;
    },
    onInterrupted: () => {},
  };

  await assert.rejects(async () => {
    await agent.connect(events);
  }, /Database unreachable/);

  assert.strictEqual(agent.getStatus(), "error");
  assert.strictEqual(errorDetail, "Database unreachable");
});

await runAsyncTest("3.2 Missing token in session response", async () => {
  const mod = loadGeminiLiveModule({
    window: {},
    navigator: {},
    fetch: async () => ({
      ok: true,
      json: async () => ({ config: {} }), // token is missing
    }),
  });
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "persona" });
  await assert.rejects(async () => {
    await agent.connect({
      onAudioChunk: () => {},
      onTranscript: () => {},
      onToolCall: () => {},
      onStatusChange: () => {},
      onInterrupted: () => {},
    });
  }, /ephemeral token missing/);

  assert.strictEqual(agent.getStatus(), "error");
});

await runAsyncTest("3.3 WebSocket onerror callback dispatches onStatusChange('error')", async () => {
  let onerrorCallback = null;
  class MockGoogleGenAI {
    constructor() {
      this.live = {
        connect: async ({ callbacks }) => {
          onerrorCallback = callbacks.onerror;
          return {
            sendRealtimeInput: () => {},
            sendToolResponse: () => {},
            close: () => {},
          };
        },
      };
    }
  }

  const mod = loadGeminiLiveModule(
    {
      window: {},
      navigator: {},
      fetch: async () => ({
        ok: true,
        json: async () => ({ token: "auth_tokens/ws", config: {} }),
      }),
    },
    MockGoogleGenAI
  );
  const { VoiceAgent } = mod;

  const agent = new VoiceAgent({ mode: "guide" });
  let errorFired = false;
  let errorMsg = "";

  await agent.connect({
    onAudioChunk: () => {},
    onTranscript: () => {},
    onToolCall: () => {},
    onStatusChange: (status, detail) => {
      if (status === "error") {
        errorFired = true;
        errorMsg = detail;
      }
    },
    onInterrupted: () => {},
  });

  assert.ok(onerrorCallback, "onerror callback must be registered");
  onerrorCallback({ message: "WebSocket connection dropped by network" });

  assert.strictEqual(errorFired, true);
  assert.strictEqual(errorMsg, "WebSocket connection dropped by network");
});

await runAsyncTest("3.4 Unhandled rejections check: zero unhandled rejections across all tests", async () => {
  // Give Node event loop a tick to ensure no late-firing unhandled rejections
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(
    unhandledRejections.length,
    0,
    `Expected 0 unhandled rejections, but found ${unhandledRejections.length}`
  );
});

console.log("\n================================================================================");
console.log(`CHALLENGER ITERATION 2 RESULTS: ${passedCount}/${testCount} TESTS PASSED!`);
console.log("Zero unhandled rejections escaped.");
console.log("================================================================================\n");
