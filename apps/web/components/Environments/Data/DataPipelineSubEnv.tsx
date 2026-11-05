"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { repairPipelineDagNodeAction } from "../../../actions/eval";

export interface DataPipelineSubEnvProps {
  sessionId?: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onStepComplete?: (step: number) => void;
  isPipelineRepaired: boolean;
  setIsPipelineRepaired: (repaired: boolean) => void;
}

interface DagNode {
  id: string;
  label: string;
  type: "extractor" | "transform" | "mart" | "export";
  status: "success" | "failed" | "upstream_failed" | "running" | "blocked";
  duration: string;
  records: string;
  errorSnippet?: string;
  description: string;
}

const INITIAL_NODES: DagNode[] = [
  {
    id: "raw_ingress_stream",
    label: "kafka.ingress.events",
    type: "extractor",
    status: "success",
    duration: "1.4s",
    records: "124,500 req/min",
    description: "Ingests raw JSON payloads from AWS API Gateway into Kafka stream topics.",
  },
  {
    id: "extract_client_events",
    label: "extract_client_events",
    type: "extractor",
    status: "success",
    duration: "4.2s",
    records: "98,400 events/hr",
    description: "Snowplow batch extractor unpacking client payloads into raw bronze storage.",
  },
  {
    id: "cleanse_mobile_v2",
    label: "stg_mobile_events.sql",
    type: "transform",
    status: "failed",
    duration: "12.8s (FAILED)",
    records: "18,240 dropped (18.2%)",
    errorSnippet:
      "dbt test assert_not_null_user_id FAILED: 18,240 null rows in mobile batch. Schema drift: mobile v2.4.1 sent 'account_uid' instead of 'user_id'. Duplicate event_ids detected in retry queue.",
    description:
      "Silver staging transformation. Cleanses and validates mobile app telemetry.",
  },
  {
    id: "join_session_enrichment",
    label: "int_session_events.sql",
    type: "transform",
    status: "upstream_failed",
    duration: "0.0s (BLOCKED)",
    records: "0 records",
    errorSnippet: "Task upstream dependency `stg_mobile_events` failed. Execution halted.",
    description: "Enriches session windows by joining client telemetry with subscriber tiers.",
  },
  {
    id: "aggregate_dau_metrics",
    label: "mart_daily_active_users.sql",
    type: "mart",
    status: "upstream_failed",
    duration: "0.0s (BLOCKED)",
    records: "Stale: 50,840 DAU",
    errorSnippet: "Cannot recompute DAU mart while upstream silver tables are corrupt.",
    description: "Gold reporting mart providing published DAU metrics to BI dashboards.",
  },
  {
    id: "publish_bi_warehouse",
    label: "export.snowflake_bi_sync",
    type: "export",
    status: "blocked",
    duration: "0.0s (WAITING)",
    records: "Pending",
    description: "Reverse ETL sync pushing consolidated mart tables to Snowflake & BI replicas.",
  },
];

const FAULTY_DBT_CODE = `-- models/staging/stg_mobile_events.sql
-- FAULTY: Ingestion model written prior to mobile app v2.4.1 deployment

SELECT 
  event_id,
  payload->>'user_id' AS user_id,  -- ⚠️ BUG: Mobile v2.4.1 renamed key to 'account_uid'
  payload->>'event_name' AS event_name,
  payload->>'device_os' AS device_os,
  (payload->>'client_timestamp')::timestamptz AS event_timestamp,
  received_at
FROM raw_events
WHERE received_at >= CURRENT_DATE - INTERVAL '3 days';
-- Missing deduplication on retry storms`;

const REPAIRED_DBT_CODE = `-- models/staging/stg_mobile_events.sql
-- REPAIRED: Accommodates mobile schema drift & deduplicates retry storms

WITH deduped_events AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY event_id 
      ORDER BY received_at DESC
    ) AS dedupe_rn
  FROM raw_events
  WHERE received_at >= CURRENT_DATE - INTERVAL '3 days'
)
SELECT 
  event_id,
  -- Schema Drift Fix: Coalesce new mobile key with legacy key
  COALESCE(
    payload->>'account_uid',
    payload->>'user_id'
  ) AS user_id,
  payload->>'event_name' AS event_name,
  payload->>'device_os' AS device_os,
  (payload->>'client_timestamp')::timestamptz AS event_timestamp,
  received_at
FROM deduped_events
WHERE dedupe_rn = 1;`;

