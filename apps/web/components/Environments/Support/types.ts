export type TicketPriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";
export type TicketStatus = "OPEN" | "INVESTIGATING" | "ESCALATED" | "RESOLVED";
export type CustomerTier = "Enterprise VIP" | "Growth Enterprise" | "Scale" | "Starter";
export type CommunicationTone = "empathetic" | "neutral" | "direct";

export interface SupportTicket {
  id: string;
  customer: string;
  company: string;
  email: string;
  avatar: string;
  tier: CustomerTier;
  arr: string;
  subject: string;
  orderId: string;
  amount: string;
  rawAmount: number;
  priority: TicketPriority;
  slaTotalSeconds: number;
  slaRemainingSeconds: number;
  status: TicketStatus;
  channel: "portal" | "email" | "api" | "phone" | "chat";
  tags: string[];
  message: string;
  orderHistoryCount: number;
  duplicateTxId: string;
  originalTxId: string;
  isBreached: boolean;
  createdAt: string;
}

export interface CustomerOrder {
  id: string;
  date: string;
  items: Array<{ name: string; qty: number; price: string }>;
  total: string;
  status: "PAID (Duplicate Hold)" | "DELIVERED" | "SHIPPED" | "REFUNDED";
  paymentMethod: string;
  duplicateChargeFlag: boolean;
}

export interface GatewayLog {
  txId: string;
  timestamp: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "authorized" | "captured" | "failed" | "reversed";
  idempotencyKey: string | null;
  latencyMs: number;
  authCode: string;
  cardLast4: string;
  clientIp: string;
  userAgent: string;
  endpoint: string;
  rawPayload: Record<string, any>;
  headers: Record<string, string>;
  isDuplicate: boolean;
  collisionNote: string;
}

export interface TimelineEvent {
  time: string;
  source: "client" | "gateway" | "database" | "support" | "sre";
  title: string;
  detail: string;
  status: "ok" | "warning" | "critical" | "info";
}

export interface CustomerAccount {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  tier: CustomerTier;
  contractArr: string;
  ltv: string;
  accountStatus: "Active (Escalation Warning)" | "Active (Normal)" | "At Risk";
  joinedDate: string;
  dedicatedCsm: string;
  slaTier: string;
  orders: CustomerOrder[];
  gatewayLogs: GatewayLog[];
  timeline: TimelineEvent[];
}

export interface MacroTemplate {
  id: string;
  name: string;
  category: "crisis_reassurance" | "sla_containment" | "technical_update" | "anti_pattern";
  recommendedTone: CommunicationTone;
  subject: string;
  body: string;
  isOptimal: boolean;
  warningNote?: string;
}

export interface EscalationPayload {
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  incidentRoom: string;
  incidentTitle: string;
  affectedTicketCount: number;
  affectedEnterpriseCount: number;
  totalExposure: string;
  rootCauseAnalysis: string;
  gatewayEvidence: {
    primaryTx: string;
    duplicateTx: string;
    deltaMs: number;
    missingGuard: string;
  };
  customerReassuranceTone: CommunicationTone;
  macroApplied: string;
  autoReversalBatchDispatched: boolean;
}

export interface SupportQueueStats {
  totalUnresolved: number;
  slaBreachedCount: number;
  slaApproachingCount: number;
  enterpriseAccountsCount: number;
  totalExposureAmount: string;
  queueCleared: boolean;
}
