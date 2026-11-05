"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

import { executeDataQueryAction } from "../../../actions/eval";

// Dynamically import Monaco Editor to avoid SSR window issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        minHeight: 280,
        background: "#05070d",
        color: "#64748b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
      }}
    >
      [ INITIALIZING MONACO SQL ENGINE... ]
    </div>
  ),
});

export interface SqlQuerySubEnvProps {
  sessionId?: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onStepComplete?: (step: number) => void;
  isFixed: boolean;
  setIsFixed: (fixed: boolean) => void;
}

const INITIAL_SQL = `-- Aura Subscription Platform — Daily Active User (DAU) Metric
-- PROBLEM: Reported DAU suddenly dropped by 18% on Nov 04, while engineering ingress logs remain normal.
-- ROOT CAUSE HYPOTHESIS: The reporting query inner-joins transactions, excluding non-transacting active subscribers.
-- TASK: Correct the join logic and apply COUNT(DISTINCT u.id) across sessions.

SELECT 
  DATE(s.started_at) AS report_date,
  COUNT(u.id) AS active_users,
  'INNER_JOIN_OMITTING_NON_BUYERS' AS calculation_method
FROM users u
INNER JOIN sessions s ON u.id = s.user_id
INNER JOIN transactions t ON u.id = t.user_id AND DATE(t.created_at) = DATE(s.started_at)
WHERE s.started_at >= '2026-11-01'
  AND s.started_at <= '2026-11-05'
GROUP BY DATE(s.started_at)
ORDER BY report_date ASC;`;

const FIXED_SQL = `-- Aura Subscription Platform — Daily Active User (DAU) Metric
-- FIXED: Distinct user calculation joined on sessions (independent of transactions)
-- RECOVERY: Restores 11,400+ active non-transacting users to the DAU calculation.

SELECT 
  DATE(s.started_at) AS report_date,
  COUNT(DISTINCT u.id) AS active_users,
  'DISTINCT_ACTIVE_SESSION_USERS' AS calculation_method
FROM users u
INNER JOIN sessions s ON u.id = s.user_id
WHERE s.started_at >= '2026-11-01'
  AND s.started_at <= '2026-11-05'
  AND s.is_bot = FALSE
GROUP BY DATE(s.started_at)
ORDER BY report_date ASC;`;

interface SchemaTable {
  name: string;
  rowCount: string;
  description: string;
  columns: Array<{ name: string; type: string; isPk?: boolean; isFk?: boolean; ref?: string }>;
}

