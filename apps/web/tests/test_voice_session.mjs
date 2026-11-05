/**
 * PRAXIS VOICE SESSION - MILESTONE 3 ITERATION 2 UNIT TEST SUITE
 * Target: apps/web/components/Avatar/VoiceSession.tsx
 *
 * This test suite verifies:
 * 1. Static code quality, TypeScript exports, zero 'any' AST types, zero legacy code, secret safety.
 * 2. Sandboxed dynamic module transpile & execution: directly import and test the real exported
 *    decodeBase64PcmToAudioBuffer function from VoiceSession.tsx (silence, normal audio, peak clamping, corrupted/truncated inputs).
 * 3. Sample-accurate sequential AudioPlaybackQueue directly from VoiceSession.tsx.
 * 4. Barge-in / interruption cancellation (queue.stopAll) directly from VoiceSession.tsx.
 * 5. Streaming SpokenTurnBuffer accumulation and turn flush directly from VoiceSession.tsx.
 * 6. AudioContext lifecycle protection, safe node teardown, and null analyser fallback.
 */

import fs from "fs";
import path from "path";
import assert from "assert";
import ts from "typescript";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRequire = createRequire(path.resolve(__dirname, "../package.json"));

console.log("==========================================================");
console.log("PRAXIS VOICE SESSION - MILESTONE 3 UNIT TEST SUITE");
console.log("Testing: apps/web/components/Avatar/VoiceSession.tsx");
console.log("==========================================================\n");

const voiceSessionPath = path.resolve(__dirname, "../components/Avatar/VoiceSession.tsx");
const sourceCode = fs.readFileSync(voiceSessionPath, "utf8");

// =========================================================================
// TEST SUITE 1: Static Code Quality, Contract Exports & AST Analysis
// =========================================================================
console.log("▶ [TEST 1] Static Code Analysis, Exports & Legacy Code Removal");

// 1.1 Verify no legacy OpenAI / WebRTC strings exist
const forbiddenPatterns = [
  "RTCPeerConnection",
  "RTCDataChannel",
  "http://localhost:3001",
  "localhost:3001/voice/session",
  "api.openai.com",
  "gpt-4o-realtime",
  "oai-events",
];

for (const pattern of forbiddenPatterns) {
  assert(
    !sourceCode.includes(pattern),
    `Regression failure: sourceCode contains forbidden legacy pattern '${pattern}'`
  );
}
console.log("  ✓ No OpenAI WebRTC or localhost:3001 legacy references remain.");

// 1.2 Verify required TypeScript exports exist
const requiredExports = [
  "export type VoiceSessionStatus",
  "export type VoiceSessionMode",
  "export interface VoiceSessionProps",
  "export interface VoiceSessionHandle",
  "export default VoiceSession",
  "export const OUTPUT_SAMPLE_RATE",
  "export function decodeBase64PcmToAudioBuffer",
  "export class AudioPlaybackQueue",
  "export class SpokenTurnBuffer",
];

for (const exp of requiredExports) {
  assert(
    sourceCode.includes(exp),
    `Export contract failure: missing required export signature '${exp}'`
  );
}

// Verify VoiceSession component export (accepts forwardRef or function)
const hasVoiceSessionExport =
  sourceCode.includes("export const VoiceSession = forwardRef") ||
  sourceCode.includes("export function VoiceSession");
assert(
  hasVoiceSessionExport,
  "Export contract failure: missing exported VoiceSession component ('export const VoiceSession = forwardRef')"
);
console.log("  ✓ All required TypeScript types, classes, and component exports are present.");

