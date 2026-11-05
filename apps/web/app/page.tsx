"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeroAnimation } from "../components/HeroAnimation";

export default function Home() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [introComplete, setIntroComplete] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Return a purely static shell for server rendering to avoid hydration mismatch
    return <div style={{ minHeight: "100vh", background: "#000" }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", position: "relative" }}>

      {/* Live Canvas Background - Always visible */}
      <HeroAnimation onComplete={() => setIntroComplete(true)} />

      {/* Main Page Content - Fades in after intro */}
      <AnimatePresence>
        {introComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ position: "relative", zIndex: 1 }}
          >
            {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: "1px solid rgba(0,255,65,0.2)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 32, height: 32, background: "#000", border: "1px solid #00ff41", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff41" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: "2px", color: "#fff" }}>PRAXIS</span>
        </div>
        <div style={{ display: "flex", gap: 32, fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>
          <a href="#how" style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}>How It Works</a>
          <a href="#companies" style={{ color: "inherit", textDecoration: "none" }}>For Companies</a>
          <a href="#candidates" style={{ color: "inherit", textDecoration: "none" }}>For Candidates</a>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => router.push("/login")} style={{ padding: "8px 20px", fontSize: 12, color: "#fff", background: "transparent", border: "1px solid #333", cursor: "pointer", transition: "all 0.2s", textTransform: "uppercase" }}>Sign In</button>
          <button onClick={() => router.push("/register")} style={{ padding: "8px 20px", fontSize: 12, fontWeight: 700, color: "#000", background: "#00ff41", border: "1px solid #00ff41", cursor: "pointer", textTransform: "uppercase", boxShadow: "0 0 10px rgba(0,255,65,0.3)" }}>Get Started</button>
        </div>
      </motion.nav>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "140px 24px 100px", pointerEvents: "none" }}
      >
        <div style={{ pointerEvents: "auto", display: "inline-block" }}>
          <div style={{ display: "inline-block", padding: "6px 16px", border: "1px solid #00ff41", background: "rgba(0,255,65,0.05)", fontSize: 11, color: "#00ff41", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 28 }}>
            SYS.INIT: The future of hiring is process
          </div>
          <p style={{ fontSize: 16, color: "#888", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.7 }}>
            PRAXIS drops candidates into procedurally-mutated, historically-solved real-world problems.
            AI observers track <em>how</em> you think, not just what you answer.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/seeker/onboarding")}
              style={{ padding: "16px 36px", fontSize: 14, fontWeight: 700, color: "#000", background: "#00ff41", border: "none", cursor: "pointer", boxShadow: "0 0 20px rgba(0,255,65,0.4)", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: 10 }}
            >
              [ I'M A SEEKER ]
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
              onClick={() => router.push("/login")}
              style={{ padding: "16px 36px", fontSize: 14, fontWeight: 500, color: "#fff", background: "transparent", border: "1px solid #333", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1px" }}
            >
              [ I'M A COMPANY ]
            </motion.button>
          </div>
        </div>
      </motion.section>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{ display: "flex", justifyContent: "center", gap: 64, padding: "48px 24px", position: "relative", zIndex: 1, background: "rgba(0, 255, 65, 0.03)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid rgba(0, 255, 65, 0.1)", borderBottom: "1px solid rgba(0, 255, 65, 0.1)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)" }}
      >
        {[
          { value: "94%", label: "Prediction Accuracy" },
          { value: "2.4x", label: "Better Retention" },
          { value: "< 45m", label: "Assessment Time" },
          { value: "4", label: "Domain Verticals" },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 4, textTransform: "uppercase", letterSpacing: "1px" }}>{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* How It Works — 6-Step Loop */}
      <section id="how" style={{ position: "relative", zIndex: 1, padding: "100px 24px", maxWidth: 1100, margin: "0 auto", background: "#000" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#00ff41", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>SYSTEM.LOOP</div>
            <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "1px", margin: 0, textTransform: "uppercase" }}>6 Steps. Zero Guesswork.</h2>
          </div>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            { step: "01", title: "Baseline Litmus", desc: "Lightweight domain filter. Minimum viable competency gets you in.", icon: "⚡" },
            { step: "02", title: "Segmentation", desc: "Grouped by performance, not pedigree. Your baseline score sets your tier.", icon: "🎯" },
            { step: "03", title: "Simulation Engine", desc: "Real problems, procedurally mutated. No two candidates see the same version.", icon: "🧬" },
            { step: "04", title: "Cross-Domain", desc: "Same engine, domain-specific skins. Engineering, Product, Finance, Data.", icon: "🔀" },
            { step: "05", title: "Process Ranking", desc: "Approach, creativity, error recovery. Not just correctness.", icon: "📊" },
            { step: "06", title: "Portable Record", desc: "Your verified track record. LinkedIn but your profile is your proof.", icon: "🛡️" },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              onMouseEnter={() => setHoveredCard(item.step)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                padding: 28,
                border: `1px solid ${hoveredCard === item.step ? "#00ff41" : "#222"}`,
                background: hoveredCard === item.step ? "rgba(0,255,65,0.02)" : "#050505",
                transition: "all 0.2s",
                cursor: "default",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 24, filter: "grayscale(100%)" }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#00ff41", letterSpacing: "1px" }}>[{item.step}]</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase" }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 2FA Validation Section */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px 100px", maxWidth: 1100, margin: "0 auto", background: "#000" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>SYS.VERIFY</div>
            <h2 style={{ fontSize: 32, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>Independent Verification Signals</h2>
          </div>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { title: "Reputation Network", desc: "Past colleagues provide structured, accountable testimony tied to observable outcomes. Not endorsements — verified relational signal.", color: "#00ff41", icon: "🤝" },
            { title: "Apprenticeship Market", desc: "Skip evaluation. Go straight to a 1-2 week paid trial. Real work, real environment. Outcome feeds your portable record.", color: "#fff", icon: "💼" },
            { title: "Outcome Tracking", desc: "Post-hire performance data. Which simulation signals predicted success at your company? We close the loop.", color: "#888", icon: "📈" },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              style={{ padding: 32, border: "1px solid #222", background: "#050505", position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: card.color }} />
              <span style={{ fontSize: 32, display: "block", marginBottom: 16, filter: "grayscale(100%) brightness(200%)" }}>{card.icon}</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px", textTransform: "uppercase" }}>{card.title}</h3>
              <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.7 }}>{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "80px 24px 120px", background: "#000" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
          <div style={{ maxWidth: 700, margin: "0 auto", padding: 48, border: "1px solid #333", background: "#050505" }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 16px", textTransform: "uppercase" }}>Ready to prove yourself?</h2>
            <p style={{ color: "#666", margin: "0 0 32px", fontSize: 14 }}>No resume padding. No whiteboard theater. Just solve.</p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/seeker/onboarding")}
                style={{ padding: "16px 40px", fontSize: 14, fontWeight: 700, color: "#000", background: "#00ff41", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1px" }}
              >
                [ START_AS_SEEKER ]
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => router.push("/login")}
                style={{ padding: "16px 40px", fontSize: 14, fontWeight: 500, color: "#888", background: "transparent", border: "1px solid #333", cursor: "pointer", textTransform: "uppercase", letterSpacing: "1px" }}
              >
                [ COMPANY_LOGIN ]
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}