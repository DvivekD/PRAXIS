"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GmailInboxSubEnv from "./GmailInboxSubEnv";
import LinearBacklogSubEnv from "./LinearBacklogSubEnv";
import ProductAnalyticsSubEnv from "./ProductAnalyticsSubEnv";
import ProductObserverHUD from "./ProductObserverHUD";
import type { EmailItem, BacklogIssue, FunnelStep, MetricTimelinePoint, ExperimentConfig } from "./types";
import { getProductTriageDataAction, submitProductTriageAction } from "../../../actions/eval";

interface ProductEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any> | void;
  onComplete: () => void;
  demoMode: boolean;
  initialSubEnv?: number;
  onSubEnvChange?: (sub: number) => void;
}

export type ProductSubEnvTab = "01_gmail" | "02_linear" | "03_analytics";

export default function ProductEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
  initialSubEnv = 1,
  onSubEnvChange,
}: ProductEnvironmentProps) {
  const getTabFromSubEnv = (sub?: number): ProductSubEnvTab => {
    if (sub === 2) return "02_linear";
    if (sub === 3) return "03_analytics";
    return "01_gmail";
  };

  const [activeTab, setActiveTab] = useState<ProductSubEnvTab>(getTabFromSubEnv(initialSubEnv));
  const [loading, setLoading] = useState(true);

  // Synchronize when initialSubEnv changes from URL or JudgeMenu
  useEffect(() => {
    if (initialSubEnv) {
      setActiveTab(getTabFromSubEnv(initialSubEnv));
    }
  }, [initialSubEnv]);

  // Shared state across all 3 sub-environments
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [backlogIssues, setBacklogIssues] = useState<BacklogIssue[]>([]);
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([]);
  const [hourlyTelemetry, setHourlyTelemetry] = useState<MetricTimelinePoint[]>([]);
  const [experiments, setExperiments] = useState<ExperimentConfig[]>([]);

  // Triage state
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [cognitiveLoad, setCognitiveLoad] = useState<number>(54);
  const [observerNotes, setObserverNotes] = useState<string[]>([]);
  const [signals, setSignals] = useState<{
    edgeCaseConsideration?: boolean;
    tradeoffArticulation?: boolean;
    structuredDebugging?: boolean;
  }>({
    edgeCaseConsideration: false,
    tradeoffArticulation: false,
    structuredDebugging: false,
  });

  // Fetch initial real product triage data from eval.ts action
  useEffect(() => {
    async function loadData() {
      try {
        const res = await getProductTriageDataAction(sessionId);
        if (res.success && res.data) {
          setEmails(res.data.emails);
          setBacklogIssues(res.data.backlogIssues);
          setFunnelSteps(res.data.funnelSteps);
          setHourlyTelemetry(res.data.hourlyTelemetry);
          setExperiments(res.data.experiments);
        }
      } catch (err) {
        console.error("Failed to load product triage data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sessionId]);

  const handleTabSwitch = (tab: ProductSubEnvTab) => {
    setActiveTab(tab);
    const subNum = tab === "01_gmail" ? 1 : tab === "02_linear" ? 2 : 3;
    onSubEnvChange?.(subNum);
    const label =
      tab === "01_gmail"
        ? "01 // Google Gmail Inbox"
        : tab === "02_linear"
        ? "02 // Linear Product Backlog"
        : "03 // Amplitude Product Analytics";
    onAction(`[SWITCH_SUB_ENV] Navigated to ${label}`);
  };

  // Handle email triage decision
  const handleSelectOption = async (emailId: string, actionText: string) => {
    setDecisions((prev) => ({ ...prev, [emailId]: actionText }));
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, unread: false } : e))
    );

    const email = emails.find((e) => e.id === emailId);
    onAction(`[PRODUCT_TRIAGE] Re: "${email?.subject || emailId}" -> Decision: ${actionText}`);

    // Update server eval action
    try {
      const res = await submitProductTriageAction(sessionId, "email_reply", {
        emailId,
        decision: actionText,
      });

      if (res?.success) {
        if (res.cognitiveLoadScore) setCognitiveLoad(res.cognitiveLoadScore);
        if (res.processSignals) {
          setSignals((prev) => ({
            ...prev,
            edgeCaseConsideration: res.processSignals.edgeCaseConsideration ?? prev.edgeCaseConsideration,
            tradeoffArticulation: res.processSignals.tradeoffArticulation ?? prev.tradeoffArticulation,
            structuredDebugging: res.processSignals.structuredDebugging ?? prev.structuredDebugging,
          }));
        }
      }
    } catch {}

    // Link decision to backlog status if relevant
    if (emailId === "email_1") {
      if (actionText.includes("Sev-1") || actionText.includes("Engineering")) {
        setBacklogIssues((prev) =>
          prev.map((issue) =>
            issue.key === "AURA-101"
              ? { ...issue, status: "in_progress", priority: "P0" }
              : issue
          )
        );
      }
    } else if (emailId === "email_3") {
      // CEO Gift card banner decision
      if (actionText.includes("Hold") || actionText.includes("Freeze")) {
        setBacklogIssues((prev) =>
          prev.map((issue) =>
            issue.key === "AURA-104"
              ? { ...issue, status: "triage", priority: "P2" }
              : issue
          )
        );
      }
    } else if (emailId === "email_4") {
      // Pause marketing blast
      if (actionText.includes("Hold") || actionText.includes("Pause")) {
        setBacklogIssues((prev) =>
          prev.map((issue) =>
            issue.key === "AURA-102"
              ? { ...issue, status: "in_progress", priority: "P0" }
              : issue
          )
        );
      }
    }
  };

  // Convert email to Linear Issue
  const handleConvertEmailToIssue = async (email: EmailItem) => {
    const nextKey = `AURA-${100 + backlogIssues.length + 1}`;
    const newIssue: BacklogIssue = {
      id: `issue_${Date.now()}`,
      key: nextKey,
      title: email.subject,
      description: `Converted from stakeholder email by ${email.sender} (${email.role}):\n\n${email.body.slice(0, 160)}...`,
      priority: email.priority === "urgent" ? "P0" : "P1",
      status: "backlog",
      storyPoints: email.priority === "urgent" ? 5 : 3,
      assignee: {
        name: email.sender,
        avatar: email.sender.split(" ").map((n) => n[0]).join(""),
        role: email.role,
      },
      labels: [...email.labels, "From-Email"],
      originEmailId: email.id,
      isLaunchBlocker: email.priority === "urgent",
    };

    setBacklogIssues((prev) => [newIssue, ...prev]);
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, linkedIssueId: nextKey } : e))
    );

    onAction(`[CONVERT_TO_LINEAR] Converted email "${email.subject}" into Linear issue ${nextKey}`);

    try {
      const res = await submitProductTriageAction(sessionId, "convert_to_issue", {
        key: nextKey,
        emailId: email.id,
      });
      if (res?.success && res.processSignals) {
        setSignals((prev) => ({
          ...prev,
          tradeoffArticulation: res.processSignals.tradeoffArticulation ?? prev.tradeoffArticulation,
        }));
      }
    } catch {}
  };

  // Update existing Backlog Issue
  const handleUpdateIssue = async (issueId: string, updates: Partial<BacklogIssue>) => {
    setBacklogIssues((prev) =>
      prev.map((issue) => (issue.id === issueId ? { ...issue, ...updates } : issue))
    );

    const issue = backlogIssues.find((i) => i.id === issueId);
    if (!issue) return;
    const updated = { ...issue, ...updates };

    if (updates.priority || updates.status) {
      try {
        const res = await submitProductTriageAction(sessionId, "update_issue", {
          issueKey: updated.key,
          priority: updated.priority,
          status: updated.status,
        });

        if (res?.success) {
          if (res.cognitiveLoadScore) setCognitiveLoad(res.cognitiveLoadScore);
          if (res.processSignals) {
            setSignals((prev) => ({
              ...prev,
              edgeCaseConsideration: res.processSignals.edgeCaseConsideration ?? prev.edgeCaseConsideration,
              tradeoffArticulation: res.processSignals.tradeoffArticulation ?? prev.tradeoffArticulation,
              structuredDebugging: res.processSignals.structuredDebugging ?? prev.structuredDebugging,
            }));
          }
        }
      } catch {}
    }
  };

  // Create new Issue from Linear UI
  const handleCreateIssue = async (newIssue: Omit<BacklogIssue, "id">) => {
    const created: BacklogIssue = {
      ...newIssue,
      id: `issue_${Date.now()}`,
    };
    setBacklogIssues((prev) => [created, ...prev]);

    try {
      const res = await submitProductTriageAction(sessionId, "convert_to_issue", {
        key: created.key,
      });
      if (res?.success && res.processSignals) {
        setSignals((prev) => ({
          ...prev,
          tradeoffArticulation: res.processSignals.tradeoffArticulation ?? prev.tradeoffArticulation,
        }));
      }
    } catch {}
  };

  const decisionCount = Object.keys(decisions).length;

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          background: "#0a0c12",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#818cf8",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        [ INITIALIZING_PRODUCT_MANAGEMENT_SUITE // SCOPE_3... ]
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        background: "#0c0e15",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ─── MASTER PRODUCT SUITE TOP NAVIGATION ──────────────── */}
      <div
        style={{
          height: 48,
          background: "#121520",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          zIndex: 100,
        }}
      >
        {/* Left: Scope Branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              background: "rgba(129,140,248,0.2)",
              color: "#a5b4fc",
              padding: "3px 8px",
              borderRadius: 4,
              letterSpacing: "1px",
            }}
          >
            SCOPE 3 // PRODUCT
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
            Black Friday Launch Triage
          </span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            T-minus 6h to Midnight Launch
          </span>
        </div>

        {/* Center: 3 Sub-Environment Tabs */}
        <div
          style={{
            display: "flex",
            background: "rgba(0,0,0,0.4)",
            padding: 3,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            gap: 2,
          }}
        >
          <button
            onClick={() => handleTabSwitch("01_gmail")}
            style={{
              background: activeTab === "01_gmail" ? "#222738" : "transparent",
              color: activeTab === "01_gmail" ? "#fff" : "#94a3b8",
              border: activeTab === "01_gmail" ? "1px solid rgba(129,140,248,0.3)" : "1px solid transparent",
              padding: "5px 14px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            <span>✉️</span>
            <span>01 — Gmail Inbox ({decisionCount}/{emails.length || 5})</span>
          </button>

          <button
            onClick={() => handleTabSwitch("02_linear")}
            style={{
              background: activeTab === "02_linear" ? "#222738" : "transparent",
              color: activeTab === "02_linear" ? "#fff" : "#94a3b8",
              border: activeTab === "02_linear" ? "1px solid rgba(129,140,248,0.3)" : "1px solid transparent",
              padding: "5px 14px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            <span>📋</span>
            <span>02 — Linear Backlog ({backlogIssues.length})</span>
          </button>

          <button
            onClick={() => handleTabSwitch("03_analytics")}
            style={{
              background: activeTab === "03_analytics" ? "#222738" : "transparent",
              color: activeTab === "03_analytics" ? "#fff" : "#94a3b8",
              border: activeTab === "03_analytics" ? "1px solid rgba(129,140,248,0.3)" : "1px solid transparent",
              padding: "5px 14px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
            }}
          >
            <span>📊</span>
            <span>03 — Analytics & Experiment Lab</span>
          </button>
        </div>

        {/* Right: Launch Readiness Status Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              fontSize: 11,
              color: decisionCount >= 3 ? "#4ade80" : "#f59e0b",
              background: decisionCount >= 3 ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
              border: decisionCount >= 3 ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(245,158,11,0.3)",
              padding: "3px 10px",
              borderRadius: 6,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: decisionCount >= 3 ? "#22c55e" : "#f59e0b" }} />
            <span>{decisionCount >= 3 ? "LAUNCH GATES READY" : "TRIAGE PENDING"}</span>
          </div>
        </div>
      </div>

      {/* ─── MAIN WORKSPACE + DOCKED 3D OBSERVER HUD ─────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Active Sub-Environment Mount */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {activeTab === "01_gmail" && (
            <GmailInboxSubEnv
              sessionId={sessionId}
              emails={emails}
              decisions={decisions}
              onSelectOption={handleSelectOption}
              onConvertEmailToIssue={handleConvertEmailToIssue}
              onAction={onAction}
              onComplete={onComplete}
              backlogIssues={backlogIssues}
            />
          )}

          {activeTab === "02_linear" && (
            <LinearBacklogSubEnv
              sessionId={sessionId}
              issues={backlogIssues}
              onUpdateIssue={handleUpdateIssue}
              onCreateIssue={handleCreateIssue}
              onAction={onAction}
            />
          )}

          {activeTab === "03_analytics" && (
            <ProductAnalyticsSubEnv
              sessionId={sessionId}
              funnelSteps={funnelSteps}
              hourlyTelemetry={hourlyTelemetry}
              experiments={experiments}
              onAction={onAction}
              onProposeExperiment={(exp) => setExperiments((prev) => [exp, ...prev])}
            />
          )}
        </div>

        {/* ─── DOCKED 3D OBSERVER AVATAR / COGNITIVE TELEMETRY HUD ─────── */}
        <ProductObserverHUD
          cognitiveLoad={cognitiveLoad}
          observerNotes={observerNotes}
          activePersona={{ name: "Taylor Brooks", role: "CEO" }}
          signals={signals}
        />
      </div>
    </div>
  );
}
