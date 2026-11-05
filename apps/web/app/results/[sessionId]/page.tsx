"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getSessionResultsAction } from "../../../actions/eval";
import type { EvaluationReport } from "../../../lib/agents/evaluator";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      const result = await getSessionResultsAction(sessionId);
      if (result.success && result.report) {
        setReport(result.report);
        setMeta(result.sessionMeta);

        // Animate score counter
        let current = 0;
        const target = result.report.compositeScore;
        const interval = setInterval(() => {
          current += 1.5;
          if (current >= target) {
            setAnimatedScore(target);
            clearInterval(interval);
          } else {
            setAnimatedScore(Math.round(current * 10) / 10);
          }
        }, 20);
      }
      setLoading(false);
    }
    fetchResults();
  }, [sessionId]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#020202", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ color: "#00ff41", fontSize: 14 }}>
          [ COMPUTING_EVALUATION... ]
        </motion.div>
      </div>
    );
  }

  if (!report || !meta) {
    return (
      <div style={{ minHeight: "100vh", background: "#020202", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace" }}>
        [ ERROR: SESSION_NOT_FOUND ]
      </div>
    );
  }

  const scoreColor = report.compositeScore >= 80 ? "#22c55e" : report.compositeScore >= 60 ? "#f59e0b" : "#ef4444";
  const tierColor = report.tier === "exceptional" ? "#00ff41" : report.tier === "strong" ? "#22c55e" : report.tier === "competent" ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ minHeight: "100vh", background: "#020202", color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 100px" }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: "#00ff41", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>[ STEP 6: EVALUATION_COMPLETE ]</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px", textTransform: "uppercase" }}>Portable Record</h1>
          <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
            SESSION {sessionId?.slice(0, 8)}... // {meta.domain?.toUpperCase()} // {report.tier?.toUpperCase()}
          </p>
        </motion.div>

        {/* Composite Score */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: "spring" }} style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ width: 160, height: 160, border: `2px solid ${scoreColor}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", position: "relative", background: `${scoreColor}08` }}>
            <svg width="160" height="160" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
              <rect x="2" y="2" width="156" height="156" fill="none" stroke={`${scoreColor}30`} strokeWidth="2" />
              <line x1="2" y1="2" x2={2 + (animatedScore / 100) * 156} y2="2" stroke={scoreColor} strokeWidth="3" />
              <line x1={2 + 156} y1="2" x2={2 + 156} y2={2 + (animatedScore / 100) * 156} stroke={scoreColor} strokeWidth="3" />
            </svg>
            <div>
              <div style={{ fontSize: 42, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{animatedScore}</div>
              <div style={{ fontSize: 10, color: "#555", marginTop: 4, textTransform: "uppercase" }}>COMPOSITE</div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: tierColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px" }}>
            TIER: {report.tier}
          </div>
        </motion.div>

        {/* Dimensional Scores */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: "#00ff41", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 16 }}>[ PROCESS_DIMENSIONS ]</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {Object.entries(report.dimensionalScores).map(([key, value], i) => {
              const label = key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
              const barColor = (value as number) >= 85 ? "#22c55e" : (value as number) >= 70 ? "#00ff41" : (value as number) >= 50 ? "#f59e0b" : "#ef4444";
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  style={{ padding: "12px 14px", background: "#050505", border: "1px solid #1a1a1a" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#666" }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{value as number}</span>
                  </div>
                  <div style={{ height: 3, background: "#1a1a1a", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${value as number}%` }}
                      transition={{ delay: 0.8 + i * 0.05, duration: 0.6 }}
                      style={{ height: "100%", background: barColor }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Observer Insights */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: "#00ff41", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 16 }}>[ OBSERVER_INSIGHTS ]</div>

          {/* Process Narrative */}
          {report.processNarrative.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {report.processNarrative.map((note, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1 + i * 0.1 }}
                  style={{ padding: "10px 14px", background: "rgba(0,255,65,0.03)", border: "1px solid rgba(0,255,65,0.15)", fontSize: 12, color: "#aaa", lineHeight: 1.6 }}
                >
                  <span style={{ color: "#00ff41", fontWeight: 700, marginRight: 6 }}>→</span> {note}
                </motion.div>
              ))}
            </div>
          )}

          {/* Raw observer notes from session */}
          {meta.observerNotes?.length > 0 && (
            <div style={{ padding: 14, background: "#050505", border: "1px solid #1a1a1a", marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", marginBottom: 8 }}>RAW TELEMETRY NOTES</div>
              {meta.observerNotes.slice(-5).map((note: string, i: number) => (
                <div key={i} style={{ fontSize: 11, color: "#666", lineHeight: 1.6, marginBottom: 4 }}>
                  <span style={{ color: "#444" }}>▸</span> {note}
                </div>
              ))}
            </div>
          )}

          {/* Strengths & Growth */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: 14, background: "rgba(34,197,94,0.03)", border: "1px solid rgba(34,197,94,0.15)" }}>
              <div style={{ fontSize: 10, color: "#22c55e", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>STRENGTHS</div>
              {report.strengthAreas.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>✦ {s}</div>
              ))}
            </div>
            <div style={{ padding: 14, background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div style={{ fontSize: 10, color: "#f59e0b", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>GROWTH AREAS</div>
              {report.growthAreas.length > 0 ? report.growthAreas.map((g, i) => (
                <div key={i} style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>△ {g}</div>
              )) : <div style={{ fontSize: 12, color: "#555" }}>No significant gaps detected</div>}
            </div>
          </div>
        </motion.div>

        {/* ══════ 2FA VERIFICATION BOARD ══════ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }} style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: "#00ff41", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 16 }}>[ 2FA_VERIFICATION_BOARD ]</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {/* Signal 1: Simulation Score (Factor A) */}
            <div style={{ padding: 20, background: "#050505", border: `1px solid ${report.compositeScore >= 70 ? "#22c55e40" : "#f59e0b40"}`, textAlign: "center" }}>
              <div style={{ width: 32, height: 32, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${report.compositeScore >= 70 ? "#22c55e" : "#f59e0b"}`, fontSize: 14 }}>
                {report.compositeScore >= 70 ? "✓" : "△"}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>Simulation Score</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: scoreColor, marginBottom: 4 }}>{report.compositeScore}</div>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>FACTOR A: {report.compositeScore >= 70 ? "VERIFIED" : "BELOW THRESHOLD"}</div>
            </div>

            {/* Signal 2: Reputation Network (Factor B) */}
            <div style={{ padding: 20, background: "#050505", border: "1px solid #44444440", textAlign: "center" }}>
              <div style={{ width: 32, height: 32, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #555", fontSize: 14, color: "#555" }}>
                ○
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>Reputation Network</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#555", marginBottom: 4 }}>UNVERIFIED</div>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>FACTOR B: PENDING</div>
              <button
                style={{ marginTop: 8, padding: "6px 12px", fontSize: 10, background: "transparent", border: "1px solid #444", color: "#888", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}
              >
                REQUEST TESTIMONY
              </button>
            </div>

            {/* Signal 3: Outcome Tracking (Factor C) */}
            <div style={{ padding: 20, background: "#050505", border: "1px solid #44444440", textAlign: "center" }}>
              <div style={{ width: 32, height: 32, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #555", fontSize: 14, color: "#555" }}>
                ○
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>Outcome Tracking</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#555", marginBottom: 4 }}>PENDING HIRE</div>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>FACTOR C: PENDING</div>
              <button
                style={{ marginTop: 8, padding: "6px 12px", fontSize: 10, background: "transparent", border: "1px solid #444", color: "#888", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase" }}
              >
                VIEW ANALYTICS
              </button>
            </div>
          </div>

          {/* Escalation Summary */}
          <div style={{ marginTop: 16, padding: 14, background: "#050505", border: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>ESCALATION MANAGEMENT</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: report.escalationManagement === "excellent" ? "#22c55e" : report.escalationManagement === "good" ? "#00ff41" : "#f59e0b", textTransform: "uppercase" }}>{report.escalationManagement}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>HIDDEN CONDITIONS DISCOVERED</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{report.hiddenConditionsDiscovered}/{report.totalHiddenConditions}</div>
            </div>
          </div>

          {/* Recommended Next Step */}
          <div style={{ marginTop: 12, padding: 14, background: "rgba(0,255,65,0.03)", border: "1px solid rgba(0,255,65,0.15)" }}>
            <div style={{ fontSize: 10, color: "#00ff41", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>RECOMMENDED NEXT STEP</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>{report.recommendedNextStep}</div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/seeker/onboarding")}
            style={{ padding: "12px 28px", fontSize: 12, fontWeight: 700, color: "#000", background: "#00ff41", border: "none", cursor: "pointer", textTransform: "uppercase" }}
          >
            [ NEW_ASSESSMENT ]
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            style={{ padding: "12px 28px", fontSize: 12, fontWeight: 500, color: "#666", background: "transparent", border: "1px solid #333", cursor: "pointer", textTransform: "uppercase", fontFamily: "inherit" }}
          >
            [ HOME ]
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
