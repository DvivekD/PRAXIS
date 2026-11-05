"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FunnelStep, MetricTimelinePoint, ExperimentConfig } from "./types";
import { proposeExperimentAction } from "../../../actions/eval";

interface ProductAnalyticsSubEnvProps {
  sessionId: string;
  funnelSteps: FunnelStep[];
  hourlyTelemetry: MetricTimelinePoint[];
  experiments: ExperimentConfig[];
  onAction: (actionText: string) => void;
  onProposeExperiment?: (exp: ExperimentConfig) => void;
}

interface FeatureAdoptionItem {
  id: string;
  name: string;
  category: "promotional" | "recommendation" | "checkout" | "social";
  status: "active" | "staging" | "incident_risk" | "safe";
  adoptionRate: number; // %
  conversionImpact: number; // %
  latencyImpactMs: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  recommendation: "FREEZE_DEPLOY" | "P0_HOTFIX_REQUIRED" | "MAINTAIN" | "DE_PRIORITIZE";
  description: string;
  metrics: {
    impressions: number;
    interactions: number;
    abandonmentCorrelation: string;
  };
}

const FEATURE_ADOPTION_DATA: FeatureAdoptionItem[] = [
  {
    id: "feat_1",
    name: "Midnight Gift Card Upsell Banner (CEO Request)",
    category: "promotional",
    status: "incident_risk",
    adoptionRate: 4.1,
    conversionImpact: -12.8,
    latencyImpactMs: 35,
    riskLevel: "HIGH",
    recommendation: "FREEZE_DEPLOY",
    description: "Marketing promo banner inserted into cart slide-out to boost AOV. Historical staging telemetry reveals high distraction rate at final review step.",
    metrics: {
      impressions: 42100,
      interactions: 1726,
      abandonmentCorrelation: "+12.8% checkout exit rate",
    },
  },
  {
    id: "feat_2",
    name: "1-Click Express Checkout & Pay Now Button",
    category: "checkout",
    status: "incident_risk",
    adoptionRate: 64.2,
    conversionImpact: -42.8,
    latencyImpactMs: 240,
    riskLevel: "CRITICAL",
    recommendation: "P0_HOTFIX_REQUIRED",
    description: "Primary payment authorization trigger. Severe flaw: un-mutexed button triggers repeat HTTP POST requests under 200ms latency jitter, resulting in duplicate debits.",
    metrics: {
      impressions: 28400,
      interactions: 16240,
      abandonmentCorrelation: "6,951 duplicate charges (ERR_DOUBLE_CHARGE_TX)",
    },
  },
  {
    id: "feat_3",
    name: "Cart Cross-Sell Recommendation Drawer",
    category: "recommendation",
    status: "safe",
    adoptionRate: 6.4,
    conversionImpact: 8.2,
    latencyImpactMs: 180,
    riskLevel: "MEDIUM",
    recommendation: "MAINTAIN",
    description: "Vector-based accessories recommendation carousel in cart drawer. Moderately increases AOV (+$14.20/order) with acceptable latency profile.",
    metrics: {
      impressions: 42100,
      interactions: 2694,
      abandonmentCorrelation: "+8.2% order value lift",
    },
  },
  {
    id: "feat_4",
    name: "Wishlist Social Share & Deep Linking",
    category: "social",
    status: "safe",
    adoptionRate: 1.1,
    conversionImpact: 0.2,
    latencyImpactMs: 5,
    riskLevel: "LOW",
    recommendation: "DE_PRIORITIZE",
    description: "Social share button for holiday wishlist curation. Very low shopper engagement before launch; negligible impact on storefront revenue.",
    metrics: {
      impressions: 89200,
      interactions: 981,
      abandonmentCorrelation: "Neutral (<0.5% effect)",
    },
  },
];

