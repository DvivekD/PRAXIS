"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CustomerAccount, GatewayLog } from "./types";
import { ELENA_ROSTOVA_ACCOUNT } from "./mockData";

interface CustomerInvestigationSubEnvProps {
  account?: CustomerAccount;
  onNavigateToSubEnv: (subEnv: "queue" | "investigation" | "escalation") => void;
  onAction: (actionText: string) => Promise<any>;
}

export default function CustomerInvestigationSubEnv({
  account = ELENA_ROSTOVA_ACCOUNT,
  onNavigateToSubEnv,
  onAction,
}: CustomerInvestigationSubEnvProps) {
  const [selectedTxId, setSelectedTxId] = useState<string>("tx_8820");
  const [showRawJson, setShowRawJson] = useState(false);
  const [rcaCopied, setRcaCopied] = useState(false);

  const primaryTx = account.gatewayLogs.find((g) => !g.isDuplicate) || account.gatewayLogs[0];
  const duplicateTx = account.gatewayLogs.find((g) => g.isDuplicate) || account.gatewayLogs[1];

  const handleCopyRCA = () => {
    setRcaCopied(true);
    onAction(
      "[INVESTIGATION] Seeker verified gateway collision between tx_8819 and tx_8820. Isolated root cause: missing idempotency key and late database lock in checkout.ts."
    );
    setTimeout(() => setRcaCopied(false), 2500);
  };

  const handleExportToEscalation = () => {
    onAction(
      "[INVESTIGATION_COMPLETE] Seeker finished diagnostic deep-dive into Elena Rostova's account. Prepared SEV-1 escalation payload with gateway logs evidence."
    );
    onNavigateToSubEnv("escalation");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#040711",
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', -apple-system, sans-serif",
        overflowY: "auto",
      }}
    >
      {/* Top Banner / Customer Profile Header */}
      <div
        style={{
          padding: "16px 24px",
          background: "#080d1c",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "#10b981",
              color: "#000",
              fontWeight: 900,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(16, 185, 129, 0.3)",
            }}
          >
            ER
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff" }}>{account.name}</h2>
              <span
                style={{
                  fontSize: 10,
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#f59e0b",
                  border: "1px solid #f59e0b",
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontWeight: 800,
                }}
              >
                {account.tier}
              </span>
              <span
                style={{
                  fontSize: 10,
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  border: "1px solid #ef4444",
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontWeight: 700,
                }}
              >
                {account.accountStatus}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {account.company} • {account.email} • Contract: <strong style={{ color: "#10b981" }}>{account.contractArr}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => onNavigateToSubEnv("queue")}
            style={{
              padding: "7px 14px",
              background: "#0c1322",
              border: "1px solid #1e293b",
              color: "#94a3b8",
              fontSize: 11,
              borderRadius: 5,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>←</span>
            <span>Back to Queue (120)</span>
          </button>

          <button
            onClick={handleExportToEscalation}
            style={{
              padding: "7px 16px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              color: "#10b981",
              fontSize: 11,
              fontWeight: 800,
              borderRadius: 5,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 0 12px rgba(16, 185, 129, 0.2)",
            }}
          >
            <span>03 // OPEN ESCALATION WORKSPACE</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Main Troubleshooting Dashboard Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          padding: 24,
          flex: 1,
        }}
      >
        {/* LEFT COLUMN: ORDERS & GATEWAY LOGS DEEP-DIVE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Order History */}
          <div style={{ background: "#080d1c", border: "1px solid #1e293b", borderRadius: 8, overflow: "hidden" }}>
            <div
              style={{
                padding: "12px 16px",
                background: "#0c1426",
                borderBottom: "1px solid #1e293b",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <span>📦</span>
                <span>Customer Order & Billing Records</span>
              </div>
              <span style={{ fontSize: 10, color: "#64748b" }}>Lifetime Spend: {account.ltv}</span>
            </div>

            <div style={{ padding: 12 }}>
              {account.orders.map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 6,
                    background: ord.duplicateChargeFlag ? "rgba(239, 68, 68, 0.08)" : "#050813",
                    border: ord.duplicateChargeFlag ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid #141f33",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{ord.id}</span>
                      <span style={{ fontSize: 10, color: "#64748b", marginLeft: 8 }}>{ord.date}</span>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontWeight: 800,
                        background: ord.duplicateChargeFlag ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.15)",
                        color: ord.duplicateChargeFlag ? "#ef4444" : "#22c55e",
                        border: `1px solid ${ord.duplicateChargeFlag ? "#ef4444" : "#22c55e"}`,
                      }}
                    >
                      {ord.status}
                    </span>
                  </div>

                  <div style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 6 }}>
                    {ord.items.map((it, i) => (
                      <div key={i}>
                        {it.qty}x {it.name} ({it.price})
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", borderTop: "1px solid #1e293b", paddingTop: 6 }}>
                    <span>Payment: {ord.paymentMethod}</span>
                    <span style={{ fontWeight: 800, color: ord.duplicateChargeFlag ? "#ef4444" : "#fff" }}>
                      Total: {ord.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Gateway Logs Deep-Dive (tx_8819 vs tx_8820) */}
          <div style={{ background: "#080d1c", border: "1px solid #1e293b", borderRadius: 8, overflow: "hidden" }}>
            <div
              style={{
                padding: "12px 16px",
                background: "#0c1426",
                borderBottom: "1px solid #1e293b",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: "#ef4444", display: "flex", alignItems: "center", gap: 8 }}>
                <span>⚡</span>
                <span>Payment Gateway Authorization Inspector (tx_8819 vs tx_8820)</span>
              </div>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                style={{
                  fontSize: 10,
                  background: "#141f33",
                  border: "1px solid #334155",
                  color: "#cbd5e1",
                  padding: "3px 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {showRawJson ? "Show Diff View" : "Show Raw JSON"}
              </button>
            </div>

            <div style={{ padding: 14 }}>
              {showRawJson ? (
                <div style={{ background: "#03060f", padding: 12, borderRadius: 6, border: "1px solid #1e293b", fontSize: 10, color: "#38bdf8", overflowX: "auto" }}>
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(
                      {
                        primary_authorization: primaryTx,
                        duplicate_authorization: duplicateTx,
                        concurrency_collision_delta_ms: 284,
                        analysis: "Null idempotency-key header allowed identical payload to charge twice.",
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {/* Primary Auth */}
                  <div
                    style={{
                      background: "#050813",
                      border: "1px solid #10b98140",
                      borderRadius: 6,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#10b981" }}>{primaryTx.txId}</span>
                      <span style={{ fontSize: 9, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                        PRIMARY VALID
                      </span>
                    </div>

                    <div style={{ fontSize: 10, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4 }}>
                      <div>Timestamp: <strong style={{ color: "#fff" }}>{primaryTx.timestamp}</strong></div>
                      <div>Amount: <strong style={{ color: "#fff" }}>${primaryTx.amount.toFixed(2)} USD</strong></div>
                      <div>Auth Code: <span style={{ color: "#38bdf8" }}>{primaryTx.authCode}</span></div>
                      <div>
                        Idempotency Key:{" "}
                        <span style={{ color: "#ef4444", fontWeight: 800 }}>null (MISSING)</span>
                      </div>
                      <div>Endpoint: <span style={{ color: "#cbd5e1" }}>{primaryTx.endpoint}</span></div>
                      <div>Gateway Latency: <span>{primaryTx.latencyMs}ms</span></div>
                    </div>
                  </div>

                  {/* Duplicate Collision Auth */}
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.05)",
                      border: "1px solid #ef4444",
                      borderRadius: 6,
                      padding: 12,
                      boxShadow: "0 0 10px rgba(239, 68, 68, 0.15)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#ef4444" }}>{duplicateTx.txId}</span>
                      <span style={{ fontSize: 9, background: "#ef4444", color: "#fff", padding: "1px 5px", borderRadius: 3, fontWeight: 800 }}>
                        COLLISION DUPLICATE
                      </span>
                    </div>

                    <div style={{ fontSize: 10, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4 }}>
                      <div>
                        Timestamp: <strong style={{ color: "#ef4444" }}>{duplicateTx.timestamp}</strong>
                        <span style={{ color: "#f59e0b", fontSize: 9, marginLeft: 4 }}>(+284ms)</span>
                      </div>
                      <div>Amount: <strong style={{ color: "#fff" }}>${duplicateTx.amount.toFixed(2)} USD</strong></div>
                      <div>Auth Code: <span style={{ color: "#ef4444" }}>{duplicateTx.authCode}</span></div>
                      <div>
                        Idempotency Key:{" "}
                        <span style={{ color: "#ef4444", fontWeight: 800 }}>null (MISSING)</span>
                      </div>
                      <div>Endpoint: <span style={{ color: "#cbd5e1" }}>{duplicateTx.endpoint}</span></div>
                      <div>Gateway Latency: <span>{duplicateTx.latencyMs}ms</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Concurrency Diagnostic Callout */}
              <div
                style={{
                  marginTop: 12,
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 6,
                  padding: 10,
                  fontSize: 10,
                  color: "#cbd5e1",
                  lineHeight: 1.5,
                }}
              >
                <div style={{ color: "#ef4444", fontWeight: 800, marginBottom: 2 }}>
                  🚨 CONCURRENCY RACE CONDITION DIAGNOSED:
                </div>
                Requests <code>tx_8819</code> and <code>tx_8820</code> were dispatched 284ms apart due to a rapid double-click on the storefront checkout button. Because <code>checkout.ts</code> evaluated its idempotency lock AFTER charging the payment gateway, both requests executed and authorized $249.99 against Elena Rostova's credit card.
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DIAGNOSTIC TIMELINE & ROOT CAUSE SUMMARY */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Diagnostic Root-Cause Timeline */}
          <div style={{ background: "#080d1c", border: "1px solid #1e293b", borderRadius: 8, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                padding: "12px 16px",
                background: "#0c1426",
                borderBottom: "1px solid #1e293b",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8", display: "flex", alignItems: "center", gap: 8 }}>
                <span>⏱</span>
                <span>Diagnostic Root-Cause Timeline (ord_9901)</span>
              </div>
              <span style={{ fontSize: 10, color: "#64748b" }}>Resolution Turn 1</span>
            </div>

            <div style={{ padding: 16, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {account.timeline.map((evt, idx) => {
                const isCrit = evt.status === "critical";
                const isWarn = evt.status === "warning";
                const dotColor = isCrit ? "#ef4444" : isWarn ? "#f59e0b" : "#10b981";

                return (
                  <div key={idx} style={{ display: "flex", gap: 12, position: "relative" }}>
                    {/* Time indicator */}
                    <div style={{ width: 85, fontSize: 10, color: "#64748b", fontWeight: 700, paddingTop: 2 }}>
                      {evt.time}
                    </div>

                    {/* Timeline Dot & Line */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: dotColor,
                          boxShadow: `0 0 8px ${dotColor}`,
                          flexShrink: 0,
                        }}
                      />
                      {idx < account.timeline.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: "#1e293b", margin: "4px 0" }} />
                      )}
                    </div>

                    {/* Event Detail Box */}
                    <div
                      style={{
                        flex: 1,
                        background: isCrit ? "rgba(239, 68, 68, 0.08)" : "#050813",
                        border: `1px solid ${isCrit ? "rgba(239, 68, 68, 0.4)" : "#1e293b"}`,
                        borderRadius: 6,
                        padding: 10,
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: isCrit ? "#ef4444" : "#fff" }}>
                          {evt.title}
                        </span>
                        <span style={{ fontSize: 9, textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                          [{evt.source}]
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>{evt.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Root-Cause Analysis Summary Card */}
          <div
            style={{
              background: "#080d1c",
              border: "1px solid #10b981",
              borderRadius: 8,
              padding: 16,
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#10b981" }}>
                ✓ ROOT CAUSE ISOLATED // EVIDENCE PACKAGED
              </div>
              <button
                onClick={handleCopyRCA}
                style={{
                  padding: "4px 10px",
                  fontSize: 10,
                  fontWeight: 700,
                  background: rcaCopied ? "#10b981" : "#141f33",
                  color: rcaCopied ? "#000" : "#cbd5e1",
                  border: "1px solid #334155",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {rcaCopied ? "✓ Telemetry Logged" : "Log RCA Telemetry"}
              </button>
            </div>

            <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 14 }}>
              <strong>Definitive Cause:</strong> Storefront checkout endpoint is missing an atomic mutex and idempotency header. Under rapid repeat clicks, dual charges authorization occurs in Stripe (e.g. <code>tx_8819</code> and <code>tx_8820</code>). Individual customer refunds will fail to resolve the 120 backlog tickets and will cause accounting balance loss.
            </div>

            <button
              onClick={handleExportToEscalation}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(16, 185, 129, 0.2)",
                border: "1px solid #10b981",
                color: "#10b981",
                fontWeight: 900,
                fontSize: 12,
                borderRadius: 5,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 0 15px rgba(16, 185, 129, 0.25)",
              }}
            >
              <span>⚡</span>
              <span>TRANSFER RCA TO ESCALATION & RESPONSE CENTER</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
