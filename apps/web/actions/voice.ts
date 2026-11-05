"use server";

import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export interface VoiceCompanionMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface VoiceCompanionRequest {
  userMessage: string;
  domain: string;
  mode: "guide" | "interviewer" | "copilot";
  subEnv?: number | string;
  problemTitle?: string;
  history?: VoiceCompanionMessage[];
}

export interface VoiceCompanionResponse {
  reply: string;
  mode: "guide" | "interviewer" | "copilot";
  domain: string;
  success: boolean;
  error?: string;
}

const DOMAIN_CONTEXTS: Record<string, { problem: string; details: string }> = {
  engineering: {
    problem: "Scope 1 Engineering: Checkout 504 Gateway Timeouts & Double-Charge Race Condition",
    details:
      "Aura Commerce is facing a Black Friday outage. Connection pool maxSockets (128/128) is exhausted in SSH Node workers due to dead CoreDNS pod 10.244.3.99 on auth.payment.internal:8443. Checkout service has a non-atomic idempotency check where charge() is dispatched before database order status is updated.",
  },
  sales: {
    problem: "Scope 2 Sales: Save the $250K Renewal with Sam Jenkins (VP Retail, Nordic Goods)",
    details:
      "Sam Jenkins is threatening to cancel their $250k annual contract and switch to CommerceCloud due to fear of Black Friday checkout failure. Key objections: concurrency lock contention, uptime SLA guarantee, CommerceCloud's 1.25% take-rate vs Aura's platform savings.",
  },
  product: {
    problem: "Scope 3 Product Management: Black Friday Launch Triage",
    details:
      "Triage 5 stakeholder crisis emails: Sev-1 double charges reported by support lead Jordan Mitchell, VIP merchant Marcus Vance threatening churn, CEO Taylor Brooks asking to push gift card feature tonight (must enforce deploy freeze), Head of Growth Chloe Zhao ready to fire 500k promotional blast (must hold blast).",
  },
  data: {
    problem: "Scope 4 Data: The Missing DAU Problem (-18% Metric Anomaly)",
    details:
      "Daily active user count plummeted by 18% on Nov 04 while ingress traffic was normal. The SQL query inner-joins transactions, excluding non-transacting subscribers. The Airflow/dbt pipeline also experienced schema drift (account_uid vs user_id in mobile v2.4.1).",
  },
  sre: {
    problem: "Scope 5 SRE: Sev-1 Production Outage War Room",
    details:
      "5xx error rate spiked to 42.8%, p99 latency jumped to 2850ms, and 12 out of 16 checkout-api pods are CrashLooping on release v2.4.1. SRE must acknowledge the Sev-1 alert, post an update to status page, consult Alex Chen, and execute a zero-downtime rollback to v2.4.0.",
  },
  support: {
    problem: "Scope 6 Support: SLA Backlog & Customer Escalation",
    details:
      "120 tickets queued up overnight. 3 Enterprise VIP tickets have expiring SLAs due to double credit card debits. Support must adopt an empathetic tone and execute a batch escalation to SRE rather than issuing piecemeal manual refunds.",
  },
  brand: {
    problem: "Scope 7 Brand: The Viral Brand Crisis",
    details:
      "Negative tweets about duplicate charges are cascading with 2.4k retweets (#AuraOutage +1,420%). Brand team must draft an authentic holding statement acknowledging the issue and taking accountability, avoiding defensiveness, and distributing to Tier-1 tech reporters to recover sentiment to 86%.",
  },
};