export default function DataPipelineSubEnv({
  sessionId,
  onAction,
  onStepComplete,
  isPipelineRepaired,
  setIsPipelineRepaired,
}: DataPipelineSubEnvProps) {
  const [nodes, setNodes] = useState<DagNode[]>(() =>
    INITIAL_NODES.map((n) =>
      isPipelineRepaired && (n.status === "failed" || n.status === "upstream_failed" || n.status === "blocked")
        ? { ...n, status: "success", duration: "2.1s", records: "Normalized" }
        : n
    )
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string>("cleanse_mobile_v2");
  const [activeTab, setActiveTab] = useState<"logs" | "code" | "assertions">("logs");
  const [isExecutingDag, setIsExecutingDag] = useState(false);
  const [codeContent, setCodeContent] = useState(isPipelineRepaired ? REPAIRED_DBT_CODE : FAULTY_DBT_CODE);
  const [validationNotice, setValidationNotice] = useState<string | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[2];

  const checkCodeFix = (code: string) => {
    const lower = code.toLowerCase();
    const handlesSchemaDrift = lower.includes("account_uid") && lower.includes("coalesce");
    const handlesDedupe = lower.includes("row_number") || lower.includes("dedupe") || lower.includes("distinct");
    return handlesSchemaDrift && handlesDedupe;
  };

  const handleCompileModel = async () => {
    try {
      const res = await repairPipelineDagNodeAction(
        sessionId || "demo-session",
        selectedNodeId,
        codeContent
      );
      if (res && res.isRepaired) {
        setIsPipelineRepaired(true);
        setValidationNotice("✓ Compilation Success: Schema drift handled via COALESCE and window deduplication active. All assertions passing.");
        setNodes((prev) =>
          prev.map((n) =>
            n.id === "cleanse_mobile_v2"
              ? { ...n, status: "success", duration: "2.1s", records: "62,850 Validated" }
              : n
          )
        );
        onAction(
          "[PIPELINE_FIX_APPLIED] Seeker patched `stg_mobile_events.sql` with COALESCE(payload->>'account_uid', payload->>'user_id') and window deduplication."
        );
      } else {
        setIsPipelineRepaired(false);
        setValidationNotice("✕ Compilation Error: dbt test assert_not_null_user_id failed. Coalesce payload->>'account_uid' and add ROW_NUMBER() deduplication.");
        onAction("[PIPELINE_VALIDATION_FAILED] Model stg_mobile_events.sql failed quality assertions.");
      }
    } catch {
      const isFixed = checkCodeFix(codeContent);
      setIsPipelineRepaired(isFixed);
      if (isFixed) {
        setValidationNotice("✓ Compilation Success: Schema drift handled and window deduplication active.");
        onAction(
          "[PIPELINE_FIX_APPLIED] Seeker patched `stg_mobile_events.sql` with COALESCE and deduplication."
        );
      } else {
        setValidationNotice("✕ Compilation Error: Schema drift unhandled or deduplication missing.");
      }
    }
  };

  const handleApplyNodeFix = () => {
    setCodeContent(REPAIRED_DBT_CODE);
    setIsPipelineRepaired(true);
    setValidationNotice("✓ Repaired model loaded: COALESCE(account_uid, user_id) and ROW_NUMBER() window dedup active.");
    setNodes((prev) =>
      prev.map((n) =>
        n.id === "cleanse_mobile_v2"
          ? { ...n, status: "success", duration: "2.1s", records: "62,850 Validated" }
          : n
      )
    );
    onAction(
      "[PIPELINE_FIX_APPLIED] Seeker patched `stg_mobile_events.sql` with COALESCE(payload->>'account_uid', payload->>'user_id') and window deduplication."
    );
  };

  const handleTriggerDagRun = () => {
    setIsExecutingDag(true);
    setValidationNotice(null);
    onAction("[PIPELINE_DAG_TRIGGERED] Triggered Airflow manual DAG run `scheduled__dau_mart_daily_v3`.");

    const isEffectiveRepaired = isPipelineRepaired || checkCodeFix(codeContent);

    if (!isEffectiveRepaired) {
      // Simulate real DAG failure at cleanse_mobile_v2
      setTimeout(() => {
        setNodes((prev) =>
          prev.map((n) => (n.id === "cleanse_mobile_v2" ? { ...n, status: "running", duration: "Running..." } : n))
        );
      }, 400);

      setTimeout(() => {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === "cleanse_mobile_v2"
              ? {
                  ...n,
                  status: "failed",
                  duration: "12.8s (FAILED)",
                  records: "18,240 dropped (18.2%)",
                  errorSnippet:
                    "dbt test assert_not_null_user_id FAILED: 18,240 null rows in mobile batch. Schema drift: mobile v2.4.1 sent 'account_uid' instead of 'user_id'. Duplicate event_ids detected in retry queue.",
                }
              : n.id === "join_session_enrichment" || n.id === "aggregate_dau_metrics"
              ? { ...n, status: "upstream_failed", duration: "0.0s (BLOCKED)" }
              : n.id === "publish_bi_warehouse"
              ? { ...n, status: "blocked", duration: "0.0s (WAITING)" }
              : n
          )
        );
        setIsExecutingDag(false);
        setIsPipelineRepaired(false);
        onAction(
          "[PIPELINE_DAG_FAILED] Airflow DAG execution halted at task stg_mobile_events.sql: assert_not_null_user_id failed with 18,240 null rows due to mobile v2.4.1 schema drift."
        );
      }, 1500);
      return;
    }

    // Sequential successful pipeline run simulation
    setTimeout(() => {
      setNodes((prev) =>
        prev.map((n) => (n.id === "cleanse_mobile_v2" ? { ...n, status: "running", duration: "Running..." } : n))
      );
    }, 400);

    setTimeout(() => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === "cleanse_mobile_v2"
            ? { ...n, status: "success", duration: "3.4s", records: "100% Validated (0 nulls)" }
            : n.id === "join_session_enrichment"
            ? { ...n, status: "running", duration: "Running..." }
            : n
        )
      );
    }, 1100);

    setTimeout(() => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === "join_session_enrichment"
            ? { ...n, status: "success", duration: "2.8s", records: "62,850 sessions enriched" }
            : n.id === "aggregate_dau_metrics"
            ? { ...n, status: "running", duration: "Running..." }
            : n
        )
      );
    }, 1800);

    setTimeout(() => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === "aggregate_dau_metrics"
            ? { ...n, status: "success", duration: "1.9s", records: "62,850 DAU (18% Recovered)" }
            : n.id === "publish_bi_warehouse"
            ? { ...n, status: "success", duration: "0.8s", records: "Synced to Snowflake" }
            : n
        )
      );
      setIsExecutingDag(false);
      setIsPipelineRepaired(true);
      onAction(
        "[PIPELINE_DAG_SUCCESS] All 6 DAG tasks succeeded. Data Quality assertions passed 100%. Gold mart published."
      );
      onStepComplete?.(2);
    }, 2500);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 440px",
        height: "100%",
        width: "100%",
        background: "#05070d",
        color: "#e2e8f0",
        fontFamily: "'JetBrains Mono', monospace",
        overflow: "hidden",
      }}
    >
      {/* LEFT COLUMN: Airflow / dbt DAG Visualizer */}
      <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid #1e293b", overflow: "hidden" }}>
        {/* DAG Header Bar */}
        <div
          style={{
            padding: "10px 18px",
            background: "#080c16",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#38bdf8", display: "flex", alignItems: "center", gap: 6 }}>
              <span>🌪️</span>
              <span>DAG: aura_dau_mart_daily_v3</span>
            </span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 8px",
                borderRadius: 4,
                background: isPipelineRepaired ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                color: isPipelineRepaired ? "#22c55e" : "#ef4444",
                border: `1px solid ${isPipelineRepaired ? "#22c55e" : "#ef4444"}`,
                fontWeight: 700,
              }}
            >
              {isPipelineRepaired ? "DAG_RUN: SUCCESS" : "DAG_RUN: FAILED (1 task, 2 blocked)"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handleTriggerDagRun}
              disabled={isExecutingDag}
              style={{
                padding: "6px 14px",
                background: isExecutingDag ? "#1e293b" : "rgba(6,182,212,0.15)",
                border: "1px solid #06b6d4",
                color: "#22d3ee",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 800,
                cursor: isExecutingDag ? "wait" : "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 0 10px rgba(6,182,212,0.2)",
              }}
            >
              <span>{isExecutingDag ? "🔄" : "▶"}</span>
              <span>{isExecutingDag ? "EXECUTING PIPELINE..." : "TRIGGER DAG RUN"}</span>
            </button>
          </div>
        </div>

        {/* Pipeline Info Banner */}
        <div
          style={{
            padding: "8px 18px",
            background: "#070b14",
            borderBottom: "1px solid #1e293b",
            fontSize: 10,
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            Schedule: <span style={{ color: "#38bdf8" }}>@hourly</span> | Orchestrator:{" "}
            <span style={{ color: "#f8fafc" }}>Airflow 2.8.1 + dbt Core 1.7</span>
          </div>
          <div style={{ color: isPipelineRepaired ? "#22c55e" : "#f59e0b" }}>
            {isPipelineRepaired
              ? "All quality assertions passing (0 drift, 0 duplicate events)"
              : "Root Cause: Mobile App v2.4.1 schema drift caused 18.2% NULLs in stg_mobile_events"}
          </div>
        </div>

        {/* Visual DAG Canvas */}
        <div
          style={{
            flex: 1,
            background: "radial-gradient(circle at 50% 50%, #0a1120 0%, #04070d 100%)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
            overflow: "auto",
          }}
        >
          {/* Legend */}
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 18,
              display: "flex",
              gap: 12,
              fontSize: 10,
              color: "#64748b",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} /> Success
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} /> Failed
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} /> Upstream Failed
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#06b6d4" }} /> Running
            </span>
          </div>

          {/* DAG Pipeline Flow */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 680, margin: "0 auto", width: "100%" }}>
            {nodes.map((node, index) => {
              const isSelected = selectedNodeId === node.id;
              const isFailed = node.status === "failed";
              const isSuccess = node.status === "success";
              const isRunning = node.status === "running";
              const isUpstream = node.status === "upstream_failed";

              const borderColor = isSuccess
                ? "#22c55e"
                : isFailed
                ? "#ef4444"
                : isRunning
                ? "#06b6d4"
                : isUpstream
                ? "#f59e0b"
                : "#334155";

              const bgColor = isSelected
                ? "#0d1729"
                : isFailed
                ? "rgba(239,68,68,0.06)"
                : isSuccess
                ? "rgba(34,197,94,0.04)"
                : "#070c18";

              return (
                <div key={node.id} style={{ position: "relative" }}>
                  <motion.div
                    whileHover={{ scale: 1.015 }}
                    onClick={() => setSelectedNodeId(node.id)}
                    style={{
                      background: bgColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 8,
                      padding: "12px 16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      boxShadow: isSelected
                        ? `0 0 16px ${borderColor}40`
                        : isRunning
                        ? "0 0 12px rgba(6,182,212,0.3)"
                        : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: `${borderColor}20`,
                          border: `1px solid ${borderColor}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                        }}
                      >
                        {isSuccess ? "✓" : isFailed ? "✕" : isRunning ? "⟳" : "!"}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc" }}>
                          {node.label}
                        </div>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                          {node.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: borderColor }}>
                        {node.duration}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                        {node.records}
                      </div>
                    </div>
                  </motion.div>

                  {/* Connector Arrow to next node */}
                  {index < nodes.length - 1 && (
                    <div
                      style={{
                        height: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isSuccess ? "#22c55e" : "#475569",
                        fontSize: 12,
                      }}
                    >
                      <span>↓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Node Inspector Drawer */}
      <div
        style={{
          background: "#04070e",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Inspector Header */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #1e293b",
            background: "#080c16",
          }}
        >
          <div style={{ fontSize: 10, color: "#06b6d4", fontWeight: 800, letterSpacing: "1px" }}>
            TASK INSPECTOR
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#f8fafc", marginTop: 2 }}>
            {selectedNode.label}
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            Operator: <code style={{ color: "#38bdf8" }}>DbtRunOperator</code> | Target:{" "}
            <code style={{ color: "#f59e0b" }}>prod_silver</code>
          </div>
        </div>

        {/* Tab Controls */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #1e293b",
            background: "#060911",
          }}
        >
          <button
            onClick={() => setActiveTab("logs")}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: activeTab === "logs" ? "#0b1220" : "transparent",
              border: "none",
              borderBottom: activeTab === "logs" ? "2px solid #06b6d4" : "none",
              color: activeTab === "logs" ? "#22d3ee" : "#64748b",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            📋 Logs & Errors
          </button>
          <button
            onClick={() => setActiveTab("code")}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: activeTab === "code" ? "#0b1220" : "transparent",
              border: "none",
              borderBottom: activeTab === "code" ? "2px solid #06b6d4" : "none",
              color: activeTab === "code" ? "#22d3ee" : "#64748b",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            💻 Model SQL
          </button>
          <button
            onClick={() => setActiveTab("assertions")}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: activeTab === "assertions" ? "#0b1220" : "transparent",
              border: "none",
              borderBottom: activeTab === "assertions" ? "2px solid #06b6d4" : "none",
              color: activeTab === "assertions" ? "#22d3ee" : "#64748b",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            🧪 Assertions ({isPipelineRepaired ? "3/3 Pass" : "1 Fail"})
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, padding: 14, overflowY: "auto" }}>
          {activeTab === "logs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  background: "#020306",
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  padding: 12,
                  fontSize: 10,
                  lineHeight: 1.6,
                  color: "#cbd5e1",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <div style={{ color: "#64748b", marginBottom: 6 }}>
                  [2026-11-05 06:14:01 UTC] Running dbt model: stg_mobile_events...
                </div>
                {isPipelineRepaired ? (
                  <>
                    <div style={{ color: "#22c55e" }}>
                      [2026-11-05 06:14:02 UTC] PASS: stg_mobile_events compiled cleanly.
                    </div>
                    <div style={{ color: "#22c55e" }}>
                      [2026-11-05 06:14:03 UTC] Deduplicated 4,812 retry storm events.
                    </div>
                    <div style={{ color: "#22c55e" }}>
                      [2026-11-05 06:14:03 UTC] 18,240 mobile v2.4.1 events mapped via `account_uid`.
                    </div>
                    <div style={{ color: "#22c55e" }}>
                      [2026-11-05 06:14:04 UTC] Total output records: 62,850 active telemetry rows.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ color: "#f87171" }}>
                      [2026-11-05 06:14:02 UTC] ERROR: dbt test `assert_not_null_user_id` FAILED!
                    </div>
                    <div style={{ color: "#ef4444", fontWeight: 700 }}>
                      Found 18,240 rows with NULL user_id (18.2% of mobile batch).
                    </div>
                    <div style={{ color: "#f59e0b" }}>
                      [2026-11-05 06:14:02 UTC] SCHEMA_DRIFT: Client release v2.4.1 emitted `payload.account_uid` instead of `payload.user_id`.
                    </div>
                    <div style={{ color: "#f59e0b" }}>
                      [2026-11-05 06:14:03 UTC] DUPLICATE_KEY: 4,812 duplicate events detected in Kafka retry queue.
                    </div>
                    <div style={{ color: "#64748b" }}>
                      [2026-11-05 06:14:03 UTC] Halting downstream task `int_session_events`.
                    </div>
                  </>
                )}
              </div>

              {!isPipelineRepaired && (
                <div
                  style={{
                    padding: 12,
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid #ef444450",
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                >
                  <div style={{ color: "#ef4444", fontWeight: 700, marginBottom: 4 }}>
                    Action Required:
                  </div>
                  <div style={{ color: "#94a3b8", lineHeight: 1.5, fontSize: 10 }}>
                    Update the staging dbt model to coalesce <code style={{ color: "#fff" }}>account_uid</code> and deduplicate retry events, then trigger the DAG run.
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "code" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>
                Target File: <code>models/staging/stg_mobile_events.sql</code>
              </div>
              <textarea
                value={codeContent}
                onChange={(e) => setCodeContent(e.target.value)}
                style={{
                  width: "100%",
                  height: 260,
                  background: "#020306",
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  color: "#f8fafc",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10.5,
                  padding: 10,
                  lineHeight: 1.5,
                  resize: "none",
                  outline: "none",
                }}
              />
              {validationNotice && (
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: 4,
                    fontSize: 10,
                    lineHeight: 1.4,
                    background: validationNotice.startsWith("✓")
                      ? "rgba(34, 197, 94, 0.12)"
                      : "rgba(239, 68, 68, 0.12)",
                    border: `1px solid ${
                      validationNotice.startsWith("✓") ? "#22c55e60" : "#ef444460"
                    }`,
                    color: validationNotice.startsWith("✓") ? "#4ade80" : "#f87171",
                  }}
                >
                  {validationNotice}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleCompileModel}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    background: "rgba(6,182,212,0.2)",
                    border: "1px solid #06b6d4",
                    color: "#22d3ee",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <span>⚡</span>
                  <span>Compile & Validate Model</span>
                </button>

                <button
                  onClick={handleApplyNodeFix}
                  style={{
                    padding: "8px 12px",
                    background: isPipelineRepaired ? "rgba(34,197,94,0.15)" : "#0b1220",
                    border: isPipelineRepaired ? "1px solid #22c55e" : "1px solid #334155",
                    color: isPipelineRepaired ? "#22c55e" : "#94a3b8",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  title="Auto-fill recommended dbt fix"
                >
                  <span>🛠️</span>
                  <span>{isPipelineRepaired ? "Template Active" : "Apply Template"}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "assertions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  background: "#060912",
                  border: `1px solid ${isPipelineRepaired ? "#22c55e40" : "#ef444450"}`,
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f8fafc" }}>
                    assert_not_null_user_id
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: isPipelineRepaired ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: isPipelineRepaired ? "#22c55e" : "#ef4444",
                      fontWeight: 700,
                    }}
                  >
                    {isPipelineRepaired ? "PASS" : "FAIL (18.2% NULLs)"}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                  Validates that every client event payload maps to a valid subscriber identifier.
                </div>
              </div>

              <div
                style={{
                  background: "#060912",
                  border: `1px solid ${isPipelineRepaired ? "#22c55e40" : "#f59e0b50"}`,
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f8fafc" }}>
                    assert_unique_event_id
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: isPipelineRepaired ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                      color: isPipelineRepaired ? "#22c55e" : "#f59e0b",
                      fontWeight: 700,
                    }}
                  >
                    {isPipelineRepaired ? "PASS" : "WARN (4,812 duplicates)"}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                  Guarantees idempotency across Kafka consumer network retries.
                </div>
              </div>

              <div
                style={{
                  background: "#060912",
                  border: "1px solid #22c55e40",
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f8fafc" }}>
                    assert_row_count_variance
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: "rgba(34,197,94,0.15)",
                      color: "#22c55e",
                      fontWeight: 700,
                    }}
                  >
                    PASS (+0.4% vs avg)
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                  Checks that volume matches rolling 7-day API gateway ingress traffic baseline.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div
          style={{
            padding: 14,
            borderTop: "1px solid #1e293b",
            background: "#080c16",
          }}
        >
          <button
            onClick={handleTriggerDagRun}
            disabled={isExecutingDag}
            style={{
              width: "100%",
              padding: "10px 16px",
              background: isPipelineRepaired
                ? "rgba(34,197,94,0.2)"
                : "rgba(6,182,212,0.15)",
              border: `1px solid ${isPipelineRepaired ? "#22c55e" : "#06b6d4"}`,
              color: isPipelineRepaired ? "#22c55e" : "#22d3ee",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 800,
              cursor: isExecutingDag ? "wait" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>{isExecutingDag ? "🔄" : isPipelineRepaired ? "✓" : "⚡"}</span>
            <span>
              {isExecutingDag
                ? "RUNNING DBT PIPELINE..."
                : isPipelineRepaired
                ? "RE-EXECUTE DAG TEST SUITE"
                : "DEPLOY HOTFIX & TRIGGER DAG RUN"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
