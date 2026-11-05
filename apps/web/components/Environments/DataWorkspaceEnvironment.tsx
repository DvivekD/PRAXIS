"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DataWorkspaceEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onComplete: () => void;
  demoMode: boolean;
}

const INITIAL_SQL = `-- Aura Commerce — Daily Active Shopper Metric
-- Notice: DAU appears up 40% ahead of Black Friday.
SELECT 
  DATE(t.created_at) AS report_date,
  COUNT(u.id) AS active_shoppers
FROM users u
JOIN transactions t ON u.id = t.user_id
WHERE t.created_at >= '2026-11-01'
GROUP BY DATE(t.created_at)
ORDER BY report_date ASC;`;

const FIXED_SQL = `-- Aura Commerce — Daily Active Shopper Metric
-- FIXED: Calculating unique shoppers to prevent order duplicates
SELECT 
  DATE(t.created_at) AS report_date,
  COUNT(DISTINCT u.id) AS active_shoppers
FROM users u
JOIN transactions t ON u.id = t.user_id
WHERE t.created_at >= '2026-11-01'
GROUP BY DATE(t.created_at)
ORDER BY report_date ASC;`;

export default function DataWorkspaceEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
}: DataWorkspaceEnvironmentProps) {
  const [sqlCode, setSqlCode] = useState(INITIAL_SQL);
  const [isFixed, setIsFixed] = useState(false);
  const [hasRun, setHasRun] = useState(true);
  const [solved, setSolved] = useState(false);

  // Inflated data points vs true unique data points
  const pointsInflated = [
    { date: "Nov 01", val: 38000, y: 140 },
    { date: "Nov 02", val: 41200, y: 130 },
    { date: "Nov 03", val: 59000, y: 90 },
    { date: "Nov 04", val: 78500, y: 45 },
    { date: "Nov 05", val: 84200, y: 25 },
  ];

  const pointsCorrect = [
    { date: "Nov 01", val: 38000, y: 140 },
    { date: "Nov 02", val: 39500, y: 135 },
    { date: "Nov 03", val: 43200, y: 120 },
    { date: "Nov 04", val: 48900, y: 105 },
    { date: "Nov 05", val: 52400, y: 95 },
  ];

  const activePoints = isFixed ? pointsCorrect : pointsInflated;

  const handleRunQuery = () => {
    const isDistinct = sqlCode.toLowerCase().includes("distinct");
    setIsFixed(isDistinct);
    setHasRun(true);

    onAction(`[SQL_QUERY] Executed: ${sqlCode.replace(/\n/g, " ")}`);

    if (isDistinct && !solved) {
      setSolved(true);
      onAction("[VICTORY] Data candidate fixed the duplicate count bug by applying COUNT(DISTINCT u.id). Metric normalized.");
      setTimeout(() => {
        onComplete();
      }, 3000);
    }
  };

  const handleApplyDistinct = () => {
    setSqlCode(FIXED_SQL);
    setIsFixed(true);
    setHasRun(true);
    setSolved(true);
    onAction("[VICTORY] Data candidate applied COUNT(DISTINCT u.id). Metric normalized.");
    setTimeout(() => {
      onComplete();
    }, 3000);
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#080c14",
        color: "#fff",
        fontFamily: "'JetBrains Mono', monospace",
        display: "grid",
        gridTemplateColumns: "240px 1fr 420px",
        overflow: "hidden",
      }}
    >
      {/* LEFT COLUMN: Schema Explorer */}
      <div
        style={{
          background: "#05070d",
          borderRight: "1px solid #1e293b",
          padding: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ fontSize: 11, color: "#06b6d4", fontWeight: 800, letterSpacing: "1.5px", marginBottom: 16 }}>
          [ AURA ANALYTICS DB ]
        </div>

        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 8 }}>
          Tables & Relations:
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 11 }}>
          <div style={{ background: "#0b101c", border: "1px solid #1e293b", borderRadius: 4, padding: 8 }}>
            <div style={{ color: "#38bdf8", fontWeight: 700, marginBottom: 4 }}>📋 users</div>
            <div style={{ color: "#64748b", paddingLeft: 8 }}>- id (PK, uuid)</div>
            <div style={{ color: "#64748b", paddingLeft: 8 }}>- email (varchar)</div>
            <div style={{ color: "#64748b", paddingLeft: 8 }}>- tier (varchar)</div>
          </div>

          <div style={{ background: "#0b101c", border: "1px solid #1e293b", borderRadius: 4, padding: 8 }}>
            <div style={{ color: "#38bdf8", fontWeight: 700, marginBottom: 4 }}>📋 transactions</div>
            <div style={{ color: "#64748b", paddingLeft: 8 }}>- id (PK, uuid)</div>
            <div style={{ color: "#f59e0b", paddingLeft: 8 }}>- user_id (FK users.id)</div>
            <div style={{ color: "#64748b", paddingLeft: 8 }}>- amount (decimal)</div>
            <div style={{ color: "#64748b", paddingLeft: 8 }}>- created_at (timestamp)</div>
          </div>
        </div>

        <div style={{ marginTop: "auto", background: "rgba(6,182,212,0.06)", border: "1px solid #06b6d430", borderRadius: 6, padding: 10, fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>
          <span style={{ color: "#06b6d4", fontWeight: 700 }}>Hint:</span> A user can perform multiple transactions in a single day. Joining without <code style={{ color: "#fff" }}>DISTINCT</code> multiplies their visits!
        </div>
      </div>

      {/* CENTER COLUMN: SQL Editor */}
      <div style={{ display: "flex", flexDirection: "column", background: "#080c16" }}>
        <div
          style={{
            padding: "10px 16px",
            background: "#090d18",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>
            query_active_shoppers.sql
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleApplyDistinct}
              style={{
                padding: "4px 10px",
                background: "#0e7490",
                border: "none",
                color: "#fff",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ⚡ Add DISTINCT
            </button>
            <button
              onClick={handleRunQuery}
              style={{
                padding: "4px 14px",
                background: "#06b6d4",
                border: "none",
                color: "#000",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ▶ Run Query (F5)
            </button>
          </div>
        </div>

        <textarea
          value={sqlCode}
          onChange={(e) => setSqlCode(e.target.value)}
          style={{
            flex: 1,
            background: "#060911",
            color: "#f8fafc",
            fontFamily: "inherit",
            fontSize: 13,
            lineHeight: 1.6,
            padding: 16,
            border: "none",
            outline: "none",
            resize: "none",
          }}
        />

        {/* Data Output Table */}
        <div style={{ height: "35vh", borderTop: "1px solid #1e293b", background: "#080c16", padding: 12, overflowY: "auto" }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontWeight: 700 }}>
            QUERY RESULTS ({activePoints.length} ROWS)
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b", color: "#64748b" }}>
                <th style={{ padding: "6px 8px" }}>REPORT_DATE</th>
                <th style={{ padding: "6px 8px" }}>ACTIVE_SHOPPERS</th>
                <th style={{ padding: "6px 8px" }}>VARIANCE</th>
              </tr>
            </thead>
            <tbody>
              {activePoints.map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #0f172a" }}>
                  <td style={{ padding: "6px 8px", color: "#94a3b8" }}>{p.date}</td>
                  <td style={{ padding: "6px 8px", color: isFixed ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                    {p.val.toLocaleString()}
                  </td>
                  <td style={{ padding: "6px 8px", color: "#64748b" }}>
                    {isFixed ? "Normal" : i >= 2 ? "+40% Spike (Duplicate)" : "Normal"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT COLUMN: Live Animated Visualizer */}
      <div
        style={{
          borderLeft: "1px solid #1e293b",
          background: "#05070d",
          padding: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ fontSize: 11, color: "#06b6d4", fontWeight: 800, letterSpacing: "1.5px", marginBottom: 12 }}>
          [ LIVE CHART TELEMETRY ]
        </div>

        <div style={{ background: "#0b101c", border: `1px solid ${isFixed ? "#22c55e" : "#ef4444"}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Current Metric State</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: isFixed ? "#22c55e" : "#ef4444", margin: "4px 0" }}>
            {isFixed ? "✓ INTEGRITY VERIFIED (52,400 DAU)" : "⚠️ ANOMALOUS SPIKE (84,200 DAU)"}
          </div>
          <div style={{ fontSize: 10, color: "#64748b" }}>
            {isFixed
              ? "Unique customer deduping active. Data aligns with production load."
              : "Cart double-charges are multiplying active user joins by ~1.6x!"}
          </div>
        </div>

        {/* SVG Chart */}
        <div
          style={{
            flex: 1,
            background: "#060911",
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>
            Daily Active Shoppers (DAU)
          </div>

          <svg viewBox="0 0 320 180" style={{ width: "100%", height: 160, overflow: "visible" }}>
            {/* Grid lines */}
            <line x1="20" y1="30" x2="310" y2="30" stroke="#1e293b" strokeDasharray="3 3" />
            <line x1="20" y1="80" x2="310" y2="80" stroke="#1e293b" strokeDasharray="3 3" />
            <line x1="20" y1="130" x2="310" y2="130" stroke="#1e293b" strokeDasharray="3 3" />

            {/* Connecting Line */}
            <motion.path
              d={`M ${activePoints
                .map((p, i) => `${40 + i * 65},${p.y}`)
                .join(" L ")}`}
              fill="none"
              stroke={isFixed ? "#22c55e" : "#ef4444"}
              strokeWidth="3"
              animate={{
                d: `M ${activePoints.map((p, i) => `${40 + i * 65},${p.y}`).join(" L ")}`,
                stroke: isFixed ? "#22c55e" : "#ef4444",
              }}
              transition={{ duration: 0.6 }}
            />

            {/* Points */}
            {activePoints.map((p, i) => (
              <motion.circle
                key={i}
                cx={40 + i * 65}
                cy={p.y}
                r="5"
                fill={isFixed ? "#22c55e" : "#ef4444"}
                animate={{ cy: p.y, fill: isFixed ? "#22c55e" : "#ef4444" }}
                transition={{ duration: 0.6 }}
              />
            ))}
          </svg>

          {/* X axis labels */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 10px", fontSize: 10, color: "#64748b" }}>
            <span>Nov 01</span>
            <span>Nov 02</span>
            <span>Nov 03</span>
            <span>Nov 04</span>
            <span>Nov 05</span>
          </div>
        </div>

        <AnimatePresence>
          {solved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: 16,
                padding: 12,
                background: "rgba(34,197,94,0.1)",
                border: "1px solid #22c55e",
                borderRadius: 6,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: "#22c55e", marginBottom: 2 }}>
                🎉 METRIC REPAIRED!
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>
                Distinct user counts restored data veracity. Routing to evaluation...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
