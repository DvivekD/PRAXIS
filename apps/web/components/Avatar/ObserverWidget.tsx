"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarScene from "./AvatarScene";

interface ObserverWidgetProps {
  domain: string;
  analyserNode?: AnalyserNode | null;
  onInteract?: (actionText: string) => void;
  cognitiveLoad?: number;
  voiceMode?: "off" | "persona" | "guide";
  activePersonaName?: string;
  activePersonaRole?: string;
}

const DOMAIN_COLORS: Record<string, string> = {
  engineering: "#00ff41",
  sales: "#f59e0b",
  product: "#818cf8",
  data: "#06b6d4",
  sre: "#ef4444",
  support: "#10b981",
  brand: "#ec4899",
};

export default function ObserverWidget({
  domain = "engineering",
  analyserNode = null,
  onInteract,
  cognitiveLoad = 50,
  voiceMode = "off",
  activePersonaName,
  activePersonaRole,
}: ObserverWidgetProps) {
  const hasDedicatedHud = ["brand", "sales", "support", "data"].includes(domain.toLowerCase());
  const [isMinimized, setIsMinimized] = useState(hasDedicatedHud);
  const themeColor = DOMAIN_COLORS[domain.toLowerCase()] || "#00ff41";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9000,
        fontFamily: "'JetBrains Mono', monospace",
        pointerEvents: "auto",
      }}
    >
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            key="minimized"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsMinimized(false)}
            title="Expand 3D Observer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(5, 8, 16, 0.92)",
              border: `1px solid ${themeColor}60`,
              boxShadow: `0 8px 30px rgba(0,0,0,0.7), 0 0 15px ${themeColor}30`,
              borderRadius: 30,
              padding: "10px 18px",
              cursor: "pointer",
              color: "#fff",
              backdropFilter: "blur(12px)",
            }}
          >
            <span style={{ position: "relative", display: "flex", width: 12, height: 12 }}>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: themeColor,
                  opacity: 0.75,
                  animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                }}
              />
              <span
                style={{
                  position: "relative",
                  borderRadius: "50%",
                  width: 12,
                  height: 12,
                  background: themeColor,
                }}
              />
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", color: themeColor }}>
              3D OBSERVER
            </span>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>▲ EXPAND</span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            style={{
              width: 280,
              background: "rgba(6, 10, 18, 0.94)",
              border: `1px solid ${themeColor}50`,
              boxShadow: `0 16px 40px rgba(0,0,0,0.85), 0 0 25px ${themeColor}25`,
              borderRadius: 14,
              overflow: "hidden",
              backdropFilter: "blur(16px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "rgba(0, 0, 0, 0.4)",
                borderBottom: `1px solid ${themeColor}30`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: themeColor,
                    boxShadow: `0 0 8px ${themeColor}`,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "1px",
                    color: themeColor,
                    textTransform: "uppercase",
                  }}
                >
                  3D OBSERVER // {domain}
                </span>
              </div>
              <button
                onClick={() => setIsMinimized(true)}
                title="Minimize"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                ▼
              </button>
            </div>

            {/* 3D Three.js Viewport */}
            <div
              style={{
                width: "100%",
                height: 200,
                position: "relative",
                background: "#010308",
              }}
            >
              <AvatarScene
                analyserNode={analyserNode}
                domain={domain}
                onInteract={onInteract}
              />
            </div>

            {/* Telemetry Footer */}
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(3, 6, 12, 0.8)",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10 }}>
                <span style={{ color: "#94a3b8" }}>COGNITIVE LOAD</span>
                <span style={{ color: themeColor, fontWeight: 700 }}>{cognitiveLoad}%</span>
              </div>
              {/* Load Bar */}
              <div
                style={{
                  width: "100%",
                  height: 4,
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, cognitiveLoad))}%`,
                    height: "100%",
                    background: themeColor,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>

              {activePersonaName && (
                <div
                  style={{
                    fontSize: 9,
                    color: "#94a3b8",
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 2,
                  }}
                >
                  <span>PERSONA:</span>
                  <span style={{ color: "#fff" }}>
                    {activePersonaName} ({activePersonaRole})
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
