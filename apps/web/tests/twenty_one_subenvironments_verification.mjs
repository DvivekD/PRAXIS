import assert from "node:assert/strict";
import { ProblemBank, SCOPE_DEFINITIONS } from "../lib/services/problemBank.ts";

console.log("======================================================================");
console.log("PRAXIS: 7 SCOPES × 3 SUB-ENVIRONMENTS (21 ARENAS) VERIFICATION SUITE");
console.log("======================================================================");

const problemBank = new ProblemBank();
const expectedScopes = ["engineering", "sales", "product", "data", "sre", "support", "brand"];

console.log("\n▶ [TEST 1] Scope Count & Integrity");
const scopes = problemBank.getAllScopes();
assert.equal(scopes.length, 7, `Expected 7 scopes, received ${scopes.length}`);
console.log(`  ✓ [PASS] Exactly 7 Scopes defined in ProblemBank`);

for (const expectedScope of expectedScopes) {
  const scopeDef = SCOPE_DEFINITIONS[expectedScope];
  assert.ok(scopeDef, `Scope definition missing for ${expectedScope}`);
  assert.equal(scopeDef.subEnvironments.length, 3, `Scope ${expectedScope} does not have 3 sub-environments`);
  console.log(`  ✓ [PASS] Scope '${expectedScope}' has 3 sub-environments:`);
  for (const sub of scopeDef.subEnvironments) {
    console.log(`      • [0${sub.subEnv}] ${sub.title} (${sub.envType})`);
    assert.ok(sub.problemStatement, `Sub-environment ${sub.title} has no problemStatement`);
    assert.ok(sub.description, `Sub-environment ${sub.title} has no description`);
    assert.ok(sub.skinType, `Sub-environment ${sub.title} has no skinType`);
  }
}

console.log("\n▶ [TEST 2] Total Sub-Environment Count");
let totalSubEnvs = 0;
for (const s of scopes) {
  totalSubEnvs += s.subEnvironments.length;
}
assert.equal(totalSubEnvs, 21, `Expected exactly 21 sub-environments, found ${totalSubEnvs}`);
console.log(`  ✓ [PASS] Total Sub-Environments = ${totalSubEnvs} (21/21 Verified)`);

console.log("\n▶ [TEST 3] Problem Mutation & Resolution per Sub-Environment");
for (const domain of expectedScopes) {
  for (let sub = 1; sub <= 3; sub++) {
    const generated = problemBank.generateMutatedProblem(domain, "mid-level", sub);
    assert.equal(generated.domain, domain, `Domain mismatch: ${generated.domain} vs ${domain}`);
    assert.equal(generated.subEnv, sub, `SubEnv mismatch: ${generated.subEnv} vs ${sub}`);
    assert.ok(generated.title, `Generated problem title missing for ${domain} sub ${sub}`);
    assert.ok(generated.problemStatement, `Problem statement missing for ${domain} sub ${sub}`);
    assert.ok(generated.scenario, `Scenario missing for ${domain} sub ${sub}`);
  }
}
console.log("  ✓ [PASS] All 21 sub-environments successfully generate mutated problems with real data");

console.log("\n▶ [TEST 4] Fallback Behavior & Boundary Values");
const fallbackScope = problemBank.generateMutatedProblem("unknown_scope", "expert", 99);
assert.equal(fallbackScope.domain, "engineering", "Fallback should default to engineering");
assert.equal(fallbackScope.subEnv, 1, "Fallback sub-env should default to 1");
console.log("  ✓ [PASS] Unknown domain & out-of-range subEnv fallback safely");

console.log("\n======================================================================");
console.log("ALL 21 SUB-ENVIRONMENTS & SCOPES VERIFIED WITH 100% INTEGRITY");
console.log("======================================================================");
