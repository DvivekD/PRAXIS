"use client";

import { useEffect, useState } from "react";
// @ts-ignore
import * as snarkjs from "snarkjs";

export function ResultsPage({ sessionId }: { sessionId: string }) {
  const [vc, setVc] = useState<any>(null);
  const [proof, setProof] = useState<string>("");
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`http://localhost:3001/credentials/issue/${sessionId}`, { method: "POST" })
      .then(res => res.json())
      .then(data => setVc(data))
      .catch(err => console.error("Failed to issue VC", err));
  }, [sessionId]);

  const downloadVc = () => {
    if (!vc) return;
    const blob = new Blob([JSON.stringify(vc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credential-${sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateProof = async () => {
    if (!vc) return;
    try {
      const score = vc.credentialSubject.performance.cognitiveLoadScore;
      const threshold = 80;

      // In a real environment, you would load the .wasm and .zkey from public folder
      // const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      //   { score, threshold },
      //   "/zk/score_threshold.wasm",
      //   "/zk/score_threshold_final.zkey"
      // );

      // MOCK for scaffold
      const mockProof = {
        pi_a: ["mock_a1", "mock_a2", "mock_a3"],
        pi_b: [["mock_b1", "mock_b2"], ["mock_b3", "mock_b4"], ["mock_b5", "mock_b6"]],
        pi_c: ["mock_c1", "mock_c2", "mock_c3"],
        protocol: "groth16",
        curve: "bn128"
      };

      setProof(JSON.stringify(mockProof, null, 2));
    } catch (err) {
      console.error("Proof generation failed", err);
      setProof("Error generating proof. Ensure ZK assets are built.");
    }
  };

  const verifyProof = async () => {
    if (!proof) return;
    try {
      // In a real env:
      // const vKey = await fetch("/zk/verification_key.json").then( res => res.json() );
      // const res = await snarkjs.groth16.verify(vKey, [80], JSON.parse(proof));
      // setVerificationResult(res);

      // MOCK
      setTimeout(() => setVerificationResult(true), 500);
    } catch (err) {
      console.error(err);
      setVerificationResult(false);
    }
  };

  if (!vc) return <div style={{ padding: 20, color: "white" }}>Loading results...</div>;

  const score = vc.credentialSubject.performance.cognitiveLoadScore;
  const passed = vc.credentialSubject.performance.simulationPassed;

  return (
    <div style={{ padding: 40, color: "white", fontFamily: "sans-serif", maxWidth: 800, margin: "0 auto" }}>
      <h1>Simulation Complete</h1>

      <div style={{ backgroundColor: "#2d2d2d", padding: 20, borderRadius: 8, marginBottom: 20 }}>
        <h2>Performance</h2>
        <p>Cognitive Load Score: <strong>{score}/100</strong></p>
        <p>Status: <strong style={{ color: passed ? "#4caf50" : "#f44336" }}>{passed ? "Passed" : "Needs Review"}</strong></p>
      </div>

      <div style={{ marginBottom: 40 }}>
        <h3>Verifiable Credential</h3>
        <p>Your performance has been cryptographically signed by the Praxis Simulator.</p>
        <button
          onClick={downloadVc}
          style={{ padding: "10px 20px", backgroundColor: "#007acc", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          Download W3C Credential
        </button>
      </div>

      <div style={{ backgroundColor: "#1e1e1e", padding: 20, borderRadius: 8, border: "1px solid #333" }}>
        <h3>Zero-Knowledge Proof</h3>
        <p>Generate a mathematical proof that your score is &gt;= 80 without revealing the exact score to the employer.</p>

        <button
          onClick={generateProof}
          style={{ padding: "10px 20px", backgroundColor: "#8a2be2", color: "white", border: "none", borderRadius: 4, cursor: "pointer", marginBottom: 20 }}
        >
          Generate ZK Proof
        </button>

        {proof && (
          <>
            <textarea
              readOnly
              value={proof}
              style={{ width: "100%", height: 150, backgroundColor: "#000", color: "#0f0", fontFamily: "monospace", padding: 10, border: "1px solid #333", borderRadius: 4, marginBottom: 10 }}
            />
            <button
              onClick={verifyProof}
              style={{ padding: "10px 20px", backgroundColor: "#333", color: "white", border: "1px solid #555", borderRadius: 4, cursor: "pointer" }}
            >
              Verify Proof Locally
            </button>
          </>
        )}

        {verificationResult !== null && (
          <div style={{ marginTop: 20, padding: 10, backgroundColor: verificationResult ? "rgba(76, 175, 80, 0.2)" : "rgba(244, 67, 54, 0.2)", color: verificationResult ? "#4caf50" : "#f44336", borderRadius: 4 }}>
            {verificationResult ? "✅ Proof is Valid" : "❌ Invalid Proof"}
          </div>
        )}
      </div>
    </div>
  );
}
