"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SupportTicket, TicketPriority } from "./types";

interface HelpdeskQueueSubEnvProps {
  tickets: SupportTicket[];
  activeTicketId: string;
  onSelectTicket: (ticketId: string) => void;
  onNavigateToSubEnv: (subEnv: "queue" | "investigation" | "escalation") => void;
  onBatchEscalatePrompt: () => void;
  isQueueSwept: boolean;
  formatSla: (seconds: number) => string;
}

export default function HelpdeskQueueSubEnv({
  tickets,
  activeTicketId,
  onSelectTicket,
  onNavigateToSubEnv,
  onBatchEscalatePrompt,
  isQueueSwept,
  formatSla,
}: HelpdeskQueueSubEnvProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "at_risk" | "vip" | "double_charge" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"sla" | "value" | "priority">("sla");

  // Dynamic Queue Counts
  const unresolvedCount = useMemo(
    () => tickets.filter((t) => t.status !== "RESOLVED").length,
    [tickets]
  );
  const atRiskCount = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.status !== "RESOLVED" &&
          (t.slaRemainingSeconds < 300 || t.isBreached || t.priority === "CRITICAL")
      ).length,
    [tickets]
  );
  const vipCount = useMemo(
    () => tickets.filter((t) => t.tier === "Enterprise VIP").length,
    [tickets]
  );
  const doubleChargeCount = useMemo(
    () => tickets.filter((t) => t.tags.includes("DOUBLE_CHARGE")).length,
    [tickets]
  );
  const resolvedCount = useMemo(
    () => tickets.filter((t) => t.status === "RESOLVED").length,
    [tickets]
  );

  // Filter calculation
  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    if (activeFilter === "at_risk") {
      result = result.filter(
        (t) =>
          t.status !== "RESOLVED" &&
          (t.slaRemainingSeconds < 300 || t.isBreached || t.priority === "CRITICAL")
      );
    } else if (activeFilter === "vip") {
      result = result.filter((t) => t.tier === "Enterprise VIP");
    } else if (activeFilter === "double_charge") {
      result = result.filter((t) => t.tags.includes("DOUBLE_CHARGE"));
    } else if (activeFilter === "resolved") {
      result = result.filter((t) => t.status === "RESOLVED");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.customer.toLowerCase().includes(q) ||
          t.company.toLowerCase().includes(q) ||
          t.orderId.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "sla") {
        return a.slaRemainingSeconds - b.slaRemainingSeconds;
      }
      if (sortBy === "value") {
        return b.rawAmount - a.rawAmount;
      }
      if (sortBy === "priority") {
        const order: Record<TicketPriority, number> = { CRITICAL: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
        return order[b.priority] - order[a.priority];
      }
      return 0;
    });

    return result;
  }, [tickets, activeFilter, searchQuery, sortBy]);

  const activeTicket = useMemo(
    () => tickets.find((t) => t.id === activeTicketId) || tickets[0],
    [tickets, activeTicketId]
  );

  const incidentTickets = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.tags.includes("DOUBLE_CHARGE") ||
          t.priority === "CRITICAL" ||
          t.slaRemainingSeconds < 300
      ),
    [tickets]
  );

  const isAllIncidentSelected = useMemo(
    () =>
      incidentTickets.length > 0 &&
      incidentTickets.every((t) => selectedTicketIds.includes(t.id)),
    [incidentTickets, selectedTicketIds]
  );

  const toggleSelectAllIncident = () => {
    if (isAllIncidentSelected) {
      setSelectedTicketIds([]);
    } else {
      setSelectedTicketIds(incidentTickets.map((t) => t.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTicketIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getPriorityBadgeStyle = (priority: TicketPriority) => {
    switch (priority) {
      case "CRITICAL":
        return { bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444", text: "#ef4444" };
      case "HIGH":
        return { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b", text: "#f59e0b" };
      case "NORMAL":
        return { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6", text: "#3b82f6" };
      case "LOW":
      default:
        return { bg: "rgba(100, 116, 139, 0.15)", border: "#64748b", text: "#94a3b8" };
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        height: "100%",
        width: "100%",
        background: "#050811",
        color: "#f8fafc",
        fontFamily: "'JetBrains Mono', -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* MAIN QUEUE VIEW */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #1e293b",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* KPI Summary Bar */}
        <div
          style={{
            padding: "12px 18px",
            background: "#080d1a",
            borderBottom: "1px solid #1e293b",
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 12,
          }}
        >
          <div style={{ background: "#0c1322", padding: "8px 12px", borderRadius: 6, border: "1px solid #1e293b" }}>
            <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
              Unresolved Queue
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: isQueueSwept ? "#22c55e" : "#f8fafc" }}>
              {isQueueSwept ? "0 / 120" : `${unresolvedCount}`}
              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400, marginLeft: 4 }}>
                {isQueueSwept ? "(Swept)" : "Tickets"}
              </span>
            </div>
          </div>

          <div style={{ background: "#0c1322", padding: "8px 12px", borderRadius: 6, border: "1px solid #ef444440" }}>
            <div style={{ fontSize: 9, color: "#ef4444", textTransform: "uppercase", fontWeight: 700 }}>
              SLA Breached / Imminent
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444" }}>
              {isQueueSwept ? "0" : `${atRiskCount}`}
              <span style={{ fontSize: 10, color: "#ef4444aa", fontWeight: 400, marginLeft: 4 }}>
                {isQueueSwept ? "Resolved" : "Critical"}
              </span>
            </div>
          </div>

          <div style={{ background: "#0c1322", padding: "8px 12px", borderRadius: 6, border: "1px solid #f59e0b40" }}>
            <div style={{ fontSize: 9, color: "#f59e0b", textTransform: "uppercase", fontWeight: 700 }}>
              Enterprise Impacted
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>
              {vipCount} Accounts
            </div>
          </div>

          <div style={{ background: "#0c1322", padding: "8px 12px", borderRadius: 6, border: "1px solid #38bdf840" }}>
            <div style={{ fontSize: 9, color: "#38bdf8", textTransform: "uppercase", fontWeight: 700 }}>
              Duplicate Exposure
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8" }}>
              $29,880.00
            </div>
          </div>

          <div style={{ background: "#0c1322", padding: "8px 12px", borderRadius: 6, border: "1px solid #10b98140" }}>
            <div style={{ fontSize: 9, color: "#10b981", textTransform: "uppercase", fontWeight: 700 }}>
              SRE Escalation Status
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: isQueueSwept ? "#22c55e" : "#ef4444", marginTop: 4 }}>
              {isQueueSwept ? "SEV-1 MITIGATED" : "PENDING SEV-1"}
            </div>
          </div>
        </div>

        {/* Filter View Selector & Search Toolbar */}
        <div
          style={{
            padding: "10px 18px",
            background: "#080c18",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "all", label: "All Tickets", count: tickets.length },
              { id: "at_risk", label: "Breached / At Risk", count: isQueueSwept ? 0 : atRiskCount },
              { id: "vip", label: "Enterprise VIP", count: vipCount },
              { id: "double_charge", label: "Double Charge (#INC-8820)", count: doubleChargeCount },
              { id: "resolved", label: "Resolved", count: resolvedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                style={{
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: activeFilter === tab.id ? 700 : 500,
                  borderRadius: 5,
                  border: activeFilter === tab.id ? "1px solid #10b981" : "1px solid #1e293b",
                  background: activeFilter === tab.id ? "rgba(16, 185, 129, 0.15)" : "#0c1220",
                  color: activeFilter === tab.id ? "#10b981" : "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: 9,
                    background: activeFilter === tab.id ? "#10b981" : "#1e293b",
                    color: activeFilter === tab.id ? "#000" : "#cbd5e1",
                    padding: "1px 5px",
                    borderRadius: 10,
                    fontWeight: 800,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              placeholder="Search queue (ID, Customer, Order)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "#0c1220",
                border: "1px solid #1e293b",
                borderRadius: 5,
                padding: "6px 12px",
                fontSize: 11,
                color: "#fff",
                outline: "none",
                width: 220,
              }}
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                background: "#0c1220",
                border: "1px solid #1e293b",
                borderRadius: 5,
                padding: "6px 8px",
                fontSize: 11,
                color: "#cbd5e1",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="sla">Sort: SLA Urgency</option>
              <option value="value">Sort: Order Value</option>
              <option value="priority">Sort: Priority</option>
            </select>
          </div>
        </div>

        {/* Batch Action Strip */}
        <div
          style={{
            padding: "8px 18px",
            background: "#090f1d",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={isAllIncidentSelected}
              onChange={toggleSelectAllIncident}
              style={{ cursor: "pointer", accentColor: "#10b981" }}
            />
            <span style={{ color: "#94a3b8" }}>
              {selectedTicketIds.length > 0 ? (
                <strong style={{ color: "#10b981" }}>{selectedTicketIds.length} tickets selected</strong>
              ) : (
                `Select all ${incidentTickets.length} Incident Tickets`
              )}
            </span>
          </div>

          {selectedTicketIds.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onNavigateToSubEnv("investigation")}
                style={{
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid #38bdf8",
                  color: "#38bdf8",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🔍 Investigate Customer Accounts
              </button>
              <button
                onClick={onBatchEscalatePrompt}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid #ef4444",
                  color: "#ef4444",
                  padding: "4px 10px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>⚡</span>
                <span>Batch Escalate to SRE (SEV-1)</span>
              </button>
            </div>
          )}
        </div>

        {/* Tickets Scroll List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredTickets.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>No tickets match your filter criteria</div>
            </div>
          ) : (
            filteredTickets.map((t) => {
              const isSelected = t.id === activeTicketId;
              const isChecked = selectedTicketIds.includes(t.id);
              const pStyle = getPriorityBadgeStyle(t.priority);

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid #141f33",
                    background: isSelected
                      ? "rgba(16, 185, 129, 0.08)"
                      : isChecked
                      ? "rgba(56, 189, 248, 0.04)"
                      : "transparent",
                    borderLeft: isSelected ? "3px solid #10b981" : "3px solid transparent",
                    cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "24px 75px 180px 1fr 140px 110px",
                    alignItems: "center",
                    gap: 12,
                    transition: "all 0.1s ease",
                  }}
                >
                  {/* Checkbox */}
                  <div onClick={(e) => toggleSelectOne(t.id, e)}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      style={{ cursor: "pointer", accentColor: "#10b981" }}
                    />
                  </div>

                  {/* Priority Tag */}
                  <div>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "2px 6px",
                        borderRadius: 3,
                        background: pStyle.bg,
                        border: `1px solid ${pStyle.border}`,
                        color: pStyle.text,
                        fontWeight: 800,
                        letterSpacing: "0.5px",
                      }}
                    >
                      {t.priority}
                    </span>
                  </div>

                  {/* Customer & Company */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: t.tier === "Enterprise VIP" ? "#10b981" : "#3b82f6",
                        color: "#000",
                        fontWeight: 800,
                        fontSize: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {t.avatar}
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {t.customer}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {t.company}
                      </div>
                    </div>
                  </div>

                  {/* Subject & Tags */}
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>{t.id}</span>
                      <span style={{ fontSize: 12, color: "#cbd5e1", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {t.subject}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 9, color: "#64748b" }}>Order {t.orderId}</span>
                      {t.tags.includes("DOUBLE_CHARGE") && (
                        <span style={{ fontSize: 9, background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                          DOUBLE CHARGE
                        </span>
                      )}
                      {t.tier === "Enterprise VIP" && (
                        <span style={{ fontSize: 9, background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                          VIP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order Value */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.tags.includes("DOUBLE_CHARGE") ? "#ef4444" : "#10b981" }}>
                      {t.amount}
                    </div>
                    <div style={{ fontSize: 9, color: "#64748b" }}>{t.arr}</div>
                  </div>

                  {/* SLA Countdown Timer */}
                  <div style={{ textAlign: "right" }}>
                    {isQueueSwept ? (
                      <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, background: "rgba(34, 197, 94, 0.15)", padding: "2px 6px", borderRadius: 4 }}>
                        RESOLVED
                      </span>
                    ) : t.slaRemainingSeconds <= 0 ? (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#fff",
                          background: "#ef4444",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontWeight: 800,
                          animation: "pulse 1s infinite",
                        }}
                      >
                        BREACHED
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 10,
                          color: t.slaRemainingSeconds < 120 ? "#ef4444" : t.slaRemainingSeconds < 600 ? "#f59e0b" : "#10b981",
                          fontWeight: 800,
                          background:
                            t.slaRemainingSeconds < 120
                              ? "rgba(239, 68, 68, 0.15)"
                              : t.slaRemainingSeconds < 600
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(16, 185, 129, 0.15)",
                          padding: "2px 6px",
                          borderRadius: 4,
                          border: `1px solid ${
                            t.slaRemainingSeconds < 120
                              ? "rgba(239, 68, 68, 0.4)"
                              : t.slaRemainingSeconds < 600
                              ? "rgba(245, 158, 11, 0.4)"
                              : "rgba(16, 185, 129, 0.4)"
                          }`,
                        }}
                      >
                        ⏱ {formatSla(t.slaRemainingSeconds)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: SELECTED TICKET PREVIEW & CONTEXT */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "#070b16",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Ticket Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", background: "#0a0f1e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#10b981", fontWeight: 800, letterSpacing: "1px" }}>
              [ TICKET PREVIEW // {activeTicket.id} ]
            </span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 6px",
                borderRadius: 4,
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                fontWeight: 700,
              }}
            >
              {activeTicket.priority}
            </span>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 6px 0", color: "#fff", lineHeight: 1.4 }}>
            {activeTicket.subject}
          </h3>

          <div style={{ display: "flex", gap: 10, fontSize: 10, color: "#94a3b8" }}>
            <span>Customer: <strong style={{ color: "#fff" }}>{activeTicket.customer}</strong></span>
            <span>•</span>
            <span>Order: <strong style={{ color: "#fff" }}>{activeTicket.orderId}</strong></span>
          </div>
        </div>

        {/* Customer Detail Card */}
        <div style={{ padding: 16, borderBottom: "1px solid #1e293b", background: "#090d1c" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "#10b981",
                color: "#000",
                fontWeight: 900,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeTicket.avatar}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{activeTicket.customer}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{activeTicket.company}</div>
              <div style={{ fontSize: 10, color: "#10b981", fontWeight: 700, marginTop: 2 }}>
                {activeTicket.tier} ({activeTicket.arr})
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#050812",
              border: "1px solid #1e293b",
              borderRadius: 6,
              padding: 10,
              fontSize: 10,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <div>
              <span style={{ color: "#64748b" }}>Duplicate Hold:</span>
              <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 11 }}>{activeTicket.amount}</div>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Live SLA:</span>
              <div
                style={{
                  color: activeTicket.slaRemainingSeconds < 120 ? "#ef4444" : "#f59e0b",
                  fontWeight: 800,
                  fontSize: 11,
                }}
              >
                ⏱ {formatSla(activeTicket.slaRemainingSeconds)}
              </div>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Gateway Auth:</span>
              <div style={{ color: "#38bdf8", fontWeight: 700 }}>{activeTicket.originalTxId}</div>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Collision Auth:</span>
              <div style={{ color: "#ef4444", fontWeight: 700 }}>{activeTicket.duplicateTxId}</div>
            </div>
          </div>
        </div>

        {/* Customer Ingest Message */}
        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 800, marginBottom: 8 }}>
            Customer Inquiry Thread:
          </div>
          <div
            style={{
              background: "#0c1222",
              border: "1px solid #1e293b",
              borderRadius: 8,
              padding: 14,
              fontSize: 11,
              color: "#cbd5e1",
              lineHeight: 1.6,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 10, color: "#64748b" }}>
              <span>From: {activeTicket.email}</span>
              <span>{activeTicket.createdAt}</span>
            </div>
            {activeTicket.message}
          </div>

          {/* Root cause discovery hint */}
          <div
            style={{
              marginTop: 14,
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              borderRadius: 6,
              padding: 12,
              fontSize: 10,
              color: "#94a3b8",
              lineHeight: 1.5,
            }}
          >
            <div style={{ color: "#38bdf8", fontWeight: 800, marginBottom: 4 }}>
              💡 TRIAGE PROTOCOL:
            </div>
            Do NOT issue individual manual refunds in the portal! Deep-dive into Elena Rostova's payment logs in SubEnv 02 to isolate the systemic null-idempotency collision before escalating.
          </div>
        </div>

        {/* Bottom Sub-Environment Transition Actions */}
        <div style={{ padding: 16, background: "#080d1a", borderTop: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => onNavigateToSubEnv("investigation")}
            style={{
              width: "100%",
              padding: "10px",
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid #38bdf8",
              color: "#38bdf8",
              fontWeight: 800,
              fontSize: 11,
              borderRadius: 5,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>🔍</span>
            <span>02 // INVESTIGATE CUSTOMER & GATEWAY LOGS</span>
          </button>

          <button
            onClick={() => onNavigateToSubEnv("escalation")}
            style={{
              width: "100%",
              padding: "10px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              color: "#10b981",
              fontWeight: 800,
              fontSize: 11,
              borderRadius: 5,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>✉️</span>
            <span>03 // ESCALATE & RESPOND TO CUSTOMER</span>
          </button>
        </div>
      </div>
    </div>
  );
}
