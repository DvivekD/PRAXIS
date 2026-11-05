"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  GrafanaMonitoringSubEnv,
  IncidentWarRoomSubEnv,
  KubernetesRollbackSubEnv,
  type KubernetesPod,
  type ActiveAlert,
  type TimelineEvent,
  type WarRoomChatMessage,
  type StatusPageUpdate,
  type PostmortemReport,
} from "./SRE";
import {
  submitSreTelemetryAction,
  executeSreRollbackAction,
} from "../../actions/eval";
import { VoiceSession } from "../Avatar/VoiceSession";

// Dynamically import AvatarScene with SSR disabled for Three.js / Canvas safety
const AvatarScene = dynamic(() => import("../Avatar/AvatarScene"), { ssr: false });

interface WarRoomEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onComplete: () => void;
  demoMode: boolean;
  analyserNode?: AnalyserNode | null;
  initialSubEnv?: number;
  onSubEnvChange?: (sub: number) => void;
}

// Initial 16 Production Pods
const GENERATE_INITIAL_PODS = (): KubernetesPod[] => {
  const podSuffixes = [
    "2kz8q", "4j8lw", "9x1mq", "8p0df",
    "3b7yc", "7k2na", "5t9er", "1m4vp",
    "6h8qz", "0f3jk", "2w9sx", "8d1ce",
    "4n7bv", "9s2pl", "3x8tm", "5z1ky",
  ];

  return podSuffixes.map((suffix, idx) => {
    // 12 pods are crashlooping on v2.4.1, 4 are degraded running (0/1 ready)
    const isCrash = idx < 12;
    const nodeIdx = (idx % 4) + 1;

    return {
      name: `checkout-service-7f6c8d4b8-${suffix}`,
      status: isCrash ? "CrashLoopBackOff" : "Running",
      ready: isCrash ? "0/1" : "0/1",
      restarts: isCrash ? 12 + (idx % 5) : 8,
      version: "v2.4.1",
      age: `${15 + idx}m`,
      node: `node-prod-us-east-1-${nodeIdx}`,
      cpuPercent: isCrash ? 88 + (idx % 8) : 74,
      memoryMb: 820 + idx * 12,
      logs: [
        `[2026-11-05T16:56:40.100Z] INFO  [Server] Initializing checkout-service on port 8080 (container image: aura/checkout:v2.4.1-hotfix)`,
        `[2026-11-05T16:56:41.220Z] INFO  [Database] Connected to order-db-primary pool (active: 18, idle: 2)`,
        `[2026-11-05T16:56:42.890Z] INFO  [Ingress] POST /v1/checkout/complete HTTP/1.1 (concurrency: 4,800 req/s)`,
        `[2026-11-05T16:56:43.012Z] ERROR [CheckoutController] Uncaught TypeError: Cannot read properties of undefined (reading 'token')`,
        `    at PromoService.validateToken (/app/src/promo.ts:42:19)`,
        `    at CheckoutController.processPayment (/app/src/checkout.ts:88:12)`,
        `    at processTicksAndRejections (node:internal/process/task_queues:95:5)`,
        `[2026-11-05T16:56:43.024Z] FATAL Container exited with non-zero status code: 1`,
        `[2026-11-05T16:56:43.050Z] KUBELET Liveness probe failed: HTTP probe /healthz returned statuscode: 500`,
        `[2026-11-05T16:56:43.100Z] KUBELET Back-off 5m0s restarting failed container=checkout-api pod=checkout-service-7f6c8d4b8-${suffix}`,
      ],
    };
  });
};

