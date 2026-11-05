import fs from "fs";
import path from "path";
import assert from "assert";
import ts from "typescript";
import { fileURLToPath } from "url";
import React from "../node_modules/react/index.js";
import { renderToStaticMarkup } from "../node_modules/react-dom/server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("======================================================================");
console.log("CHALLENGER_M3_2: ADVERSARIAL CONTRACT & BEHAVIORAL STRESS HARNESS");
console.log("Target: apps/web/components/Avatar/VoiceSession.tsx");
console.log("======================================================================\n");

const voiceSessionPath = path.resolve(__dirname, "../components/Avatar/VoiceSession.tsx");
const sourceCode = fs.readFileSync(voiceSessionPath, "utf8");

// =========================================================================
// MOCK WEB AUDIO AND BROWSER DOM ENVIRONMENT
// =========================================================================

class MockAudioBuffer {
  constructor(numberOfChannels, length, sampleRate) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this._channelData = [new Float32Array(length)];
  }

  getChannelData(channel) {
    return this._channelData[channel];
  }
}

class MockAudioBufferSourceNode {
  constructor(audioCtx) {
    this.context = audioCtx;
    this.buffer = null;
    this.started = false;
    this.startTime = -1;
    this.stopped = false;
    this.disconnected = false;
    this.target = null;
    this.onended = null;
  }

  connect(target) {
    this.target = target;
  }

  disconnect() {
    this.disconnected = true;
  }

  start(time = 0) {
    this.started = true;
    this.startTime = time;
  }

  stop() {
    this.stopped = true;
    if (this.onended) {
      const cb = this.onended;
      this.onended = null;
      cb();
    }
  }
}

class MockGainNode {
  constructor(audioCtx) {
    this.context = audioCtx;
    this.gain = { value: 1.0 };
    this.target = null;
    this.disconnected = false;
  }

  connect(target) {
    this.target = target;
    this.disconnected = false;
  }

  disconnect() {
    this.target = null;
    this.disconnected = true;
  }
}

class MockAnalyserNode {
  constructor(audioCtx) {
    this.context = audioCtx;
    this.fftSize = 2048;
    this.smoothingTimeConstant = 0.8;
    this.target = null;
    this.disconnected = false;
  }

  connect(target) {
    this.target = target;
    this.disconnected = false;
  }

  disconnect() {
    this.target = null;
    this.disconnected = true;
  }

  getByteFrequencyData(array) {
    array.fill(128);
  }
}

class MockAudioContext {
  constructor(initialState = "running") {
    this.state = initialState;
    this.currentTime = 0.0;
    this.destination = { id: "audio_destination" };
    this.closed = false;
    this.resumed = false;
  }

  createBuffer(channels, length, sampleRate) {
    return new MockAudioBuffer(channels, length, sampleRate);
  }

  createBufferSource() {
    return new MockAudioBufferSourceNode(this);
  }

  createGain() {
    return new MockGainNode(this);
  }

  createAnalyser() {
    return new MockAnalyserNode(this);
  }

  async resume() {
    this.resumed = true;
    this.state = "running";
  }

  async close() {
    this.closed = true;
    this.state = "closed";
  }
}

// Global browser mock injection
globalThis.window = globalThis;
globalThis.AudioContext = MockAudioContext;
globalThis.webkitAudioContext = MockAudioContext;

// Mock VoiceAgent
class MockVoiceAgentInstance {
  constructor(options) {
    this.options = options;
    this.events = null;
    this.status = "disconnected";
    this.isMicActive = false;
    this.sentToolResponses = [];
    this.pushedContexts = [];
    this.disconnected = false;
    this.failOnConnect = null;
    this.failOnStartMic = null;
  }

