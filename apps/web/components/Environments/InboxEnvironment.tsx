"use client";

import React from "react";
import ProductEnvironment from "./Product/ProductEnvironment";

interface InboxEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any> | void;
  onComplete: () => void;
  demoMode: boolean;
  initialSubEnv?: number;
  onSubEnvChange?: (sub: number) => void;
}

/**
 * Scope 3: Product Management (Black Friday Launch Triage)
 * Integrates 3 realistic sub-environments under `apps/web/components/Environments/Product/`:
 * 1. 01 — Gmail Inbox Management (GmailInboxSubEnv.tsx): Authentic Google Gmail web UI.
 * 2. 02 — Product Backlog & Roadmap (LinearBacklogSubEnv.tsx): Authentic Jira/Linear Kanban boards.
 * 3. 03 — Product Analytics & Experiment Lab (ProductAnalyticsSubEnv.tsx): Mixpanel/Amplitude conversion funnels & A/B testing.
 * Alongside 3D Observer Synapse HUD (ProductObserverHUD.tsx) with live cognitive telemetry.
 */
export default function InboxEnvironment(props: InboxEnvironmentProps) {
  return <ProductEnvironment {...props} />;
}