// 1.3 Verify zero TypeScript 'any' types in AST
const sourceFile = ts.createSourceFile(
  "VoiceSession.tsx",
  sourceCode,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

let anyTypeCount = 0;
function inspectNode(node) {
  if (node.kind === ts.SyntaxKind.AnyKeyword) {
    anyTypeCount++;
  }
  ts.forEachChild(node, inspectNode);
}
inspectNode(sourceFile);

assert.strictEqual(
  anyTypeCount,
  0,
  `Strict typing failure: found ${anyTypeCount} instances of 'any' type in VoiceSession.tsx`
);
console.log("  ✓ AST verification: zero 'any' types in VoiceSession.tsx.");

// 1.4 Verify no client secret leaks
assert(!sourceCode.includes("GEMINI_API_KEY"), "Security failure: GEMINI_API_KEY found in client code");
assert(!sourceCode.includes("process.env"), "Security failure: process.env found in client component");
console.log("  ✓ Client security invariants confirmed: 0 secrets leaked.");

// =========================================================================
// MODULE LOADER: Genuine Sandboxed Execution of VoiceSession.tsx
// =========================================================================

// Transpile VoiceSession.tsx to CommonJS
const { outputText: jsCode } = ts.transpileModule(sourceCode, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    removeComments: false,
  },
});

// Transpile geminiLive.ts to satisfy import dependency
const geminiLivePath = path.resolve(__dirname, "../lib/voice/geminiLive.ts");
const geminiLiveSource = fs.readFileSync(geminiLivePath, "utf8");
const { outputText: geminiLiveJs } = ts.transpileModule(geminiLiveSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    removeComments: false,
  },
});

