"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { SCOPE_DEFINITIONS } from "../lib/services/problemBank";

export default function JudgeMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedScope, setExpandedScope] = useState<string | null>(null);
  const router = useRouter();

  const handleRoute = (domainOrPath: string, isDirectPath: boolean = false, subEnv?: number) => {
    setIsOpen(false);
    if (isDirectPath) {
      router.push(`/${domainOrPath}`);
    } else {
      router.push(`/seeker/dashboard?domain=${domainOrPath}${subEnv ? `&subEnv=${subEnv}` : ""}`);
    }
  };

  const scopes = Object.values(SCOPE_DEFINITIONS);

  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999 }}>
      {/* Burger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 42,
          height: 42,
          background: "rgba(6, 10, 18, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          borderRadius: "50%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 4,
          cursor: "pointer",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}
        title="Quick Navigation Menu (7 Scopes × 3 Sub-Envs)"
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
              background: "rgba(8, 12, 22, 0.97)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 10,
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 320,
              maxHeight: "88vh",
              overflowY: "auto",
              boxShadow: "0 16px 48px rgba(0,0,0,0.9)",
              backdropFilter: "blur(20px)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <div style={{ fontSize: 10, color: "#94a3b8", padding: "6px 12px 2px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 800, display: "flex", justifyContent: "space-between" }}>
              <span>7 Scopes × 3 Sub-Envs</span>
              <span style={{ color: "#f59e0b" }}>21 ARENAS</span>
            </div>

            {scopes.map((scope) => {
              const isExpanded = expandedScope === scope.domain;
              return (
                <div key={scope.domain} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <motion.button
                      whileHover={{ background: `${scope.accent}15`, x: 2 }}
                      onClick={() => handleRoute(scope.domain)}
                      style={{
                        ...menuBtnStyle,
                        color: scope.accent,
                        flex: 1,
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 13 }}>◆</span>
                      <span style={{ fontWeight: 800 }}>{scope.label}</span>
                    </motion.button>

                    <button
                      onClick={() => setExpandedScope(isExpanded ? null : scope.domain)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#94a3b8",
                        fontSize: 10,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                      title="Toggle sub-environments"
                    >
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  </div>

                  {/* Sub-environments list */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          paddingLeft: 18,
                          borderLeft: `2px solid ${scope.accent}40`,
                          marginLeft: 12,
                          marginBottom: 4,
                        }}
                      >
                        {scope.subEnvironments.map((sub) => (
                          <motion.button
                            key={sub.id}
                            whileHover={{ background: "rgba(255,255,255,0.06)", x: 3 }}
                            onClick={() => handleRoute(scope.domain, false, sub.subEnv)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#cbd5e1",
                              fontSize: 10,
                              textAlign: "left",
                              padding: "4px 8px",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontFamily: "'JetBrains Mono', monospace",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span style={{ color: scope.accent, fontWeight: 700 }}>0{sub.subEnv}</span>
                            <span>{sub.title.split("—")[1] || sub.title}</span>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />

            <motion.button
              whileHover={{ background: "rgba(245,158,11,0.1)", x: 2 }}
              onClick={() => handleRoute("select-domain", true)}
              style={{ ...menuBtnStyle, color: "#f59e0b" }}
            >
              <span>⚡</span>
              <span>Domain Arena Grid</span>
            </motion.button>

            <div style={{ fontSize: 9, color: "#64748b", padding: "6px 12px 2px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              Ecosystem
            </div>

            <motion.button
              whileHover={{ background: "rgba(255,255,255,0.06)", x: 2 }}
              onClick={() => handleRoute("company/dashboard", true)}
              style={{ ...menuBtnStyle, color: "#e4e4e7" }}
            >
              <span>&gt;</span>
              <span>Company Portal</span>
            </motion.button>

            <motion.button
              whileHover={{ background: "rgba(129,140,248,0.1)", x: 2 }}
              onClick={() => handleRoute("verifier/dashboard", true)}
              style={{ ...menuBtnStyle, color: "#818cf8" }}
            >
              <span>&gt;</span>
              <span>Verifier Node</span>
            </motion.button>

            <motion.button
              whileHover={{ background: "rgba(255,255,255,0.06)", x: 2 }}
              onClick={() => handleRoute("market", true)}
              style={{ ...menuBtnStyle, color: "#fff" }}
            >
              <span>&gt;</span>
              <span>Apprentice Market</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const menuBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  borderRadius: 6,
  padding: "7px 10px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11,
  cursor: "pointer",
  transition: "all 0.15s ease",
  fontFamily: "'JetBrains Mono', monospace",
};
