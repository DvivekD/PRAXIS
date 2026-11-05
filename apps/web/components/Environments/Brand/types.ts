export type SocialPlatform = "twitter" | "instagram" | "threads" | "reddit";

export interface BrandMention {
  id: string;
  platform: SocialPlatform;
  author: string;
  handle: string;
  avatar: string;
  verified: boolean;
  followerCount: string;
  text: string;
  timestamp: string;
  likes: string | number;
  retweets?: string | number;
  sentiment: "hostile" | "negative" | "neutral" | "positive";
  reachImpact: "CRITICAL" | "HIGH" | "MODERATE";
  flagged?: boolean;
  quoteTweetOf?: string;
  postUrl?: string;
}

export interface KeywordSpike {
  keyword: string;
  count: string;
  change: string;
  isSpike: boolean;
  severity: "critical" | "high" | "moderate";
}

export interface PressInquiry {
  id: string;
  outlet: string;
  journalist: string;
  email: string;
  outletTier: string;
  deadline: string;
  deadlineMinutes: number;
  urgency: "CRITICAL" | "HIGH" | "URGENT";
  queryText: string;
  status: "pending" | "responded" | "declined";
  responseDraft?: string;
}

export interface BrandToneReport {
  accountability: number;
  defensiveness: "Low" | "Medium" | "High" | "Extreme";
  clarity: number;
  empathy: number;
  isOptimal: boolean;
  critiqueNotes: string[];
  strengths: string[];
  warnings: string[];
}

export interface PublishedStatement {
  id: string;
  code: string;
  title: string;
  text: string;
  publishedAt: string;
  isOptimal: boolean;
  toneReport: BrandToneReport;
}

export interface BrandCrisisActionPayload {
  actionType: "ANALYZE_TONE" | "PUBLISH_STATEMENT" | "RESPOND_PRESS" | "GENERATE_PR_REPORT" | "FLAG_MENTION";
  statementText?: string;
  toneMetrics?: {
    accountability: number;
    defensiveness: "Low" | "Medium" | "High" | "Extreme";
    clarity: number;
    isOptimal?: boolean;
  };
  sentimentScore?: number;
  pressInquiryId?: string;
  outlet?: string;
  customNotes?: string;
  telemetry?: Record<string, unknown>;
}

export interface BrandCrisisSubEnvProps {
  sessionId: string;
  sentiment: number;
  setSentiment: React.Dispatch<React.SetStateAction<number>>;
  mentions: BrandMention[];
  setMentions: React.Dispatch<React.SetStateAction<BrandMention[]>>;
  pressInquiries: PressInquiry[];
  setPressInquiries: React.Dispatch<React.SetStateAction<PressInquiry[]>>;
  publishedStatement: PublishedStatement | null;
  setPublishedStatement: React.Dispatch<React.SetStateAction<PublishedStatement | null>>;
  onAction: (actionText: string, metadata?: Record<string, unknown>) => Promise<unknown>;
  onComplete: () => void;
  demoMode: boolean;
  navigateToSubEnv?: (subEnv: "listening" | "studio" | "command") => void;
}