function loadVoiceSessionModule(globals = {}) {
  const geminiLiveMod = { exports: {} };
  const fnGL = new Function("exports", "module", "require", "window", "navigator", "globalThis", geminiLiveJs);
  fnGL(
    geminiLiveMod.exports,
    geminiLiveMod,
    (id) => {
      if (id === "@google/genai") {
        return {
          GoogleGenAI: class MockGoogleGenAI {
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
      return webRequire(id);
    },
    globals.window || {},
    globals.navigator || {},
    globals
  );

  const voiceSessionMod = { exports: {} };
  const fnVS = new Function("exports", "module", "require", "window", "globalThis", jsCode);
  fnVS(
    voiceSessionMod.exports,
    voiceSessionMod,
    (id) => {
      if (id.includes("AvatarScene")) {
        return function MockAvatarScene() {
          return null;
        };
      }
      if (id.includes("geminiLive")) {
        return geminiLiveMod.exports;
      }
      return webRequire(id);
    },
    globals.window || {},
    globals
  );

  return voiceSessionMod.exports;
}

// Load real exported functions and classes from VoiceSession.tsx
const voiceSessionExports = loadVoiceSessionModule();
const {
  OUTPUT_SAMPLE_RATE,
  decodeBase64PcmToAudioBuffer,
  AudioPlaybackQueue,
  SpokenTurnBuffer,
  VoiceSession,
} = voiceSessionExports;

assert.strictEqual(OUTPUT_SAMPLE_RATE, 24000);
assert.strictEqual(typeof decodeBase64PcmToAudioBuffer, "function");
assert.strictEqual(typeof AudioPlaybackQueue, "function");
assert.strictEqual(typeof SpokenTurnBuffer, "function");
assert(
  VoiceSession && (typeof VoiceSession === "object" || typeof VoiceSession === "function"),
  "VoiceSession must be exported as a React forwardRef component"
);

// =========================================================================
// MOCK WEB AUDIO IMPLEMENTATIONS FOR NODE.JS TEST RUNNER
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
    this.stopped = false;
    this.disconnected = false;
    this.startTime = null;
    this.onended = null;
  }

  connect(dest) {
    this.destination = dest;
  }

  disconnect() {
    this.disconnected = true;
  }

  start(when = 0) {
    this.startTime = when;
  }

  stop() {
    this.stopped = true;
  }
}

class MockGainNode {
  constructor(audioCtx) {
    this.context = audioCtx;
    this.gain = { value: 1.0 };
    this.disconnected = false;
  }

  connect(dest) {
    this.destination = dest;
  }

  disconnect() {
    this.disconnected = true;
  }
}

class MockAnalyserNode {
  constructor(audioCtx) {
    this.context = audioCtx;
    this.fftSize = 2048;
    this.disconnected = false;
  }

  connect(dest) {
    this.destination = dest;
  }

  disconnect() {
    this.disconnected = true;
  }
}

class MockAudioContext {
  constructor() {
    this.state = "running";
    this.currentTime = 0;
    this.destination = {};
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

  async close() {
    this.state = "closed";
  }
}

const mockCtx = new MockAudioContext();

// =========================================================================
// TEST SUITE 2: Base64 24kHz PCM Audio Decoding (Real Exported Function)
// =========================================================================
console.log("\n▶ [TEST 2] Base64 PCM Audio Decoding & Normalization (Real Function)");

// Test 2.1: Silence (10 samples of 0)
const zeroBuffer = new ArrayBuffer(20);
const zeroBase64 = Buffer.from(zeroBuffer).toString("base64");
const decodedSilence = decodeBase64PcmToAudioBuffer(mockCtx, zeroBase64, 24000);

assert(decodedSilence !== null, "Decoded silence buffer should not be null");
assert.strictEqual(decodedSilence.length, 10, "Should have exactly 10 samples");
assert.strictEqual(decodedSilence.sampleRate, 24000, "Should have 24000 Hz sample rate");
const silenceSamples = decodedSilence.getChannelData(0);
for (let i = 0; i < 10; i++) {
  assert.strictEqual(silenceSamples[i], 0, `Sample ${i} should be 0.0`);
}
console.log("  ✓ Silence decoding: correctly maps 0 -> 0.0 at 24,000 Hz.");

// Test 2.2: Normal audio wave (100 samples)
const normalBuffer = new ArrayBuffer(200);
const normalView = new DataView(normalBuffer);
for (let i = 0; i < 100; i++) {
  normalView.setInt16(i * 2, Math.round(Math.sin((i / 100) * Math.PI * 2) * 16000), true);
}
const normalBase64 = Buffer.from(normalBuffer).toString("base64");
const decodedNormal = decodeBase64PcmToAudioBuffer(mockCtx, normalBase64, 24000);
assert(decodedNormal !== null, "Decoded normal audio should not be null");
assert.strictEqual(decodedNormal.length, 100);
const normalSamples = decodedNormal.getChannelData(0);
for (let i = 0; i < 100; i++) {
  assert(normalSamples[i] >= -1.0 && normalSamples[i] <= 1.0, "Samples must be normalized within [-1.0, 1.0]");
}
console.log("  ✓ Normal audio waveform decoded and properly bounded in [-1.0, 1.0].");

// Test 2.3: Positive peak (+32767) and Negative peak (-32768)
const peakBuffer = new ArrayBuffer(4);
const peakView = new DataView(peakBuffer);
peakView.setInt16(0, 32767, true); // sample 0: max positive
peakView.setInt16(2, -32768, true); // sample 1: max negative
const peakBase64 = Buffer.from(peakBuffer).toString("base64");
const decodedPeaks = decodeBase64PcmToAudioBuffer(mockCtx, peakBase64, 24000);

assert(decodedPeaks !== null);
const peakSamples = decodedPeaks.getChannelData(0);
assert(Math.abs(peakSamples[0] - 1.0) < 0.0001, `Positive peak should be 1.0, got ${peakSamples[0]}`);
assert(Math.abs(peakSamples[1] - (-1.0)) < 0.0001, `Negative peak should be -1.0, got ${peakSamples[1]}`);
console.log("  ✓ Peak normalization: +32767 -> +1.0 and -32768 -> -1.0 strictly clamped.");

// Test 2.4: Little-endian vs Big-endian validation
const leBuffer = new ArrayBuffer(2);
const leView = new DataView(leBuffer);
leView.setUint8(0, 0x01); // low byte
leView.setUint8(1, 0x00); // high byte -> value = 1 in little-endian (vs 256 in big-endian)
const leBase64 = Buffer.from(leBuffer).toString("base64");
const decodedLe = decodeBase64PcmToAudioBuffer(mockCtx, leBase64, 24000);
const leSamples = decodedLe.getChannelData(0);
assert(Math.abs(leSamples[0] - (1 / 32767.0)) < 0.00001, "Should strictly interpret little-endian bytes");
console.log("  ✓ Little-endian byte order correctly preserved.");

// Test 2.5: Empty, truncated, odd-length and malformed inputs
assert.strictEqual(decodeBase64PcmToAudioBuffer(mockCtx, ""), null, "Empty base64 should return null");
assert.strictEqual(decodeBase64PcmToAudioBuffer(mockCtx, "   "), null, "Whitespace should return null");
assert.strictEqual(decodeBase64PcmToAudioBuffer(mockCtx, "A"), null, "Truncated base64 should return null");
assert.strictEqual(decodeBase64PcmToAudioBuffer(mockCtx, "!@#$%^&*()"), null, "Pure non-base64 should return null");
assert.strictEqual(decodeBase64PcmToAudioBuffer(mockCtx, "AQ=="), null, "1-byte truncated PCM should return null");
const oddByteBase64 = Buffer.from(new Uint8Array([0x42])).toString("base64");
assert.strictEqual(decodeBase64PcmToAudioBuffer(mockCtx, oddByteBase64), null, "Single-byte PCM should return null");
console.log("  ✓ Graceful handling of empty, truncated, odd-length and malformed audio chunks.");

// =========================================================================
// TEST SUITE 3: Sample-Accurate Audio Scheduling (Real AudioPlaybackQueue)
// =========================================================================
console.log("\n▶ [TEST 3] Sample-Accurate Audio Scheduling (Real AudioPlaybackQueue)");

const mockGain = mockCtx.createGain();
let isSpeakingState = false;
const queue = new AudioPlaybackQueue(mockCtx, mockGain, (speaking) => {
  isSpeakingState = speaking;
});

// Create 100ms valid chunk of 2400 samples
const chunk100msBuf = new ArrayBuffer(2400 * 2);
const chunk100msView = new DataView(chunk100msBuf);
for (let i = 0; i < 2400; i++) {
  chunk100msView.setInt16(i * 2, 1000, true);
}
const chunk100msB64 = Buffer.from(chunk100msBuf).toString("base64");

// Chunk 1: arrives at currentTime = 0.0s
mockCtx.currentTime = 0.0;
const item1 = queue.scheduleChunk(chunk100msB64, 24000);
assert(item1 !== null, "Item 1 should be scheduled");
assert.strictEqual(item1.startTime, 0.02, "Initial chunk should have 20ms lead jitter buffer");
assert(Math.abs(item1.duration - 0.1) < 0.0001, "Duration should be 0.1s");
assert.strictEqual(queue.getActiveSourceCount(), 1);
assert.strictEqual(isSpeakingState, true, "isSpeaking callback should be true");

// Chunk 2: arrives at currentTime = 0.05s (before chunk 1 finishes)
mockCtx.currentTime = 0.05;
const item2 = queue.scheduleChunk(chunk100msB64, 24000);
assert(item2 !== null);
assert(
  Math.abs(item2.startTime - item1.endTime) < 0.0001,
  "Chunk 2 must immediately follow chunk 1 without gap"
);
assert.strictEqual(queue.getActiveSourceCount(), 2);

// Chunk 3: arrives after queue drains at currentTime = 2.0s
mockCtx.currentTime = 2.0;
const item3 = queue.scheduleChunk(chunk100msB64, 24000);
assert(item3 !== null);
assert.strictEqual(item3.startTime, 2.02, "Drained queue chunk must be scheduled at currentTime + 0.02s");

console.log("  ✓ Gapless sequential audio scheduling and jitter lead buffer verified.");

// =========================================================================
// TEST SUITE 4: Barge-in / Interruption (Real queue.stopAll)
// =========================================================================
console.log("\n▶ [TEST 4] Barge-in / Interruption Cancellation (Real queue.stopAll)");

assert(queue.getActiveSourceCount() > 0, "Active sources should exist before barge-in");
const src1 = item1.source;
const src2 = item2.source;
const src3 = item3.source;

mockCtx.currentTime = 2.05;
queue.stopAll();

assert.strictEqual(src1.stopped, true, "Source 1 should be stopped");
assert.strictEqual(src1.disconnected, true, "Source 1 should be disconnected");
assert.strictEqual(src2.stopped, true, "Source 2 should be stopped");
assert.strictEqual(src3.stopped, true, "Source 3 should be stopped");
assert.strictEqual(queue.getActiveSourceCount(), 0, "activeSources set should be completely cleared");
assert.strictEqual(queue.getNextStartTime(), 2.05, "Timeline pointer must immediately reset to currentTime");
assert.strictEqual(isSpeakingState, false, "isSpeaking should be false after stopAll");

console.log("  ✓ Instantaneous source node stopping, disconnection, and timeline reset verified.");

// =========================================================================
// TEST SUITE 5: Spoken Turn Accumulation (Real SpokenTurnBuffer)
// =========================================================================
console.log("\n▶ [TEST 5] Spoken Turn Accumulation & Bridge (Real SpokenTurnBuffer)");

const dispatchedTurns = [];
const turnBuffer = new SpokenTurnBuffer((text) => {
  dispatchedTurns.push(text);
});

// Candidate speaks over 3 streaming events
turnBuffer.append("I have completed");
turnBuffer.append("the database query optimization");
turnBuffer.append("using an index.");

assert.strictEqual(
  turnBuffer.getBuffer(),
  "I have completed the database query optimization using an index."
);

// Turn completes
const flushed = turnBuffer.flush();
assert.strictEqual(flushed, "I have completed the database query optimization using an index.");
assert.strictEqual(dispatchedTurns.length, 1);
assert.strictEqual(dispatchedTurns[0], flushed);
assert.strictEqual(turnBuffer.getBuffer(), "", "Buffer must be empty after flush");

// Redundant flush produces no duplicates
turnBuffer.flush();
assert.strictEqual(dispatchedTurns.length, 1, "Redundant flush should not dispatch empty turn");

console.log("  ✓ Spoken turn accumulation and dispatch to evaluation pipeline verified.");

// =========================================================================
// TEST SUITE 6: Teardown, Lifecycle & test-avatar Compatibility
// =========================================================================
console.log("\n▶ [TEST 6] Lifecycle Contracts, Teardown & test-avatar Compatibility");

// 6.1 AudioContext Ownership Protection check in sourceCode
assert(
  sourceCode.includes("isInternalAudioContextRef"),
  "AudioContext lifecycle contract failure: must track isInternalAudioContextRef to prevent closing parent context"
);
console.log("  ✓ External AudioContext preservation confirmed.");

// 6.2 Node disconnection check in sourceCode
assert(
  sourceCode.includes("gainNodeRef.current?.disconnect()"),
  "Teardown contract failure: gainNodeRef.current?.disconnect() must be called before null assignment"
);
assert(
  sourceCode.includes("analyserNodeRef.current?.disconnect()"),
  "Teardown contract failure: analyserNodeRef.current?.disconnect() must be called before null assignment"
);
console.log("  ✓ Resource teardown node disconnections confirmed.");

// 6.3 AnalyserNode fallback check
assert(
  sourceCode.includes("externalAnalyser || internalAnalyser"),
  "Lip-sync fallback contract failure: must use 'externalAnalyser || internalAnalyser' to support analyserNode={null}"
);
console.log("  ✓ Lip-sync fallback with analyserNode={null} confirmed.");

// 6.4 test-avatar/page.tsx compatibility check
const testAvatarPath = path.resolve(__dirname, "../app/test-avatar/page.tsx");
const testAvatarSource = fs.readFileSync(testAvatarPath, "utf8");

assert(
  testAvatarSource.includes("<VoiceSession />") ||
    testAvatarSource.includes("<VoiceSession/>"),
  "test-avatar/page.tsx must mount <VoiceSession />"
);

const expectedDefaults = [
  'mode = "persona"',
  'domain = "engineering"',
  'showAvatar = true',
  'compact = false',
  'autoConnect = false',
];

for (const def of expectedDefaults) {
  assert(
    sourceCode.includes(def),
    `Default parameter missing: expected VoiceSession to specify '${def}'`
  );
}
console.log("  ✓ Safe defaults confirmed: mode='persona', domain='engineering', showAvatar=true.");

console.log("\n==========================================================");
console.log("ALL 6 TEST SUITES PASSED CLEANLY (100% SUCCESS)");
console.log("==========================================================");