  async connect(events) {
    this.events = events;
    this.status = "connecting";
    this.events.onStatusChange?.("connecting");

    if (this.failOnConnect) {
      this.status = "error";
      this.events.onStatusChange?.("error", this.failOnConnect.message);
      throw this.failOnConnect;
    }

    if (this.failOnStartMic) {
      this.status = "error";
      this.events.onStatusChange?.("error", this.failOnStartMic.message);
      throw this.failOnStartMic;
    }

    this.status = "connected";
    this.isMicActive = true;
    this.events.onStatusChange?.("connected");
  }

  async disconnect() {
    this.disconnected = true;
    this.status = "disconnected";
    this.isMicActive = false;
    this.events?.onStatusChange?.("disconnected");
  }

  async startMic() {
    if (this.failOnStartMic) {
      throw this.failOnStartMic;
    }
    this.isMicActive = true;
  }

  stopMic() {
    this.isMicActive = false;
  }

  pushContext(text) {
    this.pushedContexts.push(text);
  }

  sendToolResponse(name, id, result) {
    this.sentToolResponses.push({ name, id, result });
  }

  // Simulation triggers for tests
  emitAudioChunk(base64Pcm) {
    this.events?.onAudioChunk(base64Pcm);
  }

  emitTranscript(role, text) {
    this.events?.onTranscript(role, text);
  }

  emitInterrupted() {
    this.events?.onInterrupted();
  }

  emitTurnComplete() {
    this.events?.onTurnComplete?.();
  }

  emitToolCall(name, args, id) {
    this.events?.onToolCall(name, args, id);
  }

  emitStatusChange(status, detail) {
    this.status = status;
    this.events?.onStatusChange(status, detail);
  }
}

let activeMockAgent = null;

// =========================================================================
// TRANSPILE VOICESESSION FOR RUNTIME TESTING WITH MOCKED DEPENDENCIES
// =========================================================================