export default function ProductAnalyticsSubEnv({
  sessionId,
  funnelSteps,
  hourlyTelemetry,
  experiments: initialExperiments,
  onAction,
  onProposeExperiment,
}: ProductAnalyticsSubEnvProps) {
  const [activeTab, setActiveTab] = useState<"funnel" | "adoption" | "telemetry" | "experiments">("funnel");
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(4); // Step 5: Payment Review (anomaly)
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>("feat_1");
  const [experiments, setExperiments] = useState<ExperimentConfig[]>(initialExperiments);
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [activeExperimentId, setActiveExperimentId] = useState<string>("EXP-2026-BF-01");

  // New Experiment Form state
  const [expName, setExpName] = useState("EXP-2026-BF-02: Instant One-Click Retry Mutex");
  const [expHypothesis, setExpHypothesis] = useState(
    "Adding an atomic Redis token mutex on the pay button will prevent duplicate card debits under rapid repeat clicks and restore checkout conversion to >85%."
  );
  const [expControl, setExpControl] = useState("Control (Standard repeat-click behavior)");
  const [expVariant, setExpVariant] = useState("Variant B (Disabled pay button + client idempotency token)");
  const [expSplit, setExpSplit] = useState(50);
  const [expMetric, setExpMetric] = useState("Payment Step Conversion (%)");

  const [experimentDeployed, setExperimentDeployed] = useState(false);

  const selectedStep = funnelSteps[selectedStepIndex] || funnelSteps[4];
  const selectedFeature = FEATURE_ADOPTION_DATA.find((f) => f.id === selectedFeatureId) || FEATURE_ADOPTION_DATA[0];

  // SVG Funnel dimensions
  const maxUsers = funnelSteps[0]?.users || 124500;

  const handleDeployExperiment = async () => {
    setExperimentDeployed(true);
    try {
      const res = await proposeExperimentAction(sessionId, {
        name: expName,
        hypothesis: expHypothesis,
        controlVariant: expControl,
        testVariant: expVariant,
        trafficSplit: expSplit,
        primaryMetric: expMetric,
      });

      if (res.success && res.experiment) {
        setExperiments((prev) => [res.experiment, ...prev]);
        setActiveExperimentId(res.experiment.id);
        onProposeExperiment?.(res.experiment);
      }

      onAction(
        `[EXPERIMENT_DEPLOYED] Launched "${expName}" with ${expSplit}% traffic split. Primary Metric: ${expMetric}. Statistical significance: p < 0.001.`
      );
      setIsProposeModalOpen(false);
    } catch (e) {
      console.error("Experiment deployment failed:", e);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#0b0e14",
        color: "#e2e8f0",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ─── MIXPANEL / AMPLITUDE HEADER ──────────────────────── */}
      <div
        style={{
          height: 54,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "#111622",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Amplitude / Mixpanel Brand mark */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "linear-gradient(135deg, #06b6d4, #0284c7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            ▲
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              <span>Amplitude Analytics // Black Friday Launch Telemetry</span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(239,68,68,0.2)",
                  color: "#f87171",
                  fontWeight: 700,
                }}
              >
                🚨 CRITICAL DROP-OFF DETECTED
              </span>
            </div>
          </div>
        </div>

        {/* Analytics Sub-tabs */}
        <div
          style={{
            display: "flex",
            background: "rgba(0,0,0,0.3)",
            padding: 3,
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            onClick={() => {
              setActiveTab("funnel");
              onAction("[AMPLITUDE_TAB] Switched to Conversion Funnel analysis");
            }}
            style={{
              background: activeTab === "funnel" ? "#212838" : "transparent",
              color: activeTab === "funnel" ? "#fff" : "#94a3b8",
              border: "none",
              padding: "5px 14px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📊</span>
            <span>Conversion Funnel</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("adoption");
              onAction("[AMPLITUDE_TAB] Switched to Feature Adoption & Risk Matrix");
            }}
            style={{
              background: activeTab === "adoption" ? "#212838" : "transparent",
              color: activeTab === "adoption" ? "#fff" : "#94a3b8",
              border: "none",
              padding: "5px 14px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>🎯</span>
            <span>Feature Adoption</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("telemetry");
              onAction("[AMPLITUDE_TAB] Switched to Hourly Error Telemetry");
            }}
            style={{
              background: activeTab === "telemetry" ? "#212838" : "transparent",
              color: activeTab === "telemetry" ? "#fff" : "#94a3b8",
              border: "none",
              padding: "5px 14px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📈</span>
            <span>Hourly Error Telemetry</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("experiments");
              onAction("[AMPLITUDE_TAB] Switched to Experiment Lab (A/B Test)");
            }}
            style={{
              background: activeTab === "experiments" ? "#212838" : "transparent",
              color: activeTab === "experiments" ? "#fff" : "#94a3b8",
              border: "none",
              padding: "5px 14px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>🧪</span>
            <span>Experiment Lab (A/B Test)</span>
          </button>
        </div>

        {/* Propose Experiment action button */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setIsProposeModalOpen(true)}
            style={{
              background: "linear-gradient(135deg, #0284c7, #0369a1)",
              color: "#fff",
              border: "none",
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(2,132,199,0.3)",
            }}
          >
            <span>+</span>
            <span>Propose A/B Experiment</span>
          </button>
        </div>
      </div>

      {/* ─── TOP KPI CARDS BAR ─────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          padding: "12px 20px",
          background: "#0e131d",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ background: "#151b26", padding: "10px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Total Storefront Visitors</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 2 }}>124,500</div>
          <div style={{ fontSize: 10, color: "#22c55e", marginTop: 2 }}>+28.4% Black Friday surge</div>
        </div>

        <div style={{ background: "#151b26", padding: "10px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Cart-to-Checkout Rate</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 2 }}>67.5%</div>
          <div style={{ fontSize: 10, color: "#38bdf8", marginTop: 2 }}>Normal baseline range</div>
        </div>

        <div style={{ background: "#1f1519", padding: "10px 14px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)" }}>
          <div style={{ fontSize: 11, color: "#f87171", fontWeight: 600 }}>Payment Step Drop-Off (Step 5)</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444", marginTop: 2 }}>42.8% Drop-Off</div>
          <div style={{ fontSize: 10, color: "#fca5a5", marginTop: 2 }}>🚨 6,951 duplicate card charge errors</div>
        </div>

        <div style={{ background: "#151b26", padding: "10px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Net Funnel Conversion</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 2 }}>7.46%</div>
          <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 2 }}>Down from 19.3% benchmark target</div>
        </div>
      </div>

      {/* ─── TAB 1: CONVERSION FUNNEL ──────────────────────────── */}
      {activeTab === "funnel" && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left: Interactive Funnel Visualization */}
          <div
            style={{
              flex: 1,
              padding: 20,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>
                6-Stage Checkout Conversion Funnel (Real-time Drop-off Analysis)
              </h3>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                Select any stage to inspect platform & error code breakdown
              </span>
            </div>

            {/* Funnel Step Bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {funnelSteps.map((step, idx) => {
                const isSelected = idx === selectedStepIndex;
                const widthPercent = (step.users / maxUsers) * 100;

                return (
                  <motion.div
                    key={step.step}
                    onClick={() => {
                      setSelectedStepIndex(idx);
                      onAction(`[AMPLITUDE_FUNNEL] Inspected Funnel Step ${step.step}: "${step.name}" (${step.users.toLocaleString()} users, ${step.dropOffRate}% drop)`);
                    }}
                    whileHover={{ scale: 1.005 }}
                    style={{
                      background: isSelected ? "#1b2333" : "#131722",
                      border: isSelected ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 8,
                      padding: 14,
                      cursor: "pointer",
                      position: "relative",
                      boxShadow: isSelected ? "0 4px 16px rgba(56,189,248,0.15)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: step.isAnomaly ? "#ef4444" : "#0284c7",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {step.step}
                        </span>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{step.name}</span>
                          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>— {step.subtitle}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                            {step.users.toLocaleString()} users
                          </span>
                          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>
                            ({step.conversionRate.toFixed(1)}% of top)
                          </span>
                        </div>
                        {step.dropOffRate > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: step.isAnomaly ? "#f87171" : "#94a3b8",
                              background: step.isAnomaly ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)",
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            -{step.dropOffRate.toFixed(1)}% drop
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress visual bar */}
                    <div style={{ width: "100%", height: 12, background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                      <div
                        style={{
                          width: `${widthPercent}%`,
                          height: "100%",
                          background: step.isAnomaly
                            ? "linear-gradient(90deg, #ef4444, #dc2626)"
                            : "linear-gradient(90deg, #0284c7, #38bdf8)",
                          borderRadius: 6,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>

                    {step.isAnomaly && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: "#fca5a5",
                          background: "rgba(239,68,68,0.1)",
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        ⚠️ {step.anomalyNote}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right: Step Deep-Dive Inspector */}
          <div
            style={{
              width: 360,
              background: "#10141e",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              overflowY: "auto",
            }}
          >
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "#38bdf8", fontWeight: 700, letterSpacing: "0.5px" }}>
                Step {selectedStep.step} Inspector
              </div>
              <h4 style={{ margin: "4px 0 0 0", fontSize: 16, color: "#fff" }}>{selectedStep.name}</h4>
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#94a3b8" }}>{selectedStep.subtitle}</p>
            </div>

            {/* Metrics Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#161b27", padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Audience Size</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                  {selectedStep.users.toLocaleString()}
                </div>
              </div>
              <div style={{ background: "#161b27", padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Drop-Off Rate</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: selectedStep.isAnomaly ? "#ef4444" : "#fff", marginTop: 2 }}>
                  {selectedStep.dropOffRate}%
                </div>
              </div>
            </div>

            {/* Error Code Distribution if Step 5 */}
            {selectedStep.step === 5 ? (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171", textTransform: "uppercase", marginBottom: 8 }}>
                  🚨 Root Cause Failure Distribution
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#fff", fontWeight: 600 }}>ERR_DOUBLE_CHARGE_TX</span>
                    <strong style={{ color: "#f87171" }}>88.4% (6,145 events)</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                    <span>GATEWAY_TIMEOUT_504</span>
                    <span>7.2% (501 events)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                    <span>INSUFFICIENT_FUNDS</span>
                    <span>4.4% (305 events)</span>
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: "#fca5a5", lineHeight: 1.5 }}>
                  <strong>Product Diagnosis:</strong> High drop-off is driven almost exclusively by repeat payment button clicks when network latency spikes during checkout authorization.
                </div>
              </div>
            ) : (
              <div style={{ background: "#161b27", borderRadius: 8, padding: 14, fontSize: 12, color: "#94a3b8" }}>
                Traffic flow through this step is within normal variance (+- 2% of annual Black Friday benchmark).
              </div>
            )}

            {/* Platform / Device Distribution */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>
                Device Breakdown
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#cbd5e1" }}>Mobile Safari / iOS</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>54%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#cbd5e1" }}>Mobile Chrome / Android</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>24%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#cbd5e1" }}>Desktop Chrome / Mac & PC</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>22%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: FEATURE ADOPTION MATRIX ───────────────────── */}
      {activeTab === "adoption" && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left: Feature List & Risk Cards */}
          <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: 15, fontWeight: 700, color: "#fff" }}>
                  Storefront Feature Adoption & Black Friday Launch Risk Matrix
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
                  Correlating user interaction volume, checkout latency, and conversion sensitivity across active features.
                </p>
              </div>
              <span style={{ fontSize: 11, background: "rgba(129,140,248,0.15)", color: "#a5b4fc", padding: "4px 10px", borderRadius: 4, fontWeight: 700 }}>
                4 Features Profiled
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FEATURE_ADOPTION_DATA.map((feat) => {
                const isSelected = feat.id === selectedFeatureId;
                const isCritical = feat.riskLevel === "CRITICAL";
                const isHigh = feat.riskLevel === "HIGH";

                return (
                  <motion.div
                    key={feat.id}
                    onClick={() => {
                      setSelectedFeatureId(feat.id);
                      onAction(`[FEATURE_ADOPTION] Inspected feature "${feat.name}": Adoption=${feat.adoptionRate}%, Impact=${feat.conversionImpact}%, Recommendation=${feat.recommendation}`);
                    }}
                    whileHover={{ scale: 1.005 }}
                    style={{
                      background: isSelected ? "#1b2333" : "#131722",
                      border: isSelected ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 8,
                      padding: 14,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{feat.category === "promotional" ? "🎁" : feat.category === "checkout" ? "💳" : feat.category === "recommendation" ? "✨" : "🔗"}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{feat.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: isCritical ? "rgba(239,68,68,0.2)" : isHigh ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.15)",
                            color: isCritical ? "#f87171" : isHigh ? "#fbbf24" : "#4ade80",
                            fontWeight: 700,
                          }}
                        >
                          {feat.riskLevel} RISK
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.08)",
                            color: "#cbd5e1",
                            fontWeight: 600,
                          }}
                        >
                          {feat.recommendation}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                      {feat.description}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, background: "#0c0f17", padding: "8px 12px", borderRadius: 6, marginTop: 4 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>Shopper Adoption:</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{feat.adoptionRate}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>Conversion Impact:</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: feat.conversionImpact < 0 ? "#ef4444" : "#22c55e" }}>
                          {feat.conversionImpact > 0 ? `+${feat.conversionImpact}%` : `${feat.conversionImpact}%`}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>Latency Delta:</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: feat.latencyImpactMs > 100 ? "#f59e0b" : "#cbd5e1" }}>
                          +{feat.latencyImpactMs}ms
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right: Feature Telemetry Deep Dive */}
          <div
            style={{
              width: 360,
              background: "#10141e",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              overflowY: "auto",
            }}
          >
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "#38bdf8", fontWeight: 700, letterSpacing: "0.5px" }}>
                Feature Impact Deep Dive
              </div>
              <h4 style={{ margin: "4px 0 0 0", fontSize: 15, color: "#fff" }}>{selectedFeature.name}</h4>
              <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#94a3b8" }}>Category: {selectedFeature.category.toUpperCase()}</p>
            </div>

            <div style={{ background: "#161b27", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase" }}>
                Interaction Telemetry
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#94a3b8" }}>Total Impressions:</span>
                <strong style={{ color: "#fff" }}>{selectedFeature.metrics.impressions.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#94a3b8" }}>User Interactions:</span>
                <strong style={{ color: "#fff" }}>{selectedFeature.metrics.interactions.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#94a3b8" }}>Abandonment Correlation:</span>
                <strong style={{ color: selectedFeature.conversionImpact < 0 ? "#ef4444" : "#22c55e" }}>
                  {selectedFeature.metrics.abandonmentCorrelation}
                </strong>
              </div>
            </div>

            <div
              style={{
                background: selectedFeature.riskLevel === "CRITICAL" || selectedFeature.riskLevel === "HIGH" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                border: selectedFeature.riskLevel === "CRITICAL" || selectedFeature.riskLevel === "HIGH" ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(34,197,94,0.3)",
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: selectedFeature.riskLevel === "CRITICAL" || selectedFeature.riskLevel === "HIGH" ? "#f87171" : "#4ade80", textTransform: "uppercase", marginBottom: 6 }}>
                Launch Gate Directive: {selectedFeature.recommendation}
              </div>
              <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6 }}>
                {selectedFeature.id === "feat_1"
                  ? "CEO Taylor Brooks requested shipping this banner tonight. However, telemetry proves it introduces high cognitive distraction at checkout review, causing a 12.8% surge in abandoned carts. Directive: Enforce code freeze and hold deployment."
                  : selectedFeature.id === "feat_2"
                  ? "High-volume checkout pathway suffering from 42.8% payment step drop-off due to ERR_DOUBLE_CHARGE_TX. Directive: Escalate to Alex Chen as P0 Sev-1 with Redis token mutex."
                  : selectedFeature.id === "feat_3"
                  ? "Safe to maintain. Adds positive AOV lift with acceptable +180ms latency profile."
                  : "Safe to defer. Non-essential cosmetic feature with low engagement."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: HOURLY ERROR TELEMETRY ─────────────────────── */}
      {activeTab === "telemetry" && (
        <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#131722", padding: 20, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 style={{ margin: "0 0 6px 0", fontSize: 16, color: "#fff" }}>
              Hourly Traffic & Duplicate Charge Spike (T-Minus 6 Hours to Midnight)
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
              Tracking ERR_DOUBLE_CHARGE_TX anomalies as storefront requests ramped from 14k/hr to 124k/hr.
            </p>

            {/* Visual SVG Timeline Chart */}
            <div style={{ marginTop: 24, height: 260, position: "relative" }}>
              <svg width="100%" height="220" style={{ overflow: "visible" }}>
                {/* Horizontal gridlines */}
                {[0, 50, 100, 150, 200].map((y, i) => (
                  <line
                    key={i}
                    x1="40"
                    y1={y}
                    x2="95%"
                    y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="4"
                  />
                ))}

                {/* Bars for double-charge errors */}
                {hourlyTelemetry.map((pt, i) => {
                  const x = 60 + i * 110;
                  const maxErrors = 7000;
                  const barH = (pt.doubleChargeErrors / maxErrors) * 180;
                  const y = 200 - barH;

                  return (
                    <g key={pt.time}>
                      {/* Error Bar */}
                      <rect
                        x={x - 20}
                        y={y}
                        width="40"
                        height={barH}
                        fill={pt.doubleChargeErrors > 500 ? "#ef4444" : "#f59e0b"}
                        rx="4"
                        opacity={0.85}
                      />
                      {/* Label values */}
                      <text
                        x={x}
                        y={y - 6}
                        fill="#fca5a5"
                        fontSize="10"
                        textAnchor="middle"
                        fontWeight="700"
                      >
                        {pt.doubleChargeErrors}
                      </text>
                      {/* Time label */}
                      <text x={x} y="220" fill="#94a3b8" fontSize="11" textAnchor="middle">
                        {pt.time}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Telemetry Data Table */}
          <div style={{ background: "#131722", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "100px 140px 160px 140px 120px",
                padding: "10px 16px",
                background: "#181b27",
                fontSize: 11,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
              }}
            >
              <span>Timestamp</span>
              <span>Total Requests</span>
              <span>Duplicate Debits</span>
              <span>Successful Orders</span>
              <span>Conversion %</span>
            </div>

            {hourlyTelemetry.map((pt) => (
              <div
                key={pt.time}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 140px 160px 140px 120px",
                  padding: "10px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  fontSize: 12,
                  color: "#cbd5e1",
                }}
              >
                <span style={{ fontWeight: 700, color: "#fff" }}>{pt.time}</span>
                <span>{pt.totalRequests.toLocaleString()}</span>
                <span style={{ color: pt.doubleChargeErrors > 500 ? "#ef4444" : "#eab308", fontWeight: 700 }}>
                  {pt.doubleChargeErrors.toLocaleString()} errs
                </span>
                <span>{pt.successfulOrders.toLocaleString()}</span>
                <span>{pt.conversionRate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: EXPERIMENT LAB (A/B TESTING) ───────────────── */}
      {activeTab === "experiments" && (
        <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: 16, color: "#fff" }}>
                Product Experiment Lab & A/B Statistical Engine
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
                Validate architectural and UX hypotheses with confidence intervals before broad rollout.
              </p>
            </div>
            <button
              onClick={() => setIsProposeModalOpen(true)}
              style={{
                background: "#0284c7",
                color: "#fff",
                border: "none",
                padding: "8px 18px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Create New Experiment
            </button>
          </div>

          {/* Active Experiments Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {experiments.map((exp) => (
              <div
                key={exp.id}
                style={{
                  background: "#131722",
                  borderRadius: 8,
                  border: "1px solid rgba(56,189,248,0.2)",
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>{exp.id}</span>
                      <h4 style={{ margin: 0, fontSize: 15, color: "#fff" }}>{exp.name}</h4>
                      <span
                        style={{
                          fontSize: 10,
                          background: "rgba(34,197,94,0.15)",
                          color: "#4ade80",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontWeight: 700,
                        }}
                      >
                        RUNNING (99.4% CONFIDENCE)
                      </span>
                    </div>
                    <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>
                      <strong>Hypothesis:</strong> {exp.hypothesis}
                    </p>
                  </div>

                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#4ade80",
                      background: "rgba(34,197,94,0.1)",
                      padding: "6px 12px",
                      borderRadius: 6,
                    }}
                  >
                    +{exp.projectedLift}% Lift
                  </span>
                </div>

                {/* Variant Comparison Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "#1a1f2c", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>
                      Variant A (Control - 50% traffic)
                    </div>
                    <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{exp.controlVariant}</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#ef4444", fontWeight: 700 }}>
                      Payment Conversion: 57.2% | Error Rate: 42.8%
                    </div>
                  </div>

                  <div style={{ background: "rgba(2,132,199,0.12)", border: "1px solid rgba(2,132,199,0.3)", padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700 }}>
                      Variant B (Treatment - 50% traffic) [WINNER]
                    </div>
                    <div style={{ fontSize: 12, color: "#fff", marginTop: 4 }}>{exp.testVariant}</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#4ade80", fontWeight: 700 }}>
                      Payment Conversion: 92.4% | Error Rate: 0.02%
                    </div>
                  </div>
                </div>

                {/* Statistical Details */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                  <span>Sample Size: <strong>{exp.sampleSize.toLocaleString()} users</strong></span>
                  <span>Primary Metric: <strong>{exp.primaryMetric}</strong></span>
                  <span>Confidence Level: <strong>{exp.confidence}% (p &lt; 0.001)</strong></span>
                  <span style={{ color: "#4ade80", fontWeight: 700 }}>Decision: Ready for 100% Production Rollout</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── PROPOSE EXPERIMENT MODAL ──────────────────────────── */}
      <AnimatePresence>
        {isProposeModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: 580,
                background: "#141824",
                borderRadius: 10,
                border: "1px solid rgba(56,189,248,0.3)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  background: "#1c2233",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  Propose Black Friday A/B Experiment
                </span>
                <button
                  type="button"
                  onClick={() => setIsProposeModalOpen(false)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16 }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                    Experiment Title
                  </label>
                  <input
                    type="text"
                    value={expName}
                    onChange={(e) => setExpName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#0c0f17",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                    Hypothesis Statement
                  </label>
                  <textarea
                    rows={3}
                    value={expHypothesis}
                    onChange={(e) => setExpHypothesis(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#0c0f17",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      color: "#fff",
                      fontSize: 13,
                      fontFamily: "inherit",
                      outline: "none",
                      resize: "none",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Variant A (Control)
                    </label>
                    <input
                      type="text"
                      value={expControl}
                      onChange={(e) => setExpControl(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#0c0f17",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 12,
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Variant B (Test Treatment)
                    </label>
                    <input
                      type="text"
                      value={expVariant}
                      onChange={(e) => setExpVariant(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#0c0f17",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 12,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Primary Metric
                    </label>
                    <select
                      value={expMetric}
                      onChange={(e) => setExpMetric(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#0c0f17",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 12,
                        outline: "none",
                      }}
                    >
                      <option value="Payment Step Conversion (%)">Payment Step Conversion (%)</option>
                      <option value="Double Charge Error Rate (%)">Double Charge Error Rate (%)</option>
                      <option value="Average Order Value ($)">Average Order Value ($)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Traffic Split ({expSplit}% / {100 - expSplit}%)
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={expSplit}
                      onChange={(e) => setExpSplit(parseInt(e.target.value))}
                      style={{ width: "100%", marginTop: 8, accentColor: "#0284c7" }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 20px",
                  background: "#1c2233",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsProposeModalOpen(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8",
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeployExperiment}
                  style={{
                    background: "#0284c7",
                    color: "#fff",
                    border: "none",
                    padding: "6px 18px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Launch A/B Test
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
