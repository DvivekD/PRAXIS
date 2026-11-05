const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');

console.log('====================================================');
console.log('PRAXIS VOICE AGENT - MILESTONE 1 EMPIRICAL TEST SUITE');
console.log('Challenger 2: Config Contracts & Secret Redaction');
console.log('====================================================\n');

// 1. Transpile personas.ts
const personasPath = path.resolve('apps/web/lib/agents/personas.ts');
const personasSource = fs.readFileSync(personasPath, 'utf8');
const { outputText: personasJs } = ts.transpileModule(personasSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});

const personasModule = { exports: {} };
const personasFn = new Function('exports', 'module', 'require', personasJs);
personasFn(personasModule.exports, personasModule, require);
const { DOMAIN_PERSONAS, Persona } = personasModule.exports;

// 2. Load Next.js NextResponse
const { NextResponse } = require(path.resolve('apps/web/node_modules/next/server.js'));

// 3. Load @google/genai Modality
const genai = require(path.resolve('apps/web/node_modules/@google/genai'));
const { Modality } = genai;

// 4. Helper to load route.ts with custom GoogleGenAI mock/spy
function loadRouteModule(mockGoogleGenAI) {
  const routePath = path.resolve('apps/web/app/api/voice/session/route.ts');
  const routeSource = fs.readFileSync(routePath, 'utf8');
  const { outputText: routeJs } = ts.transpileModule(routeSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });

  const customRequire = (id) => {
    if (id === 'next/server') {
      return { NextResponse };
    }
    if (id === '@google/genai') {
      return {
        GoogleGenAI: mockGoogleGenAI,
        Modality,
      };
    }
    if (id.includes('personas')) {
      return { DOMAIN_PERSONAS, Persona };
    }
    return require(id);
  };

  const routeModule = { exports: {} };
  const routeFn = new Function('exports', 'module', 'require', '__dirname', '__filename', routeJs);
  routeFn(routeModule.exports, routeModule, customRequire, path.dirname(routePath), routePath);
  return routeModule.exports;
}

function createMockRequest(body, contentType = 'application/json') {
  const bodyText = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    text: async () => bodyText,
    headers: new Map([['content-type', contentType]]),
  };
}

let passed = 0;
let failed = 0;

