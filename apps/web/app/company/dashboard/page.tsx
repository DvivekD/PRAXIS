"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import { getCompanyProblemsAction, createProblemAction, getCompanyPipelineAction } from "../../../actions/company";

// Background 3D grid effect
function CyberGrid() {
  const groupRef = React.useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[15, 1]} />
        <meshBasicMaterial color="#00ff41" wireframe transparent opacity={0.03} />
      </mesh>
    </group>
  );
}

import React from "react";

export default function CompanyDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pipeline" | "problems" | "model" | "outcomes">("pipeline");

  const [problems, setProblems] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);

  // Problem Form State
  const [domain, setDomain] = useState("engineering");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");

  useEffect(() => {
    async function loadData() {
      if (activeTab === "problems") {
        const res = await getCompanyProblemsAction();
        if (res.success) setProblems(res.problems || []);
      } else if (activeTab === "pipeline") {
        const res = await getCompanyPipelineAction();
        if (res.success) setPipeline(res.pipeline || []);
      }
    }
    loadData();
  }, [activeTab]);

  const handleCreateProblem = async () => {
    const res = await createProblemAction({
      domain, title, description, setupCode, agentPrompt
    });
    if (res.success) {
      setProblems([res.problem, ...problems]);
      setTitle("");
      setDescription("");
      setSetupCode("");
      setAgentPrompt("");
    } else {
      alert("Failed to create problem: " + res.error);
    }
  };

  const mockModel = {
    accuracy: 84,
    insights: [
      "Candidates scoring high in 'Error Recovery' stay 40% longer at your company.",
      "Efficiency is a weak predictor of long-term performance for engineering roles.",
      "'Beyond Known Answer' candidates are 2x more likely to be promoted within 9 months.",
    ],
    weights: {
      approachQuality: 0.25,
      efficiency: 0.10,
      creativity: 0.05,
      errorRecovery: 0.30,
      beyondKnownAnswer: 0.10,
      toolUtilization: 0.05,
      communication: 0.10,
      ambiguityHandling: 0.05,
    },
  };

  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 0, border: "1px solid #00ff41", background: "rgba(0, 255, 65, 0.05)", color: "#e4e4e7", fontSize: 14, outline: "none", boxSizing: "border-box" as const, fontFamily: "'JetBrains Mono', monospace" };
  const labelStyle = { fontSize: 12, color: "#00ff41", fontWeight: 600, display: "block", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ minHeight: "100vh", background: "#020202", color: "#fff", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      {/* 3D Background */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0 }}>
        <Canvas camera={{ position: [0, 0, 10] }}>
          <CyberGrid />
        </Canvas>
      </div>

      {/* Header */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: "1px solid #00ff41" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => router.push("/")}>
          <div style={{ width: 28, height: 28, borderRadius: 0, border: "1px solid #00ff41", background: "rgba(0,255,65,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#00ff41" }}>PRAXIS</span>
          <span style={{ fontSize: 12, color: "#00ff41", fontWeight: 500, padding: "2px 8px", borderRadius: 0, border: "1px solid #00ff41", fontFamily: "'JetBrains Mono', monospace" }}>COMPANY_TERMINAL</span>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 32, fontWeight: 800, marginBottom: 32, letterSpacing: "-0.02em", fontFamily: "'JetBrains Mono', monospace" }}>SYS_DASHBOARD</motion.h1>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32, background: "rgba(0,255,65,0.05)", borderRadius: 0, padding: 4, width: "fit-content", border: "1px solid #00ff41" }}>
          {(["pipeline", "problems", "model", "outcomes"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 600, color: activeTab === tab ? "#080c14" : "#00ff41", background: activeTab === tab ? "#00ff41" : "transparent", border: "none", borderRadius: 0, cursor: "pointer", textTransform: "uppercase", transition: "all 0.2s", fontFamily: "'JetBrains Mono', monospace" }}>
              {tab === "pipeline" ? "PIPELINE" : tab === "problems" ? "PROBLEMS" : tab === "model" ? "MODEL" : "OUTCOMES"}
            </button>
          ))}
        </div>

        {/* Pipeline Tab */}
        {activeTab === "pipeline" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ borderRadius: 0, border: "1px solid #00ff41", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 2fr 1fr", padding: "12px 20px", background: "rgba(0,255,65,0.1)", fontSize: 11, fontWeight: 700, color: "#00ff41", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>
                <span>Candidate</span><span>Problem</span><span>Score</span><span>Process Signals</span><span>Turns</span>
              </div>
              {pipeline.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#00ff41", fontFamily: "'JetBrains Mono', monospace" }}>NO_DATA_FOUND</div>
              ) : (
                pipeline.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 2fr 1fr", padding: "16px 20px", borderTop: "1px solid #00ff41", alignItems: "center", fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{p.candidateName}</span>
                    <span style={{ color: "#a1a1aa", fontSize: 12 }}>{p.problemTitle}</span>
                    <span style={{ fontWeight: 700, color: p.cognitiveScore >= 85 ? "#00ff41" : p.cognitiveScore >= 70 ? "#f59e0b" : "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>{(p.cognitiveScore || 0).toFixed(1)}</span>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {Object.entries(p.processSignals || {}).slice(0, 3).map(([key, val]: any) => (
                        <span key={key} title={`${key}: ${val}`} style={{ fontSize: 10, padding: "2px 6px", border: "1px solid #00ff41", background: "rgba(0,255,65,0.1)", color: "#00ff41", fontFamily: "'JetBrains Mono', monospace" }}>
                          {key.substring(0, 8)}:{val > 0 ? '+' : ''}{val}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.resolutionTurns}</span>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Problems Tab */}
        {activeTab === "problems" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              {/* Form */}
              <div style={{ padding: 24, border: "1px solid #00ff41", background: "rgba(0,255,65,0.02)" }}>
                <h2 style={{ fontSize: 18, color: "#00ff41", marginBottom: 20, fontFamily: "'JetBrains Mono', monospace" }}>AUTHOR_PROBLEM</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Domain</label>
                    <select value={domain} onChange={(e) => setDomain(e.target.value)} style={inputStyle}>
                      <option value="engineering">Engineering</option>
                      <option value="sales">Sales</option>
                      <option value="product">Product</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="e.g. Memory Leak in Worker" />
                  </div>
                  <div>
                    <label style={labelStyle}>Description (Scenario)</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 80 }} placeholder="Explain the problem context..." />
                  </div>

                  {domain === "engineering" ? (
                    <div>
                      <label style={labelStyle}>Setup Code (Buggy/Initial State)</label>
                      <textarea value={setupCode} onChange={(e) => setSetupCode(e.target.value)} style={{ ...inputStyle, minHeight: 120 }} placeholder="function calculate() { ... }" />
                    </div>
                  ) : (
                    <div>
                      <label style={labelStyle}>Agent Prompt (Roleplay Instructions)</label>
                      <textarea value={agentPrompt} onChange={(e) => setAgentPrompt(e.target.value)} style={{ ...inputStyle, minHeight: 120 }} placeholder="You are an angry client who wants a refund..." />
                    </div>
                  )}

                  <button onClick={handleCreateProblem} style={{ padding: "12px 0", fontSize: 14, fontWeight: 700, color: "#080c14", background: "#00ff41", border: "none", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", marginTop: 8 }}>
                    &gt; SAVE_PROBLEM
                  </button>
                </div>
              </div>

              {/* List */}
              <div>
                <h2 style={{ fontSize: 18, color: "#00ff41", marginBottom: 20, fontFamily: "'JetBrains Mono', monospace" }}>PROBLEM_BANK</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {problems.map((prob) => (
                    <div key={prob.id} style={{ padding: 16, border: "1px solid rgba(0,255,65,0.4)", background: "rgba(0,255,65,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, color: "#00ff41", fontFamily: "'JetBrains Mono', monospace" }}>{prob.title}</span>
                        <span style={{ fontSize: 11, padding: "2px 6px", border: "1px solid #00ff41", color: "#00ff41", textTransform: "uppercase" }}>{prob.domain}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#a1a1aa", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{prob.description}</p>
                    </div>
                  ))}
                  {problems.length === 0 && (
                    <div style={{ color: "#71717a", fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>NO_PROBLEMS_FOUND</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Model Tab */}
        {activeTab === "model" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ padding: 28, borderRadius: 0, background: "rgba(0,255,65,0.02)", border: "1px solid #00ff41" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#00ff41", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>MODEL_ACCURACY_MATRIX</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
                  <div style={{ fontSize: 72, fontWeight: 900, color: "#00ff41", fontFamily: "'JetBrains Mono', monospace", lineHeight: 0.8 }}>{mockModel.accuracy}%</div>
                  <div style={{ paddingBottom: 6 }}>
                    <div style={{ display: "flex", gap: 2 }}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} style={{ width: 8, height: 24, background: i < 8 ? "#00ff41" : "rgba(0,255,65,0.2)" }} />
                      ))}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "#71717a", marginTop: 16 }}>Based on 47 cryptographically verified outcome records. Confidence interval: high.</p>
              </div>
              
              <div style={{ padding: 28, borderRadius: 0, background: "rgba(0,255,65,0.02)", border: "1px solid #00ff41" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#00ff41", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>HEURISTIC_WEIGHT_DISTRIBUTION</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(mockModel.weights).map(([key, val]) => {
                    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                    const width = `${val * 100}%`;
                    return (
                      <div key={key} style={{ display: "grid", gridTemplateColumns: "140px 1fr 40px", alignItems: "center", fontSize: 11, color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>
                        <span>{label.toUpperCase()}</span>
                        <div style={{ height: 4, background: "rgba(0,255,65,0.1)", width: "100%", position: "relative" }}>
                          <motion.div initial={{ width: 0 }} animate={{ width }} transition={{ duration: 1, delay: Math.random() * 0.5 }} style={{ position: "absolute", top: 0, left: 0, height: "100%", background: val >= 0.2 ? "#00ff41" : "#06b6d4", boxShadow: "0 0 8px rgba(0,255,65,0.5)" }} />
                        </div>
                        <span style={{ textAlign: "right", color: val >= 0.2 ? "#00ff41" : "#71717a" }}>{(val * 100).toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {mockModel.insights.map((insight, i) => (
                <div key={i} style={{ padding: "20px", borderRadius: 0, background: "rgba(0,255,65,0.04)", border: "1px solid rgba(0,255,65,0.3)", fontSize: 13, color: "#86efac", lineHeight: 1.6, fontFamily: "'JetBrains Mono', monospace", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ display: "inline-block", background: "#00ff41", color: "#000", padding: "2px 6px", fontSize: 10, fontWeight: "bold", marginBottom: 12 }}>SIGNAL_{i + 1}</span>
                    <div>{insight}</div>
                  </div>
                  <div style={{ height: 30, display: "flex", alignItems: "flex-end", gap: 2 }}>
                    {Array.from({ length: 20 }).map((_, j) => (
                      <motion.div key={j} animate={{ height: [Math.random() * 10 + 5, Math.random() * 25 + 5, Math.random() * 10 + 5] }} transition={{ repeat: Infinity, duration: 1.5 + Math.random(), ease: "linear" }} style={{ width: 4, background: "rgba(0,255,65,0.4)" }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Outcomes Tab */}
        {activeTab === "outcomes" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", padding: "80px 0" }}>
            <span style={{ fontSize: 48 }}>📊</span>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginTop: 16, color: "#00ff41", fontFamily: "'JetBrains Mono', monospace" }}>OUTCOME_TRACKING</h3>
            <p style={{ color: "#71717a", fontSize: 15, maxWidth: 400, margin: "8px auto 24px" }}>Submit post-hire performance data to train your predictive hiring model.</p>
            <button style={{ padding: "12px 28px", fontSize: 14, fontWeight: 600, color: "#080c14", background: "#00ff41", border: "none", borderRadius: 0, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>&gt; SUBMIT_DATA</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
