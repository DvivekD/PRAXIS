export interface KubernetesPod {
  name: string;
  status: "Running" | "CrashLoopBackOff" | "Error" | "ContainerCreating" | "Terminating";
  ready: string;
  restarts: number;
  version: "v2.4.1" | "v2.4.0";
  age: string;
  node: string;
  cpuPercent: number;
  memoryMb: number;
  logs: string[];
}

export interface PromqlQueryResult {
  query: string;
  timestamp: string;
  status: "success" | "error";
  latencyMs: number;
  resultType: "matrix" | "vector";
  result: Array<{
    metric: Record<string, string>;
    values: Array<[number, string | number]>;
  }>;
}

export interface ServiceHealthItem {
  id: string;
  name: string;
  type: string;
  status: "healthy" | "degraded" | "critical";
  errorRate: number;
  p99LatencyMs: number;
  activeReplicas: string;
  dependencies: string[];
  description: string;
}

export interface ActiveAlert {
  id: string;
  severity: "CRITICAL" | "PAGE" | "WARNING";
  title: string;
  description: string;
  firedAt: string;
  source: string;
  acknowledged: boolean;
  runbookUrl?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  type: "deploy" | "alert" | "action" | "status" | "resolve";
  author: string;
}

export interface StatusPageUpdate {
  status: "Investigating" | "Identified" | "Monitoring" | "Resolved";
  title: string;
  message: string;
  affectedServices: string[];
  updatedAt: string;
}

export interface PostmortemReport {
  incidentId: string;
  incidentTitle: string;
  severity: string;
  durationMinutes: number;
  detectedAt: string;
  mitigatedAt: string;
  impactSummary: string;
  rootCause: string;
  recoveryAction: string;
  actionItems: string[];
  timeline: TimelineEvent[];
}

export interface WarRoomChatMessage {
  id: string;
  sender: string;
  role: string;
  text: string;
  time: string;
  type?: "chat" | "alert" | "bot" | "user";
}
