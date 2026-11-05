const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding PRAXIS database...\n");

  // ═══ COMPANY 1: TechForge (Engineering + Data) ═══
  const companyUser1 = await prisma.user.upsert({
    where: { email: "admin@techforge.io" },
    update: {},
    create: {
      email: "admin@techforge.io",
      passwordHash: "demo123",
      role: "company",
      fullName: "TechForge Admin",
    },
  });

  const company1 = await prisma.company.upsert({
    where: { userId: companyUser1.id },
    update: {},
    create: {
      userId: companyUser1.id,
      name: "TechForge",
      industry: "Cloud Infrastructure",
      evalWeights: JSON.stringify({ toolUtilization: 20, efficiency: 20, approachQuality: 20 }),
    },
  });

  // Engineering Problem
  await prisma.problem.upsert({
    where: { id: "prob-eng-ratelimiter" },
    update: {},
    create: {
      id: "prob-eng-ratelimiter",
      companyId: company1.id,
      domain: "engineering",
      title: "Distributed Rate Limiter Bug",
      description: "Our API rate limiter is allowing 3x expected traffic during burst periods. The token bucket implementation has a race condition in concurrent requests across distributed Redis nodes. Candidates must identify the non-atomic INCR/EXPIRE pattern and propose a Lua-script-based fix with sliding window logic.",
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
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, this.config.windowMs / 1000);
    }
    return current <= this.config.maxRequests;
    // Missing: Lua scripting for atomicity
    // Missing: Sliding window instead of fixed window
    // Missing: Distributed node awareness
  }
}`,
      agentPrompt: null,
    },
  });

  // Data Problem
  await prisma.problem.upsert({
    where: { id: "prob-data-etl" },
    update: {},
    create: {
      id: "prob-data-etl",
      companyId: company1.id,
      domain: "data",
      title: "ETL Pipeline Latency Crisis",
      description: "Our ETL pipeline latency increased 400% over the past quarter. The board report depends on data that is currently 6 hours stale. Root cause appears to be a schema migration that was not properly backfilled, causing full table scans and a cartesian join.",
      setupCode: `-- etl_pipeline.sql — SLOW QUERY (takes 45 min, target: under 5 min)

-- BUG 1: Full table scan — missing index on created_at
-- BUG 2: Cartesian join — missing join condition on products
-- BUG 3: No partition pruning — scanning all historical data

SELECT
  u.user_id,
  u.email,
  e.event_type,
  e.event_data,
  p.product_name,
  SUM(e.revenue) as total_revenue
FROM users u
  JOIN events e ON u.user_id = e.user_id
  -- Missing: AND e.created_at >= '2024-01-01'
  JOIN products p ON 1=1
  -- BUG: Should be p.product_id = e.product_id
WHERE u.status = 'active'
GROUP BY u.user_id, u.email, e.event_type, e.event_data, p.product_name;

-- TODO: Add materialized view or incremental processing
-- TODO: Add HAVING and ORDER BY for useful output`,
      agentPrompt: null,
    },
  });

  console.log("✅ Company 1: TechForge (Engineering + Data problems)");

  // ═══ COMPANY 2: CloserHQ (Sales + Product) ═══
  const companyUser2 = await prisma.user.upsert({
    where: { email: "admin@closerhq.com" },
    update: {},
    create: {
      email: "admin@closerhq.com",
      passwordHash: "demo123",
      role: "company",
      fullName: "CloserHQ Admin",
    },
  });

  const company2 = await prisma.company.upsert({
    where: { userId: companyUser2.id },
    update: {},
    create: {
      userId: companyUser2.id,
      name: "CloserHQ",
      industry: "SaaS / Revenue Operations",
      evalWeights: JSON.stringify({ communication: 25, ambiguityHandling: 20, creativity: 15 }),
    },
  });

  // Sales Problem
  await prisma.problem.upsert({
    where: { id: "prob-sales-enterprise" },
    update: {},
    create: {
      id: "prob-sales-enterprise",
      companyId: company2.id,
      domain: "sales",
      title: "Enterprise Contract Rescue",
      description: "A $4M ARR enterprise customer is threatening to churn after a 15% price increase. They have been contacted by 2 competitors. The VP of Sales needs this deal saved without setting a dangerous discount precedent. The customer actually wants a dedicated account manager more than a price cut — but they won't say that directly.",
      setupCode: null,
      agentPrompt: "You are in a high-stakes enterprise contract negotiation. The customer (Karen Wu) is frustrated and considering alternatives. You must balance retention with profitability. Find creative solutions beyond pure discounting. The customer's hidden need is a dedicated account manager, not a price cut.",
    },
  });

  // Product Problem
  await prisma.problem.upsert({
    where: { id: "prob-product-pricing" },
    update: {},
    create: {
      id: "prob-product-pricing",
      companyId: company2.id,
      domain: "product",
      title: "Pricing Model Migration",
      description: "The board wants to pivot from per-seat to usage-based pricing. Your largest customer (40% of revenue) is on an all-you-can-eat plan. The CEO wants aggressive migration, Engineering says it needs 6 weeks of technical spike, and the customer demands grandfathering. Find a path forward.",
      setupCode: null,
      agentPrompt: "You are mediating a pricing model pivot between the CEO (Taylor Brooks), Head of Engineering (Morgan Lee), and the biggest customer. The CEO wants speed, Engineering wants time, and the customer wants stability. Find creative compromise.",
    },
  });

  console.log("✅ Company 2: CloserHQ (Sales + Product problems)");

  // ═══ SAMPLE CANDIDATE ═══
  await prisma.user.upsert({
    where: { email: "test-user-id@praxis.dev" },
    update: {},
    create: {
      id: "test-user-id",
      email: "test-user-id@praxis.dev",
      passwordHash: "demo",
      role: "candidate",
      fullName: "Test Candidate",
      cvData: "Senior Software Engineer with 5 years of experience in React, Node.js, and distributed systems.",
    },
  });

  console.log("✅ Sample candidate created");
  console.log("\n🎉 Seed complete! Sample credentials:");
  console.log("   Company 1: admin@techforge.io / demo123 (Engineering + Data)");
  console.log("   Company 2: admin@closerhq.com / demo123 (Sales + Product)");
  console.log("   Candidate: test-user-id@praxis.dev / demo");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
