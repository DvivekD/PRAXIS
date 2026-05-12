"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { analyzeResumeAction } from "../../../actions/resume";

const AvatarScene = dynamic(() => import("../../../components/Avatar/AvatarScene"), { ssr: false });

export default function SeekerOnboarding() {
  const router = useRouter();
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [currentDomain, setCurrentDomain] = useState("onboarding");
  const [showAnalysisData, setShowAnalysisData] = useState(false);

  const handleAnalyze = async () => {
    if (!resumeText.trim()) return;
    setLoading(true);
    setCurrentDomain("onboarding");
    setShowAnalysisData(false);
    
    try {
      const result = await analyzeResumeAction(resumeText);
      if (result.success) {
        setAnalysis(result.analysis);
        // Dramatic delay before snapping to the new domain
        setTimeout(() => {
          setCurrentDomain(result.analysis.domain);
          // Show the analysis text card after the morph
          setTimeout(() => setShowAnalysisData(true), 1000);
        }, 1500);
      } else {
        alert("Failed to analyze resume.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleProceed = () => {
    // In a real app, this sets the user session state
    router.push(`/seeker/dashboard?domain=${analysis.domain}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020202", color: "#fff", fontFamily: "'JetBrains Mono', monospace", padding: "80px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid #222", paddingBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#00ff41", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>[ SYS.INIT ]</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>Baseline Litmus Test</h1>
          <p style={{ color: "#666", marginTop: 8, fontSize: 14 }}>Upload or paste your CV. Our AI will analyze your vectors and assign your initial tier and domain.</p>
        </div>

        {!analysis ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your plain-text resume here...&#10;&#10;E.g. Senior Software Engineer at TechCorp. Built scalable microservices..."
              style={{
                width: "100%",
                height: 300,
                background: "#050505",
                border: "1px solid #333",
                color: "#00ff41",
                fontFamily: "inherit",
                fontSize: 13,
                padding: 20,
                outline: "none",
                resize: "vertical",
                marginBottom: 24,
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !resumeText.trim()}
              style={{
                padding: "16px 32px",
                background: loading ? "#222" : "#00ff41",
                color: loading ? "#666" : "#000",
                border: "none",
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {loading ? "[ ANALYZING_VECTORS... ]" : "[ INITIATE_SCAN ]"}
            </button>
          </motion.div>
        ) : (
          <div style={{ position: "relative", height: 400, marginBottom: 40 }}>
            {/* The Morphing 3D Core */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: "100%", height: "100%", borderRadius: 16, overflow: "hidden" }}>
              <AvatarScene analyserNode={null} domain={currentDomain} />
            </motion.div>
          </div>
        )}

        {showAnalysisData && analysis && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: "#050505", border: "1px solid #00ff41", padding: 32 }}>
            <div style={{ fontSize: 12, color: "#00ff41", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 24 }}>[ SCAN_COMPLETE ]</div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Assigned Domain</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", textTransform: "uppercase" }}>{analysis.domain}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Baseline Confidence</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>{analysis.estimatedBaselineScore}%</div>
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 8 }}>AI Reasoning</div>
              <p style={{ fontSize: 14, color: "#aaa", lineHeight: 1.6, margin: 0 }}>{analysis.reasoning}</p>
            </div>

            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 12 }}>Detected Competencies</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {analysis.coreCompetencies.map((comp: string, i: number) => (
                  <span key={i} style={{ padding: "6px 12px", background: "rgba(0,255,65,0.1)", border: "1px solid rgba(0,255,65,0.3)", color: "#00ff41", fontSize: 12 }}>
                    {comp}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleProceed}
              style={{
                padding: "16px 32px",
                background: "#fff",
                color: "#000",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              [ ENTER_DASHBOARD ]
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
