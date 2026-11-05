"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { KubernetesPod, PromqlQueryResult, ServiceHealthItem } from "./types";

interface GrafanaMonitoringSubEnvProps {
  errorRate: number;
  p99Latency: number;
  cpuSaturation: number;
  memorySaturation: number;
  isRecovering: boolean;
  pods: KubernetesPod[];
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onNavigateToRollback?: () => void;
  onNavigateToWarRoom?: () => void;
}

const DEFAULT_PROMQL_QUERIES = [
  {
    label: "5xx Error Rate (%)",
    query: `sum(rate(http_requests_total{status=~"5.."}[1m])) / sum(rate(http_requests_total[1m])) * 100`,
    description: "Evaluates ratio of 5xx HTTP response codes across checkout endpoints",
  },
  {
    label: "p99 Latency (ms)",
    query: `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[1m])) by (le)) * 1000`,
    description: "Calculates 99th percentile request latency across ingress gateway",
  },
  {
    label: "CrashLooping Pod Count",
    query: `count(kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"})`,
    description: "Monitors count of pods failing liveness probes with non-zero exit codes",
  },
  {
    label: "Pod CPU Saturation",
    query: `sum(rate(container_cpu_usage_seconds_total{container="checkout-api"}[1m])) by (pod)`,
    description: "Aggregates CPU utilization spikes across all checkout container replicas",
  },
];

