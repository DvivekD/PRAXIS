// Problem Bank — Domain-specific scenarios for 7 domains set in Aura Commerce (Black Friday)

export interface GeneratedProblem {
  domain: string;
  scenario: string;
  contextVariables: Record<string, string>;
  difficulty: string;
  mutationSeed: number;
  setupCode?: string;
  agentPrompt?: string;
  skinType: "ide" | "roleplay" | "inbox" | "call" | "warroom" | "helpdesk" | "social";
  title: string;
}

const ENGINEERING_PROBLEMS = [
  {
    title: "Checkout Double-Charge Race Condition",
    baseScenario: "Black Friday checkout is double-charging shoppers when users rapidly double-click 'Complete Order'. Concurrency guard in checkout.ts is evaluated after the external payment gateway charge. Fix the race condition so checkout execution is atomic and strictly idempotent.",
    variables: {
      concurrencyEngine: ["In-memory atomic flag", "Redis distributed mutex", "Postgres row lock"],
      paymentGateway: ["Stripe Elements", "Adyen Direct", "Aura Internal Gateway"],
    },
    setupCode: `// /var/www/aura-commerce/src/checkout.ts
import { paymentGateway } from './services/gateway';
import { orderStore } from './db/orders';

export async function processPayment(orderId: string, amount: number): Promise<boolean> {
  const order = await orderStore.find(orderId);
  if (!order) throw new Error("Order not found");

  // BUG: Payment gateway charged BEFORE idempotency flag is verified & committed
  const chargeSuccess = await paymentGateway.charge(order.customerId, amount);

  if (order.status === "PAID") {
    console.warn("[CHECKOUT] Duplicate execution detected after charge!");
    return false;
  }

  await orderStore.update(orderId, { status: "PAID", chargedAt: Date.now() });
  return chargeSuccess;
}`,
  },
];

const SALES_PROBLEMS = [
  {
    title: "Nordic Goods Enterprise Contract Renewal",
    baseScenario: "Sam Jenkins (VP Retail at Nordic Goods) is threatening to churn their $250k enterprise contract ahead of Black Friday due to reports of checkout glitches. Uncover their underlying reliability fears, present Aura's 99.99% core SLA & atomic rollback containment, and book a technical lock-in meeting.",
    variables: {
      contractValue: ["$250,000 ARR", "$400,000 ARR", "$180,000 ARR"],
      riskFactor: ["Black Friday flash sale downtime", "Data residency compliance", "Multi-region failover"],
    },
    agentPrompt: "You are Sam Jenkins, VP Retail at Nordic Goods. You have a $250k trial contract with Aura Commerce. You saw reports of checkout glitches and are hesitant to renew right before Black Friday. If the candidate asks probing questions about your fears and presents atomic SLA guarantees, agree to book a 15-minute technical lock-in meeting tomorrow.",
  },
];

const PRODUCT_PROBLEMS = [
  {
    title: "Black Friday Triage & Stakeholder Prioritization",
    baseScenario: "Conflicting urgent requests land in your executive inbox at T-minus 6 hours to Black Friday. Prioritize resolving the customer-facing payment bug, gently push back on the CEO's last-minute gift cards, pause the promotional email blast, and publish the incident protocol.",
    variables: {
      stakeholderPressure: ["Board deadline", "Marketing campaign countdown", "VIP merchant churn threat"],
    },
    agentPrompt: "You are Taylor Brooks, CEO of Aura Commerce. You want to push the gift card feature to bump AOV by 15%, but engineering is grappling with an active checkout bug. Value candidate who prioritizes stability and communicates clearly.",
  },
];

const DATA_PROBLEMS = [
  {
    title: "Black Friday DAU Metric Anomaly",
    baseScenario: "The analytics dashboard reports a 40% surge in Daily Active Shoppers ahead of Black Friday. However, a cart-to-transaction JOIN without DISTINCT is multiplying visits. Correct the SQL query to calculate unique active shoppers.",
    variables: {
      varianceDelta: ["+40% spike", "+65% spike", "+32% spike"],
    },
    setupCode: `-- Aura Commerce — Daily Active Shopper Metric
SELECT 
  DATE(t.created_at) AS report_date,
  COUNT(u.id) AS active_shoppers
FROM users u
JOIN transactions t ON u.id = t.user_id
WHERE t.created_at >= '2026-11-01'
GROUP BY DATE(t.created_at)
ORDER BY report_date ASC;`,
  },
];

const SRE_PROBLEMS = [
  {
    title: "Sev-1 Checkout API Production Outage",
    baseScenario: "Production alert: 5xx error rate skyrocketed to 42% following deployment v2.4.1-hotfix. Checkout conversion has plummeted to 12%. Analyze system telemetry, update the public status page, and execute a zero-downtime rollback to v2.4.0.",
    variables: {
      trafficVolume: ["45,000 req/sec", "80,000 req/sec"],
    },
    agentPrompt: "You are Alex Chen, Lead SRE at Aura Commerce. Production checkout is failing after v2.4.1-hotfix. Assist the incident commander in executing a clean rollback to v2.4.0.",
  },
];

const SUPPORT_PROBLEMS = [
  {
    title: "Black Friday Payment Incident Ticket Queue",
    baseScenario: "Three urgent customer tickets have arrived within 10 minutes reporting duplicate card debits under rapid repeat clicks. Identify the systemic root cause, select an empathetic tone, and execute a unified batch escalation to SRE rather than fragmented manual refunds.",
    variables: {
      affectedCustomers: ["Elena Rostova, David Kim, Sarah Miller"],
    },
    agentPrompt: "You are Jordan Mitchell, Customer Support Lead. Help the agent recognize that individual refunds do not solve the systemic checkout bug.",
  },
];

const BRAND_PROBLEMS = [
  {
    title: "Viral Checkout Glitch Crisis Control",
    baseScenario: "A scheduled promotional tweet ('Ready to splurge this Black Friday?') went live just as checkout began glitching, sparking a viral PR crisis with 2,400+ angry quote-tweets. Draft an authentic, accountable response aligned with brand guidelines to restore community trust.",
    variables: {
      viralReach: ["2,400 retweets, 8,900 quote-tweets"],
    },
    agentPrompt: "You are Maya Lin, Head of Brand Communications. Evaluate candidate's PR response for accountability, transparency, and empathy.",
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
      sre: SRE_PROBLEMS,
      support: SUPPORT_PROBLEMS,
      brand: BRAND_PROBLEMS,
    };
  }

  public generateMutatedProblem(domain: string, segment: string): GeneratedProblem {
    const domainKey = domain.toLowerCase();
    const domainProblems = this.problems[domainKey] || this.problems.engineering;
    const base = domainProblems[Math.floor(Math.random() * domainProblems.length)];

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
      dynamicScenario += ` [Context applied: ${parts.join(", ")}]`;
    }

    let skinType: "ide" | "roleplay" | "inbox" | "call" | "warroom" | "helpdesk" | "social" = "ide";
    if (domainKey === "sales") skinType = "call";
    else if (domainKey === "product") skinType = "inbox";
    else if (domainKey === "sre") skinType = "warroom";
    else if (domainKey === "support") skinType = "helpdesk";
    else if (domainKey === "brand") skinType = "social";
    else if (domainKey === "data") skinType = "ide";

    return {
      domain: domainKey,
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