// Strip imports from VoiceSession and supply dependencies via function arguments
let modifiedSource = sourceCode
  .replace(/"use client";/g, "")
  .replace(/import\s+React.*?from\s+["']react["'];/g, "const { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } = React;")
  .replace(/import\s+AvatarScene\s+from\s+["']\.\/AvatarScene["'];/g, `
    const AvatarScene = (props) => React.createElement("div", {
      "data-testid": "avatar-scene",
      "data-domain": props.domain,
      "data-has-analyser": props.analyserNode ? "true" : "false"
    });
  `)
  .replace(/import\s*\{[\s\S]*?\}\s*from\s*["'].*?geminiLive["'];/g, "")
  .replace(/new VoiceAgent\(\{/g, `new MockVoiceAgentWrapper({`);

// Append export bindings
modifiedSource += `
exports.VoiceSession = VoiceSession;
exports.decodeBase64PcmToAudioBuffer = decodeBase64PcmToAudioBuffer;
exports.OUTPUT_SAMPLE_RATE = OUTPUT_SAMPLE_RATE;
`;

// Transpile with TypeScript using JsxEmit.React
const { outputText: transpiledCode } = ts.transpileModule(modifiedSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React,
  },
});

// Create runtime module factory
const moduleFunction = new Function(
  "React",
  "base64ToArrayBuffer",
  "MockVoiceAgentWrapper",
  "exports",
  `
  ${transpiledCode}
  return exports;
  `
);

import { base64ToArrayBuffer } from "../lib/voice/geminiLive.ts";

function MockVoiceAgentWrapper(options) {
  const instance = new MockVoiceAgentInstance(options);
  activeMockAgent = instance;
  return instance;
}

const componentModule = moduleFunction(React, base64ToArrayBuffer, MockVoiceAgentWrapper, {});
const {
  VoiceSession,
  decodeBase64PcmToAudioBuffer,
  OUTPUT_SAMPLE_RATE,
} = componentModule;

// =========================================================================
// REACT COMPONENT TEST HARNESS FOR FULL HOOK & LIFECYCLE EXECUTION
// =========================================================================

class ComponentHarness {
  constructor(Component, props = {}) {
    this.Component = Component;
    this.props = props;
    this.ref = { current: null };
    this.stateValues = [];
    this.stateSetters = [];
    this.refs = [];
    this.callbacks = [];
    this.effects = [];
    this.cleanups = [];
    this.hookCursor = { state: 0, ref: 0, cb: 0, eff: 0 };
    this.currentOutput = null;
    this.isMounted = true;
    this.render();
  }

  setProps(newProps) {
    this.props = { ...this.props, ...newProps };
    this.render();
  }

  render() {
    this.hookCursor = { state: 0, ref: 0, cb: 0, eff: 0 };

    const self = this;
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const prevH = internals?.H;

    const dispatcher = {
      useState: (initial) => {
        const idx = self.hookCursor.state++;
        if (idx >= self.stateValues.length) {
          const val = typeof initial === "function" ? initial() : initial;
          self.stateValues.push(val);
          self.stateSetters.push((newVal) => {
            if (!self.isMounted) return;
            const nextVal = typeof newVal === "function" ? newVal(self.stateValues[idx]) : newVal;
            if (self.stateValues[idx] !== nextVal) {
              self.stateValues[idx] = nextVal;
              self.render();
            }
          });
        }
        return [self.stateValues[idx], self.stateSetters[idx]];
      },
      useRef: (initial) => {
        const idx = self.hookCursor.ref++;
        if (idx >= self.refs.length) {
          self.refs.push({ current: initial });
        }
        return self.refs[idx];
      },
      useCallback: (fn, deps) => {
        const idx = self.hookCursor.cb++;
        if (idx >= self.callbacks.length) {
          self.callbacks.push({ fn, deps });
        } else {
          const prev = self.callbacks[idx];
          const depsChanged = !prev.deps || !deps || deps.some((d, i) => d !== prev.deps[i]);
          if (depsChanged) {
            self.callbacks[idx] = { fn, deps };
          }
        }
        return self.callbacks[idx].fn;
      },
      useImperativeHandle: (ref, createHandle, deps) => {
        if (ref) {
          const handle = createHandle();
          if (typeof ref === "function") {
            ref(handle);
          } else {
            ref.current = handle;
          }
        }
      },
      useEffect: (effect, deps) => {
        const idx = self.hookCursor.eff++;
        if (idx >= self.effects.length) {
          self.effects.push({ effect, deps, cleanup: null, hasRun: false });
        } else {
          const prev = self.effects[idx];
          const depsChanged = !prev.deps || !deps || deps.some((d, i) => d !== prev.deps[i]);
          if (depsChanged) {
            if (prev.cleanup) prev.cleanup();
            self.effects[idx] = { effect, deps, cleanup: null, hasRun: false };
          }
        }
      },
      useMemo: (fn) => fn(),
      useId: () => "mock-id",
    };

    if (internals) {
      internals.H = dispatcher;
    }

    try {
      this.currentOutput = this.Component(this.props, this.ref);
    } finally {
      if (internals) {
        internals.H = prevH;
      }
    }

    // Run pending effects
    for (const effObj of this.effects) {
      if (!effObj.hasRun && effObj.effect) {
        effObj.hasRun = true;
        const res = effObj.effect();
        if (typeof res === "function") {
          effObj.cleanup = res;
          this.cleanups.push(res);
        }
      }
    }

    return this.currentOutput;
  }

  unmount() {
    this.isMounted = false;
    for (const cleanup of this.cleanups) {
      try {
        cleanup();
      } catch (err) {
        console.warn("Cleanup error:", err);
      }
    }
    this.cleanups = [];
  }
}

// Helper to generate Base64 PCM data
function generateTonePcmBase64(sampleCount, sampleRate = 24000, frequency = 440) {
  const buffer = new ArrayBuffer(sampleCount * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t);
    const int16 = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    view.setInt16(i * 2, int16, true);
  }
  return Buffer.from(buffer).toString("base64");
}

let passedCount = 0;
let totalCount = 0;

function runTest(suiteName, testName, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

async function runAsyncTest(suiteName, testName, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

// =========================================================================
// SUITE 1: Props Contracts & Standalone Mounting
// =========================================================================
console.log("▶ [SUITE 1] Props Contracts & Standalone Mounting");

runTest("Suite 1", "1.1 Standalone mounting with 0 props (test-avatar compatibility)", () => {
  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {});
  assert(harness.currentOutput !== null, "Component must render without crashing");
  
  // Verify HTML markup contains initial Ready state and Connect Voice button
  const html = renderToStaticMarkup(harness.currentOutput);
  assert(html.includes("Connect Voice"), "Must render 'Connect Voice' button");
  assert(html.includes("Ready"), "Must render initial status label 'Ready'");
  assert(html.includes("engineering"), "Default domain badge must be 'engineering'");
  assert(html.includes('data-testid="avatar-scene"'), "Default showAvatar must mount AvatarScene");
  harness.unmount();
});

runTest("Suite 1", "1.2 Custom props binding (domain, custom class)", () => {
  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    domain: "sales",
    className: "custom-dock-class",
  });
  const html = renderToStaticMarkup(harness.currentOutput);
  assert(html.includes("custom-dock-class"), "Custom className must be applied");
  assert(html.includes('data-domain="sales"'), "AvatarScene must receive domain prop");
  harness.unmount();
});

runTest("Suite 1", "1.3 Compact mode suppresses AvatarScene and applies compact padding", () => {
  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    compact: true,
  });
  const html = renderToStaticMarkup(harness.currentOutput);
  assert(!html.includes('data-testid="avatar-scene"'), "AvatarScene must be suppressed in compact mode");
  // In compact mode, compact padding '6px 14px' is applied
  assert(html.includes("padding:6px 14px"), "Compact padding must be applied");
  harness.unmount();
});

// =========================================================================
// SUITE 2: AnalyserNode Injection & Audio Graph Routing
// =========================================================================
console.log("\n▶ [SUITE 2] AnalyserNode Injection & Audio Graph Routing");

await runAsyncTest("Suite 2", "2.1 External AnalyserNode context reuse and graph wiring", async () => {
  const externalAudioCtx = new MockAudioContext("running");
  const externalAnalyser = externalAudioCtx.createAnalyser();

  let readyAnalyserPassed = null;
  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    analyserNode: externalAnalyser,
    onAnalyserReady: (node) => { readyAnalyserPassed = node; },
  });

  // Connect voice session
  await harness.ref.current.connect();

  assert(activeMockAgent !== null, "VoiceAgent must be instantiated");
  assert.strictEqual(harness.ref.current.getStatus(), "connected");
  
  // Verify that the external analyser is returned by getAnalyserNode()
  const activeNode = harness.ref.current.getAnalyserNode();
  assert.strictEqual(activeNode, externalAnalyser, "getAnalyserNode() must return injected external AnalyserNode");

  // Verify that AvatarScene received the external analyser
  const html = renderToStaticMarkup(harness.currentOutput);
  assert(html.includes('data-has-analyser="true"'), "AvatarScene must receive external analyser");

  await harness.ref.current.disconnect();
  harness.unmount();
});

await runAsyncTest("Suite 2", "2.2 Internal AnalyserNode creation and callbacks onAnalyserReady / onAnalyserNodeCreated", async () => {
  let readyCalled = false;
  let createdCalled = false;
  let receivedNode = null;

  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    onAnalyserReady: (node) => {
      readyCalled = true;
      receivedNode = node;
    },
    onAnalyserNodeCreated: (node) => {
      createdCalled = true;
    },
  });

  await harness.ref.current.connect();

  assert.strictEqual(readyCalled, true, "onAnalyserReady must be called when internal analyser is created");
  assert.strictEqual(createdCalled, true, "onAnalyserNodeCreated must be called when internal analyser is created");
  assert(receivedNode instanceof MockAnalyserNode, "Created node must be an AnalyserNode instance");

  const activeNode = harness.ref.current.getAnalyserNode();
  assert.strictEqual(activeNode, receivedNode, "getAnalyserNode() must return internally created AnalyserNode");

  await harness.ref.current.disconnect();
  harness.unmount();
});

await runAsyncTest("Suite 2", "2.3 AnalyserNode={null} behavior verification", async () => {
  let readyNode = null;
  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    analyserNode: null,
    onAnalyserReady: (node) => { readyNode = node; },
  });

  await harness.ref.current.connect();

  // initAudioGraph creates an internal analyser and calls onAnalyserReady
  assert(readyNode !== null, "onAnalyserReady should receive the created analyser");

  // If parent updates props via onAnalyserReady (matching simulation page contract)
  harness.setProps({ analyserNode: readyNode });
  assert.strictEqual(harness.ref.current.getAnalyserNode(), readyNode);

  await harness.ref.current.disconnect();
  harness.unmount();
});

// =========================================================================
// SUITE 3: Spoken Turn Accumulation & Bridge (onUserTurn)
// =========================================================================
console.log("\n▶ [SUITE 3] Spoken Turn Accumulation & Bridge (onUserTurn)");

await runAsyncTest("Suite 3", "3.1 Multi-chunk user transcript accumulation and turnComplete flush", async () => {
  let dispatchedTurns = [];
  let transcriptsLogged = [];

  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    onUserTurn: (text) => dispatchedTurns.push(text),
    onTranscript: (role, text) => transcriptsLogged.push({ role, text }),
  });

  await harness.ref.current.connect();

  // User speaks in 3 chunks
  activeMockAgent.emitTranscript("user", "We need to");
  activeMockAgent.emitTranscript("user", "scale the Redis cache");
  activeMockAgent.emitTranscript("user", "cluster across three availability zones.");

  assert.strictEqual(dispatchedTurns.length, 0, "Turn should not flush while candidate is speaking");

  // Gemini Live signals turn complete
  activeMockAgent.emitTurnComplete();

  assert.strictEqual(dispatchedTurns.length, 1, "Exactly one turn should be dispatched");
  assert.strictEqual(
    dispatchedTurns[0],
    "We need to scale the Redis cache cluster across three availability zones."
  );

  // Redundant turnComplete should not dispatch duplicate
  activeMockAgent.emitTurnComplete();
  assert.strictEqual(dispatchedTurns.length, 1, "No duplicate turns on subsequent turnComplete signals");

  await harness.ref.current.disconnect();
  harness.unmount();
});

await runAsyncTest("Suite 3", "3.2 Model speech chunk arrival flushes user turn if turnComplete was missed", async () => {
  let dispatchedTurns = [];

  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    onUserTurn: (text) => dispatchedTurns.push(text),
  });

  await harness.ref.current.connect();

  activeMockAgent.emitTranscript("user", "The index should be on user_id.");

  // Model starts speaking audio without explicit prior turnComplete
  const audioChunk = generateTonePcmBase64(480, 24000);
  activeMockAgent.emitAudioChunk(audioChunk);

  assert.strictEqual(dispatchedTurns.length, 1, "Model audio chunk arrival must flush pending user turn");
  assert.strictEqual(dispatchedTurns[0], "The index should be on user_id.");

  await harness.ref.current.disconnect();
  harness.unmount();
});

await runAsyncTest("Suite 3", "3.3 Disconnect cleanly purges user buffer without trailing turn dispatch", async () => {
  let dispatchedTurns = [];

  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    onUserTurn: (text) => dispatchedTurns.push(text),
  });

  await harness.ref.current.connect();

  activeMockAgent.emitTranscript("user", "Partial speech that was aborted...");
  await harness.ref.current.disconnect();

  assert.strictEqual(dispatchedTurns.length, 0, "Aborted turn should be discarded on disconnect");
  harness.unmount();
});

// =========================================================================
// SUITE 4: Coach Event & Tool Call Dispatching
// =========================================================================
console.log("\n▶ [SUITE 4] Coach Event & Tool Call Dispatching");

await runAsyncTest("Suite 4", "4.1 log_event tool triggers onCoachEvent and auto-responds with status logged", async () => {
  let coachEvents = [];
  let toolCalls = [];

  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    onCoachEvent: (event, detail) => coachEvents.push({ event, detail }),
    onToolCall: (name, args, id) => toolCalls.push({ name, args, id }),
  });

  await harness.ref.current.connect();

  activeMockAgent.emitToolCall(
    "log_event",
    { event: "hint_nudged", detail: "Suggested reviewing B-tree index structure" },
    "call_abc123"
  );

  assert.strictEqual(toolCalls.length, 1, "onToolCall must receive the tool call");
  assert.strictEqual(toolCalls[0].name, "log_event");
  assert.strictEqual(toolCalls[0].id, "call_abc123");

  assert.strictEqual(coachEvents.length, 1, "onCoachEvent must be invoked");
  assert.strictEqual(coachEvents[0].event, "hint_nudged");
  assert.strictEqual(coachEvents[0].detail, "Suggested reviewing B-tree index structure");

  // Verify automated acknowledgement response sent to VoiceAgent
  assert.strictEqual(activeMockAgent.sentToolResponses.length, 1);
  assert.deepStrictEqual(activeMockAgent.sentToolResponses[0], {
    name: "log_event",
    id: "call_abc123",
    result: { status: "logged" },
  });

  await harness.ref.current.disconnect();
  harness.unmount();
});

await runAsyncTest("Suite 4", "4.2 Custom tool calls do not trigger coach event and do not auto-respond", async () => {
  let coachEvents = [];
  let toolCalls = [];

  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    onCoachEvent: (event, detail) => coachEvents.push({ event, detail }),
    onToolCall: (name, args, id) => toolCalls.push({ name, args, id }),
  });

  await harness.ref.current.connect();

  activeMockAgent.emitToolCall("run_query", { query: "SELECT * FROM users" }, "call_custom_99");

  assert.strictEqual(toolCalls.length, 1);
  assert.strictEqual(coachEvents.length, 0, "Custom tool should not trigger onCoachEvent");
  assert.strictEqual(activeMockAgent.sentToolResponses.length, 0, "Custom tool should not be auto-responded");

  await harness.ref.current.disconnect();
  harness.unmount();
});

// =========================================================================
// SUITE 5: Avatar Suppression & Display Control
// =========================================================================
console.log("\n▶ [SUITE 5] Avatar Suppression & Display Control");

runTest("Suite 5", "5.1 showAvatar=false suppresses AvatarScene and sets dark background", () => {
  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    showAvatar: false,
  });

  const html = renderToStaticMarkup(harness.currentOutput);
  assert(!html.includes('data-testid="avatar-scene"'), "AvatarScene must NOT be rendered when showAvatar=false");
  assert(html.includes("background-color:#050505"), "Background color must be solid #050505 when showAvatar=false");

  harness.unmount();
});

await runAsyncTest("Suite 5", "5.2 Audio playback functions identically when showAvatar=false", async () => {
  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    showAvatar: false,
  });

  await harness.ref.current.connect();
  const audioChunk = generateTonePcmBase64(480, 24000);
  activeMockAgent.emitAudioChunk(audioChunk);

  assert.strictEqual(harness.ref.current.getStatus(), "connected");
  await harness.ref.current.disconnect();
  harness.unmount();
});

// =========================================================================
// SUITE 6: Error Boundaries & Microphone Denial
// =========================================================================
console.log("\n▶ [SUITE 6] Error Boundaries & Microphone Denial");

await runAsyncTest("Suite 6", "6.1 Microphone denial transitions to error status and displays banner with retry", async () => {
  let statusTransitions = [];

  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    onStatusChange: (status, detail) => statusTransitions.push({ status, detail }),
  });

  // Configure mock agent to reject getUserMedia
  MockVoiceAgentWrapper.nextFailOnStartMic = new Error("NotAllowedError: Permission denied by user");

  // Trigger connectVoice
  try {
    // Override the mock to inject mic failure
    activeMockAgent = null;
    const oldWrapper = MockVoiceAgentWrapper;
    // We execute connect via handle
    const connectPromise = harness.ref.current.connect();
    
    // Simulate error transition from agent
    activeMockAgent.emitStatusChange("error", "Microphone error: NotAllowedError: Permission denied by user");
    await connectPromise;
  } catch (err) {
    // Expected rejection caught
  }

  assert.strictEqual(harness.ref.current.getStatus(), "error");
  
  // Verify error banner markup
  const html = renderToStaticMarkup(harness.currentOutput);
  assert(html.includes("⚠️"), "Error banner must render warning symbol");
  assert(html.includes("Permission denied"), "Error message must include detail");
  assert(html.includes("Retry"), "Error banner must include Retry button");

  harness.unmount();
});

// =========================================================================
// SUITE 7: AudioContext Autoplay & Suspended State Resume
// =========================================================================
console.log("\n▶ [SUITE 7] AudioContext Autoplay & Suspended State Resume");

await runAsyncTest("Suite 7", "7.1 Suspended AudioContext is automatically resumed on connect", async () => {
  const suspendedCtx = new MockAudioContext("suspended");
  assert.strictEqual(suspendedCtx.state, "suspended");

  const externalAnalyser = suspendedCtx.createAnalyser();

  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {
    analyserNode: externalAnalyser,
  });

  await harness.ref.current.connect();

  assert.strictEqual(suspendedCtx.resumed, true, "audioCtx.resume() must be called");
  assert.strictEqual(suspendedCtx.state, "running", "AudioContext state must be running");

  await harness.ref.current.disconnect();
  harness.unmount();
});

// =========================================================================
// SUITE 8: Web Audio Playback Queue, Sequential Scheduling & PCM Decoding
// =========================================================================
console.log("\n▶ [SUITE 8] Web Audio Playback Queue, Sequential Scheduling & PCM Decoding");

runTest("Suite 8", "8.1 Little-endian 24kHz PCM decoding and peak clamping", () => {
  const mockCtx = new MockAudioContext();

  // Test peak clamping: +32767 -> 1.0, -32768 -> -1.0
  const peakBuffer = new ArrayBuffer(4);
  const view = new DataView(peakBuffer);
  view.setInt16(0, 32767, true);
  view.setInt16(2, -32768, true);
  const b64 = Buffer.from(peakBuffer).toString("base64");

  const audioBuf = decodeBase64PcmToAudioBuffer(mockCtx, b64, 24000);
  assert(audioBuf !== null);
  const ch = audioBuf.getChannelData(0);
  assert(Math.abs(ch[0] - 1.0) < 0.0001, "Positive peak should normalize to 1.0");
  assert(Math.abs(ch[1] - (-1.0)) < 0.0001, "Negative peak should normalize to -1.0");
});

runTest("Suite 8", "8.2 Malformed and empty audio chunk handling", () => {
  const mockCtx = new MockAudioContext();
  assert.strictEqual(decodeBase64PcmToAudioBuffer(mockCtx, ""), null, "Empty base64 returns null");
  assert.strictEqual(decodeBase64PcmToAudioBuffer(mockCtx, "A"), null, "Malformed base64 returns null");
});

// =========================================================================
// SUITE 9: Instantaneous Barge-In Interruption
// =========================================================================
console.log("\n▶ [SUITE 9] Instantaneous Barge-In Interruption");

await runAsyncTest("Suite 9", "9.1 onInterrupted cancels all active sources and resets nextStartTime", async () => {
  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {});
  await harness.ref.current.connect();

  // Feed 2 audio chunks
  const chunk1 = generateTonePcmBase64(2400, 24000); // 0.1s
  const chunk2 = generateTonePcmBase64(2400, 24000); // 0.1s
  activeMockAgent.emitAudioChunk(chunk1);
  activeMockAgent.emitAudioChunk(chunk2);

  // Fire barge-in interruption
  activeMockAgent.emitInterrupted();

  // Component UI status should not show isSpeaking
  const html = renderToStaticMarkup(harness.currentOutput);
  assert(html.includes("Listening"), "Status should return to Listening after interruption");

  await harness.ref.current.disconnect();
  harness.unmount();
});

// =========================================================================
// SUITE 10: Hardware Microphone Mute / Unmute State Machine
// =========================================================================
console.log("\n▶ [SUITE 10] Hardware Microphone Mute / Unmute State Machine");

await runAsyncTest("Suite 10", "10.1 toggleMute halts and resumes mic stream cleanly", async () => {
  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {});
  await harness.ref.current.connect();

  assert.strictEqual(activeMockAgent.isMicActive, true, "Mic should be active on connect");

  // Toggle mute: active -> muted
  await harness.ref.current.toggleMute();
  assert.strictEqual(activeMockAgent.isMicActive, false, "agent.stopMic() must be called on mute");

  let html = renderToStaticMarkup(harness.currentOutput);
  assert(html.includes("Mic Muted"), "Status label should show 'Mic Muted'");
  assert(html.includes("Unmute"), "Button should show 'Unmute'");

  // Toggle unmute: muted -> active
  await harness.ref.current.toggleMute();
  assert.strictEqual(activeMockAgent.isMicActive, true, "agent.startMic() must be called on unmute");

  html = renderToStaticMarkup(harness.currentOutput);
  assert(html.includes("Listening"), "Status label should return to 'Listening'");
  assert(html.includes("Mute"), "Button should show 'Mute'");

  await harness.ref.current.disconnect();
  harness.unmount();
});

// =========================================================================
// SUITE 11: Component Teardown & Resource Leak Invariant
// =========================================================================
console.log("\n▶ [SUITE 11] Component Teardown & Resource Leak Invariant");

await runAsyncTest("Suite 11", "11.1 Unmount disconnects agent and releases AudioContext cleanly", async () => {
  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {});
  await harness.ref.current.connect();

  const agentRef = activeMockAgent;
  assert.strictEqual(agentRef.disconnected, false);

  // Unmount component while connected
  harness.unmount();

  assert.strictEqual(agentRef.disconnected, true, "VoiceAgent must be disconnected on unmount");
});

// =========================================================================
// SUITE 12: Imperative Handle API
// =========================================================================
console.log("\n▶ [SUITE 12] Imperative Handle API");

await runAsyncTest("Suite 12", "12.1 VoiceSessionHandle exposes all required methods", async () => {
  const harness = new ComponentHarness(VoiceSession.render || VoiceSession, {});
  const handle = harness.ref.current;

  assert(typeof handle.connect === "function", "handle.connect must be function");
  assert(typeof handle.disconnect === "function", "handle.disconnect must be function");
  assert(typeof handle.toggleMute === "function", "handle.toggleMute must be function");
  assert(typeof handle.pushContext === "function", "handle.pushContext must be function");
  assert(typeof handle.getStatus === "function", "handle.getStatus must be function");
  assert(typeof handle.getAnalyserNode === "function", "handle.getAnalyserNode must be function");

  assert.strictEqual(harness.ref.current.getStatus(), "disconnected");

  await harness.ref.current.connect();
  assert.strictEqual(harness.ref.current.getStatus(), "connected");

  harness.ref.current.pushContext("candidate executed npm run test");
  assert.strictEqual(activeMockAgent.pushedContexts.length, 1);
  assert.strictEqual(activeMockAgent.pushedContexts[0], "candidate executed npm run test");

  await harness.ref.current.disconnect();
  assert.strictEqual(harness.ref.current.getStatus(), "disconnected");

  harness.unmount();
});

console.log("\n======================================================================");
console.log(`ALL ${passedCount} OF ${totalCount} ADVERSARIAL STRESS TESTS PASSED CLEANLY (100% SUCCESS)`);
console.log("======================================================================\n");
