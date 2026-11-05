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
              background: "rgba(5, 5, 5, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 180,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              backdropFilter: "blur(10px)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <div style={{ fontSize: 10, color: "#666", padding: "8px 12px", textTransform: "uppercase", letterSpacing: "1px" }}>
              Quick Navigation
            </div>
            
            <button onClick={() => handleRoute("engineering")} style={{ ...menuBtnStyle, color: "#00ff41" }}>
              <span style={{ fontSize: 14 }}>&gt;</span> Engineering
            </button>
            <button onClick={() => handleRoute("sales")} style={{ ...menuBtnStyle, color: "#f59e0b" }}>
              <span style={{ fontSize: 14 }}>&gt;</span> Sales
            </button>
            <button onClick={() => handleRoute("product")} style={{ ...menuBtnStyle, color: "#818cf8" }}>
              <span style={{ fontSize: 14 }}>&gt;</span> Product
            </button>
            <button onClick={() => handleRoute("data")} style={{ ...menuBtnStyle, color: "#06b6d4" }}>
              <span style={{ fontSize: 14 }}>&gt;</span> Data
            </button>
            <div style={{ fontSize: 10, color: "#666", padding: "8px 12px", textTransform: "uppercase", letterSpacing: "1px", marginTop: 8 }}>
              Ecosystem
            </div>
            <button onClick={() => handleRoute("company/dashboard", true)} style={{ ...menuBtnStyle, color: "#e4e4e7" }}>
              <span style={{ fontSize: 14 }}>&gt;</span> Company Terminal
            </button>
            <button onClick={() => handleRoute("verifier/dashboard", true)} style={{ ...menuBtnStyle, color: "#818cf8" }}>
              <span style={{ fontSize: 14 }}>&gt;</span> Verifier Node (2FA)
            </button>
            <button onClick={() => handleRoute("market", true)} style={{ ...menuBtnStyle, color: "#fff" }}>
              <span style={{ fontSize: 14 }}>&gt;</span> Apprentice Market
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const menuBtnStyle = {
  background: "transparent",
  border: "none",
  padding: "10px 12px",
  textAlign: "left" as const,
  cursor: "pointer",
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 4,
  transition: "background 0.2s",
};
