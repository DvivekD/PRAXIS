"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function JudgeMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleRoute = (domainOrPath: string, isDirectPath: boolean = false) => {
    setIsOpen(false);
    if (isDirectPath) {
      router.push(`/${domainOrPath}`);
    } else {
      router.push(`/seeker/dashboard?domain=${domainOrPath}`);
    }
  };

  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999 }}>
      {/* Burger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 40,
          height: 40,
          background: "rgba(0, 0, 0, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "50%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 4,
          cursor: "pointer",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ width: 16, height: 2, background: "#fff", transition: "all 0.3s", transform: isOpen ? "rotate(45deg) translate(4px, 4px)" : "none" }} />
        <div style={{ width: 16, height: 2, background: "#fff", transition: "all 0.3s", opacity: isOpen ? 0 : 1 }} />
        <div style={{ width: 16, height: 2, background: "#fff", transition: "all 0.3s", transform: isOpen ? "rotate(-45deg) translate(4px, -5px)" : "none" }} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            style={{
              position: "absolute",
              top: 50,
              right: 0,
              background: "rgba(8, 12, 20, 0.96)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 8,
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minWidth: 260,
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 12px 40px rgba(0,0,0,0.85)",
              backdropFilter: "blur(16px)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <div style={{ fontSize: 10, color: "#94a3b8", padding: "8px 12px 4px 12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 800 }}>
              Quick Navigation // 7 Scopes
            </div>
            
            <motion.button 
              whileHover={{ background: "rgba(0,255,65,0.1)", x: 3 }}
              onClick={() => handleRoute("engineering")} 
              style={{ ...menuBtnStyle, color: "#00ff41" }}
            >
              <span style={{ fontSize: 13 }}>💻</span>
              <span>Engineering (Terminal)</span>
            </motion.button>

            <motion.button 
              whileHover={{ background: "rgba(245,158,11,0.1)", x: 3 }}
              onClick={() => handleRoute("sales")} 
              style={{ ...menuBtnStyle, color: "#f59e0b" }}
            >
              <span style={{ fontSize: 13 }}>📞</span>
              <span>Sales (Live Call)</span>
            </motion.button>

            <motion.button 
              whileHover={{ background: "rgba(129,140,248,0.1)", x: 3 }}
              onClick={() => handleRoute("product")} 
              style={{ ...menuBtnStyle, color: "#818cf8" }}
            >
              <span style={{ fontSize: 13 }}>✉️</span>
              <span>Product (Google Gmail)</span>
            </motion.button>

            <motion.button 
              whileHover={{ background: "rgba(6,182,212,0.1)", x: 3 }}
              onClick={() => handleRoute("data")} 
              style={{ ...menuBtnStyle, color: "#06b6d4" }}
            >
              <span style={{ fontSize: 13 }}>📊</span>
              <span>Data (SQL Workspace)</span>
            </motion.button>

            <motion.button 
              whileHover={{ background: "rgba(239,68,68,0.1)", x: 3 }}
              onClick={() => handleRoute("sre")} 
              style={{ ...menuBtnStyle, color: "#ef4444" }}
            >
              <span style={{ fontSize: 13 }}>🚨</span>
              <span>SRE (Incident War Room)</span>
            </motion.button>

            <motion.button 
              whileHover={{ background: "rgba(16,185,129,0.1)", x: 3 }}
              onClick={() => handleRoute("support")} 
              style={{ ...menuBtnStyle, color: "#10b981" }}
            >
              <span style={{ fontSize: 13 }}>🎧</span>
              <span>Support (Helpdesk Queue)</span>
            </motion.button>

            <motion.button 
              whileHover={{ background: "rgba(236,72,153,0.1)", x: 3 }}
              onClick={() => handleRoute("brand")} 
              style={{ ...menuBtnStyle, color: "#ec4899" }}
            >
              <span style={{ fontSize: 13 }}>📱</span>
              <span>Brand (Crisis Command)</span>
            </motion.button>

            <motion.button 
              whileHover={{ background: "rgba(245,158,11,0.1)", x: 3 }}
              onClick={() => handleRoute("select-domain", true)} 
              style={{ ...menuBtnStyle, color: "#f59e0b", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 4, paddingTop: 10 }}
            >
              <span style={{ fontSize: 13 }}>⚡</span>
              <span>Domain Selector (Grid)</span>
            </motion.button>

            <div style={{ fontSize: 10, color: "#64748b", padding: "10px 12px 4px 12px", textTransform: "uppercase", letterSpacing: "1px", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 4, fontWeight: 700 }}>
              Ecosystem
            </div>

            <motion.button 
              whileHover={{ background: "rgba(255,255,255,0.06)", x: 3 }}
              onClick={() => handleRoute("company/dashboard", true)} 
              style={{ ...menuBtnStyle, color: "#e4e4e7" }}
            >
              <span style={{ fontSize: 14 }}>&gt;</span>
              <span>Company Terminal</span>
            </motion.button>

            <motion.button 
              whileHover={{ background: "rgba(129,140,248,0.1)", x: 3 }}
              onClick={() => handleRoute("verifier/dashboard", true)} 
              style={{ ...menuBtnStyle, color: "#818cf8" }}
            >
              <span style={{ fontSize: 14 }}>&gt;</span>
              <span>Verifier Node (2FA)</span>
            </motion.button>

            <motion.button 
              whileHover={{ background: "rgba(255,255,255,0.06)", x: 3 }}
              onClick={() => handleRoute("market", true)} 
              style={{ ...menuBtnStyle, color: "#fff" }}
            >
              <span style={{ fontSize: 14 }}>&gt;</span>
              <span>Apprentice Market</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const menuBtnStyle = {
  background: "transparent",
  border: "none",
  padding: "8px 12px",
  textAlign: "left" as const,
  cursor: "pointer",
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  gap: 10,
  borderRadius: 4,
  transition: "background 0.15s ease",
  width: "100%",
};
