// Problem Bank — 7 Scopes x 3 Sub-environments = 21 Sub-environments in Aura Commerce

export interface SubEnvironmentDef {
  subEnv: 1 | 2 | 3;
  id: string;
  title: string;
  envType: string;
  description: string;
  problemStatement: string;
  variables?: Record<string, string[]>;
  setupCode?: string;
  agentPrompt?: string;
  skinType: "ide" | "roleplay" | "inbox" | "call" | "warroom" | "helpdesk" | "social";
}

export interface DomainScopeDef {
  domain: string;
  label: string;
  projectTitle: string;
  projectOverview: string;
  accent: string;
  subEnvironments: SubEnvironmentDef[];
}

export interface GeneratedProblem {
  domain: string;
  subEnv: 1 | 2 | 3;
  subEnvId: string;
  title: string;
  envType: string;
  scenario: string;
  problemStatement: string;
  contextVariables: Record<string, string>;
  difficulty: string;
  mutationSeed: number;
  setupCode?: string;
  agentPrompt?: string;
  skinType: "ide" | "roleplay" | "inbox" | "call" | "warroom" | "helpdesk" | "social";
}

export const SCOPE_DEFINITIONS: Record<string, DomainScopeDef> = {
  engineering: {
    domain: "engineering",
    label: "Engineering",
    projectTitle: "Checkout Concurrency & Infrastructure Degradation",
    projectOverview: "Checkout requests are timing out under peak load and double-charging shoppers during flash sales.",
    accent: "#00ff41",
    subEnvironments: [
      {
        subEnv: 1,
        id: "eng-ssh-terminal",
        title: "01 — SSH Infrastructure Terminal",
        envType: "Linux SSH / Remote Server",
        description: "Investigate remote Linux server aura-prod-app-04 via SSH, inspect logs, processes (ps aux, top), memory (free -m), CPU usage, and running services. Find why checkout requests are timing out.",
        problemStatement: "Checkout requests are timing out (>30s) during Black Friday traffic bursts. Inspect remote Linux server aura-prod-app-04 via SSH, check system resource metrics (ps aux, top, free -m), inspect checkout error logs, and identify connection pool starvation.",
        variables: {
          serverHost: ["aura-prod-app-04.us-east-1", "aura-prod-app-02.us-east-1"],
          hungWorkerPid: ["4103", "4104"],
        },
        skinType: "ide",
        agentPrompt: "You are Alex Chen, Staff Infrastructure Engineer. Direct the candidate to inspect top/htop, ps aux, system logs (/var/log/checkout/timeout.log), and identify connection pool exhaustion on the checkout workers.",
      },
      {
        subEnv: 2,
        id: "eng-network-lab",
        title: "02 — Network Diagnostics Lab",
        envType: "CLI / Network Tools",
        description: "Diagnose DNS resolution (nslookup/dig), port connectivity (curl/nc/telnet), API latency, connection pooling, and network bottlenecks. Identify whether failures originate from application or infrastructure.",
        problemStatement: "Determine whether checkout failures originate from DNS misdirection, network packet drop, or upstream payment gateway latency using diagnostic CLI tools (nslookup, dig, curl, nc, ping, traceroute, ss -s).",
        variables: {
          gatewayHost: ["auth.payment.internal:8443", "gateway.payment.aura:8443"],
          stalePodIp: ["10.244.3.99"],
          activePodIp: ["10.244.4.150"],
        },
        skinType: "ide",
        agentPrompt: "You are Priya Patel, Lead Network Engineer. Review candidate's diagnostic network commands (nslookup, dig, curl, nc, traceroute, ss -s) and evaluate whether they identify the stale CoreDNS upstream pod and connection pool saturation.",
      },
      {
        subEnv: 3,
        id: "eng-code-debugger",
        title: "03 — Code Debugger",
        envType: "IDE / Debugger",
        description: "Inspect the checkout service code, reproduce a race condition, add breakpoints, fix the concurrency bug and run test cases.",
        problemStatement: "A concurrency bug in checkout.ts evaluates the idempotency check after the external payment gateway charge. Fix the race condition and prove it with tests.",
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
        skinType: "ide",
        agentPrompt: "You are Alex Chen, Staff Engineer. The candidate must fix the concurrency race condition in checkout.ts by guarding status check and marking PROCESSING before the charge call.",
      },
    ],
  },

  sales: {
    domain: "sales",
    label: "Sales",
    projectTitle: "Save the $250K Renewal",
    projectOverview: "A major customer, Sam Jenkins (VP Retail at Nordic Goods), is considering cancelling a $250,000 annual contract ahead of Black Friday. The seeker must understand objections, pitch a better solution, and close the renewal.",
    accent: "#f59e0b",
    subEnvironments: [
      {
        subEnv: 1,
        id: "sales-live-call",
        title: "01 — Live Sales Call",
        envType: "AI Voice Simulation",
        description: "Conduct a simulated live call with Sam Jenkins. Discover pain points, handle objections and negotiate the renewal.",
        problemStatement: "Sam Jenkins threatens to cancel Nordic Goods' $250k contract. Engage in a real-time call, uncover their reliability fears, and secure a commitment to review an enterprise addendum.",
        variables: {
          contractValue: ["$250,000 ARR"],
          churnReason: ["Reports of Black Friday checkout glitch", "Shopify Plus 20% lower quote"],
        },
        skinType: "call",
        agentPrompt: "You are Sam Jenkins, VP Retail at Nordic Goods. You have a $250k trial contract with Aura Commerce. You are skeptical about renewing right before Black Friday due to reliability rumors. Be firm but fair. If the candidate offers 99.99% uptime guarantee and active technical support, agree to lock in terms.",
      },
      {
        subEnv: 2,
        id: "sales-pitch-room",
        title: "02 — Pitch & Negotiation Room",
        envType: "Presentation / Pitch Builder",
        description: "Prepare a tailored sales pitch, demonstrate product value, build pricing proposals and respond to competitor comparisons.",
        problemStatement: "Assemble a bespoke presentation demonstrating Aura's high-throughput architecture, competitor comparison against Shopify Plus, and a 3-year multi-tier pricing proposal.",
        variables: {
          targetSavings: ["$1.8M GMV preserved", "$2.4M GMV preserved"],
          discountTier: ["10% multi-year lock", "15% upfront prepay"],
        },
        skinType: "call",
        agentPrompt: "You are Jordan Price, VP Sales at Aura. Review the candidate's executive pitch deck and commercial proposal for Nordic Goods.",
      },
      {
        subEnv: 3,
        id: "sales-crm-dealdesk",
        title: "03 — CRM & Deal Desk",
        envType: "Salesforce-style CRM",
        description: "Review customer history, update deal stages, prepare follow-up emails, calculate discounts and submit the final renewal proposal.",
        problemStatement: "Navigate Nordic Goods' CRM account history, calculate deal desk margin discounts, advance the opportunity from Negotiation to Closed Won, and dispatch the contract addendum.",
        variables: {
          accountTier: ["Enterprise Tier-1 Diamond"],
          renewalAmount: ["$250,000 ARR"],
        },
        skinType: "call",
        agentPrompt: "You are Diana Ross, Chief Commercial Officer. Approve the deal desk terms once the candidate inputs healthy gross margin parameters and 99.99% SLA terms.",
      },
    ],
  },

  product: {
    domain: "product",
    label: "Product Management",
    projectTitle: "Black Friday Launch Triage",
    projectOverview: "An upcoming Black Friday launch has several unresolved customer complaints, stakeholder requests and product issues. The seeker must organize information and decide what should be prioritized before launch.",
    accent: "#818cf8",
    subEnvironments: [
      {
        subEnv: 1,
        id: "prod-gmail-inbox",
        title: "01 — Gmail Inbox Management",
        envType: "Google Gmail Simulation",
        description: "Triage a crowded inbox containing stakeholder emails, customer complaints, feature requests and launch blockers. Categorize, prioritize and respond to important conversations.",
        problemStatement: "Triage a flood of high-stakes emails landing 6 hours before Black Friday. Identify Sev-1 blockers, respond to the CEO and VIP merchant, and freeze non-essential code changes.",
        variables: {
          pendingEmails: ["14 critical messages", "18 messages across 3 threads"],
          ceoPressure: ["Add gift card promo banner immediately", "Hold all non-critical releases"],
        },
        skinType: "inbox",
        agentPrompt: "You are Taylor Brooks, CEO of Aura Commerce. You want to push the gift card feature to bump AOV by 15%, but engineering is grappling with an active checkout bug. Value a product manager who prioritizes checkout stability.",
      },
      {
        subEnv: 2,
        id: "prod-backlog-roadmap",
        title: "02 — Product Backlog & Roadmap",
        envType: "Jira / Linear-style Workspace",
        description: "Convert requests into product requirements, create user stories, prioritize the backlog and assign sprint tasks.",
        problemStatement: "Translate incoming stakeholder requests into clear engineering user stories. Prioritize P0 checkout fixes into Sprint 42 Freeze and deprioritize high-risk cosmetic tasks.",
        variables: {
          sprintVelocity: ["42 story points"],
          blockerTicket: ["AURA-1042: Concurrency idempotency guard"],
        },
        skinType: "inbox",
        agentPrompt: "You are Sam Rivera, Lead Technical Product Manager. Ensure the sprint scope is strictly frozen with only P0 blockers scheduled before the midnight rush.",
      },
      {
        subEnv: 3,
        id: "prod-analytics-experiment",
        title: "03 — Product Analytics & Experiment Lab",
        envType: "Product Analytics Dashboard",
        description: "Examine conversion funnels, feature adoption and customer drop-offs. Propose an experiment to improve checkout conversion before Black Friday.",
        problemStatement: "Analyze Amplitude/Mixpanel funnel telemetry showing a 65% drop-off at the payment step. Formulate a 1-click idempotent checkout A/B test with statistical significance modeling.",
        variables: {
          baselineConversion: ["34.8% payment completion"],
          expectedLift: ["+18.4% lift in completed orders"],
        },
        skinType: "inbox",
        agentPrompt: "You are Dr. Elena Patel, Head of Product Analytics. Validate candidate's funnel hypothesis and experiment sample size calculation.",
      },
    ],
  },

  data: {
    domain: "data",
    label: "Data & Analytics",
    projectTitle: "The Missing DAU Problem",
    projectOverview: "A subscription platform's daily active user count suddenly drops by 18%, but the engineering team claims that traffic is normal. The seeker must investigate the data and correct the reporting.",
    accent: "#06b6d4",
    subEnvironments: [
      {
        subEnv: 1,
        id: "data-sql-workspace",
        title: "01 — SQL Query Workspace",
        envType: "SQL Editor",
        description: "Query customer, session and event tables. Identify missing records, incorrect joins and discrepancies in DAU calculations.",
        problemStatement: "Investigate why the executive DAU dashboard dropped 18%. Query users, sessions, and events tables to uncover an unindexed join and duplicate event filtering.",
        setupCode: `-- Aura Commerce — Daily Active User Calculation
SELECT 
  DATE(s.session_start) AS report_date,
  COUNT(u.id) AS raw_user_count,
  COUNT(DISTINCT u.id) AS true_dau
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
WHERE s.session_start >= '2026-11-01'
GROUP BY DATE(s.session_start)
ORDER BY report_date ASC;`,
        skinType: "ide",
        agentPrompt: "You are Dr. Chen, Principal Data Architect. The candidate must write queries with DISTINCT user_ids and properly account for background session pings.",
      },
      {
        subEnv: 2,
        id: "data-pipeline-quality",
        title: "02 — Data Pipeline & Quality Lab",
        envType: "ETL / Data Engineering",
        description: "Investigate ingestion failures, transformation logic, duplicated events and schema changes. Repair the faulty data pipeline.",
        problemStatement: "Airflow/dbt DAG task 'dbt_dau_aggregation' has failed due to schema changes in mobile app JSON event payloads. Repair the transformation and trigger a clean DAG run.",
        variables: {
          dagTask: ["dbt_dau_aggregation", "extract_app_events"],
          schemaMismatch: ["user_id cast string to bigint", "null event_type filter"],
        },
        skinType: "ide",
        agentPrompt: "You are Marcus Reid, Data Platform Engineer. Help the candidate diagnose the failing dbt model and re-run the pipeline to verify 100% DAG success.",
      },
      {
        subEnv: 3,
        id: "data-bi-studio",
        title: "03 — Analytics & BI Studio",
        envType: "Tableau / Power BI-style Dashboard",
        description: "Correct the DAU visualization, validate KPIs, compare historical trends and create a report explaining the discrepancy.",
        problemStatement: "Correct the BI dashboard calculations, compare 30-day historical trends across iOS/Android/Web, and publish the executive metric reconciliation report.",
        variables: {
          reconciledDAU: ["84,200 active users"],
          discrepancyDelta: ["-18.2% false drop due to mobile session heartbeat filter"],
        },
        skinType: "ide",
        agentPrompt: "You are Taylor Vance, VP Analytics. Review the candidate's executive BI report and verify all platform KPIs match ground truth.",
      },
    ],
  },

  sre: {
    domain: "sre",
    label: "Site Reliability Engineering",
    projectTitle: "Sev-1 Production Outage",
    projectOverview: "A production e-commerce service goes down during peak traffic. API latency increases, error rates spike and customers cannot complete transactions. The seeker must restore service.",
    accent: "#ef4444",
    subEnvironments: [
      {
        subEnv: 1,
        id: "sre-observability-grafana",
        title: "01 — Observability & Monitoring",
        envType: "Grafana / Prometheus-style Dashboard",
        description: "Monitor CPU, memory, request latency, error rates and service health. Identify the affected service and correlate metrics.",
        problemStatement: "Production 5xx error rate has surged to 42.4% and P99 latency is at 8,420ms. Correlate Prometheus metrics and Grafana panels to isolate the failing checkout microservice.",
        variables: {
          errorRate: ["42.4% 5xx errors", "46.1% 5xx errors"],
          p99Latency: ["8,420ms", "9,100ms"],
        },
        skinType: "warroom",
        agentPrompt: "You are Alex Chen, Incident Commander. Guide the candidate in correlating the 5xx spike with the v2.4.1 hotfix deployment and DB pool exhaustion.",
      },
      {
        subEnv: 2,
        id: "sre-incident-warroom",
        title: "02 — Incident War Room",
        envType: "Incident Command Center",
        description: "Analyze alerts and logs, coordinate with simulated engineering teams, establish incident severity and develop a recovery plan.",
        problemStatement: "Take command of INC-8921. Coordinate with simulated engineering teams across Slack/PagerDuty, publish public status page updates, and authorize mitigation.",
        variables: {
          incidentId: ["INC-8921"],
          severity: ["Sev-1 Critical Outage"],
        },
        skinType: "warroom",
        agentPrompt: "You are Sarah Lin, Staff SRE. Ensure the candidate establishes clear incident roles, communicates status to merchants, and drafts the rollback plan.",
      },
      {
        subEnv: 3,
        id: "sre-deployment-rollback",
        title: "03 — Deployment & Rollback Console",
        envType: "CI/CD / Kubernetes Simulation",
        description: "Investigate the latest deployment, perform a safe rollback, verify application health and restore production traffic.",
        problemStatement: "Inspect Git diff between v2.4.0 and v2.4.1, execute zero-downtime canary rollback on Kubernetes cluster, and verify traffic recovery.",
        variables: {
          currentVersion: ["v2.4.1-hotfix"],
          targetVersion: ["v2.4.0-stable"],
        },
        skinType: "warroom",
        agentPrompt: "You are Marcus Vance, DevOps Lead. Validate that the candidate executes the rollback safely without dropping active in-flight requests.",
      },
    ],
  },

  support: {
    domain: "support",
    label: "Customer Support",
    projectTitle: "SLA Backlog & Customer Escalation",
    projectOverview: "A SaaS company's support queue has accumulated 120 unresolved tickets. Several enterprise customers have breached or are approaching their SLA deadlines. The seeker must prioritize and resolve the queue.",
    accent: "#10b981",
    subEnvironments: [
      {
        subEnv: 1,
        id: "supp-ticket-queue",
        title: "01 — Helpdesk Ticket Queue",
        envType: "Zendesk-style Helpdesk",
        description: "Review customer tickets, assign priority levels, categorize issues and identify tickets approaching SLA violations.",
        problemStatement: "120 tickets are pending with 4 enterprise SLAs breached and 12 approaching violation in under 30 minutes. Categorize tickets and triage systemic checkout duplicates.",
        variables: {
          queueSize: ["120 unresolved tickets"],
          breachedCount: ["4 breached, 12 urgent warning"],
        },
        skinType: "helpdesk",
        agentPrompt: "You are Jordan Mitchell, Customer Support Lead. Help the candidate identify that multiple duplicate charge complaints stem from a single systemic engineering defect.",
      },
      {
        subEnv: 2,
        id: "supp-customer-investigation",
        title: "02 — Customer Investigation Desk",
        envType: "Customer Account / Troubleshooting Console",
        description: "Investigate customer histories, reproduce technical issues, inspect account information and identify appropriate resolutions.",
        problemStatement: "Inspect Elena Rostova's enterprise account ($120k ARR) and transaction audit trail to verify two consecutive $149 charges occurred 22ms apart.",
        variables: {
          vipCustomer: ["Elena Rostova (Global Retail Corp)"],
          duplicatedAmount: ["$149.00 x 2"],
        },
        skinType: "helpdesk",
        agentPrompt: "You are David Kim, Tier-3 Technical Support Engineer. Guide the candidate in inspecting transaction IDs tx_8819 and tx_8820 in the payment ledger.",
      },
      {
        subEnv: 3,
        id: "supp-escalation-response",
        title: "03 — Escalation & Response Center",
        envType: "Customer Communication Workspace",
        description: "Draft customer responses, handle angry customers, escalate critical issues and perform batch updates for resolved tickets.",
        problemStatement: "Compose high-empathy customer communications, trigger automatic payment voids with credit concessions, batch-update all 12 duplicate tickets, and sync with engineering.",
        variables: {
          batchCount: ["12 affected customer tickets"],
          compensationCredit: ["$100 store credit + instant void"],
        },
        skinType: "helpdesk",
        agentPrompt: "You are Jordan Mitchell. Review the candidate's customer reply for empathy, accountability, and clarity.",
      },
    ],
  },

  brand: {
    domain: "brand",
    label: "Brand & Social Crisis",
    projectTitle: "The Viral Brand Crisis",
    projectOverview: "A negative post about a company's product goes viral on social media. Mentions are increasing, sentiment is declining and journalists are requesting comments. The seeker must control the reputational damage.",
    accent: "#ec4899",
    subEnvironments: [
      {
        subEnv: 1,
        id: "brand-social-listening",
        title: "01 — Social Listening & Sentiment Monitor",
        envType: "Social Media Listening Dashboard",
        description: "Monitor X, Instagram and other social mentions. Track hashtags, analyze sentiment, identify influential accounts and understand the origin of the crisis.",
        problemStatement: "A viral tweet criticizing checkout double-charges has reached 2,400 retweets and public sentiment has plunged to 78% negative. Monitor viral velocity and identify key influencers.",
        variables: {
          viralRetweets: ["2,400 retweets, 8,900 quote-tweets"],
          sentimentGauge: ["78% Negative, 16% Neutral, 6% Positive"],
        },
        skinType: "social",
        agentPrompt: "You are Maya Lin, Head of Brand Communications. Evaluate candidate's analysis of the viral crisis origin and press exposure risks.",
      },
      {
        subEnv: 2,
        id: "brand-content-studio",
        title: "02 — Brand Content & Response Studio",
        envType: "Content Creation Workspace",
        description: "Draft public statements, social media responses, apology posts and press releases. Maintain the company's tone and brand guidelines.",
        problemStatement: "Draft official company statements across X, LinkedIn, and the press status portal. Enforce accountability, apologize without excuses, and detail automatic refunds.",
        variables: {
          targetToneScore: ["92/100 accountability index"],
          channels: ["X / Twitter thread, Official Press Release, Status Page"],
        },
        skinType: "social",
        agentPrompt: "You are Maya Lin. Critique the candidate's public apology draft. Reject defensive language or passing blame to third-party payment gateways.",
      },
      {
        subEnv: 3,
        id: "brand-crisis-command",
        title: "03 — Crisis Command Center",
        envType: "Reputation & Campaign Dashboard",
        description: "Coordinate the communication strategy, assess the impact of responses, track sentiment recovery and prepare a reputation management plan.",
        problemStatement: "Orchestrate multi-channel executive and legal approvals, deploy the PR response, watch live sentiment rebound from -78% to +65%, and publish the post-crisis recovery roadmap.",
        variables: {
          recoveryGoal: ["+65% Net Positive Sentiment"],
          reputationImpact: ["94% customer retention maintained"],
        },
        skinType: "social",
        agentPrompt: "You are Maya Lin. Validate that the candidate secures legal sign-off and coordinates with the executive leadership team.",
      },
    ],
  },
};