export async function chatVoiceCompanionAction(
  request: VoiceCompanionRequest
): Promise<VoiceCompanionResponse> {
  try {
    const domainKey = (request.domain || "engineering").toLowerCase();
    const domainContext = DOMAIN_CONTEXTS[domainKey] || DOMAIN_CONTEXTS.engineering;
    const isInterviewer = request.mode === "interviewer";

    const systemPrompt = isInterviewer
      ? `You are an elite, sharp, and encouraging Senior Technical Interviewer conducting a live oral evaluation for the role of ${domainKey.toUpperCase()} Lead at Aura Commerce.

CONTEXT:
${domainContext.problem}
${domainContext.details}

YOUR ROLE & BEHAVIOR:
1. Speak in natural, spoken conversational English designed to be listened to through Text-to-Speech (TTS).
2. Keep your spoken responses concise: 1 to 3 sentences maximum. Never output long bulleted lists, markdown tables, or walls of text.
3. In Interviewer Mode: Actively grill and interview the candidate. When they say something, assess their technical logic, challenge their assumptions, probe edge cases, and ask the next logical architectural question.
4. If the candidate asks for advice, answer their technical question directly and intelligently, but immediately follow up with: "How would you handle the failure mode if...?"
5. Maintain a professional, warm, yet intellectually rigorous interview tone. Never break character.`
      : `You are the 3D Observer AI Co-Pilot & Senior Technical Mentor for the ${domainKey.toUpperCase()} simulation at Aura Commerce.

CONTEXT:
${domainContext.problem}
${domainContext.details}

YOUR ROLE & BEHAVIOR:
1. Speak in crisp, natural, conversational spoken English designed for Browser SpeechSynthesis.
2. Keep responses to 1 to 3 punchy, insightful sentences.
3. Answer any technical doubt, system design question, or conceptual curiosity the candidate asks (e.g. TCP handshakes, DNS caching, mutex locks, SQL joins, SLA terms).
4. Give subtle Socratic clues to help them solve the active sub-environment problem without spoiling the complete answer outright.
5. If the candidate asks general computer science or domain questions, answer freely and accurately, then guide them back to their mission.`;

    const recentHistory = (request.history || []).slice(-8).map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    }));

    // If GROQ_API_KEY is configured, call Groq via AI SDK for <120ms ultra-low latency response
    if (process.env.GROQ_API_KEY) {
      const { text: replyText } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        system: systemPrompt,
        messages: [
          ...recentHistory,
          { role: "user", content: request.userMessage },
        ],
        temperature: isInterviewer ? 0.7 : 0.6,
        maxOutputTokens: 85,
      });

      return {
        reply: replyText.trim(),
        mode: request.mode,
        domain: domainKey,
        success: true,
      };
    }

    // Fallback if GROQ_API_KEY is not set: smart contextual heuristics
    const userLower = request.userMessage.toLowerCase();
    let smartReply = "";

    if (isInterviewer) {
      if (domainKey === "engineering") {
        smartReply =
          "Good observation on the connection pool. But what happens if CoreDNS takes 60 seconds to propagate the IP removal across worker pods? How do you prevent thread starvation in the interim?";
      } else if (domainKey === "sales") {
        smartReply =
          "You've addressed the uptime SLA, but Sam Jenkins' CFO is fixated on CommerceCloud's lower entry tier. What volume rebate structure would you pitch to close this before Friday?";
      } else {
        smartReply =
          "That's a valid initial triage step. Walk me through the edge cases: what is the worst-case blast radius if that mitigation fails under 10x traffic?";
      }
    } else {
      if (userLower.includes("dns") || userLower.includes("ip") || userLower.includes("timeout")) {
        smartReply =
          "Notice CoreDNS mapping auth.payment.internal to two pod IPs. One of those pods, 10.244.3.99, is refusing TCP handshakes on port 8443. Try running `flush-dns` to prune it from the routing table.";
      } else if (userLower.includes("race") || userLower.includes("concurrency") || userLower.includes("lock")) {
        smartReply =
          "In high-traffic checkout flows, never call external payment gateways before claiming the order idempotency key. Claim the state atomically in database first, then charge the card.";
      } else {
        smartReply = `I hear your question regarding "${request.userMessage.slice(0, 45)}". Focus on isolating the upstream dependency and checking your connection pool status.`;
      }
    }

    return {
      reply: smartReply,
      mode: request.mode,
      domain: domainKey,
      success: true,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[chatVoiceCompanionAction] Error:", errorMsg);
    return {
      reply: "I copy that. Let's inspect the active sub-environment telemetry and verify the next failure boundary.",
      mode: request.mode,
      domain: request.domain,
      success: false,
      error: errorMsg,
    };
  }
}
