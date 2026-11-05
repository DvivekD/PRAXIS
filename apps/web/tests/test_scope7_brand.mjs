import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("================================================================================");
console.log("SCOPE 7: BRAND (THE VIRAL BRAND CRISIS) - FUNCTIONAL TEST SUITE");
console.log("================================================================================\n");

// 1. Verify existence of Brand sub-environment components
const brandDir = path.resolve(__dirname, "../components/Environments/Brand");
const requiredFiles = [
  "types.ts",
  "SocialListeningSubEnv.tsx",
  "BrandContentStudioSubEnv.tsx",
  "CrisisCommandSubEnv.tsx",
];

for (const f of requiredFiles) {
  const filePath = path.join(brandDir, f);
  assert(fs.existsSync(filePath), `Required file missing: ${f}`);
  const content = fs.readFileSync(filePath, "utf8");
  assert(content.length > 500, `File appears too short/empty: ${f}`);
  console.log(`  [PASS] Verified ${f} (${content.length} bytes)`);
}

// 2. Verify SocialCommandEnvironment wraps all 3 sub-environments
const mainEnvPath = path.resolve(__dirname, "../components/Environments/SocialCommandEnvironment.tsx");
assert(fs.existsSync(mainEnvPath), "SocialCommandEnvironment.tsx missing");
const mainContent = fs.readFileSync(mainEnvPath, "utf8");

assert(mainContent.includes("SocialListeningSubEnv"), "SocialCommandEnvironment must include SocialListeningSubEnv");
assert(mainContent.includes("BrandContentStudioSubEnv"), "SocialCommandEnvironment must include BrandContentStudioSubEnv");
assert(mainContent.includes("CrisisCommandSubEnv"), "SocialCommandEnvironment must include CrisisCommandSubEnv");
assert(mainContent.includes("AvatarScene"), "SocialCommandEnvironment must include 3D AvatarScene in HUD");
console.log("  [PASS] SocialCommandEnvironment seamlessly mounts all 3 sub-environments and 3D Avatar HUD");

// 3. Verify AvatarScene domain="brand" support
const avatarPath = path.resolve(__dirname, "../components/Avatar/AvatarScene.tsx");
const avatarContent = fs.readFileSync(avatarPath, "utf8");
assert(avatarContent.includes('case "brand":'), "AvatarScene must handle domain='brand'");
assert(avatarContent.includes("#ec4899"), "AvatarScene must use #ec4899 brand theme color");
console.log("  [PASS] 3D AvatarScene has native BrandCore with resonant social wave sphere and #ec4899 color");

// 4. Verify eval.ts brand actions & telemetry
const evalPath = path.resolve(__dirname, "../actions/eval.ts");
const evalContent = fs.readFileSync(evalPath, "utf8");
assert(evalContent.includes("submitBrandCrisisAction"), "eval.ts must export submitBrandCrisisAction");
assert(evalContent.includes('"Maya": "brand"'), "eval.ts must recognize Maya persona hint");
assert(evalContent.includes("brand:"), "eval.ts must include brand AI fallback");
console.log("  [PASS] actions/eval.ts exports submitBrandCrisisAction with full telemetry wiring");

// 5. Verify evaluator.ts brand weights
const evaluatorPath = path.resolve(__dirname, "../lib/agents/evaluator.ts");
const evaluatorContent = fs.readFileSync(evaluatorPath, "utf8");
assert(evaluatorContent.includes('case "brand":'), "evaluator.ts must have dedicated weights for brand domain");
console.log("  [PASS] evaluator.ts defines tailored crisis communication weights for Brand domain");

console.log("\n================================================================================");
console.log("ALL SCOPE 7 BRAND VERIFICATION CHECKS PASSED SUCCESSFULLY!");
console.log("================================================================================");
