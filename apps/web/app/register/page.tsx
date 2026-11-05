"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"candidate" | "company">("candidate");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    // Mock register — in production this calls the auth server action
    setTimeout(() => {
      if (role === "candidate") {
        router.push("/select-domain");
      } else {
        router.push("/company/dashboard");
      }
    }, 800);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050510", color: "#fff", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", bottom: "10%", left: "30%", width: "40%", height: "40%", background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)", filter: "blur(100px)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, padding: 40, borderRadius: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "0 8px 20px rgba(99,102,241,0.3)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Create your account</h1>
          <p style={{ fontSize: 14, color: "#71717a", margin: 0 }}>Start proving what you can do</p>
        </div>

        {/* Role Toggle */}
        <div style={{ display: "flex", marginBottom: 24, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 4 }}>
          {(["candidate", "company"] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600, color: role === r ? "#fff" : "#71717a", background: role === r ? "rgba(99,102,241,0.2)" : "transparent", border: "none", borderRadius: 8, cursor: "pointer", textTransform: "capitalize", transition: "all 0.2s" }}>
              {r === "candidate" ? "🎯 Candidate" : "🏢 Company"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "#71717a", fontWeight: 600, display: "block", marginBottom: 6 }}>Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#e4e4e7", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#71717a", fontWeight: 600, display: "block", marginBottom: 6 }}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#e4e4e7", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#71717a", fontWeight: 600, display: "block", marginBottom: 6 }}>Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#e4e4e7", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRegister}
          disabled={loading}
          style={{ width: "100%", padding: "14px 0", fontSize: 15, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", border: "none", borderRadius: 12, cursor: "pointer", marginTop: 24, boxShadow: "0 6px 20px rgba(99,102,241,0.3)" }}
        >
          {loading ? "Creating account..." : "Create Account"}
        </motion.button>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ fontSize: 13, color: "#52525b" }}>Already have an account? </span>
          <a onClick={() => router.push("/login")} style={{ fontSize: 13, color: "#818cf8", cursor: "pointer", fontWeight: 600 }}>Sign in</a>
        </div>
      </motion.div>
    </div>
  );
}