export default function GrafanaMonitoringSubEnv({
  errorRate,
  p99Latency,
  cpuSaturation,
  memorySaturation,
  isRecovering,
  pods,
  onAction,
  onNavigateToRollback,
  onNavigateToWarRoom,
}: GrafanaMonitoringSubEnvProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState("Last 15m");
  const [promqlInput, setPromqlInput] = useState(DEFAULT_PROMQL_QUERIES[0].query);
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [queryResult, setQueryResult] = useState<PromqlQueryResult | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceHealthItem | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "raw">("table");

  const crashloopCount = pods.filter((p) => p.status === "CrashLoopBackOff" || p.status === "Error").length;
  const runningCount = pods.filter((p) => p.status === "Running").length;

  // Initial synthetic query run
  useEffect(() => {
    executePromql(DEFAULT_PROMQL_QUERIES[0].query, true);
  }, [errorRate, isRecovering]);

  const executePromql = async (queryToRun: string, silent: boolean = false) => {
    setIsExecutingQuery(true);
    const start = performance.now();

    if (!silent) {
      onAction(`[PROMQL_QUERY] Executed: ${queryToRun}`);
    }

    // Build realistic PromQL timeseries
    const nowTs = Math.floor(Date.now() / 1000);
    let seriesData: PromqlQueryResult["result"] = [];

    if (queryToRun.includes("5..") || queryToRun.includes("http_requests_total")) {
      seriesData = [
        {
          metric: { service: "checkout-api", code: "500", cluster: "aura-prod-us-east-1" },
          values: [
            [nowTs - 600, "0.12"],
            [nowTs - 300, isRecovering ? "18.4" : "42.8"],
            [nowTs, errorRate.toFixed(2)],
          ],
        },
        {
          metric: { service: "checkout-api", code: "200", cluster: "aura-prod-us-east-1" },
          values: [
            [nowTs - 600, "99.88"],
            [nowTs - 300, isRecovering ? "81.6" : "57.2"],
            [nowTs, (100 - errorRate).toFixed(2)],
          ],
        },
      ];
    } else if (queryToRun.includes("quantile") || queryToRun.includes("duration")) {
      seriesData = [
        {
          metric: { service: "checkout-api", quantile: "0.99", path: "/v1/orders/charge" },
          values: [
            [nowTs - 600, "45"],
            [nowTs - 300, isRecovering ? "820" : "2850"],
            [nowTs, Math.round(p99Latency).toString()],
          ],
        },
        {
          metric: { service: "checkout-api", quantile: "0.50", path: "/v1/orders/charge" },
          values: [
            [nowTs - 600, "22"],
            [nowTs - 300, isRecovering ? "140" : "410"],
            [nowTs, isRecovering ? "26" : "390"],
          ],
        },
      ];
    } else if (queryToRun.includes("CrashLoopBackOff") || queryToRun.includes("pod")) {
      seriesData = [
        {
          metric: { deployment: "checkout-service", container: "checkout-api", reason: "CrashLoopBackOff" },
          values: [
            [nowTs - 600, "0"],
            [nowTs - 300, isRecovering ? "4" : "12"],
            [nowTs, crashloopCount.toString()],
          ],
        },
      ];
    } else {
      seriesData = [
        {
          metric: { container: "checkout-api", metric_name: "cpu_usage_core_rate" },
          values: [
            [nowTs - 600, "0.24"],
            [nowTs - 300, isRecovering ? "0.45" : "0.94"],
            [nowTs, (cpuSaturation / 100).toFixed(2)],
          ],
        },
      ];
    }

    const elapsed = Math.round(performance.now() - start + Math.random() * 15 + 8);

    setQueryResult({
      query: queryToRun,
      timestamp: new Date().toISOString(),
      status: "success",
      latencyMs: elapsed,
      resultType: "matrix",
      result: seriesData,
    });
    setIsExecutingQuery(false);
  };

  const servicesList: ServiceHealthItem[] = [
    {
      id: "srv-checkout",
      name: "checkout-api",
      type: "Microservice (Node.js)",
      status: errorRate > 2 ? "critical" : "healthy",
      errorRate: errorRate,
      p99LatencyMs: Math.round(p99Latency),
      activeReplicas: `${runningCount}/16 ready`,
      dependencies: ["payment-gateway-proxy", "order-db-primary", "auth-service"],
      description: "Handles shopping cart final checkout, card authorization, and order emission.",
    },
    {
      id: "srv-payment",
      name: "payment-gateway-proxy",
      type: "Ingress Proxy (Go)",
      status: errorRate > 2 ? "degraded" : "healthy",
      errorRate: errorRate > 2 ? 14.8 : 0.04,
      p99LatencyMs: errorRate > 2 ? 1820 : 65,
      activeReplicas: "8/8 ready",
      dependencies: ["order-db-primary"],
      description: "Direct upstream proxy interface to Stripe / Adyen / external processors.",
    },
    {
      id: "srv-cart",
      name: "cart-service",
      type: "Microservice (Go)",
      status: "healthy",
      errorRate: 0.02,
      p99LatencyMs: 18,
      activeReplicas: "12/12 ready",
      dependencies: ["inventory-cache"],
      description: "User session basket management and discount code validator.",
    },
    {
      id: "srv-db",
      name: "order-db-primary",
      type: "PostgreSQL 16 Cluster",
      status: "healthy",
      errorRate: 0.0,
      p99LatencyMs: 8,
      activeReplicas: "Primary + 2 Replicas",
      dependencies: [],
      description: "ACID transaction ledger for orders, invoices, and ledger settlements.",
    },
    {
      id: "srv-auth",
      name: "auth-service",
      type: "Microservice (Rust)",
      status: "healthy",
      errorRate: 0.01,
      p99LatencyMs: 12,
      activeReplicas: "6/6 ready",
      dependencies: ["order-db-primary"],
      description: "JWT session issuer and customer identity verifier.",
    },
    {
      id: "srv-cache",
      name: "inventory-cache",
      type: "Redis Cluster",
      status: "healthy",
      errorRate: 0.0,
      p99LatencyMs: 1.4,
      activeReplicas: "3 Masters / 3 Replicas",
      dependencies: [],
      description: "In-memory stock level cache preventing warehouse over-selling.",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#0b0c10",
        color: "#e2e8f0",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflowY: "auto",
      }}
    >
      {/* ─── TOP GRAFANA TOOLBAR ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
          background: "#111217",
          borderBottom: "1px solid #1e222d",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 26,
              height: 26,
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: "#fff",
              fontSize: 14,
            }}
          >
            G
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }}>
              <span style={{ color: "#94a3b8" }}>Dashboards / Production /</span>
              <span style={{ color: "#f8fafc" }}>Aura Commerce // SRE Cluster Overview</span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: errorRate > 2 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)",
                  color: errorRate > 2 ? "#ef4444" : "#22c55e",
                  border: `1px solid ${errorRate > 2 ? "#ef4444" : "#22c55e"}`,
                  fontWeight: 800,
                }}
              >
                {errorRate > 2 ? "SEV-1 ALERTING" : "NORMALIZED"}
              </span>
            </div>
            <span style={{ fontSize: 10, color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
              datasource: Prometheus (kube-prometheus-stack) | scrape: 5s
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Quick links to sister sub-environments */}
          {onNavigateToWarRoom && (
            <button
              onClick={onNavigateToWarRoom}
              style={{
                background: "#1e222d",
                border: "1px solid #334155",
                color: "#f59e0b",
                padding: "5px 10px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>🚨</span>
              <span>War Room</span>
            </button>
          )}

          {onNavigateToRollback && (
            <button
              onClick={onNavigateToRollback}
              style={{
                background: errorRate > 2 ? "rgba(239,68,68,0.15)" : "#1e222d",
                border: errorRate > 2 ? "1px solid #ef4444" : "1px solid #334155",
                color: errorRate > 2 ? "#ef4444" : "#38bdf8",
                padding: "5px 10px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>☸️</span>
              <span>Rollback Console</span>
            </button>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#181b1f",
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid #272d38",
              fontSize: 11,
              color: "#94a3b8",
            }}
          >
            <span>⏱️</span>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "#e2e8f0",
                fontSize: 11,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="Last 5m">Last 5m</option>
              <option value="Last 15m">Last 15m</option>
              <option value="Last 1h">Last 1h</option>
              <option value="Last 3h">Last 3h</option>
            </select>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#181b1f",
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid #272d38",
              fontSize: 11,
              color: "#22c55e",
            }}
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}
            />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>5s</span>
          </div>
        </div>
      </div>

      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        {/* ─── ROW 1: PRIMARY KPI STAT CARDS ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {/* Card 1: 5xx Rate */}
          <div
            style={{
              background: errorRate > 2 ? "linear-gradient(145deg, #1f1113 0%, #111319 100%)" : "linear-gradient(145deg, #0d1e16 0%, #111319 100%)",
              border: `1px solid ${errorRate > 2 ? "rgba(239,68,68,0.5)" : "rgba(34,197,94,0.4)"}`,
              borderRadius: 6,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
                HTTP 5XX ERROR RATE
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: errorRate > 2 ? "#ef4444" : "#22c55e",
                  fontWeight: 700,
                }}
              >
                SLO &lt; 0.50%
              </span>
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: errorRate > 2 ? "#ef4444" : "#22c55e",
                }}
              >
                {errorRate.toFixed(2)}%
              </span>
              <span style={{ fontSize: 11, color: errorRate > 2 ? "#f87171" : "#86efac" }}>
                {errorRate > 2 ? "▲ +4,120% spike" : "▼ Normal"}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
              Ingress endpoint: <code style={{ color: "#38bdf8" }}>/v1/checkout/complete</code>
            </div>
          </div>

          {/* Card 2: p99 Latency */}
          <div
            style={{
              background: p99Latency > 200 ? "linear-gradient(145deg, #1f1411 0%, #111319 100%)" : "linear-gradient(145deg, #0d1e16 0%, #111319 100%)",
              border: `1px solid ${p99Latency > 200 ? "rgba(249,115,22,0.5)" : "rgba(34,197,94,0.4)"}`,
              borderRadius: 6,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
                API LATENCY (P99)
              </span>
              <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#f97316", fontWeight: 700 }}>
                SLO &lt; 200ms
              </span>
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: p99Latency > 200 ? "#f97316" : "#22c55e",
                }}
              >
                {Math.round(p99Latency)}ms
              </span>
              <span style={{ fontSize: 11, color: p99Latency > 200 ? "#fb923c" : "#86efac" }}>
                {p99Latency > 200 ? "▲ +2,760ms" : "▼ Normal"}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
              Deadlock & timeout cascade on checkout lock
            </div>
          </div>

          {/* Card 3: Pod Saturation */}
          <div
            style={{
              background: "#111319",
              border: "1px solid #1e222d",
              borderRadius: 6,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
                POD CLUSTER HEALTH
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: crashloopCount > 0 ? "#ef4444" : "#22c55e",
                  fontWeight: 700,
                }}
              >
                {runningCount}/16 READY
              </span>
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: crashloopCount > 0 ? "#ef4444" : "#22c55e",
                }}
              >
                {crashloopCount > 0 ? `${crashloopCount} CrashLoop` : "All Healthy"}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
              Deployment: <code style={{ color: "#a855f7" }}>checkout-service</code>
            </div>
          </div>

          {/* Card 4: Throughput & Revenue Drag */}
          <div
            style={{
              background: "#111319",
              border: "1px solid #1e222d",
              borderRadius: 6,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px" }}>
                BLACK FRIDAY TRAFFIC
              </span>
              <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#38bdf8", fontWeight: 700 }}>
                PEAK LOAD
              </span>
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", color: "#38bdf8" }}>
                48.2k
              </span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>req/sec</span>
            </div>
            <div style={{ fontSize: 10, color: errorRate > 2 ? "#ef4444" : "#22c55e", marginTop: 4 }}>
              {errorRate > 2 ? `-$12,400/min GMV loss rate` : `100% Transactions passing`}
            </div>
          </div>
        </div>

        {/* ─── ROW 2: REAL-TIME CHARTS (GRAFANA PANELS) ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Chart Panel 1: Error Rate vs Baseline */}
          <div
            style={{
              background: "#111319",
              border: "1px solid #1e222d",
              borderRadius: 6,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              height: 260,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#ef4444" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                  HTTP 5xx Error Rate (%) &amp; Critical Threshold
                </span>
              </div>
              <span style={{ fontSize: 10, color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                1m Rate Window
              </span>
            </div>

            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-end" }}>
              <svg viewBox="0 0 500 160" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                {/* Gridlines */}
                <line x1="0" y1="130" x2="500" y2="130" stroke="#1e222d" strokeWidth="1" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#1e222d" strokeWidth="1" />
                <line x1="0" y1="50" x2="500" y2="50" stroke="#1e222d" strokeWidth="1" />
                <line x1="0" y1="10" x2="500" y2="10" stroke="#1e222d" strokeWidth="1" />

                {/* Critical Threshold Line (0.5%) */}
                <line x1="0" y1="126" x2="500" y2="126" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
                <text x="4" y="122" fill="#ef4444" fontSize="9" fontFamily="monospace">
                  SLO Limit: 0.5%
                </text>

                {/* Event Marker: Deploy v2.4.1-hotfix */}
                <line x1="220" y1="10" x2="220" y2="140" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="224" y="24" fill="#f59e0b" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  Deploy v2.4.1-hotfix
                </text>

                {/* Dynamic waveform */}
                <motion.path
                  d={
                    errorRate > 2
                      ? "M 0,128 L 80,128 L 160,127 L 220,128 L 240,40 L 320,38 L 400,36 L 500,38"
                      : "M 0,128 L 80,128 L 160,127 L 220,128 L 240,40 L 320,42 L 360,126 L 500,128"
                  }
                  fill="none"
                  stroke={errorRate > 2 ? "#ef4444" : "#22c55e"}
                  strokeWidth="2.5"
                  transition={{ duration: 0.5 }}
                />

                {/* Shaded Area Under Curve */}
                <motion.path
                  d={
                    errorRate > 2
                      ? "M 0,128 L 80,128 L 160,127 L 220,128 L 240,40 L 320,38 L 400,36 L 500,38 L 500,140 L 0,140 Z"
                      : "M 0,128 L 80,128 L 160,127 L 220,128 L 240,40 L 320,42 L 360,126 L 500,128 L 500,140 L 0,140 Z"
                  }
                  fill={errorRate > 2 ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)"}
                  transition={{ duration: 0.5 }}
                />
              </svg>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginTop: 8, fontFamily: "monospace" }}>
              <span>16:50:00</span>
              <span>16:55:00</span>
              <span>17:00:00</span>
              <span>17:05:00 (NOW)</span>
            </div>
          </div>

          {/* Chart Panel 2: Latency & CPU Saturation */}
          <div
            style={{
              background: "#111319",
              border: "1px solid #1e222d",
              borderRadius: 6,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              height: 260,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#f97316" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                  API Latency (p99 ms) &amp; CPU Pod Saturation (%)
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 10, fontFamily: "monospace" }}>
                <span style={{ color: "#f97316" }}>■ Latency p99</span>
                <span style={{ color: "#38bdf8" }}>■ CPU Saturation</span>
              </div>
            </div>

            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-end" }}>
              <svg viewBox="0 0 500 160" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                <line x1="0" y1="130" x2="500" y2="130" stroke="#1e222d" strokeWidth="1" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#1e222d" strokeWidth="1" />
                <line x1="0" y1="50" x2="500" y2="50" stroke="#1e222d" strokeWidth="1" />

                {/* SLO Target Line (200ms) */}
                <line x1="0" y1="120" x2="500" y2="120" stroke="#f97316" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <text x="4" y="116" fill="#f97316" fontSize="9" fontFamily="monospace">
                  SLO p99: 200ms
                </text>

                {/* Latency line */}
                <motion.path
                  d={
                    p99Latency > 200
                      ? "M 0,126 L 100,125 L 220,126 L 250,22 L 350,25 L 420,20 L 500,22"
                      : "M 0,126 L 100,125 L 220,126 L 250,22 L 340,30 L 380,124 L 500,126"
                  }
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2.5"
                  transition={{ duration: 0.5 }}
                />

                {/* CPU Saturation line */}
                <motion.path
                  d={
                    cpuSaturation > 50
                      ? "M 0,135 L 120,134 L 220,135 L 250,35 L 360,32 L 450,30 L 500,34"
                      : "M 0,135 L 120,134 L 220,135 L 250,35 L 340,45 L 390,130 L 500,134"
                  }
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="5 2"
                  transition={{ duration: 0.5 }}
                />
              </svg>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginTop: 8, fontFamily: "monospace" }}>
              <span>16:50:00</span>
              <span>16:55:00</span>
              <span>17:00:00</span>
              <span>17:05:00 (NOW)</span>
            </div>
          </div>
        </div>

        {/* ─── ROW 3: PROMQL QUERY INSPECTOR ─── */}
        <div
          style={{
            background: "#111319",
            border: "1px solid #1e222d",
            borderRadius: 6,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🔍</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>PromQL Query Inspector &amp; Metric Explorer</span>
              <span style={{ fontSize: 10, color: "#64748b", background: "#1e222d", padding: "2px 6px", borderRadius: 3 }}>
                v2.45.0
              </span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setViewMode("table")}
                style={{
                  background: viewMode === "table" ? "#1e293b" : "transparent",
                  border: "1px solid #334155",
                  color: viewMode === "table" ? "#38bdf8" : "#94a3b8",
                  padding: "3px 8px",
                  borderRadius: 3,
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode("raw")}
                style={{
                  background: viewMode === "raw" ? "#1e293b" : "transparent",
                  border: "1px solid #334155",
                  color: viewMode === "raw" ? "#38bdf8" : "#94a3b8",
                  padding: "3px 8px",
                  borderRadius: 3,
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                Raw JSON
              </button>
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {DEFAULT_PROMQL_QUERIES.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPromqlInput(item.query);
                  executePromql(item.query);
                }}
                style={{
                  background: promqlInput === item.query ? "rgba(56,189,248,0.15)" : "#181b22",
                  border: promqlInput === item.query ? "1px solid #38bdf8" : "1px solid #272d38",
                  color: promqlInput === item.query ? "#38bdf8" : "#94a3b8",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Query Bar */}
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                background: "#08090d",
                border: "1px solid #272d38",
                borderRadius: 4,
                padding: "0 10px",
              }}
            >
              <span style={{ color: "#f97316", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginRight: 8 }}>
                promql&gt;
              </span>
              <input
                type="text"
                value={promqlInput}
                onChange={(e) => setPromqlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") executePromql(promqlInput);
                }}
                placeholder="Enter PromQL query expression..."
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  color: "#f8fafc",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  padding: "10px 0",
                  outline: "none",
                }}
              />
            </div>
            <button
              onClick={() => executePromql(promqlInput)}
              disabled={isExecutingQuery}
              style={{
                background: "#2563eb",
                border: "none",
                borderRadius: 4,
                color: "#fff",
                fontWeight: 700,
                fontSize: 11,
                padding: "0 18px",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{isExecutingQuery ? "Evaluating..." : "Run Query"}</span>
              <span>▶</span>
            </button>
          </div>

          {/* Query Execution Status */}
          {queryResult && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>
              <span>
                Status: <strong style={{ color: "#22c55e" }}>200 OK</strong> | Execution Latency:{" "}
                <strong style={{ color: "#e2e8f0" }}>{queryResult.latencyMs}ms</strong> | Series Matched:{" "}
                <strong style={{ color: "#38bdf8" }}>{queryResult.result.length}</strong>
              </span>
              <span>Executed: {queryResult.timestamp.split("T")[1].replace("Z", "")} UTC</span>
            </div>
          )}

          {/* Query Results View */}
          {queryResult && (
            <div
              style={{
                background: "#08090d",
                border: "1px solid #1e222d",
                borderRadius: 4,
                padding: 10,
                maxHeight: 180,
                overflowY: "auto",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
              }}
            >
              {viewMode === "table" ? (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e222d", color: "#94a3b8" }}>
                      <th style={{ padding: "6px 8px" }}>Metric Labels</th>
                      <th style={{ padding: "6px 8px", width: 140 }}>Value (Instant)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.result.map((series, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #141720" }}>
                        <td style={{ padding: "6px 8px", color: "#38bdf8" }}>
                          {"{"}
                          {Object.entries(series.metric)
                            .map(([k, v]) => `${k}="${v}"`)
                            .join(", ")}
                          {"}"}
                        </td>
                        <td style={{ padding: "6px 8px", color: "#22c55e", fontWeight: 700 }}>
                          {series.values[series.values.length - 1][1]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <pre style={{ margin: 0, color: "#a5b4fc", whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(queryResult, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* ─── ROW 4: SERVICE HEALTH MATRIX & TOPOLOGY ─── */}
        <div
          style={{
            background: "#111319",
            border: "1px solid #1e222d",
            borderRadius: 6,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🕸️</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
                Production Service Health Matrix (Aura Commerce Topology)
              </span>
            </div>
            <span style={{ fontSize: 10, color: "#64748b" }}>Click service for dependency inspector</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {servicesList.map((svc) => (
              <div
                key={svc.id}
                onClick={() => {
                  setSelectedService(svc);
                  onAction(`[SERVICE_INSPECT] Examined ${svc.name} health metrics`);
                }}
                style={{
                  background: selectedService?.id === svc.id ? "#181f2c" : "#0d0f14",
                  border:
                    svc.status === "critical"
                      ? "1px solid #ef4444"
                      : svc.status === "degraded"
                      ? "1px solid #f59e0b"
                      : "1px solid #1e222d",
                  borderRadius: 6,
                  padding: 12,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#f8fafc" }}>{svc.name}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: 3,
                      textTransform: "uppercase",
                      background:
                        svc.status === "critical"
                          ? "rgba(239,68,68,0.2)"
                          : svc.status === "degraded"
                          ? "rgba(245,158,11,0.2)"
                          : "rgba(34,197,94,0.2)",
                      color:
                        svc.status === "critical" ? "#ef4444" : svc.status === "degraded" ? "#f59e0b" : "#22c55e",
                    }}
                  >
                    {svc.status}
                  </span>
                </div>

                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>{svc.type}</div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>
                  <span>5xx: <strong style={{ color: svc.errorRate > 1 ? "#ef4444" : "#22c55e" }}>{svc.errorRate}%</strong></span>
                  <span>p99: <strong style={{ color: svc.p99LatencyMs > 200 ? "#f97316" : "#e2e8f0" }}>{svc.p99LatencyMs}ms</strong></span>
                  <span>{svc.activeReplicas}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Service Drill-Down Drawer */}
          {selectedService && (
            <div
              style={{
                marginTop: 8,
                padding: 12,
                background: "#08090d",
                border: "1px solid #334155",
                borderRadius: 4,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8" }}>
                  Inspector: {selectedService.name}
                </span>
                <button
                  onClick={() => setSelectedService(null)}
                  style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12 }}
                >
                  ✕
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#cbd5e1" }}>{selectedService.description}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>
                Downstream Dependencies:{" "}
                {selectedService.dependencies.length > 0 ? (
                  selectedService.dependencies.map((d, i) => (
                    <span key={i} style={{ color: "#38bdf8", marginRight: 6 }}>
                      • {d}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#64748b" }}>None (Root Leaf)</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
