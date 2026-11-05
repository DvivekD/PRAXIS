"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitExecutiveDataReportAction } from "../../../actions/eval";

export interface AnalyticsBiSubEnvProps {
  sessionId?: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onComplete: () => void;
  isSqlFixed: boolean;
  isPipelineRepaired: boolean;
}

interface RawDataPoint {
  date: string;
  flawedDau: number;
  correctedDau: number;
  serverIngress: number;
  note: string;
}

export default function AnalyticsBiSubEnv({
  sessionId,
  onAction,
  onComplete,
  isSqlFixed,
  isPipelineRepaired,
}: AnalyticsBiSubEnvProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState("incident");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedTier, setSelectedTier] = useState("all");
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    flawedDau: number;
    correctedDau: number;
    serverIngress: number;
    note: string;
  } | null>(null);
  const [showExecutiveReportModal, setShowExecutiveReportModal] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Overall system resolution state
  const isFullyResolved = isSqlFixed && isPipelineRepaired;

  // Dynamically compute sliced metric data according to selected filters
  const currentSlice = useMemo(() => {
    let basePoints: RawDataPoint[] = [];

    if (selectedTimeRange === "last7") {
      basePoints = [
        { date: "Oct 30", flawedDau: 60800, correctedDau: 60800, serverIngress: 121000, note: "Historical baseline" },
        { date: "Oct 31", flawedDau: 61100, correctedDau: 61100, serverIngress: 121800, note: "Historical baseline" },
        { date: "Nov 01", flawedDau: 61200, correctedDau: 61200, serverIngress: 122400, note: "Baseline normal traffic" },
        { date: "Nov 02", flawedDau: 60950, correctedDau: 61500, serverIngress: 123800, note: "Weekend peak stable" },
        { date: "Nov 03", flawedDau: 61800, correctedDau: 62300, serverIngress: 124100, note: "Traffic steady ahead of mobile release" },
        { date: "Nov 04", flawedDau: 50680, correctedDau: 62100, serverIngress: 124500, note: "⚠️ -18.0% drop reported, but server ingress stayed flat!" },
        { date: "Nov 05", flawedDau: 50840, correctedDau: 62850, serverIngress: 125100, note: "⚠️ Ongoing anomaly until pipeline & join repair" },
      ];
    } else if (selectedTimeRange === "last30") {
      basePoints = [
        { date: "Oct 07", flawedDau: 58500, correctedDau: 58500, serverIngress: 118000, note: "30-day start" },
        { date: "Oct 14", flawedDau: 59200, correctedDau: 59200, serverIngress: 119500, note: "Mid-month steady" },
        { date: "Oct 21", flawedDau: 60100, correctedDau: 60100, serverIngress: 120800, note: "Growth trend" },
        { date: "Oct 28", flawedDau: 60900, correctedDau: 60900, serverIngress: 121500, note: "Pre-incident baseline" },
        { date: "Nov 01", flawedDau: 61200, correctedDau: 61200, serverIngress: 122400, note: "Baseline normal traffic" },
        { date: "Nov 02", flawedDau: 60950, correctedDau: 61500, serverIngress: 123800, note: "Weekend peak stable" },
        { date: "Nov 03", flawedDau: 61800, correctedDau: 62300, serverIngress: 124100, note: "Traffic steady ahead of mobile release" },
        { date: "Nov 04", flawedDau: 50680, correctedDau: 62100, serverIngress: 124500, note: "⚠️ -18.0% false drop" },
        { date: "Nov 05", flawedDau: 50840, correctedDau: 62850, serverIngress: 125100, note: "Incident period" },
      ];
    } else {
      // Default: Incident window Nov 01 - Nov 05
      basePoints = [
        { date: "Nov 01", flawedDau: 61200, correctedDau: 61200, serverIngress: 122400, note: "Baseline normal traffic" },
        { date: "Nov 02", flawedDau: 60950, correctedDau: 61500, serverIngress: 123800, note: "Weekend peak stable" },
        { date: "Nov 03", flawedDau: 61800, correctedDau: 62300, serverIngress: 124100, note: "Traffic steady ahead of mobile release" },
        { date: "Nov 04", flawedDau: 50680, correctedDau: 62100, serverIngress: 124500, note: "⚠️ -18.0% drop reported, but server ingress stayed flat!" },
        { date: "Nov 05", flawedDau: 50840, correctedDau: 62850, serverIngress: 125100, note: "⚠️ Ongoing anomaly until pipeline & join repair" },
      ];
    }

    // Apply platform multiplier / slice
    let platformMultiplierFlawed = 1.0;
    let platformMultiplierCorrected = 1.0;
    let ingressMultiplier = 1.0;
    let platformNote = "";

    if (selectedPlatform === "web") {
      // Web was completely untouched by mobile v2.4.1 schema drift!
      platformMultiplierFlawed = 0.45;
      platformMultiplierCorrected = 0.45;
      ingressMultiplier = 0.45;
      platformNote = "Web Browser telemetry was unaffected by mobile release v2.4.1. Traffic and user counts stayed rock-solid.";
    } else if (selectedPlatform === "ios") {
      // iOS bore the full brunt of mobile schema drift (-36% drop on Nov 04)
      platformMultiplierFlawed = 0.33;
      platformMultiplierCorrected = 0.33;
      ingressMultiplier = 0.33;
      platformNote = "iOS telemetry dropped by 37% on Nov 04 due to mobile client v2.4.1 emitting account_uid instead of user_id.";
    } else if (selectedPlatform === "android") {
      platformMultiplierFlawed = 0.22;
      platformMultiplierCorrected = 0.22;
      ingressMultiplier = 0.22;
      platformNote = "Android telemetry dropped by 36% due to mobile client v2.4.1 schema drift.";
    }

    // Apply tier multiplier / slice
    let tierMultiplierFlawed = 1.0;
    let tierMultiplierCorrected = 1.0;
    let tierNote = "";

    if (selectedTier === "free") {
      // Free users never transacted! The inner join on transactions dropped them to zero!
      tierMultiplierFlawed = 0.005; // Dropped to negligible count by inner join transactions
      tierMultiplierCorrected = 0.385; // ~24,200 users
      tierNote = "Free-tier users make 0 transactions. The legacy INNER JOIN transactions completely excluded all 24,000+ free active subscribers!";
    } else if (selectedTier === "pro") {
      tierMultiplierFlawed = 0.49;
      tierMultiplierCorrected = 0.49;
      tierNote = "Pro subscribers transacted, but mobile users were affected by the mobile v2.4.1 schema drift.";
    } else if (selectedTier === "enterprise") {
      tierMultiplierFlawed = 0.125;
      tierMultiplierCorrected = 0.125;
      tierNote = "Enterprise accounts transacted reliably via contract renewals.";
    }

    const points = basePoints.map((p, idx) => {
      const isIncidentDay = p.date === "Nov 04" || p.date === "Nov 05";
      let flawed = Math.round(p.flawedDau * platformMultiplierFlawed * tierMultiplierFlawed);
      // For web, no drop on incident day:
      if (selectedPlatform === "web" && selectedTier === "all" && isIncidentDay) {
        flawed = Math.round(p.correctedDau * platformMultiplierCorrected * tierMultiplierCorrected);
      }
      const corrected = Math.round(p.correctedDau * platformMultiplierCorrected * tierMultiplierCorrected);
      const ingress = Math.round(p.serverIngress * ingressMultiplier);

      let customNote = p.note;
      if (selectedPlatform !== "all" && platformNote) customNote = platformNote;
      if (selectedTier === "free") customNote = tierNote;

      return {
        date: p.date,
        flawedDau: flawed,
        correctedDau: corrected,
        serverIngress: ingress,
        note: customNote,
      };
    });

    const latest = points[points.length - 1];
    const prev = points[points.length - 2] || points[0];

    const currentFlawed = latest.flawedDau;
    const currentCorrected = latest.correctedDau;
    const currentIngress = latest.serverIngress;

    const diffFlawed = Math.round(((latest.flawedDau - prev.flawedDau) / Math.max(1, prev.flawedDau)) * 1000) / 10;
    const diffCorrected = Math.round(((latest.correctedDau - prev.correctedDau) / Math.max(1, prev.correctedDau)) * 1000) / 10;

    let verdictText = "Daily Active Users plunged by 18% on Nov 04 while server ingress traffic was completely unchanged. Engineering team was correct.";
    if (selectedPlatform === "web") {
      verdictText = "Web Browser telemetry reveals 0% drop. This definitively proves the drop was localized to mobile app telemetry & query logic.";
    } else if (selectedTier === "free") {
      verdictText = "Free-tier active subscribers were 100% eliminated by the INNER JOIN transactions bug in the legacy query!";
    } else if (selectedPlatform === "ios" || selectedPlatform === "android") {
      verdictText = `${selectedPlatform.toUpperCase()} experienced an acute 36% drop starting Nov 04 due to the v2.4.1 account_uid schema drift.`;
    }

    if (isFullyResolved) {
      verdictText = "Discrepancy resolved. Server ingress proved steady all along. 18% loss was completely caused by reporting query filters and mobile schema drift.";
    }

    return {
      points,
      currentFlawed,
      currentCorrected,
      currentIngress,
      varianceFlawed: diffFlawed <= -10 ? `${diffFlawed}% (Critical Drop)` : `${diffFlawed > 0 ? "+" : ""}${diffFlawed}%`,
      varianceCorrected: `${diffCorrected > 0 ? "+" : ""}${diffCorrected}% (Normalized)`,
      verdictText,
    };
  }, [selectedTimeRange, selectedPlatform, selectedTier, isFullyResolved]);

  const chartPoints = useMemo(() => {
    return currentSlice.points.map((p) => {
      const ingressY = Math.round(200 - ((p.serverIngress - 40000) / 90000) * 160);
      const flawedY = Math.round(200 - ((p.flawedDau - 40000) / 90000) * 160);
      const correctedY = Math.round(200 - ((p.correctedDau - 40000) / 90000) * 160);
      return {
        ...p,
        ingressY: Math.max(30, Math.min(210, ingressY)),
        flawedY: Math.max(30, Math.min(210, flawedY)),
        correctedY: Math.max(30, Math.min(210, correctedY)),
      };
    });
  }, [currentSlice.points]);

  const currentDau = isFullyResolved ? currentSlice.currentCorrected : currentSlice.currentFlawed;
  const currentVariance = isFullyResolved ? currentSlice.varianceCorrected : currentSlice.varianceFlawed;

  const handleGenerateReport = () => {
    setShowExecutiveReportModal(true);
    onAction("[BI_STUDIO] Seeker generated Executive Incident Post-Mortem Report for The Missing DAU Problem.");
  };

  const handleSubmitFinalReport = async () => {
    setReportSubmitted(true);
    try {
      await submitExecutiveDataReportAction(
        sessionId || "demo-session",
        {
          title: "The Missing DAU Problem: Root Cause Analysis & Metric Rectification",
          rootCauseSummary:
            "Mobile app v2.4.1 schema drift (account_uid instead of user_id) dropped 18.2% of mobile telemetry rows. Legacy SQL query used INNER JOIN on transactions without DISTINCT, dropping non-transacting active subscribers.",
          sqlJoinFixed: isSqlFixed,
          pipelineRepaired: isPipelineRepaired,
          serverTrafficSteady: true,
          normalizedDau: 62850,
        }
      );
    } catch (e) {
      console.warn("Report submission server action notice:", e);
    }

    onAction(
      "[VICTORY] Data candidate submitted final Executive Incident Report. Confirmed 18% DAU drop was a reporting artifact from schema drift and join filtering. Server traffic was steady. Metrics normalized to 62,850 DAU."
    );
    setTimeout(() => {
      onComplete();
    }, 2800);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#05070d",
        color: "#e2e8f0",
        fontFamily: "'JetBrains Mono', monospace",
        overflow: "hidden",
      }}
    >
      {/* Top BI Header / Breadcrumb */}
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
          <span style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
            <span>📊</span>
            <span>AURA BI STUDIO // EXECUTIVE DASHBOARD</span>
          </span>
          <span
            style={{
              fontSize: 9,
              padding: "2px 8px",
              borderRadius: 4,
              background: isFullyResolved ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: isFullyResolved ? "#22c55e" : "#ef4444",
              border: `1px solid ${isFullyResolved ? "#22c55e" : "#ef4444"}`,
              fontWeight: 700,
            }}
          >
            {isFullyResolved ? "DATA INTEGRITY VERIFIED" : "ANOMALY INVESTIGATION IN PROGRESS"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleGenerateReport}
            style={{
              padding: "6px 14px",
              background: isFullyResolved ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.15)",
              border: `1px solid ${isFullyResolved ? "#22c55e" : "#f59e0b"}`,
              color: isFullyResolved ? "#22c55e" : "#f59e0b",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: isFullyResolved ? "0 0 12px rgba(34,197,94,0.3)" : "none",
            }}
          >
            <span>📄</span>
            <span>GENERATE EXECUTIVE REPORT</span>
          </button>
        </div>
      </div>

      {/* Interactive Filter Strip */}
      <div
        style={{
          padding: "8px 18px",
          background: "#060a13",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          gap: 20,
          fontSize: 11,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#64748b" }}>Date Window:</span>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            style={{
              background: "#0c1322",
              border: "1px solid #1e293b",
              color: "#38bdf8",
              padding: "3px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            <option value="incident">Nov 01 - Nov 05, 2026 (Incident Window)</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#64748b" }}>Platform:</span>
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            style={{
              background: "#0c1322",
              border: "1px solid #1e293b",
              color: "#38bdf8",
              padding: "3px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            <option value="all">All Platforms (Web + iOS + Android)</option>
            <option value="ios">iOS (v2.4.1 Drift Affected)</option>
            <option value="android">Android (v2.4.1 Drift Affected)</option>
            <option value="web">Web Browser</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#64748b" }}>Subscriber Tier:</span>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            style={{
              background: "#0c1322",
              border: "1px solid #1e293b",
              color: "#38bdf8",
              padding: "3px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            <option value="all">All Tiers (Free + Pro + Enterprise)</option>
            <option value="free">Free Subscribers (Join Filtered)</option>
            <option value="pro">Pro Subscribers</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Main Studio Body */}
      <div style={{ flex: 1, padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* KPI Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {/* Card 1: Daily Active Users */}
          <div
            style={{
              background: "#070c18",
              border: `1px solid ${isFullyResolved ? "#22c55e40" : "#ef444450"}`,
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
              Daily Active Users (DAU)
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: isFullyResolved ? "#22c55e" : "#ef4444",
                marginTop: 4,
              }}
            >
              {currentDau.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: isFullyResolved ? "#22c55e" : "#f87171", marginTop: 4 }}>
              {currentVariance}
            </div>
          </div>

          {/* Card 2: Server Ingress Requests */}
          <div
            style={{
              background: "#070c18",
              border: "1px solid #06b6d440",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
              Server Ingress (Gateway Logs)
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#06b6d4", marginTop: 4 }}>
              125,100 <span style={{ fontSize: 12, fontWeight: 400 }}>req/min</span>
            </div>
            <div style={{ fontSize: 10, color: "#38bdf8", marginTop: 4 }}>
              ▲ +1.2% (Engineering claim confirmed)
            </div>
          </div>

          {/* Card 3: Stickiness DAU / MAU */}
          <div
            style={{
              background: "#070c18",
              border: "1px solid #1e293b",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
              Subscriber Stickiness (DAU/MAU)
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#f8fafc", marginTop: 4 }}>
              {isFullyResolved ? "42.6%" : "34.4%"}
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
              Benchmark: 38.0% healthy SaaS ratio
            </div>
          </div>

          {/* Card 4: Quality SLA */}
          <div
            style={{
              background: "#070c18",
              border: `1px solid ${isFullyResolved ? "#22c55e40" : "#f59e0b50"}`,
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
              Pipeline Quality Health
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: isFullyResolved ? "#22c55e" : "#f59e0b",
                marginTop: 4,
              }}
            >
              {isFullyResolved ? "100.0%" : "81.8%"}
            </div>
            <div style={{ fontSize: 10, color: isFullyResolved ? "#22c55e" : "#f59e0b", marginTop: 4 }}>
              {isFullyResolved ? "✓ All dbt tests passing" : "⚠️ Schema drift detected in staging"}
            </div>
          </div>
        </div>

        {/* Main Telemetry Line Chart */}
        <div
          style={{
            flex: 1,
            minHeight: 340,
            background: "#060912",
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {/* Chart Header & Legend */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#f8fafc" }}>
                Daily Active Users vs Ingress Server Traffic (Nov 01 - Nov 05, 2026)
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                Comparing reported DAU metric against raw API gateway requests proves traffic never dropped.
              </div>
            </div>

            {/* Legend Items */}
            <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 3, background: "#06b6d4" }} />
                <span style={{ color: "#38bdf8" }}>Server Ingress Reality (124k req/min)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 3, background: "#ef4444", borderTop: "1px dashed #ef4444" }} />
                <span style={{ color: "#ef4444" }}>Flawed DAU (Pre-Fix -18%)</span>
              </div>
              {isFullyResolved && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 14, height: 3, background: "#22c55e" }} />
                  <span style={{ color: "#22c55e" }}>Normalized True DAU (62.8k)</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive SVG Chart */}
          <div style={{ flex: 1, position: "relative", minHeight: 220 }}>
            <svg
              viewBox="0 0 600 240"
              style={{ width: "100%", height: "100%", overflow: "visible" }}
            >
              {/* Background Grid Lines */}
              <line x1="40" y1="40" x2="570" y2="40" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="40" y1="90" x2="570" y2="90" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="40" y1="140" x2="570" y2="140" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="40" y1="190" x2="570" y2="190" stroke="#1e293b" strokeDasharray="3 3" />

              {/* Y Axis Labels */}
              <text x="32" y="44" fill="#64748b" fontSize="9" textAnchor="end">125k</text>
              <text x="32" y="94" fill="#64748b" fontSize="9" textAnchor="end">80k</text>
              <text x="32" y="144" fill="#64748b" fontSize="9" textAnchor="end">62k</text>
              <text x="32" y="194" fill="#64748b" fontSize="9" textAnchor="end">50k</text>

              {/* Path 1: Server Ingress (Cyan) */}
              <motion.path
                d={`M ${chartPoints.map((p, i) => `${80 + i * 115},${p.ingressY}`).join(" L ")}`}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
              />

              {/* Path 2: Flawed DAU (Red Dashed) */}
              <motion.path
                d={`M ${chartPoints.map((p, i) => `${80 + i * 115},${p.flawedY}`).join(" L ")}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray={isFullyResolved ? "4 4" : "none"}
                opacity={isFullyResolved ? 0.45 : 1}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
              />

              {/* Path 3: Corrected DAU (Green Solid) */}
              {isFullyResolved && (
                <motion.path
                  d={`M ${chartPoints.map((p, i) => `${80 + i * 115},${p.correctedY}`).join(" L ")}`}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8 }}
                />
              )}

              {/* Data Points and Interactivity */}
              {chartPoints.map((p, i) => {
                const cx = 80 + i * 115;
                const isAnomaly = i >= 3;

                return (
                  <g key={p.date}>
                    {/* Ingress point */}
                    <circle cx={cx} cy={p.ingressY} r="4" fill="#06b6d4" />

                    {/* Flawed point */}
                    <circle
                      cx={cx}
                      cy={p.flawedY}
                      r={isAnomaly ? "6" : "4"}
                      fill="#ef4444"
                      stroke={isAnomaly ? "#ffffff" : "none"}
                      strokeWidth="1.5"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredPoint(p)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />

                    {/* Corrected point */}
                    {isFullyResolved && (
                      <circle
                        cx={cx}
                        cy={p.correctedY}
                        r="5"
                        fill="#22c55e"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        style={{ cursor: "pointer" }}
                        onMouseEnter={() => setHoveredPoint(p)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    )}

                    {/* X axis labels */}
                    <text x={cx} y="225" fill="#94a3b8" fontSize="10" textAnchor="middle">
                      {p.date}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  background: "#080e1c",
                  border: "1px solid #06b6d4",
                  borderRadius: 6,
                  padding: "10px 14px",
                  fontSize: 11,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.8)",
                  zIndex: 20,
                }}
              >
                <div style={{ color: "#38bdf8", fontWeight: 800 }}>Date: {hoveredPoint.date}</div>
                <div style={{ color: "#ef4444", marginTop: 4 }}>
                  Reported DAU (Pre-Fix): <strong>{hoveredPoint.flawedDau.toLocaleString()}</strong>
                </div>
                <div style={{ color: "#06b6d4" }}>
                  Server Ingress: <strong>{hoveredPoint.serverIngress.toLocaleString()} req/min</strong>
                </div>
                {isFullyResolved && (
                  <div style={{ color: "#22c55e" }}>
                    Normalized True DAU: <strong>{hoveredPoint.correctedDau.toLocaleString()}</strong>
                  </div>
                )}
                <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 4, fontStyle: "italic" }}>
                  {hoveredPoint.note}
                </div>
              </div>
            )}
          </div>

          {/* Anomaly Callout Banner */}
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              background: isFullyResolved ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${isFullyResolved ? "#22c55e40" : "#ef444440"}`,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 11,
            }}
          >
            <div>
              <strong style={{ color: isFullyResolved ? "#22c55e" : "#ef4444" }}>
                {isFullyResolved ? "✓ VERDICT:" : "⚠️ ACTIVE ANOMALY DETECTED:"}
              </strong>{" "}
              <span style={{ color: "#cbd5e1" }}>
                {isFullyResolved
                  ? "Discrepancy resolved. Server ingress proved steady all along. 18% loss was completely caused by reporting query filters and mobile schema drift."
                  : "Daily Active Users plunged by 18% on Nov 04 while server ingress traffic was completely unchanged. Engineering team was correct."}
              </span>
            </div>
            {!isFullyResolved && (
              <span style={{ color: "#f59e0b", fontSize: 10, fontWeight: 700 }}>
                [ STEP 1: FIX SQL ] → [ STEP 2: FIX PIPELINE ]
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Executive Report Modal */}
      <AnimatePresence>
        {showExecutiveReportModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 24,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{
                width: "100%",
                maxWidth: 720,
                background: "#080c16",
                border: "1px solid #06b6d450",
                borderRadius: 8,
                padding: 24,
                boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
                display: "flex",
                flexDirection: "column",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              {/* Report Header */}
              <div style={{ borderBottom: "1px solid #1e293b", paddingBottom: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#06b6d4", fontWeight: 800, letterSpacing: "1.5px" }}>
                  AURA COMMERCE // DATA INCIDENT POST-MORTEM
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", marginTop: 4 }}>
                  The Missing DAU Problem: Root Cause Analysis & Metric Rectification
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  Lead Author: Candidate (Data Platform Engineer) | Date: Nov 05, 2026 | Severity: SEV-2 Metric Drift
                </div>
              </div>

              {/* Report Body */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 11, lineHeight: 1.6, color: "#cbd5e1" }}>
                <div>
                  <strong style={{ color: "#38bdf8" }}>1. Executive Summary:</strong>
                  <p style={{ margin: "4px 0 0 0", color: "#94a3b8" }}>
                    On Nov 04, the Aura analytics dashboard reported an acute 18% drop in Daily Active Users (from 62,300 to 50,680). The engineering team claimed that production API traffic remained steady. Our cross-layer investigation validated engineering&apos;s assertion: server ingress was stable at 124,500 req/min. The 18% loss was an artificial reporting distortion caused by two compounding defects.
                  </p>
                </div>

                <div>
                  <strong style={{ color: "#38bdf8" }}>2. Root Cause Analysis:</strong>
                  <ul style={{ margin: "4px 0 0 16px", padding: 0, color: "#94a3b8" }}>
                    <li>
                      <strong>Defect A (SQL Join Filter):</strong> The legacy reporting query joined <code>users</code> to <code>transactions</code> via <code>INNER JOIN</code>, dropping active free and non-transacting subscribers from the daily count.
                    </li>
                    <li>
                      <strong>Defect B (Mobile Telemetry Schema Drift):</strong> Mobile release v2.4.1 renamed <code>user_id</code> to <code>account_uid</code>, leading the staging dbt model to drop 18.2% of mobile telemetry as null identifiers.
                    </li>
                  </ul>
                </div>

                <div>
                  <strong style={{ color: "#38bdf8" }}>3. Corrective Actions Applied:</strong>
                  <ul style={{ margin: "4px 0 0 16px", padding: 0, color: "#94a3b8" }}>
                    <li>
                      Updated SQL semantic definition to <code>COUNT(DISTINCT u.id)</code> across <code>sessions</code> table.
                    </li>
                    <li>
                      Patched <code>stg_mobile_events.sql</code> with <code>COALESCE(account_uid, user_id)</code> and window deduplication.
                    </li>
                    <li>
                      Re-executed Airflow DAG <code>aura_dau_mart_daily_v3</code>, restoring published DAU to <strong>62,850</strong>.
                    </li>
                  </ul>
                </div>

                <div
                  style={{
                    padding: 12,
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid #22c55e",
                    borderRadius: 6,
                  }}
                >
                  <div style={{ color: "#22c55e", fontWeight: 800 }}>
                    Metric Status: FULLY NORMALIZED (62,850 True Active Users)
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 2 }}>
                    Zero real user churn occurred. Reporting dashboards re-synced with production reality.
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 14,
                  borderTop: "1px solid #1e293b",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <button
                  onClick={() => setShowExecutiveReportModal(false)}
                  style={{
                    padding: "8px 16px",
                    background: "#0c1322",
                    border: "1px solid #334155",
                    color: "#94a3b8",
                    borderRadius: 4,
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Close
                </button>
                <button
                  onClick={handleSubmitFinalReport}
                  disabled={reportSubmitted}
                  style={{
                    padding: "8px 20px",
                    background: reportSubmitted ? "#1e293b" : "rgba(34,197,94,0.25)",
                    border: "1px solid #22c55e",
                    color: "#22c55e",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: reportSubmitted ? "wait" : "pointer",
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 0 16px rgba(34,197,94,0.3)",
                  }}
                >
                  <span>{reportSubmitted ? "✓" : "🚀"}</span>
                  <span>{reportSubmitted ? "REPORT SUBMITTED..." : "SIGN OFF & COMPLETE SIMULATION"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
