"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Suspense, useState, useEffect } from "react";
import { startSimulationAction, getProblemsByDomainAction } from "../../../actions/eval";
import { SCOPE_DEFINITIONS } from "../../../lib/services/problemBank";

export default function SeekerDashboard() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center", color: "#00ff41", border: "1px solid #00ff41", background: "rgba(0,255,65,0.05)", fontFamily: "'JetBrains Mono', monospace" }}>
          [ INITIALIZING_SEEKER_DASHBOARD... ]
        </div>
      }
    >
      <SeekerDashboardContent />
    </Suspense>
  );
}

const DEFAULT_COMPANY_PROBLEM = {
  id: "nordic-goods-3ds",
  companyName: "Nordic Goods",
  rawTitle: "Mobile 3DS Checkout Timeout",
  domain: "engineering",
  redefinedTitle: "Nordic Goods // Mobile 3DS Handshake Deadlock",
  incidentOverview: "During peak Black Friday mobile checkout, iOS Safari shoppers get stuck on blank 3D Secure modal handshakes. The payment gateway webhook never fires, thread saturation reaches 98.4%, and 42,000 active sessions are dropped. Estimated revenue exposure: $380,000.",
  blastRadius: "42,000 active sessions // $380K revenue risk",
  subEnvironments: [
    {
      subEnv: 1,
      id: "comp-sub-1",
      title: "01 — Live Infrastructure & Telemetry Triage",
      envType: "Linux SSH / Remote Server",
      description: "Investigate remote Linux server aura-prod-app-04 via SSH, grep system logs for 3DS gateway timeouts, and identify connection pool starvation.",
      problemStatement: "Checkout requests are timing out (>30s) during Black Friday traffic bursts. Inspect remote Linux server aura-prod-app-04 via SSH, check system resource metrics (ps aux, top, free -m), inspect 3DS timeout logs, and isolate connection pool starvation.",
      skinType: "ide",
    },
    {
      subEnv: 2,
      id: "comp-sub-2",
      title: "02 — Network Diagnostics Lab",
      envType: "CLI / Network Tools",
      description: "Diagnose DNS resolution and payment gateway handshake drops. Identify whether 3DS callbacks are being dropped at ingress or upstream.",
      problemStatement: "Determine whether checkout failures originate from DNS misdirection or payment gateway webhook drops using diagnostic CLI tools (nslookup, dig, curl, nc, ss -s).",
      skinType: "ide",
    },
    {
      subEnv: 3,
      id: "comp-sub-3",
      title: "03 — Code Debugger & Idempotency Patch",
      envType: "IDE / Debugger",
      description: "Inspect checkout.ts, reproduce the 3DS verification deadlock, patch the race condition, and run test suite.",
      problemStatement: "Fix the race condition in checkout.ts by acquiring atomic order lock before external 3DS charge dispatch.",
      skinType: "ide",
    },
  ],
  observerPersonaPrompt: "You are the Lead SRE observing this candidate solving Nordic Goods' Mobile 3DS outage. Evaluate their structured debugging and tool utilization.",
};

function SeekerDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const domainParam = (searchParams.get("domain") || "engineering").toLowerCase();
  const subEnvParam = searchParams.get("subEnv");
  const initialSubEnvNum = Number(subEnvParam) || 1;

  const [currentDomain, setCurrentDomain] = useState<string>(domainParam);
  const [loadingSub, setLoadingSub] = useState<number | null>(null);
  const [challengeSource, setChallengeSource] = useState<"company" | "standard">("company");
  const [companyProblemsList, setCompanyProblemsList] = useState<any[]>([DEFAULT_COMPANY_PROBLEM]);
  const [selectedProblemIdx, setSelectedProblemIdx] = useState<number>(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("praxis_custom_company_problems");
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list) && list.length > 0) {
          setCompanyProblemsList(list);
          return;
        }
      }
      localStorage.setItem("praxis_custom_company_problems", JSON.stringify([DEFAULT_COMPANY_PROBLEM]));
      localStorage.setItem("praxis_active_custom_problem", JSON.stringify(DEFAULT_COMPANY_PROBLEM));
    } catch {}
  }, []);

  useEffect(() => {
    if (domainParam) setCurrentDomain(domainParam);
  }, [domainParam]);

  const activeScope = SCOPE_DEFINITIONS[currentDomain] || SCOPE_DEFINITIONS.engineering;
  const activeCompanyProblem = companyProblemsList[selectedProblemIdx] || DEFAULT_COMPANY_PROBLEM;

  const handleLaunchCompanyProblem = (prob: any, subEnvNum: number = 1) => {
    try {
      localStorage.setItem("praxis_active_custom_problem", JSON.stringify(prob));
    } catch {}
    router.push(`/simulation/custom-${prob.id || "comp"}?domain=${prob.domain || currentDomain}&subEnv=${subEnvNum}&customProblem=1&skin=ide`);
  };

  const handleLaunchSubEnv = async (subEnvNum: number, skinType: string = "ide") => {
    setLoadingSub(subEnvNum);
    try {
      if (challengeSource === "company") {
        handleLaunchCompanyProblem(activeCompanyProblem, subEnvNum);
        return;
      }
      const result = await startSimulationAction(currentDomain, 50, "test-candidate-id", undefined, subEnvNum);
      if (typeof window !== "undefined") {
        localStorage.setItem(`praxis_session_${result.sessionId}`, JSON.stringify(result.state));
      }
      router.push(`/simulation/${result.sessionId}?domain=${currentDomain}&subEnv=${subEnvNum}&skin=${skinType}`);
    } catch (e) {
      console.error("[SEEKER] Launch failed", e);
      setLoadingSub(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#05070e", color: "#f8fafc", fontFamily: "'JetBrains Mono', monospace", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `1px solid ${activeScope.accent}40`, paddingBottom: 20, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, color: activeScope.accent, textTransform: "uppercase", letterSpacing: "2px", marginBottom: 6 }}>
              [ SYS.ACTIVE // AURA COMMERCE SIMULATION ENGINE ]
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", margin: 0, color: "#fff" }}>
              CANDIDATE ASSIGNMENT PORTAL
            </h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>Selected Scope</div>
            <div style={{ fontSize: 15, color: activeScope.accent, fontWeight: 800 }}>
              {activeScope.label.toUpperCase()} // 3 SUB-ENVIRONMENTS
            </div>
          </div>
        </div>

        {/* 7 Scope Switcher Tabs */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
            SELECT OPERATIONAL SCOPE (7 TOTAL):
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
            {Object.keys(SCOPE_DEFINITIONS).map((key) => {
              const scopeDef = SCOPE_DEFINITIONS[key];
              const isSelected = currentDomain === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setCurrentDomain(key);
                    router.push(`/seeker/dashboard?domain=${key}`);
                  }}
                  style={{
                    padding: "10px 8px",
                    background: isSelected ? `${scopeDef.accent}20` : "rgba(255,255,255,0.02)",
                    color: isSelected ? scopeDef.accent : "#94a3b8",
                    border: `1px solid ${isSelected ? scopeDef.accent : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: "all 0.15s ease",
                  }}
                >
                  {scopeDef.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Challenge Source Selector */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>SELECT CHALLENGE:</span>
            <button
              onClick={() => setChallengeSource("company")}
              style={{
                padding: "8px 16px",
                background: challengeSource === "company" ? "#00ff41" : "rgba(0,255,65,0.06)",
                color: challengeSource === "company" ? "#000" : "#00ff41",
                border: "1.5px solid #00ff41",
                borderRadius: 4,
                fontWeight: 900,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                boxShadow: challengeSource === "company" ? "0 0 15px rgba(0,255,65,0.4)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ⚡ {activeCompanyProblem.companyName.toUpperCase()} (COMPANY SUBMITTED)
            </button>
            <button
              onClick={() => setChallengeSource("standard")}
              style={{
                padding: "8px 16px",
                background: challengeSource === "standard" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.03)",
                color: challengeSource === "standard" ? "#fff" : "#64748b",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 4,
                fontWeight: 800,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              🏢 AURA COMMERCE (STANDARD BENCHMARK)
            </button>
          </div>

          {companyProblemsList.length > 1 && challengeSource === "company" && (
            <select
              value={selectedProblemIdx}
              onChange={(e) => setSelectedProblemIdx(Number(e.target.value))}
              style={{
                background: "#070b16",
                color: "#00ff41",
                border: "1px solid #00ff41",
                padding: "6px 12px",
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                outline: "none",
                cursor: "pointer",
                borderRadius: 4,
              }}
            >
              {companyProblemsList.map((p, idx) => (
                <option key={idx} value={idx}>
                  {p.companyName}: {p.redefinedTitle || p.rawTitle}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Active Project Overview Card */}
        <div
          style={{
            background: "#090d1a",
            border: `1.5px solid ${challengeSource === "company" ? "#00ff41" : activeScope.accent}50`,
            borderRadius: 10,
            padding: 24,
            marginBottom: 28,
            boxShadow: challengeSource === "company" ? "0 8px 30px rgba(0,255,65,0.15)" : `0 8px 30px rgba(0,0,0,0.6), 0 0 15px ${activeScope.accent}15`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <span
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: challengeSource === "company" ? "#00ff41" : "rgba(255,255,255,0.06)",
                  color: challengeSource === "company" ? "#000" : activeScope.accent,
                  fontWeight: 900,
                }}
              >
                {challengeSource === "company"
                  ? `⚡ ${activeCompanyProblem.companyName.toUpperCase()} // COMPANY SUBMITTED PROBLEM`
                  : "PROJECT BRIEF"}
              </span>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: "8px 0 4px" }}>
                {challengeSource === "company"
                  ? (activeCompanyProblem.redefinedTitle || activeCompanyProblem.rawTitle)
                  : activeScope.projectTitle}
              </h2>
            </div>
            <span
              style={{
                fontSize: 11,
                color: challengeSource === "company" ? "#00ff41" : activeScope.accent,
                border: `1px solid ${challengeSource === "company" ? "#00ff41" : activeScope.accent}40`,
                padding: "4px 10px",
                borderRadius: 4,
                fontWeight: 700,
              }}
            >
              {challengeSource === "company"
                ? (activeCompanyProblem.blastRadius || "3 SUB-ENVIRONMENTS")
                : "3 SUB-ENVIRONMENTS"}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
            {challengeSource === "company"
              ? activeCompanyProblem.incidentOverview
              : activeScope.projectOverview}
          </p>
        </div>

        {/* 3 Sub-Environments Detailed Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>
            &gt; AVAILABLE_SUB_ENVIRONMENTS (CHOOSE ANY TO LAUNCH):
          </div>

          {(challengeSource === "company"
            ? (activeCompanyProblem.subEnvironments || activeScope.subEnvironments)
            : activeScope.subEnvironments
          ).map((sub: any) => {
            const isLoadingThis = loadingSub === sub.subEnv;
            const cardAccent = challengeSource === "company" ? "#00ff41" : activeScope.accent;
            return (
              <motion.div
                key={sub.id || sub.subEnv}
                whileHover={{ scale: 1.008, borderColor: cardAccent }}
                style={{
                  padding: 24,
                  background: "#070b16",
                  border: `1px solid ${cardAccent}35`,
                  borderRadius: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 20,
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onClick={() => handleLaunchSubEnv(sub.subEnv, sub.skinType || "ide")}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        border: `1px solid ${cardAccent}`,
                        color: cardAccent,
                        borderRadius: 4,
                        fontWeight: 800,
                      }}
                    >
                      SUB-ENV 0{sub.subEnv}
                    </span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      [ {(sub.envType || "CLI / REMOTE TERMINAL").toUpperCase()} ]
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, color: "#fff", fontWeight: 800, margin: "0 0 6px" }}>
                    {sub.title}
                  </h3>

                  <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10, lineHeight: 1.5 }}>
                    {sub.description}
                  </div>

                  <div
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.06)",
                      fontSize: 11,
                      color: "#cbd5e1",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong style={{ color: cardAccent }}>Problem Statement: </strong>
                    {sub.problemStatement}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 160 }}>
                  <button
                    disabled={isLoadingThis}
                    style={{
                      padding: "10px 18px",
                      background: cardAccent,
                      color: "#000",
                      fontWeight: 900,
                      fontSize: 12,
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    <span>{isLoadingThis ? "INITIALIZING..." : "LAUNCH SUB-ENV ▶"}</span>
                  </button>
                  <span style={{ fontSize: 10, color: "#64748b" }}>
                    Mode: {(sub.skinType || "ide").toUpperCase()}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
