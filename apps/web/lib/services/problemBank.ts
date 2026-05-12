// Problem Bank — Rich, domain-specific scenarios for 4 domains
// Each problem has setup code (for IDE skins) or agent prompts (for roleplay skins)

export interface GeneratedProblem {
  domain: string;
  scenario: string;
  contextVariables: Record<string, string>;
  difficulty: string;
  mutationSeed: number;
  setupCode?: string;
  agentPrompt?: string;
  skinType: "ide" | "roleplay" | "inbox";
  title: string;
}

const ENGINEERING_PROBLEMS = [
  {
    title: "Rate Limiter Bypass",
    baseScenario: "Your company's API rate limiter is allowing 3x expected traffic during burst periods. The token bucket implementation has a critical flaw in how it handles concurrent requests across distributed nodes. Debug and fix the implementation.",
    variables: {
      storageBackend: ["Redis Cluster", "Memcached", "In-memory LRU with gossip sync"],
      algorithm: ["Token Bucket", "Sliding Window Log", "Fixed Window Counter"],
      trafficPattern: ["bursty IoT devices", "sustained enterprise API calls", "spiky with bot traffic"],
    },
    setupCode: `// rate-limiter.ts — BUGGY IMPLEMENTATION
import { Redis } from 'ioredis';

interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
}

export class TokenBucketLimiter {
  private redis: Redis;
  private config: RateLimiterConfig;

  constructor(redis: Redis, config: RateLimiterConfig) {
    this.redis = redis;
    this.config = config;
  }

  async isAllowed(key: string): Promise<boolean> {
    // BUG: Race condition — INCR and EXPIRE are not atomic
    // Multiple concurrent requests can slip through before the window is set
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, this.config.windowMs / 1000);
    }
    return current <= this.config.maxRequests;
  }

  // BUG: No distributed locking — each node maintains independent counts
  // BUG: No burst handling — a client can exhaust the entire window instantly
}

// Expected fix: Use Lua scripting for atomic operations, implement sliding window
`,
  },
  {
    title: "Memory Leak in Data Pipeline",
    baseScenario: "Your data ingestion pipeline is leaking memory, causing OOM kills every 4-6 hours in production. The pipeline processes streaming events and maintains an in-memory buffer for batch writes.",
    variables: {
      dataSource: ["Kafka consumer group", "WebSocket stream", "gRPC bidirectional stream"],
      batchSize: ["1000 events", "10000 events", "100000 events"],
      runtime: ["Node.js 20", "Bun", "Deno"],
    },
    setupCode: `// pipeline.ts — LEAKING IMPLEMENTATION
interface Event {
  id: string;
  payload: Record<string, any>;
  timestamp: number;
}

class DataPipeline {
  private buffer: Event[] = [];
  private listeners: Map<string, Function[]> = new Map();
  private processedIds: Set<string> = new Set(); // BUG: Never cleared

  async processEvent(event: Event) {
    // BUG: processedIds grows unboundedly — classic memory leak
    if (this.processedIds.has(event.id)) return;
    this.processedIds.add(event.id);

    this.buffer.push(event);

    // BUG: Closure captures 'event' reference, preventing GC
    this.on('flush', () => {
      console.log(\`Flushed including event \${event.id}\`);
    });

    if (this.buffer.length >= 1000) {
      await this.flush();
    }
  }

  private on(event: string, callback: Function) {
    // BUG: Listeners are added but never removed
    const list = this.listeners.get(event) || [];
    list.push(callback);
    this.listeners.set(event, list);
  }

  private async flush() {
    const batch = this.buffer.splice(0, this.buffer.length);
    // ... write to database
    this.emit('flush');
  }

  private emit(event: string) {
    const list = this.listeners.get(event) || [];
    list.forEach(fn => fn());
  }
}
`,
  },
];

const SALES_PROBLEMS = [
  {
    title: "Enterprise Contract Negotiation",
    baseScenario: "You're negotiating a $4M ARR enterprise contract renewal. The customer is threatening to churn due to a recent 15% price increase. You need to retain them without setting a dangerous discount precedent.",
    variables: {
      customerType: ["Fortune 500 bank", "Series C startup", "Government agency"],
      painPoint: ["price increase", "missing compliance feature", "poor support SLA"],
      competitorThreat: ["AWS competitor offering 30% less", "Open-source alternative gaining traction", "Industry-specific competitor with better integrations"],
    },
    agentPrompt: "You are in a high-stakes enterprise contract negotiation. The customer is frustrated and considering alternatives. You must balance retention with profitability. Find creative solutions beyond pure discounting.",
  },
  {
    title: "Cold Outbound to CTO",
    baseScenario: "You're doing cold outreach to the CTO of a mid-market SaaS company. They've publicly tweeted frustration about their current DevOps tooling. Your product is a direct solution, but they've never heard of your company.",
    variables: {
      industry: ["FinTech", "HealthTech", "EdTech"],
      companySize: ["200 employees", "500 employees", "1000 employees"],
      currentTool: ["Jenkins", "CircleCI", "GitHub Actions"],
    },
    agentPrompt: "You are cold-calling a busy CTO who has 5 minutes. Your goal is to get a 30-minute demo booked. The CTO is skeptical of vendors but open to solutions for real pain points.",
  },
];

