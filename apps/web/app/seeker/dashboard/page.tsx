"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Suspense, useState, useEffect } from "react";
import { startSimulationAction, getProblemsByDomainAction } from "../../../actions/eval";

export default function SeekerDashboard() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#00ff41", border: "1px solid #00ff41", background: "rgba(0,255,65,0.05)" }}>[ LOADING_DASHBOARD... ]</div>}>
      <SeekerDashboardContent />
    </Suspense>
  );
}

function SeekerDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const domainParam = searchParams.get("domain");
  const domain = domainParam || "engineering"; // Default to engineering if nothing assigned

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [liveProblems, setLiveProblems] = useState<any[]>([]);
  const [showJudgeMode, setShowJudgeMode] = useState(false);

  // All available domains metadata
  const domainMetadata: Record<string, any> = {
    engineering: { label: "Engineering", skin: "ide", accent: "#00ff41", scenarios: [
      "Critical system outage: Debug a distributed rate limiter causing cascaded failures.",
      "Memory leak detected: Resolve an OOM issue in the high-throughput worker node.",
      "Database deadlock: Optimize the locking strategy for the transaction ledger."
    ]},
    sales: { label: "Sales", skin: "roleplay", accent: "#f59e0b", scenarios: [
      "High-stakes negotiation: Close an enterprise contract with a skeptical CTO.",
      "Client churn risk: Save a key account after a major service disruption.",
      "Channel partnership: Structure a new revenue-sharing agreement with a Tier-1 partner."
    ]},
    product: { label: "Product", skin: "inbox", accent: "#818cf8", scenarios: [
      "Strategic pivot: Redefine the pricing model after a competitor's aggressive move.",
      "Roadmap prioritization: Balance technical debt vs. high-growth feature requests.",
      "Product-Market Fit: Analyze user feedback to define the MVP for a new AI vertical."
    ]},
    data: { label: "Data", domain: "data", skin: "ide", accent: "#06b6d4", scenarios: [
      "Data integrity crisis: Optimize a failing ETL pipeline dropping production records.",
      "Query bottleneck: Resolve a 30s latency issue in the real-time analytics engine.",
      "Pipeline migration: Sync petabyte-scale datasets across regional clusters."
    ]},
  };

  const activeDomain = domainMetadata[domain.toLowerCase()] || domainMetadata.engineering;

  useEffect(() => {
    async function loadProblems() {
      setFetching(true);
      try {
        const res = await getProblemsByDomainAction(domain);
        if (res.success) {
          setLiveProblems(res.problems || []);
        }
      } catch (e) {
        console.error("Failed to fetch live problems", e);
      }
      setFetching(false);
    }
    loadProblems();
  }, [domain]);

  const handleStartSimulation = async (problemId: string, skin: string) => {
    setLoading(true);
    try {
      const result = await startSimulationAction(domain, 50, "test-user-id", problemId);

      // Store initial state for the simulation page to pick up
      localStorage.setItem(`praxis_session_${result.sessionId}`, JSON.stringify(result.state));

      router.push(`/simulation/${result.sessionId}?skin=${skin}&domain=${domain}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#fff", fontFamily: "'JetBrains Mono', monospace", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1px solid #00ff41", paddingBottom: 24, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 12, color: "#00ff41", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>[ SYS.ACTIVE ]</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", margin: 0, color: "#00ff41" }}>SEEKER_DASHBOARD</h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase" }}>Current Tier</div>
            <div style={{ fontSize: 16, color: "#fff", fontWeight: 700 }}>{domain.toUpperCase()} / LEVEL 1</div>
          </div>
        </div>

        <h2 style={{ fontSize: 16, color: "#aaa", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 24 }}>&gt; ASSIGNED_PROBLEMS</h2>

        {fetching ? (
          <div style={{ padding: 40, textAlign: "center", color: "#00ff41", border: "1px solid #00ff41", background: "rgba(0,255,65,0.05)" }}>
            [ FETCHING_LIVE_NODES... ]
          </div>
        ) : (
          <>
            {/* Main Assignment Section */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 14, color: activeDomain.accent, textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>
                  &gt; ASSIGNED_PROBLEMS: {activeDomain.label.toUpperCase()}
                </h2>
                <div 
                  onClick={() => setShowJudgeMode(!showJudgeMode)}
                  style={{ fontSize: 11, color: "#666", cursor: "pointer", border: "1px solid #333", padding: "4px 8px" }}
                >
                  {showJudgeMode ? "[ HIDE_OTHER_DOMAINS ]" : "[ SWITCH_DOMAIN_OVERRIDE ]"}
                </div>
              </div>

              {/* Judge Mode Override */}
              {showJudgeMode && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24, padding: 12, background: "rgba(255,255,255,0.03)", border: "1px dashed #333" }}>
                  {Object.keys(domainMetadata).map(d => (
                    <button 
                      key={d}
                      onClick={() => router.push(`/seeker/dashboard?domain=${d}`)}
                      style={{ 
                        padding: "8px", 
                        background: domain === d ? domainMetadata[d].accent : "transparent",
                        color: domain === d ? "#000" : domainMetadata[d].accent,
                        border: `1px solid ${domainMetadata[d].accent}`,
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                        textTransform: "uppercase"
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: "grid", gap: 16 }}>
                {/* 1. Show live problems if any */}
                {liveProblems.map((prob) => (
                  <motion.div
                    key={prob.id}
                    whileHover={{ scale: 1.01, borderColor: activeDomain.accent }}
                    style={{ padding: 24, background: "#050505", border: `1px solid ${activeDomain.accent}40`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    onClick={() => handleStartSimulation(prob.id, activeDomain.skin)}
                  >
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, padding: "2px 6px", border: `1px solid ${activeDomain.accent}`, color: activeDomain.accent, textTransform: "uppercase" }}>{prob.company?.name || "PARTNER_NODE"}</span>
                        <span style={{ fontSize: 10, color: "#555" }}>[ {activeDomain.skin.toUpperCase()} ]</span>
                      </div>
                      <div style={{ fontSize: 16, color: "#fff", fontWeight: 700 }}>{prob.title}</div>
                    </div>
                    <div style={{ color: activeDomain.accent, fontSize: 14, fontWeight: 900 }}>LAUNCH ▶</div>
                  </motion.div>
                ))}

                {/* 2. Show generated variants for the domain */}
                {activeDomain.scenarios.map((scenarioText: string, i: number) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.01, borderColor: activeDomain.accent }}
                    style={{ padding: 24, background: "#050505", border: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    onClick={async () => {
                      if (loading) return;
                      setLoading(true);
                      try {
                        const result = await startSimulationAction(domain, 50, "test-user-id");
                        localStorage.setItem(`praxis_session_${result.sessionId}`, JSON.stringify(result.state));
                        router.push(`/simulation/${result.sessionId}?skin=${activeDomain.skin}&domain=${domain}`);
                      } catch (e) {
                        console.error(e);
                        setLoading(false);
                        alert("Simulation init failed. Please check network.");
                      }
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, padding: "2px 6px", border: `1px solid ${activeDomain.accent}`, color: activeDomain.accent, textTransform: "uppercase" }}>GEN_NODE_{i+1}</span>
                        <span style={{ fontSize: 10, color: "#555" }}>[ {activeDomain.skin.toUpperCase()} ]</span>
                      </div>
                      <div style={{ fontSize: 15, color: "#fff", marginBottom: 4, fontWeight: 700 }}>{scenarioText.split(":")[0]}</div>
                      <div style={{ fontSize: 13, color: "#888" }}>{scenarioText.split(":")[1]}</div>
                    </div>
                    <div style={{ color: activeDomain.accent, fontSize: 14, fontWeight: 900 }}>{loading ? "..." : "INIT ▶"}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
