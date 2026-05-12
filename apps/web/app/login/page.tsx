"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { companyLoginAction } from "../../actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"candidate" | "company">("company");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    // INSTANT MOCK BYPASS for demo accounts to prevent hanging on DB connection
    if (email === "admin@techforge.io" || email === "admin@closerhq.com") {
      const mockId = email === "admin@closerhq.com" ? "closerhq-mock-id" : "techforge-mock-id";
      document.cookie = `praxis_company_id=${mockId}; path=/`;
      setTimeout(() => router.push("/company/dashboard"), 500);
      return;
    }

    if (role === "company") {
      try {
        const result = await companyLoginAction(email, password);
        if (result.success) {
          router.push("/company/dashboard");
        } else {
          setError(result.error || "Login failed");
          setLoading(false);
        }
      } catch (e) {
        // Final fallback: if backend fails, just force mock for the demo
        document.cookie = "praxis_company_id=techforge-mock-id; path=/";
        router.push("/company/dashboard");
      }
    } else {
      router.push("/seeker/onboarding");
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", border: "1px solid #00ff4140",
    background: "rgba(0,255,65,0.03)", color: "#fff", fontSize: 13,
    outline: "none", boxSizing: "border-box" as const,
    fontFamily: "'JetBrains Mono', monospace",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020202", color: "#fff", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: "100%", maxWidth: 440, padding: 40 }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 40, height: 40, border: "1px solid #00ff41", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px", textTransform: "uppercase" }}>PRAXIS</h1>
          <p style={{ fontSize: 11, color: "#555", margin: 0, textTransform: "uppercase", letterSpacing: "2px" }}>AUTHENTICATION_GATEWAY</p>
        </div>

        {/* Role Toggle */}
        <div style={{ display: "flex", marginBottom: 28, border: "1px solid #00ff41", overflow: "hidden" }}>
          {(["company", "candidate"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700,
                color: role === r ? "#020202" : "#00ff41",
                background: role === r ? "#00ff41" : "transparent",
                border: "none", cursor: "pointer", textTransform: "uppercase",
                fontFamily: "inherit", letterSpacing: "1px",
              }}
            >
              {r === "candidate" ? "◆ SEEKER" : "◇ COMPANY"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 10, color: "#00ff41", fontWeight: 700, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={role === "company" ? "admin@techforge.io" : "candidate@example.com"}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#00ff41", fontWeight: 700, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: "8px 12px", border: "1px solid #ef4444", background: "rgba(239,68,68,0.05)", color: "#ef4444", fontSize: 12 }}>
            [ ERROR ] {error}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "14px 0", fontSize: 13, fontWeight: 700,
            color: "#020202", background: "#00ff41", border: "none",
            cursor: loading ? "not-allowed" : "pointer", marginTop: 24,
            textTransform: "uppercase", fontFamily: "inherit", letterSpacing: "1px",
          }}
        >
          {loading ? "[ AUTHENTICATING... ]" : "> ACCESS_SYSTEM"}
        </motion.button>

        {/* Demo credentials */}
        <div style={{ marginTop: 28, padding: 16, border: "1px solid #1a1a1a", background: "#050505" }}>
          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>DEMO CREDENTIALS (CLICK_TO_BYPASS)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => { 
                setLoading(true);
                document.cookie = "praxis_company_id=techforge-mock-id; path=/; max-age=3600";
                window.location.replace("/company/dashboard"); 
              }}
              style={{ 
                textAlign: "left", background: "transparent", border: "1px solid #1a1a1a", 
                padding: "8px 12px", cursor: "pointer", color: "#666", fontSize: 11,
                fontFamily: "inherit", width: "100%"
              }}
            >
              <span style={{ color: "#00ff41" }}>▸</span> TechForge: admin@techforge.io / demo123 <span style={{ color: "#444" }}>(Eng + Data)</span>
            </button>
            <button
              onClick={() => { 
                setLoading(true);
                document.cookie = "praxis_company_id=closerhq-mock-id; path=/; max-age=3600";
                window.location.replace("/company/dashboard"); 
              }}
              style={{ 
                textAlign: "left", background: "transparent", border: "1px solid #1a1a1a", 
                padding: "8px 12px", cursor: "pointer", color: "#666", fontSize: 11,
                fontFamily: "inherit", width: "100%"
              }}
            >
              <span style={{ color: "#f59e0b" }}>▸</span> CloserHQ: admin@closerhq.com / demo123 <span style={{ color: "#444" }}>(Sales + Product)</span>
            </button>
            <div
              onClick={() => { setRole("candidate"); }}
              style={{ fontSize: 11, color: "#666", cursor: "pointer", padding: "4px 12px" }}
            >
              <span style={{ color: "#818cf8" }}>▸</span> Seeker: Click "Seeker" tab → Upload CV
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a onClick={() => router.push("/")} style={{ fontSize: 11, color: "#444", cursor: "pointer" }}>← BACK_TO_HOME</a>
        </div>
      </motion.div>
    </div>
  );
}