const SCHEMA_TABLES: SchemaTable[] = [
  {
    name: "users",
    rowCount: "65,420 rows",
    description: "Registered subscriber profiles and plan state",
    columns: [
      { name: "id", type: "uuid", isPk: true },
      { name: "email", type: "varchar(255)" },
      { name: "tier", type: "varchar(32) [free, pro, enterprise]" },
      { name: "status", type: "varchar(32) [active, churned, trial]" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    name: "sessions",
    rowCount: "148,900 rows",
    description: "Authenticated client connection sessions",
    columns: [
      { name: "id", type: "uuid", isPk: true },
      { name: "user_id", type: "uuid", isFk: true, ref: "users.id" },
      { name: "device_type", type: "varchar(16) [web, ios, android]" },
      { name: "ip_address", type: "inet" },
      { name: "is_bot", type: "boolean" },
      { name: "started_at", type: "timestamptz" },
      { name: "ended_at", type: "timestamptz" },
    ],
  },
  {
    name: "events",
    rowCount: "890,200 rows",
    description: "Raw behavioral telemetry stream",
    columns: [
      { name: "id", type: "uuid", isPk: true },
      { name: "user_id", type: "uuid (nullable in v2.4 drift)", isFk: true, ref: "users.id" },
      { name: "account_uid", type: "varchar(64) (mobile v2.4+ key)" },
      { name: "session_id", type: "uuid", isFk: true, ref: "sessions.id" },
      { name: "event_name", type: "varchar(64) [app_open, heartbeat]" },
      { name: "timestamp", type: "timestamptz" },
    ],
  },
  {
    name: "transactions",
    rowCount: "38,100 rows",
    description: "Monetary subscription payments and renewals",
    columns: [
      { name: "id", type: "uuid", isPk: true },
      { name: "user_id", type: "uuid", isFk: true, ref: "users.id" },
      { name: "amount", type: "numeric(10,2)" },
      { name: "status", type: "varchar(32) [succeeded, failed]" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
];

export default function SqlQuerySubEnv({
  sessionId,
  onAction,
  onStepComplete,
  isFixed,
  setIsFixed,
}: SqlQuerySubEnvProps) {
  const [sqlCode, setSqlCode] = useState(isFixed ? FIXED_SQL : INITIAL_SQL);
  const [selectedTable, setSelectedTable] = useState<string | null>("sessions");
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({
    users: true,
    sessions: true,
    events: false,
    transactions: false,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [queryExecutionMeta, setQueryExecutionMeta] = useState<{
    durationMs: number;
    rowCount: number;
    timestamp: string;
    engine: string;
    queryPlan?: string;
  }>({
    durationMs: 42,
    rowCount: 5,
    timestamp: "12:04:19 UTC",
    engine: "PostgreSQL 16.2 / Aurora Read-Replica",
    queryPlan: "Hash Join (cost=24.10..892.40 rows=50840 width=24) - Omits non-transacting users",
  });
  const [queryError, setQueryError] = useState<string | null>(null);

  // Data sets reflecting the 18% drop vs reality
  const dataFlawed = [
    { date: "2026-11-01", dau: 61200, variance: "0.0%", status: "NORMAL", method: "INNER_JOIN_TRANSACTIONS" },
    { date: "2026-11-02", dau: 60950, variance: "-0.4%", status: "NORMAL", method: "INNER_JOIN_TRANSACTIONS" },
    { date: "2026-11-03", dau: 61800, variance: "+1.0%", status: "NORMAL", method: "INNER_JOIN_TRANSACTIONS" },
    { date: "2026-11-04", dau: 50680, variance: "-18.0% 🔻", status: "ANOMALOUS DROP", method: "INNER_JOIN_TRANSACTIONS" },
    { date: "2026-11-05", dau: 50840, variance: "-18.2% 🔻", status: "ANOMALOUS DROP", method: "INNER_JOIN_TRANSACTIONS" },
  ];

  const dataNormalized = [
    { date: "2026-11-01", dau: 61200, variance: "0.0%", status: "NORMAL", method: "DISTINCT_ACTIVE_SESSION_USERS" },
    { date: "2026-11-02", dau: 61500, variance: "+0.5%", status: "NORMAL", method: "DISTINCT_ACTIVE_SESSION_USERS" },
    { date: "2026-11-03", dau: 62300, variance: "+1.8%", status: "NORMAL", method: "DISTINCT_ACTIVE_SESSION_USERS" },
    { date: "2026-11-04", dau: 62100, variance: "RECOVERED ✓", status: "HEALTHY", method: "DISTINCT_ACTIVE_SESSION_USERS" },
    { date: "2026-11-05", dau: 62850, variance: "RECOVERED ✓", status: "HEALTHY", method: "DISTINCT_ACTIVE_SESSION_USERS" },
  ];

  const tableRows = isFixed ? dataNormalized : dataFlawed;

  const handleRunQuery = useCallback(async () => {
    setIsRunning(true);
    setQueryError(null);

    const lower = sqlCode.toLowerCase();
    const hasDistinct = lower.includes("distinct");
    const hasInnerTransactions =
      (lower.includes("inner join transactions") || lower.includes("join transactions")) &&
      !lower.includes("left join transactions");
    const omitsInnerTransactions = !hasInnerTransactions;
    const joinsSessions = lower.includes("sessions");

    // Partial fix diagnostic detection
    if (hasDistinct && hasInnerTransactions) {
      setQueryError(
        "⚠️ Diagnostic Alert: COUNT(DISTINCT) applied, but inner joining transactions still excludes active non-paying subscribers! Decouple the transactions join to query active sessions directly."
      );
    } else if (!hasDistinct && (omitsInnerTransactions && joinsSessions)) {
      setQueryError("⚠️ Diagnostic Alert: Sessions joined, but duplicate user sessions are not deduplicated. Add COUNT(DISTINCT u.id).");
    }

    try {
      const res = await executeDataQueryAction(sessionId || "demo-session", sqlCode);
      setIsRunning(false);
      if (res && res.success) {
        const fixed = Boolean(res.isFixed);
        setIsFixed(fixed);
        setQueryExecutionMeta({
          durationMs: res.durationMs || Math.floor(Math.random() * 25) + 30,
          rowCount: res.rowCount || 5,
          timestamp: new Date().toISOString().substring(11, 19) + " UTC",
          engine: "PostgreSQL 16.2 / Aurora Read-Replica",
          queryPlan: res.queryPlan,
        });

        if (fixed) {
          onAction(
            `[SQL_FIX_VERIFIED] Seeker updated DAU query with COUNT(DISTINCT u.id) and decoupled transactions join. Recovered 18% missing active subscribers.`
          );
          onStepComplete?.(1);
        } else {
          onAction(`[SQL_QUERY_EXECUTED] Executed query: ${sqlCode.substring(0, 80).replace(/\n/g, " ")}...`);
        }
      } else {
        // Fallback local calculation if action returns error
        const fallbackFixed = hasDistinct && joinsSessions && omitsInnerTransactions;
        setIsFixed(fallbackFixed);
        if (fallbackFixed) {
          onAction(`[SQL_FIX_VERIFIED] Seeker updated DAU query with COUNT(DISTINCT u.id) and decoupled transactions join.`);
          onStepComplete?.(1);
        }
      }
    } catch {
      const fallbackFixed = hasDistinct && joinsSessions && omitsInnerTransactions;
      setIsRunning(false);
      setIsFixed(fallbackFixed);
      setQueryExecutionMeta({
        durationMs: 38,
        rowCount: 5,
        timestamp: new Date().toISOString().substring(11, 19) + " UTC",
        engine: "PostgreSQL 16.2 / Aurora Read-Replica",
        queryPlan: fallbackFixed
          ? "Index Scan using sessions_started_at_idx on sessions (cost=0.42..18.50 rows=62850 width=24)"
          : "Hash Join (cost=24.10..892.40 rows=50840 width=24) - Omits non-transacting users",
      });
      if (fallbackFixed) {
        onAction(`[SQL_FIX_VERIFIED] Seeker updated DAU query with COUNT(DISTINCT u.id) and decoupled transactions join.`);
        onStepComplete?.(1);
      }
    }
  }, [sqlCode, sessionId, onAction, onStepComplete, setIsFixed]);

  const handleApplyFix = () => {
    setSqlCode(FIXED_SQL);
    setIsFixed(true);
    setQueryError(null);
    setQueryExecutionMeta({
      durationMs: 34,
      rowCount: 5,
      timestamp: new Date().toISOString().substring(11, 19) + " UTC",
      engine: "PostgreSQL 16.2 / Aurora Read-Replica",
    });
    onAction("[AUTO_FIX_SQL] Seeker applied DISTINCT user session join patch. 18% DAU drop corrected.");
    onStepComplete?.(1);
  };

  const handleResetQuery = () => {
    setSqlCode(INITIAL_SQL);
    setIsFixed(false);
    setQueryError(null);
    onAction("[SQL_RESET] Reset query to legacy inner-join definition.");
  };

  // Keyboard shortcut: F5 or Ctrl+Enter / Cmd+Enter to run query
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        handleRunQuery();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunQuery();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRunQuery]);

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => ({ ...prev, [name]: !prev[name] }));
    setSelectedTable(name);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        height: "100%",
        width: "100%",
        background: "#05070d",
        color: "#e2e8f0",
        fontFamily: "'JetBrains Mono', monospace",
        overflow: "hidden",
      }}
    >
      {/* LEFT COLUMN: Schema Explorer */}
      <div
        style={{
          borderRight: "1px solid #1e293b",
          background: "#03060b",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Explorer Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #1e293b",
            background: "#070b14",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: "#06b6d4", fontWeight: 800, letterSpacing: "1px" }}>
              DATABASE EXPLORER
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>aura_analytics_prod</div>
          </div>
          <span
            style={{
              fontSize: 9,
              padding: "2px 6px",
              background: "rgba(6,182,212,0.1)",
              border: "1px solid rgba(6,182,212,0.3)",
              color: "#38bdf8",
              borderRadius: 3,
            }}
          >
            v16.2
          </span>
        </div>

        {/* Diagnostic Context Note */}
        <div
          style={{
            margin: "12px 14px",
            padding: "10px 12px",
            background: isFixed ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${isFixed ? "#22c55e40" : "#ef444450"}`,
            borderRadius: 6,
            fontSize: 10,
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              color: isFixed ? "#22c55e" : "#ef4444",
              fontWeight: 800,
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{isFixed ? "✓ INTEGRITY VERIFIED" : "⚠️ REPORTING ANOMALY"}</span>
          </div>
          <div style={{ color: "#94a3b8" }}>
            {isFixed
              ? "Distinct subscriber join applied across sessions. Active non-paying users restored (+18%)."
              : "DAU dropped 18% on Nov 04. Check `sessions` vs `transactions`: Joining transactions drops free-tier and browsing subscribers!"}
          </div>
        </div>

        {/* Schema Tree */}
        <div style={{ padding: "8px 12px", flex: 1 }}>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>
            Tables & Schemas ({SCHEMA_TABLES.length})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SCHEMA_TABLES.map((table) => {
              const isExpanded = !!expandedTables[table.name];
              const isSelected = selectedTable === table.name;
              return (
                <div
                  key={table.name}
                  style={{
                    background: isSelected ? "#0a1120" : "#060a12",
                    border: isSelected ? "1px solid #06b6d450" : "1px solid #1e293b",
                    borderRadius: 6,
                    overflow: "hidden",
                    transition: "all 0.15s ease",
                  }}
                >
                  <button
                    onClick={() => toggleTable(table.name)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "transparent",
                      border: "none",
                      color: "#f1f5f9",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700 }}>
                      <span style={{ color: "#06b6d4", fontSize: 10 }}>{isExpanded ? "▼" : "▶"}</span>
                      <span style={{ color: "#38bdf8" }}>📋 {table.name}</span>
                    </div>
                    <span style={{ fontSize: 9, color: "#64748b" }}>{table.rowCount}</span>
                  </button>

                  {isExpanded && (
                    <div
                      style={{
                        padding: "6px 12px 10px 12px",
                        borderTop: "1px solid #1e293b",
                        background: "#04070d",
                        fontSize: 10,
                      }}
                    >
                      <div style={{ color: "#64748b", marginBottom: 6, fontSize: 9, fontStyle: "italic" }}>
                        {table.description}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {table.columns.map((col) => (
                          <div
                            key={col.name}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "2px 0",
                            }}
                          >
                            <span style={{ color: col.isPk ? "#f59e0b" : col.isFk ? "#38bdf8" : "#94a3b8" }}>
                              {col.isPk ? "🔑 " : col.isFk ? "🔗 " : "• "}
                              {col.name}
                            </span>
                            <span style={{ color: "#475569", fontSize: 9 }}>{col.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Tips */}
        <div
          style={{
            padding: 12,
            borderTop: "1px solid #1e293b",
            background: "#060911",
            fontSize: 10,
            color: "#64748b",
          }}
        >
          <div style={{ color: "#06b6d4", fontWeight: 700, marginBottom: 4 }}>Shortcuts:</div>
          <div>• <code style={{ color: "#38bdf8" }}>F5</code> or <code style={{ color: "#38bdf8" }}>Ctrl+Enter</code> : Run Query</div>
          <div>• Table click : Inspect columns</div>
        </div>
      </div>

      {/* RIGHT COLUMN: SQL Editor & Table Results */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Top Control Bar */}
        <div
          style={{
            padding: "10px 16px",
            background: "#080c16",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: 6 }}>
              <span>📄</span>
              <span>query_daily_active_users.sql</span>
            </span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 8px",
                background: isFixed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                color: isFixed ? "#22c55e" : "#f87171",
                border: `1px solid ${isFixed ? "#22c55e" : "#ef4444"}`,
                borderRadius: 4,
                fontWeight: 700,
              }}
            >
              {isFixed ? "QUERY_REPAIRED" : "UNRESOLVED_DISCREPANCY"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleResetQuery}
              style={{
                padding: "6px 12px",
                background: "#0b101c",
                border: "1px solid #334155",
                color: "#94a3b8",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ↺ Reset
            </button>
            <button
              onClick={handleApplyFix}
              style={{
                padding: "6px 12px",
                background: isFixed ? "rgba(34,197,94,0.15)" : "rgba(6,182,212,0.1)",
                border: isFixed ? "1px solid #22c55e" : "1px solid rgba(6,182,212,0.5)",
                color: isFixed ? "#22c55e" : "#38bdf8",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>⚡</span>
              <span>Apply Distinct Fix</span>
            </button>
            <button
              onClick={handleRunQuery}
              disabled={isRunning}
              style={{
                padding: "6px 16px",
                background: "rgba(6,182,212,0.2)",
                border: "1px solid #06b6d4",
                color: "#22d3ee",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 0 12px rgba(6,182,212,0.25)",
              }}
            >
              <span>{isRunning ? "⏳" : "▶"}</span>
              <span>RUN QUERY (F5)</span>
            </button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div style={{ flex: 1, minHeight: 260, position: "relative", background: "#05070d" }}>
          <Editor
            height="100%"
            defaultLanguage="sql"
            language="sql"
            theme="vs-dark"
            value={sqlCode}
            onChange={(val) => setSqlCode(val || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 12.5,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              suggestOnTriggerCharacters: true,
              renderLineHighlight: "all",
            }}
          />
        </div>

        {/* Execution Metadata Status Strip */}
        <div
          style={{
            padding: "6px 16px",
            background: "#080c16",
            borderTop: "1px solid #1e293b",
            borderBottom: "1px solid #1e293b",
            fontSize: 10,
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span>⚡ Execution: <strong style={{ color: "#38bdf8" }}>{queryExecutionMeta.durationMs}ms</strong></span>
            <span>📊 Rows: <strong style={{ color: "#f8fafc" }}>{queryExecutionMeta.rowCount}</strong></span>
            <span>🕒 Executed at: {queryExecutionMeta.timestamp}</span>
            {queryExecutionMeta.queryPlan && (
              <span style={{ color: "#94a3b8", fontSize: 9 }}>
                Plan: <code style={{ color: isFixed ? "#38bdf8" : "#f59e0b" }}>{queryExecutionMeta.queryPlan.slice(0, 48)}...</code>
              </span>
            )}
          </div>
          <div>
            <span>Engine: <span style={{ color: "#94a3b8" }}>{queryExecutionMeta.engine}</span></span>
          </div>
        </div>

        {/* Diagnostic Query Warning if Partial Fix */}
        {queryError && (
          <div
            style={{
              padding: "6px 16px",
              background: "rgba(245, 158, 11, 0.12)",
              borderBottom: "1px solid rgba(245, 158, 11, 0.4)",
              color: "#fbbf24",
              fontSize: 10,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{queryError}</span>
            <button
              onClick={() => setQueryError(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Bottom Panel: Table Results Grid */}
        <div style={{ height: "260px", background: "#060911", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              padding: "8px 16px",
              background: "#080d18",
              borderBottom: "1px solid #1e293b",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>
              QUERY RESULTS GRID // 5 ROWS RETURNED
            </div>
            <div style={{ fontSize: 10, color: isFixed ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
              {isFixed ? "✓ 62,850 TRUE DAU RECOVERED" : "⚠️ -18.2% ARTIFICIAL DROP DETECTED"}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e293b", color: "#64748b", fontSize: 10 }}>
                  <th style={{ padding: "8px 10px" }}>REPORT_DATE</th>
                  <th style={{ padding: "8px 10px" }}>ACTIVE_USERS (DAU)</th>
                  <th style={{ padding: "8px 10px" }}>VARIANCE DELTA</th>
                  <th style={{ padding: "8px 10px" }}>STATUS</th>
                  <th style={{ padding: "8px 10px" }}>CALCULATION_METHOD</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr
                    key={row.date}
                    style={{
                      borderBottom: "1px solid #0f172a",
                      background: !isFixed && i >= 3 ? "rgba(239,68,68,0.05)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "8px 10px", color: "#94a3b8", fontWeight: 600 }}>{row.date}</td>
                    <td
                      style={{
                        padding: "8px 10px",
                        fontWeight: 800,
                        color: isFixed ? "#22c55e" : i >= 3 ? "#ef4444" : "#f1f5f9",
                      }}
                    >
                      {row.dau.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        color: isFixed ? "#22c55e" : i >= 3 ? "#ef4444" : "#94a3b8",
                        fontWeight: i >= 3 ? 700 : 400,
                      }}
                    >
                      {row.variance}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          borderRadius: 3,
                          background:
                            row.status === "NORMAL" || row.status === "HEALTHY"
                              ? "rgba(34,197,94,0.12)"
                              : "rgba(239,68,68,0.15)",
                          color: row.status === "NORMAL" || row.status === "HEALTHY" ? "#22c55e" : "#ef4444",
                          border: `1px solid ${
                            row.status === "NORMAL" || row.status === "HEALTHY" ? "#22c55e40" : "#ef444460"
                          }`,
                          fontWeight: 700,
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", color: "#64748b", fontSize: 10 }}>
                      <code>{row.method}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AnimatePresence>
            {isFixed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                style={{
                  padding: "8px 16px",
                  background: "rgba(34,197,94,0.1)",
                  borderTop: "1px solid #22c55e40",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 11,
                }}
              >
                <div style={{ color: "#22c55e", fontWeight: 700 }}>
                  ✓ SQL Join Correction Complete: Distinct user aggregation restores reporting integrity.
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>
                  Proceed to <strong>02 — Data Pipeline & Quality Lab</strong> to repair upstream schema drift.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