export default function WarRoomEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
  analyserNode = null,
  initialSubEnv = 2,
  onSubEnvChange,
}: WarRoomEnvironmentProps) {
  const getSubKey = (num: number): "01" | "02" | "03" => {
    if (num === 1) return "01";
    if (num === 3) return "03";
    return "02";
  };

  // Navigation: 3 Sub-Environments
  const [activeSubEnv, setActiveSubEnv] = useState<"01" | "02" | "03">(getSubKey(initialSubEnv || 2));
  const [showObserverHud, setShowObserverHud] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (initialSubEnv) setActiveSubEnv(getSubKey(initialSubEnv));
  }, [initialSubEnv]);

  // Core SRE Metrics
  const [errorRate, setErrorRate] = useState(42.8);
  const [p99Latency, setP99Latency] = useState(2850);
  const [cpuSaturation, setCpuSaturation] = useState(94);
  const [memorySaturation, setMemorySaturation] = useState(88);
  const [conversionRate, setConversionRate] = useState(12.4);

  // Incident Lifecycle States
  const [isRecovering, setIsRecovering] = useState(false);
  const [isWorse, setIsWorse] = useState(false);
  const [isSolved, setIsSolved] = useState(false);

  // 16 Pods
  const [pods, setPods] = useState<KubernetesPod[]>(GENERATE_INITIAL_PODS);

  // Active Alerts Stack
  const [alerts, setAlerts] = useState<ActiveAlert[]>([
    {
      id: "alert-5xx",
      severity: "CRITICAL",
      title: "CheckoutApi5xxRateTooHigh (>40%)",
      description: "HTTP 5xx error rate sustained above 40% threshold for >3 minutes on /v1/checkout/complete.",
      firedAt: "16:57:30 UTC",
      source: "Prometheus Alertmanager",
      acknowledged: false,
    },
    {
      id: "alert-p99",
      severity: "PAGE",
      title: "LatencyP99BreachedSLA (2850ms > 200ms)",
      description: "p99 request duration has breached the 200ms Black Friday critical SLO threshold.",
      firedAt: "16:57:45 UTC",
      source: "Datadog APM",
      acknowledged: false,
    },
    {
      id: "alert-crashloop",
      severity: "WARNING",
      title: "PodCrashLoopBackOff (12/16 pods failing)",
      description: "12 container replicas exited with code 1 in deployment/checkout-service.",
      firedAt: "16:58:00 UTC",
      source: "Kubernetes Kubelet",
      acknowledged: false,
    },
    {
      id: "alert-dropoff",
      severity: "WARNING",
      title: "CustomerCartAbandonmentSpike (+310%)",
      description: "Funnel drop-off spiked immediately following release tag v2.4.1-hotfix.",
      firedAt: "16:58:15 UTC",
      source: "Datadog Funnel Analytics",
      acknowledged: true,
    },
  ]);

  // Timeline Stream
  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    {
      id: "ev-1",
      timestamp: "16:55:00 UTC",
      title: "CI/CD Deploy Tag v2.4.1-hotfix",
      detail: "Automated pipeline deployed container image aura/checkout:v2.4.1-hotfix to production cluster.",
      type: "deploy",
      author: "GitHub Actions Bot",
    },
    {
      id: "ev-2",
      timestamp: "16:56:12 UTC",
      title: "First 5xx Anomaly Detected",
      detail: "Ingress proxy recorded sudden 500 responses on checkout completion endpoint.",
      type: "alert",
      author: "Ingress Gateway",
    },
    {
      id: "ev-3",
      timestamp: "16:57:30 UTC",
      title: "PagerDuty P1 Sev-1 Escalation",
      detail: "Error rate surged past 40%. PagerDuty paged Lead SRE Alex Chen and on-call team.",
      type: "alert",
      author: "PagerDuty Dispatch",
    },
    {
      id: "ev-4",
      timestamp: "16:58:00 UTC",
      title: "Incident Command War Room Opened",
      detail: "Incident Commander (You) assumed incident lead and mobilized cross-functional triage.",
      type: "action",
      author: "Incident Commander",
    },
  ]);

  // Team Chat Messages
  const [chatMessages, setChatMessages] = useState<WarRoomChatMessage[]>([
    {
      id: "m-1",
      sender: "Alex Chen",
      role: "Lead SRE",
      text: "Error rate surged past 40% immediately following deploy v2.4.1-hotfix. Conversion dropped 70 points. What is our rollback strategy?",
      time: "16:58:10",
      type: "chat",
    },
    {
      id: "m-2",
      sender: "Datadog Bot",
      role: "System Monitor",
      text: "🚨 P1 ALERT: checkout-service.errors > 40% for 3 consecutive minutes across 16 pods.",
      time: "16:58:30",
      type: "alert",
    },
  ]);

  // Public Status Page State
  const [statusPage, setStatusPage] = useState<StatusPageUpdate>({
    status: "Investigating",
    title: "Investigating Checkout Latency & Error Anomalies",
    message: "We are actively investigating elevated failure rates affecting order completion during peak Black Friday traffic.",
    affectedServices: ["Checkout API", "Payment Processing"],
    updatedAt: "16:58:40 UTC",
  });

  // Dynamic Telemetry Recovery Tick (MaxSurge 25% rolling replacement: 4 pods per batch)
  useEffect(() => {
    if (!isRecovering) return;

    const interval = setInterval(() => {
      // Progressively replace 4 pods per tick (MaxSurge 25%)
      setPods((prev) => {
        let converted = 0;
        return prev.map((pod, idx) => {
          if (pod.version === "v2.4.0" && pod.status === "Running") return pod;
          if (converted < 4) {
            converted++;
            return {
              ...pod,
              status: "Running",
              ready: "1/1",
              version: "v2.4.0",
              cpuPercent: 20 + (idx % 6),
              memoryMb: 420 + idx * 8,
              logs: [
                `[2026-11-05T17:00:08.000Z] INFO [Rollback] Pulled verified container image aura/checkout:v2.4.0`,
                `[2026-11-05T17:00:09.100Z] INFO [Healthz] Readiness probe passed (status: 200 OK)`,
                `[2026-11-05T17:00:10.000Z] INFO [Traffic] Container serving production traffic (error rate: 0.08%)`,
              ],
            };
          }
          return pod;
        });
      });

      setErrorRate((prev) => {
        const step = demoMode ? 10.6 : 8.5;
        const next = Math.max(0.08, prev - step);
        return parseFloat(next.toFixed(2));
      });

      setP99Latency((prev) => {
        const step = demoMode ? 700 : 560;
        const next = Math.max(42, prev - step);
        return Math.round(next);
      });

      setCpuSaturation((prev) => {
        const step = demoMode ? 18 : 14;
        const next = Math.max(22, prev - step);
        return Math.round(next);
      });

      setMemorySaturation((prev) => {
        const step = demoMode ? 15 : 12;
        const next = Math.max(28, prev - step);
        return Math.round(next);
      });

      setConversionRate((prev) => {
        const step = demoMode ? 19.0 : 15.2;
        const next = Math.min(88.6, prev + step);
        return parseFloat(next.toFixed(2));
      });
    }, demoMode ? 450 : 650);

    return () => clearInterval(interval);
  }, [isRecovering, demoMode]);

  // Victory Condition Handler
  useEffect(() => {
    if (isRecovering && errorRate <= 0.5 && !isSolved) {
      setIsSolved(true);

      // Add recovery to timeline
      setTimeline((prev) => [
        ...prev,
        {
          id: `ev-${Date.now()}`,
          timestamp: "17:01:45 UTC",
          title: "SLA Restored (Error Rate < 0.1%)",
          detail: "All 16 pods transitioned to v2.4.0. Ingress error rate normalized to 0.08%, p99 latency to 42ms.",
          type: "resolve",
          author: "Incident Commander",
        },
      ]);

      // Add Alex confirmation to chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          sender: "Alex Chen",
          role: "Lead SRE",
          text: "🎉 All 16 pods are healthy and serving peak traffic on v2.4.0. Error rate is 0.08%, p99 latency is 42ms. Exceptional work, Incident Commander! You can now generate the postmortem report.",
          time: "17:01:48",
          type: "chat",
        },
      ]);

      // Resolve alerts
      setAlerts((prev) =>
        prev.map((a) => ({
          ...a,
          acknowledged: true,
          description: `[RESOLVED] ${a.description}`,
        }))
      );

      // Auto update status page
      setStatusPage({
        status: "Resolved",
        title: "All Services Operating Normally",
        message: "The issue affecting Black Friday checkout has been fully mitigated. All transaction funnels are nominal.",
        affectedServices: ["Checkout API", "Payment Processing"],
        updatedAt: "17:01:50 UTC",
      });

      // Dispatch victory telemetry
      onAction(
        "[VICTORY] SRE candidate successfully rolled back v2.4.1-hotfix. Production error rate normalized to 0.08% across 16 pods."
      );
    }
  }, [errorRate, isRecovering, isSolved, onAction]);

  // Execute 1-Click Rollback Handler
  const handleRollback = useCallback(async () => {
    if (isRecovering || isSolved) return;

    setIsRecovering(true);
    setIsWorse(false);

    // Timeline event
    setTimeline((prev) => [
      ...prev,
      {
        id: `ev-${Date.now()}`,
        timestamp: "17:00:02 UTC",
        title: "Zero-Downtime Rollback Initiated",
        detail: "Executed kubectl rollout undo deployment/checkout-service --to-revision=v2.4.0 (MaxSurge=25%).",
        type: "action",
        author: "Incident Commander",
      },
    ]);

    // Chat updates
    setChatMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}-1`,
        sender: "You (Incident Commander)",
        role: "Commander",
        text: "Executing immediate zero-downtime rollback to stable tag v2.4.0. Halting all deploys.",
        time: "17:00:02",
        type: "user",
      },
      {
        id: `m-${Date.now()}-2`,
        sender: "Alex Chen",
        role: "Lead SRE",
        text: "Rollback container image pulled. Rolling replacement across all 16 pods active. Watch the Grafana graphs recover!",
        time: "17:00:08",
        type: "chat",
      },
    ]);

    // Dispatch to eval server action
    try {
      await executeSreRollbackAction(sessionId, "v2.4.0");
    } catch (e) {
      console.warn("Rollback server action dispatch notice:", e);
    }

    onAction("[SRE_ACTION] Executed emergency zero-downtime rollback to v2.4.0");
  }, [isRecovering, isSolved, sessionId, onAction]);

  // Wrong Mitigation Handler
  const handleWrongAction = useCallback(
    async (actionName: string) => {
      setIsWorse(true);
      setErrorRate((prev) => Math.min(82, prev + 12));
      setP99Latency((prev) => Math.min(4500, prev + 600));

      setChatMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}-1`,
          sender: "You (Incident Commander)",
          role: "Commander",
          text: `Attempting mitigation: ${actionName}`,
          time: "17:00:15",
          type: "user",
        },
        {
          id: `m-${Date.now()}-2`,
          sender: "Alex Chen",
          role: "Lead SRE",
          text: `That didn't fix it — the bad code is baked into the v2.4.1 container image! We must execute a clean rollback to v2.4.0.`,
          time: "17:00:22",
          type: "chat",
        },
      ]);

      try {
        await submitSreTelemetryAction(sessionId, {
          actionType: "ineffective_action",
          metadata: { actionName },
        });
      } catch {}

      onAction(`[SRE_ACTION] Ineffective mitigation attempted: ${actionName}`);
    },
    [sessionId, onAction]
  );

  // Send War Room Chat Message Handler
  const handleSendMessage = useCallback(
    async (messageText: string) => {
      const nowTime = new Date().toLocaleTimeString();

      setChatMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          sender: "You (Incident Commander)",
          role: "Commander",
          text: messageText,
          time: nowTime,
          type: "user",
        },
      ]);

      // Call eval action
      await onAction(`[WAR_ROOM_CHAT] ${messageText}`);

      try {
        await submitSreTelemetryAction(sessionId, {
          actionType: "team_chat",
          metadata: { messageText },
        });
      } catch {}

      // Synthetic persona response from Alex Chen if message is query
      setTimeout(() => {
        const lower = messageText.toLowerCase();
        let reply = "Understood, Incident Commander. Ready to execute your directive.";

        if (lower.includes("stack trace") || lower.includes("error")) {
          reply = "The stack trace shows: 'TypeError: Cannot read properties of undefined (reading token)' in checkout.ts line 88. Rollback to v2.4.0 will eliminate this bug immediately.";
        } else if (lower.includes("diff") || lower.includes("change") || lower.includes("v2.4.1")) {
          reply = "v2.4.1-hotfix added dynamic promo token validation without a null guard. v2.4.0 did not have this code and is verified 100% stable.";
        } else if (lower.includes("rollback") || lower.includes("undo")) {
          reply = "Executing rollback to v2.4.0 now! Kubernetes is provisioning canary replicas via MaxSurge.";
          handleRollback();
          return;
        } else if (lower.includes("impact") || lower.includes("drop") || lower.includes("revenue")) {
          reply = "Customer drop-off is currently 70% above baseline. Every minute lost costs ~$12,000 in Black Friday revenue.";
        } else if (lower.includes("status") || lower.includes("statuspage")) {
          reply = "The public status page has been broadcast. Keep customers updated as rollout progresses.";
        } else if (lower.includes("postmortem") || lower.includes("rca")) {
          reply = "Once we stabilize 16/16 pods on v2.4.0, click 'Generate RCA' in the top bar to finalize the postmortem.";
        } else if (lower.includes("canary") || lower.includes("pods") || lower.includes("kubernetes") || lower.includes("k8s")) {
          reply = "We are using MaxSurge=25% rolling replacement to maintain zero dropped transactions during image swap.";
        }

        setChatMessages((prev) => [
          ...prev,
          {
            id: `m-${Date.now()}`,
            sender: "Alex Chen",
            role: "Lead SRE",
            text: reply,
            time: new Date().toLocaleTimeString(),
            type: "chat",
          },
        ]);
      }, 700);
    },
    [onAction, handleRollback, sessionId]
  );

  // Acknowledge Alert Handler
  const handleAcknowledgeAlert = useCallback(
    async (alertId: string) => {
      setAlerts((prev) =>
        prev.map((al) => (al.id === alertId ? { ...al, acknowledged: true } : al))
      );

      try {
        await submitSreTelemetryAction(sessionId, {
          actionType: "alert_ack",
          alertId,
        });
      } catch {}

      onAction(`[ALERT_ACK] Acknowledged alert ${alertId}`);
    },
    [sessionId, onAction]
  );

  // Update Public Status Page Handler
  const handleUpdateStatusPage = useCallback(
    async (update: StatusPageUpdate) => {
      setStatusPage(update);

      setTimeline((prev) => [
        ...prev,
        {
          id: `ev-${Date.now()}`,
          timestamp: update.updatedAt,
          title: `Status Page: ${update.status}`,
          detail: `Updated status.auracommerce.com: "${update.title}"`,
          type: "status",
          author: "Incident Commander",
        },
      ]);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          sender: "Statuspage Bot",
          role: "Integrations",
          text: `✓ Public status page updated to '${update.status}': "${update.title}". Customers notified.`,
          time: update.updatedAt,
          type: "bot",
        },
      ]);

      try {
        await submitSreTelemetryAction(sessionId, {
          actionType: "status_page_update",
          statusPage: {
            status: update.status,
            title: update.title,
            message: update.message,
          },
        });
      } catch {}

      onAction(`[STATUS_PAGE] Updated status page: ${update.status} - ${update.title}`);
    },
    [sessionId, onAction]
  );

  // Submit Postmortem Handler
  const handleSubmitPostmortem = useCallback(
    async (report: PostmortemReport) => {
      try {
        await submitSreTelemetryAction(sessionId, {
          actionType: "postmortem_submit",
          postmortem: report,
        });
      } catch {}

      onAction(`[POSTMORTEM_SUBMIT] Submitted RCA for ${report.incidentId}: ${report.rootCause.slice(0, 80)}...`);
    },
    [sessionId, onAction]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        background: "#05070a",
        color: "#fff",
        fontFamily: "'JetBrains Mono', monospace",
        overflow: "hidden",
      }}
    >
      {/* ─── SCOPE 5 TOP SUB-ENVIRONMENT NAV BAR ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 18px",
          background: "#080b12",
          borderBottom: "1px solid #1e293b",
          zIndex: 30,
        }}
      >
        {/* Left: Domain Indicator & 3 Sub-Environment Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 900 }}>SCOPE 5 //</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>SRE (SEV-1 OUTAGE)</span>
          </div>

          <div style={{ display: "flex", background: "#05070c", border: "1px solid #1e293b", borderRadius: 5, padding: 2 }}>
            {/* Tab 01: Observability */}
            <button
              onClick={() => {
                setActiveSubEnv("01");
                if (onSubEnvChange) onSubEnvChange(1);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 4,
                border: "none",
                background: activeSubEnv === "01" ? "#1e293b" : "transparent",
                color: activeSubEnv === "01" ? "#f97316" : "#94a3b8",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span>📊</span>
              <span>01 — Observability (Grafana)</span>
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: errorRate > 2 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)",
                  color: errorRate > 2 ? "#ef4444" : "#22c55e",
                  fontWeight: 900,
                }}
              >
                {errorRate.toFixed(1)}%
              </span>
            </button>

            {/* Tab 02: Incident War Room */}
            <button
              onClick={() => {
                setActiveSubEnv("02");
                if (onSubEnvChange) onSubEnvChange(2);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 4,
                border: "none",
                background: activeSubEnv === "02" ? "#1e293b" : "transparent",
                color: activeSubEnv === "02" ? "#ef4444" : "#94a3b8",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span>🚨</span>
              <span>02 — Incident War Room</span>
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: isSolved ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                  color: isSolved ? "#22c55e" : "#ef4444",
                  fontWeight: 900,
                }}
              >
                {isSolved ? "OK" : `${alerts.filter((a) => !a.acknowledged).length} ALERTS`}
              </span>
            </button>

            {/* Tab 03: Deployment & Rollback Console */}
            <button
              onClick={() => {
                setActiveSubEnv("03");
                if (onSubEnvChange) onSubEnvChange(3);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 4,
                border: "none",
                background: activeSubEnv === "03" ? "#1e293b" : "transparent",
                color: activeSubEnv === "03" ? "#38bdf8" : "#94a3b8",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span>☸️</span>
              <span>03 — Kubernetes Rollback</span>
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: isSolved ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                  color: isSolved ? "#22c55e" : "#ef4444",
                  fontWeight: 900,
                }}
              >
                {isSolved ? "16/16 OK" : "12 CRASH"}
              </span>
            </button>
          </div>
        </div>

        {/* Right: 3D Observer HUD Toggle & Quick Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#94a3b8" }}>
            <span>Target SLA:</span>
            <span style={{ color: "#22c55e", fontWeight: 700 }}>99.99%</span>
          </div>

          {/* Toggle 3D Observer HUD */}
          <button
            onClick={() => setShowObserverHud(!showObserverHud)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              background: showObserverHud ? "rgba(56,189,248,0.15)" : "#182030",
              border: showObserverHud ? "1px solid #38bdf8" : "1px solid #334155",
              color: showObserverHud ? "#38bdf8" : "#94a3b8",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <span>👁️</span>
            <span>{showObserverHud ? "Observer 3D [ON]" : "Observer 3D [OFF]"}</span>
          </button>
        </div>
      </div>

      {/* ─── WORKSPACE BODY (SUB-ENVIRONMENT + DOCKED OBSERVER 3D HUD) ─── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Main Sub-Environment Viewport */}
        <div style={{ flex: 1, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {activeSubEnv === "01" && (
            <GrafanaMonitoringSubEnv
              errorRate={errorRate}
              p99Latency={p99Latency}
              cpuSaturation={cpuSaturation}
              memorySaturation={memorySaturation}
              isRecovering={isRecovering}
              pods={pods}
              onAction={onAction}
              onNavigateToRollback={() => setActiveSubEnv("03")}
              onNavigateToWarRoom={() => setActiveSubEnv("02")}
            />
          )}

          {activeSubEnv === "02" && (
            <IncidentWarRoomSubEnv
              errorRate={errorRate}
              isRecovering={isRecovering}
              isSolved={isSolved}
              chatMessages={chatMessages}
              timeline={timeline}
              alerts={alerts}
              statusPage={statusPage}
              onSendMessage={handleSendMessage}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onUpdateStatusPage={handleUpdateStatusPage}
              onSubmitPostmortem={handleSubmitPostmortem}
              onNavigateToRollback={() => setActiveSubEnv("03")}
              onNavigateToMonitoring={() => setActiveSubEnv("01")}
            />
          )}

          {activeSubEnv === "03" && (
            <KubernetesRollbackSubEnv
              pods={pods}
              isRecovering={isRecovering}
              isSolved={isSolved}
              errorRate={errorRate}
              onExecuteRollback={handleRollback}
              onWrongAction={handleWrongAction}
              onAction={onAction}
              onNavigateToMonitoring={() => setActiveSubEnv("01")}
              onNavigateToWarRoom={() => setActiveSubEnv("02")}
            />
          )}
        </div>

        {/* ─── DOCKED / COLLAPSIBLE 3D OBSERVER AVATAR HUD PANEL ─── */}
        <AnimatePresence>
          {showObserverHud && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                height: "100%",
                background: "#04060b",
                borderLeft: "1px solid #1e293b",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {/* HUD Header */}
              <div
                style={{
                  padding: "10px 14px",
                  background: "#080c16",
                  borderBottom: "1px solid #1e293b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#f8fafc" }}>
                    3D OBSERVER NODE
                  </span>
                </div>
                <button
                  onClick={() => setShowObserverHud(false)}
                  style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12 }}
                >
                  ✕
                </button>
              </div>

              {/* 3D WebGL Avatar Scene Container */}
              <div style={{ height: 260, position: "relative", background: "#020202" }}>
                <AvatarScene
                  analyserNode={analyserNode}
                  domain="sre"
                  onInteract={(act) => onAction(act)}
                />

                {/* Maximize to full-screen button */}
                <button
                  onClick={() => setIsFullScreen(true)}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "rgba(10, 15, 30, 0.8)",
                    border: "1px solid #38bdf8",
                    color: "#7dd3fc",
                    padding: "3px 8px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    backdropFilter: "blur(6px)",
                    zIndex: 10,
                  }}
                  title="Maximize 3D Observer to Full Screen with Live Voice"
                >
                  <span>⛶</span>
                  <span>MAXIMIZE FULL SCREEN</span>
                </button>
              </div>

              {/* Real-time Telemetry & Cognitive Heuristics Feed */}
              <div style={{ flex: 1, padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Cognitive Load Metric */}
                <div style={{ background: "#090d18", border: "1px solid #1e293b", borderRadius: 4, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>
                    <span>COGNITIVE STRESS INDEX</span>
                    <span style={{ color: isSolved ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                      {isSolved ? "22 / 100 (NORMAL)" : "76 / 100 (HIGH)"}
                    </span>
                  </div>
                  <div style={{ height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
                    <motion.div
                      animate={{ width: isSolved ? "22%" : "76%" }}
                      transition={{ duration: 0.5 }}
                      style={{ height: "100%", background: isSolved ? "#22c55e" : "#ef4444" }}
                    />
                  </div>
                </div>

                {/* Behavioral Observer Telemetry Notes */}
                <div style={{ background: "#090d18", border: "1px solid #1e293b", borderRadius: 4, padding: 10 }}>
                  <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 800, marginBottom: 6 }}>
                    OBSERVER SIGNALS:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10, color: "#94a3b8" }}>
                    <div>
                      • Structured Debugging:{" "}
                      <strong style={{ color: "#22c55e" }}>DETECTED</strong>
                    </div>
                    <div>
                      • Investigation Focus:{" "}
                      <strong style={{ color: "#f59e0b" }}>checkout.ts concurrency</strong>
                    </div>
                    <div>
                      • Mitigation Confidence:{" "}
                      <strong style={{ color: isSolved ? "#22c55e" : "#38bdf8" }}>
                        {isSolved ? "98% (High)" : "Evaluating..."}
                      </strong>
                    </div>
                    <div>
                      • Target Revision:{" "}
                      <strong style={{ color: "#a855f7" }}>v2.4.0 (Stable)</strong>
                    </div>
                  </div>
                </div>

                {/* Live System Diagnostics */}
                <div style={{ background: "#090d18", border: "1px solid #1e293b", borderRadius: 4, padding: 10 }}>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>STREAM STATUS:</div>
                  <div style={{ fontSize: 10, color: "#cbd5e1", lineHeight: 1.5 }}>
                    WebSocket channel active. Prometheus scraping 5s intervals.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full-Screen Immersive 3D Observer Live Overlay (Matching /test-avatar) */}
      {isFullScreen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            background: "#04060b",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top Bar with Status and Minimize Button */}
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 24,
              right: 24,
              zIndex: 100,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(5, 8, 16, 0.85)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                padding: "8px 18px",
                borderRadius: 24,
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                boxShadow: "0 0 15px rgba(56, 189, 248, 0.2)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#38bdf8",
                  boxShadow: "0 0 12px #38bdf8",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8", letterSpacing: "1px" }}>
                3D OBSERVER LIVE // FULL SCREEN
              </span>
            </div>

            <button
              onClick={() => setIsFullScreen(false)}
              style={{
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#f8fafc",
                padding: "8px 18px",
                borderRadius: 24,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
                backdropFilter: "blur(12px)",
                pointerEvents: "auto",
                boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
              }}
            >
              <span style={{ color: "#ef4444", fontWeight: 900 }}>✕</span>
              <span>MINIMIZE TO WORKSPACE</span>
            </button>
          </div>

          {/* Full Screen Live Voice Session (Identical to /test-avatar) */}
          <div style={{ flex: 1, width: "100%", height: "100%", position: "relative" }}>
            <VoiceSession
              domain="sre"
              problemTitle="Scope 5 SRE: Aura Commerce Black Friday Outage War Room"
              scenario="Sev-1 Outage: 42.8% error rate on checkout. Diagnose 504 timeouts, coordinate cross-functional mitigation, rollback flawed commit."
              autoConnect={true}
              initialEngine="live"
              showAvatar={true}
              compact={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
