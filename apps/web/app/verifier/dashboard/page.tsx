"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function VerifierDashboard() {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);
    }, 2500);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'Inter', sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1px solid #818cf8", paddingBottom: 24, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 12, color: "#818cf8", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>[ SECURE NODE_04 ]</div>
            <h1 style={{ fontSize: 32, fontWeight: 900, textTransform: "uppercase", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>Curated Verification</h1>
            <p style={{ color: "#a1a1aa", marginTop: 8, fontSize: 14 }}>Manual review of AI heuristic logs before ZK-SNARK cryptographic sealing.</p>
          </div>
          <div style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#818cf8" }}>
            Status: <span style={{ color: "#22c55e" }}>ONLINE</span><br/>
            Node ID: cx_8f992a<br/>
            Pending Reviews: 1
          </div>
        </div>

        {/* Audit Panel */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 32 }}>
          
          {/* Main Log Review */}
          <div style={{ border: "1px solid rgba(129, 140, 248, 0.3)", background: "rgba(129, 140, 248, 0.05)" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(129, 140, 248, 0.3)", background: "rgba(129, 140, 248, 0.1)", fontSize: 12, fontWeight: 700, color: "#818cf8", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}>
              Simulation Audit Log — Session #994A
            </div>
            
            <div style={{ padding: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#e4e4e7", height: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ color: "#71717a" }}>&gt; Initializing playback...</div>
              <div><span style={{ color: "#f59e0b" }}>[T+0:12]</span> Candidate (Engineering) encountered Rate Limiter bug.</div>
              <div><span style={{ color: "#22c55e" }}>[T+1:05]</span> AI Observer: Candidate correctly identified race condition in Redis INCR/EXPIRE block.</div>
              <div><span style={{ color: "#818cf8" }}>[T+2:30]</span> Cognitive Load Spike detected (84/100). Candidate switching between terminal and code heavily.</div>
              <div><span style={{ color: "#f59e0b" }}>[T+4:15]</span> Candidate implemented Lua script fallback.</div>
              <div><span style={{ color: "#22c55e" }}>[T+5:00]</span> AI Observer: Solution successfully handles burst traffic. Efficiency rating: 92/100.</div>
              <div style={{ borderLeft: "2px solid #818cf8", paddingLeft: 12, margin: "12px 0", color: "#a1a1aa" }}>
                System heuristic concludes: "Candidate displays senior-level distributed systems knowledge, particularly in atomicity."
              </div>
              <div><span style={{ color: "#71717a" }}>&gt; End of log. Awaiting human verification.</span></div>
            </div>
          </div>

          {/* Action Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            <div style={{ border: "1px solid rgba(129, 140, 248, 0.3)", padding: 20, background: "rgba(129, 140, 248, 0.05)" }}>
              <div style={{ fontSize: 11, color: "#818cf8", textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>Proposed Metrics</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}><span style={{ color: "#a1a1aa" }}>Technical Approach</span><span style={{ color: "#fff", fontWeight: 700 }}>92</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}><span style={{ color: "#a1a1aa" }}>Communication</span><span style={{ color: "#fff", fontWeight: 700 }}>85</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}><span style={{ color: "#a1a1aa" }}>Error Recovery</span><span style={{ color: "#fff", fontWeight: 700 }}>88</span></div>
            </div>

            <div style={{ border: "1px solid rgba(129, 140, 248, 0.3)", padding: 20, background: "rgba(129, 140, 248, 0.05)", flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              {!verified ? (
                <>
                  <p style={{ fontSize: 12, color: "#a1a1aa", marginBottom: 20 }}>By approving, you mint a cryptographic proof (ZK-SNARK) validating this assessment to the candidate's public wallet.</p>
                  
                  <button 
                    onClick={handleVerify}
                    disabled={verifying}
                    style={{
                      width: "100%", padding: "16px 0", background: verifying ? "transparent" : "#818cf8", border: verifying ? "1px solid #818cf8" : "none", color: verifying ? "#818cf8" : "#000", fontWeight: 800, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", cursor: verifying ? "wait" : "pointer", transition: "all 0.2s"
                    }}
                  >
                    {verifying ? "[ MINTING_PROOF... ]" : "APPROVE & SEAL"}
                  </button>
                  <button style={{ width: "100%", padding: "16px 0", background: "transparent", border: "1px solid #ef4444", color: "#ef4444", fontWeight: 800, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", cursor: "pointer", marginTop: 12 }}>
                    REJECT FLAG
                  </button>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#22c55e", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>✓</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>PROOF MINTED</div>
                  <div style={{ fontSize: 10, color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all" }}>Hash: 0x9f8b...3a2c91</div>
                </motion.div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