export class ProblemBank {
  private scopes: Record<string, DomainScopeDef>;

  constructor() {
    this.scopes = SCOPE_DEFINITIONS;
  }

  public getScope(domain: string): DomainScopeDef {
    const key = domain.toLowerCase();
    return this.scopes[key] || this.scopes.engineering;
  }

  public getAllScopes(): DomainScopeDef[] {
    return Object.values(this.scopes);
  }

  public generateMutatedProblem(
    domain: string,
    segment: string,
    subEnvIndex: number = 1
  ): GeneratedProblem {
    const scope = this.getScope(domain);
    const validIndex = (subEnvIndex >= 1 && subEnvIndex <= 3) ? (subEnvIndex - 1) : 0;
    const subDef = scope.subEnvironments[validIndex] || scope.subEnvironments[0];

    const selectedVars: Record<string, string> = {};
    let dynamicScenario = subDef.description;
    if (subDef.variables) {
      const parts = [];
      for (const [varName, options] of Object.entries(subDef.variables)) {
        const choice = options[Math.floor(Math.random() * options.length)];
        selectedVars[varName] = choice;
        parts.push(`${varName}: ${choice}`);
      }
      dynamicScenario += ` [Context: ${parts.join(", ")}]`;
    }

    return {
      domain: scope.domain,
      subEnv: subDef.subEnv,
      subEnvId: subDef.id,
      title: subDef.title,
      envType: subDef.envType,
      scenario: dynamicScenario,
      problemStatement: subDef.problemStatement,
      contextVariables: selectedVars,
      difficulty: segment,
      mutationSeed: Math.floor(Math.random() * 9000) + 1000,
      setupCode: subDef.setupCode,
      agentPrompt: subDef.agentPrompt,
      skinType: subDef.skinType,
    };
  }
}

export const problemBank = new ProblemBank();
