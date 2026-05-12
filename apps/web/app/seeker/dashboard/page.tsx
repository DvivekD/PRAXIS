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
  const domain = searchParams.get("domain") || "engineering";

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [liveProblems, setLiveProblems] = useState<any[]>([]);

  useEffect(() => {
    async function loadProblems() {
      setFetching(true);
      const res = await getProblemsByDomainAction(domain);
      if (res.success) {
        setLiveProblems(res.problems || []);
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
            {/* Live company problems */}
            {liveProblems.length > 0 && (
              <div style={{ display: "grid", gap: 16, marginBottom: 32 }}>
                {liveProblems.map((prob) => {
                  const targetSkin = ["engineering", "data"].includes(prob.domain) ? "ide" : "roleplay";
                  return (
                    <motion.div
                      key={prob.id}
                      whileHover={{ scale: 1.01, borderColor: "#00ff41" }}
                      style={{
                        padding: 24,
                        background: "rgba(0,255,65,0.02)",
                        border: "1px solid #222",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", border: "1px solid #00ff41", color: "#00ff41", textTransform: "uppercase" }}>
                            {prob.company?.name || "UNKNOWN_CORP"}
                          </span>
                          <span style={{ fontSize: 11, color: "#00ff41" }}>[ {targetSkin.toUpperCase()} ]</span>
                        </div>
                        <h3 style={{ fontSize: 18, margin: 0, color: "#e4e4e7" }}>{prob.title}</h3>
                      </div>
                      <button
                        onClick={() => handleStartSimulation(prob.id, targetSkin)}
                        disabled={loading}
                        style={{
                          padding: "12px 24px",
                          background: "transparent",
                          color: "#00ff41",
                          border: "1px solid #00ff41",
                          cursor: loading ? "not-allowed" : "pointer",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          opacity: loading ? 0.5 : 1,
                          fontFamily: "inherit",
                        }}
                      >
                        Launch
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Quick Start — always available */}
            <h2 style={{ fontSize: 14, color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16, marginTop: 24 }}>&gt; QUICK_START (Built-in Scenarios)</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                { label: "Engineering", skin: "ide", desc: "Debug a distributed rate limiter", accent: "#00ff41" },
                { label: "Sales", skin: "roleplay", desc: "Enterprise contract negotiation", accent: "#f59e0b" },
                { label: "Product", skin: "roleplay", desc: "Pricing model pivot strategy", accent: "#818cf8" },
                { label: "Data", skin: "ide", desc: "Optimize a failing ETL pipeline", accent: "#06b6d4" },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  whileHover={{ scale: 1.01, borderColor: item.accent }}
                  style={{ padding: 20, background: "#050505", border: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const result = await startSimulationAction(item.label.toLowerCase(), 50, "test-user-id");
                      localStorage.setItem(`praxis_session_${result.sessionId}`, JSON.stringify(result.state));
                      router.push(`/simulation/${result.sessionId}?skin=${item.skin}&domain=${item.label.toLowerCase()}`);
                    } catch (e) { console.error(e); setLoading(false); }
                  }}
                >
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, padding: "2px 6px", border: `1px solid ${item.accent}`, color: item.accent, textTransform: "uppercase" }}>{item.label}</span>
                      <span style={{ fontSize: 11, color: "#555" }}>[ {item.skin.toUpperCase()} ]</span>
                    </div>
                    <div style={{ fontSize: 14, color: "#aaa" }}>{item.desc}</div>
                  </div>
                  <div style={{ color: item.accent, fontSize: 12, fontWeight: 700 }}>▶</div>
                </motion.div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