const PRODUCT_PROBLEMS = [
  {
    title: "Pricing Model Pivot",
    baseScenario: "The board wants to pivot from per-seat pricing to usage-based pricing. Your largest customer (40% of revenue) is on an all-you-can-eat plan and will be severely impacted. You need to build a migration strategy that doesn't cause mass churn.",
    variables: {
      currentModel: ["per-seat", "flat-rate", "tiered"],
      targetModel: ["usage-based", "hybrid", "outcome-based"],
      topCustomerReaction: ["threatening to leave", "open to discussion", "demanding grandfathering"],
    },
    agentPrompt: "You are mediating between the CEO (wants aggressive pivot), Head of Engineering (worried about implementation cost), and the biggest customer (worried about pricing shock). Find a path that satisfies all three.",
  },
];

const DATA_PROBLEMS = [
  {
    title: "ETL Pipeline Optimization",
    baseScenario: "Your ETL pipeline's latency has increased 400% over the past quarter. The business team needs fresh data for the quarterly board report by Monday. The root cause appears to be a schema migration that wasn't properly backfilled.",
    variables: {
      dataVolume: ["50M rows/day", "500M rows/day", "5B rows/day"],
      stack: ["Spark on Databricks", "dbt + Snowflake", "Custom Python + PostgreSQL"],
      urgency: ["board report Monday", "regulatory audit next week", "customer data request SLA"],
    },
    setupCode: `-- etl_pipeline.sql — SLOW QUERY
-- This query takes 45 minutes. Target: under 5 minutes.

-- BUG 1: Full table scan due to missing index on created_at
-- BUG 2: Cartesian join from missing join condition
-- BUG 3: No partition pruning — scanning all historical data

SELECT
  u.user_id,
  u.email,
  e.event_type,
  e.event_data,
  p.product_name,
  SUM(e.revenue) as total_revenue
FROM users u
  JOIN events e ON u.user_id = e.user_id  -- Missing: AND e.created_at >= '2024-01-01'
  JOIN products p ON 1=1  -- BUG: Cartesian join, should be p.product_id = e.product_id
WHERE u.status = 'active'
GROUP BY u.user_id, u.email, e.event_type, e.event_data, p.product_name
-- Missing: HAVING and ORDER BY for useful output
-- Missing: Materialized view or incremental processing strategy
;
`,
  },
];

export class ProblemBank {
  private problems: Record<string, any[]>;

  constructor() {
    this.problems = {
      engineering: ENGINEERING_PROBLEMS,
      sales: SALES_PROBLEMS,
      product: PRODUCT_PROBLEMS,
      data: DATA_PROBLEMS,
    };
  }

  public generateMutatedProblem(domain: string, segment: string): GeneratedProblem {
    const domainProblems = this.problems[domain];
    if (!domainProblems || domainProblems.length === 0) {
      return {
        domain,
        title: "General Stakeholder Crisis",
        scenario: "Resolve the ongoing stakeholder crisis using your domain expertise.",
        difficulty: segment,
        contextVariables: {},
        mutationSeed: Math.floor(Math.random() * 9000) + 1000,
        skinType: "roleplay",
      };
    }

    // Pick a random problem from the domain
    const base = domainProblems[Math.floor(Math.random() * domainProblems.length)];

    // Mutate context variables and build dynamic scenario string
    const selectedVars: Record<string, string> = {};
    let dynamicScenario = base.baseScenario;
    if (base.variables) {
      const parts = [];
      for (const [varName, options] of Object.entries(base.variables)) {
        const opts = options as string[];
        const choice = opts[Math.floor(Math.random() * opts.length)];
        selectedVars[varName] = choice;
        parts.push(`${varName}: ${choice}`);
      }
      dynamicScenario += ` [Context variables applied: ${parts.join(", ")}]`;
    }

    // Determine skin type
    let skinType: "ide" | "roleplay" | "inbox" = "roleplay";
    if ("setupCode" in base && base.setupCode) skinType = "ide";
    if (domain === "product") skinType = "inbox";

    return {
      domain,
      title: base.title,
      scenario: dynamicScenario,
      contextVariables: selectedVars,
      difficulty: segment,
      mutationSeed: Math.floor(Math.random() * 9000) + 1000,
      setupCode: "setupCode" in base ? (base as any).setupCode : undefined,
      agentPrompt: "agentPrompt" in base ? (base as any).agentPrompt : undefined,
      skinType,
    };
  }
}

export const problemBank = new ProblemBank();