async function test(desc, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

async function runAllTests() {
  const TEST_KEY = 'AIzaSy_TEST_KEY_.$*+?()[]{}|^_SECRET_98765';
  process.env.GEMINI_API_KEY = TEST_KEY;

  console.log('--- SUITE 1: PERSONA MODE CONFIG ASSEMBLY ---');

  await test('Default Persona Mode (empty body) -> Alex Chen, Aoede, gemini-2.0-flash-exp', async () => {
    class MockGenAI {
      authTokens = {
        create: async () => ({ name: 'auth_tokens/test-token-1' }),
      };
    }
    const { POST } = loadRouteModule(MockGenAI);
    const res = await POST(createMockRequest({}));
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.config.voice, 'Aoede');
    assert.strictEqual(json.config.model, 'gemini-2.0-flash-exp');
    assert.ok(json.config.systemInstruction.includes('Alex Chen'));
    assert.ok(json.config.systemInstruction.includes('Problem: Assessment Simulation'));
    assert.ok(json.config.systemInstruction.includes('Scenario: Technical hiring assessment'));
    assert.ok(json.config.systemInstruction.includes('strictly under 4 sentences'));
    assert.ok(json.config.systemInstruction.includes('HIDDEN CONDITIONS'));
    assert.strictEqual(json.config.tools, undefined);
  });

  await test('Persona Mode across all domains: sales, product, data, engineering', async () => {
    class MockGenAI {
      authTokens = { create: async () => ({ name: 'auth_tokens/test-token' }) };
    }
    const { POST } = loadRouteModule(MockGenAI);

    for (const domain of ['engineering', 'sales', 'product', 'data']) {
      const res = await POST(createMockRequest({ mode: 'persona', domain }));
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.config.voice, 'Aoede');
      const expectedPersona = DOMAIN_PERSONAS[domain][0];
      assert.ok(
        json.config.systemInstruction.includes(expectedPersona.name),
        `Domain ${domain} should have persona ${expectedPersona.name}`
      );
    }
  });

  await test('Persona Mode specific persona selection with casing/spacing: "  Sam Okafor  "', async () => {
    class MockGenAI {
      authTokens = { create: async () => ({ name: 'auth_tokens/sam' }) };
    }
    const { POST } = loadRouteModule(MockGenAI);
    const res = await POST(
      createMockRequest({
        mode: 'persona',
        domain: 'engineering',
        personaName: '  sam okafor  ',
        problemTitle: 'Architectural Review',
        scenario: 'Distributed rate limiting',
      })
    );
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(json.config.systemInstruction.includes('Sam Okafor'));
    assert.ok(json.config.systemInstruction.includes('Lead Architect'));
    assert.ok(json.config.systemInstruction.includes('Problem: Architectural Review'));
    assert.ok(json.config.systemInstruction.includes('Scenario: Distributed rate limiting'));
  });

  console.log('\n--- SUITE 2: GUIDE MODE CONFIG ASSEMBLY & TOOLS ---');

  await test('Guide Mode defaults to voice Puck and declares log_event tool', async () => {
    class MockGenAI {
      authTokens = { create: async () => ({ name: 'auth_tokens/guide' }) };
    }
    const { POST } = loadRouteModule(MockGenAI);
    const res = await POST(
      createMockRequest({
        mode: 'guide',
        problemTitle: 'LRU Cache Design',
        scenario: 'Thread safe cache implementation',
      })
    );
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.config.voice, 'Puck');
    assert.strictEqual(json.config.model, 'gemini-2.0-flash-exp');

    const instr = json.config.systemInstruction;
    assert.ok(instr.includes('PRAXIS Guide'));
    assert.ok(instr.includes('Problem: LRU Cache Design'));
    assert.ok(instr.includes('Scenario: Thread safe cache implementation'));
    assert.ok(instr.includes('Speak ONLY when:'));
    assert.ok(instr.includes('60+ seconds'));
    assert.ok(instr.includes('Socratic questions'));
    assert.ok(instr.includes('under 4 sentences'));
    assert.ok(instr.includes('[CONTEXT]'));

    // Check tools declaration
    assert.ok(Array.isArray(json.config.tools));
    assert.strictEqual(json.config.tools.length, 1);
    const tool = json.config.tools[0];
    assert.strictEqual(tool.name, 'log_event');
    assert.strictEqual(tool.parameters.type, 'OBJECT');
    assert.deepStrictEqual(tool.parameters.required, ['event', 'detail']);
    assert.strictEqual(tool.parameters.properties.event.type, 'STRING');
    assert.strictEqual(tool.parameters.properties.detail.type, 'STRING');
  });

  console.log('\n--- SUITE 3: FALLBACK TOKEN MINTING STRATEGIES ---');

  await test('Fallback 1 is engaged if primary constrained token creation fails', async () => {
    let attempts = [];
    class FallbackGenAI {
      authTokens = {
        create: async (params) => {
          if (params.config.liveConnectConstraints?.config?.systemInstruction) {
            attempts.push('primary');
            throw new Error('liveConnectConstraints.config.systemInstruction unsupported in current API version');
          }
          attempts.push('fallback1');
          return { name: 'auth_tokens/fallback1-token' };
        },
      };
    }
    const { POST } = loadRouteModule(FallbackGenAI);
    const res = await POST(createMockRequest({ mode: 'persona' }));
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.token, 'auth_tokens/fallback1-token');
    assert.deepStrictEqual(attempts, ['primary', 'fallback1']);
  });

  await test('Fallback 2 (base token) is engaged if fallback 1 fails', async () => {
    let attempts = [];
    class Fallback2GenAI {
      authTokens = {
        create: async (params) => {
          if (params.config.liveConnectConstraints) {
            attempts.push('constrained');
            throw new Error('liveConnectConstraints unsupported');
          }
          attempts.push('base');
          return { name: 'auth_tokens/base-token' };
        },
      };
    }
    const { POST } = loadRouteModule(Fallback2GenAI);
    const res = await POST(createMockRequest({ mode: 'guide' }));
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.token, 'auth_tokens/base-token');
    assert.strictEqual(json.config.voice, 'Puck');
    assert.deepStrictEqual(attempts, ['constrained', 'constrained', 'base']);
  });

  console.log('\n--- SUITE 4: SECRET SECURITY & REDACTION INVARIANTS ---');

  await test('No secret leakage on 200 OK across token, config, and headers', async () => {
    class MockGenAI {
      authTokens = { create: async () => ({ name: 'auth_tokens/clean-token-99' }) };
    }
    const { POST } = loadRouteModule(MockGenAI);
    const res = await POST(createMockRequest({ mode: 'guide' }));
    assert.strictEqual(res.status, 200);

    for (const [header, val] of res.headers.entries()) {
      assert.ok(!val.includes(TEST_KEY), `Header ${header} contains secret key!`);
    }

    const bodyStr = JSON.stringify(await res.json());
    assert.ok(!bodyStr.includes(TEST_KEY), 'Response body contains secret key!');
  });

  await test('Upstream error containing key with special regex chars is sanitized to [REDACTED]', async () => {
    let loggedMessages = [];
    const origError = console.error;
    const origWarn = console.warn;
    console.error = (...args) => loggedMessages.push(args.join(' '));
    console.warn = (...args) => loggedMessages.push(args.join(' '));

    try {
      class ErrorGenAI {
        authTokens = {
          create: async () => {
            throw new Error(`Google API fatal: Invalid credential ${TEST_KEY} rejected.`);
          },
        };
      }
      const { POST } = loadRouteModule(ErrorGenAI);
      const res = await POST(createMockRequest({ mode: 'persona' }));
      assert.strictEqual(res.status, 500);

      const json = await res.json();
      assert.ok(!JSON.stringify(json).includes(TEST_KEY), 'Response leaked secret key');
      assert.strictEqual(json.error, 'Failed to mint ephemeral voice session token.');

      const logs = loggedMessages.join('\n');
      assert.ok(!logs.includes(TEST_KEY), 'Logs leaked secret key');
      assert.ok(logs.includes('[REDACTED]'), 'Logs must contain [REDACTED]');
    } finally {
      console.error = origError;
      console.warn = origWarn;
    }
  });

  await test('Rate limit 429 response formatting without key leak', async () => {
    class RateLimitGenAI {
      authTokens = {
        create: async () => {
          throw new Error(`429 RESOURCE_EXHAUSTED: Quota exceeded for ${TEST_KEY}`);
        },
      };
    }
    const { POST } = loadRouteModule(RateLimitGenAI);
    const res = await POST(createMockRequest({ mode: 'persona' }));
    assert.strictEqual(res.status, 429);
    const json = await res.json();
    assert.strictEqual(json.error, 'Gemini Live rate limit exceeded. Please try again shortly.');
    assert.ok(!JSON.stringify(json).includes(TEST_KEY));
  });

  await test('Empty token response from service returns 500', async () => {
    class EmptyTokenGenAI {
      authTokens = {
        create: async () => ({ name: '' }),
      };
    }
    const { POST } = loadRouteModule(EmptyTokenGenAI);
    const res = await POST(createMockRequest({ mode: 'persona' }));
    assert.strictEqual(res.status, 500);
    const json = await res.json();
    assert.strictEqual(json.error, 'Google GenAI authentication service returned an empty token.');
  });

  console.log('\n--- SUITE 5: CACHE CONTROL & SECURITY HEADERS ---');

  await test('Cache-Control headers prevent caching on both success and error responses', async () => {
    class MockGenAI {
      authTokens = { create: async () => ({ name: 'auth_tokens/tok' }) };
    }
    const { POST } = loadRouteModule(MockGenAI);

    // Success response
    const successRes = await POST(createMockRequest({}));
    const successCache = successRes.headers.get('cache-control') || '';
    assert.ok(successCache.includes('no-store'), 'Success must have no-store');
    assert.ok(successCache.includes('no-cache'), 'Success must have no-cache');

    // Error response
    const errRes = await POST(createMockRequest('{ bad json'));
    const errCache = errRes.headers.get('cache-control') || '';
    assert.ok(errCache.includes('no-store'), 'Error must have no-store');
  });

  console.log('\n====================================================');
  console.log(`STRESS TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
