export interface EmailOption {
  label: string;
  action: string;
  isOptimal?: boolean;
}

export interface EmailItem {
  id: string;
  sender: string;
  email: string;
  role: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  unread: boolean;
  starred: boolean;
  priority: "urgent" | "normal";
  labels: string[];
  options: EmailOption[];
  linkedIssueId?: string;
}

export type IssuePriority = "P0" | "P1" | "P2" | "P3";
export type IssueStatus = "triage" | "backlog" | "in_progress" | "ready_for_launch" | "done";

export interface BacklogIssue {
  id: string;
  key: string;
  title: string;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  storyPoints: number;
  assignee: {
    name: string;
    avatar: string;
    role: string;
  };
  labels: string[];
  originEmailId?: string;
  isLaunchBlocker?: boolean;
}

export interface FunnelStep {
  step: number;
  name: string;
  subtitle: string;
  users: number;
  conversionRate: number;
  dropOffRate: number;
  benchmarkRate: number;
  isAnomaly?: boolean;
  anomalyNote?: string;
}

export interface MetricTimelinePoint {
  time: string;
  totalRequests: number;
  doubleChargeErrors: number;
  successfulOrders: number;
  conversionRate: number;
}

export interface ExperimentConfig {
  id: string;
  name: string;
  hypothesis: string;
  status: "draft" | "running" | "concluded";
  controlVariant: string;
  testVariant: string;
  trafficSplit: number; // e.g. 50%
  primaryMetric: string;
  sampleSize: number;
  confidence: number;
  projectedLift: number;
  winner?: string;
}

export interface LaunchProtocol {
  deployFreeze: boolean;
  sev1Escalated: boolean;
  marketingBlastPaused: boolean;
  merchantReassured: boolean;
  executiveSummary: string;
  timestamp: number;
  decisions: Record<string, string>;
}
