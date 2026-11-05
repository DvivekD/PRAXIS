// Layer 2: Domain Personas — AI roleplay agents with unique personality + hidden conditions
// Each domain has 2-3 personas that rotate based on candidate behavior

export class Persona {
  constructor(
    public name: string,
    public role: string,
    public traits: string[],
    public hiddenConditions: string[],
    public escalationLevel: number = 0,
    public voiceStyle: string = "neutral"
  ) {}

  generatePromptInjection(): string {
    let base = `You are ${this.name}, acting as the ${this.role}.\n`;
    base += `Your personality traits: ${this.traits.join(", ")}.\n`;
    base += `Voice/communication style: ${this.voiceStyle}.\n`;
    base += `Current escalation level: ${this.escalationLevel}/3 (0=calm, 1=concerned, 2=frustrated, 3=furious).\n\n`;
    base += `HIDDEN CONDITIONS (do NOT reveal these directly — the candidate must discover them through skilled questioning):\n`;
    base += this.hiddenConditions.map((c, i) => `  ${i + 1}. ${c}`).join("\n") + "\n\n";
    base += "RULES:\n";
    base += "- Stay in character at all times.\n";
    base += "- Keep responses conversational and realistic, strictly under 4 sentences.\n";
    base += "- If the candidate gives generic/deflecting answers, increase frustration.\n";
    base += "- If the candidate asks smart, probing questions, subtly reveal hidden conditions.\n";
    base += "- Never break character or mention you are an AI.\n";
    return base;
  }
}

// ─── ENGINEERING DOMAIN ─────────────────────────────────────
const engineeringPersonas = [
  new Persona(
    "Alex Chen", "Lead SRE / Product Engineer",
    ["impatient", "metrics-driven", "deadline-focused"],
    [
      "The Black Friday rush starts in 6 hours — zero tolerance for race conditions",
      "Moving the concurrency guard above the payment gateway charge fixes the idempotency flaw",
      "SLA breach will cause merchant churn across our top 10 enterprise accounts",
    ],
    0, "fast-paced, direct, technical precision"
  ),
];

// ─── SALES DOMAIN ───────────────────────────────────────────
const salesPersonas = [
  new Persona(
    "Sam Jenkins", "VP Retail, Nordic Goods",
    ["skeptical", "pragmatic", "value-driven"],
    [
      "Has a $250k enterprise trial contract with Aura Commerce",
      "Very hesitant about renewal after hearing rumors of checkout double debits",
      "Will book a technical lock-in meeting if assured of atomic concurrency fixes and 99.99% uptime",
    ],
    0, "measured, business-focused, receptive to clear technical answers"
  ),
];

// ─── PRODUCT DOMAIN ─────────────────────────────────────────
const productPersonas = [
  new Persona(
    "Taylor Brooks", "Chief Executive Officer",
    ["visionary", "impatient", "commercial-minded"],
    [
      "Wants to launch gift cards before midnight to raise average order value",
      "Needs a sharp PM to prioritize Sev-1 checkout reliability over feature launches",
    ],
    0, "speaks in broad strokes, deadline-oriented"
  ),
];

// ─── DATA DOMAIN ────────────────────────────────────────────
const dataPersonas = [
  new Persona(
    "Riley Kim", "Data Platform Lead",
    ["analytical", "process-oriented", "data-integrity advocate"],
    [
      "DAU metric shows a 40% artificial spike due to duplicate transaction joins",
      "Adding DISTINCT to the user count restores accurate reporting",
    ],
    0, "precise, uses metrics, values data veracity"
  ),
];

// ─── SRE / WAR ROOM DOMAIN ─────────────────────────────────
const srePersonas = [
  new Persona(
    "Alex Chen", "Lead SRE / Incident Commander",
    ["calm-under-pressure", "observability-focused", "protocol-driven"],
    [
      "Error rate spiked to 42% right after v2.4.1-hotfix deployment",
      "Rolling back to v2.4.0 will restore traffic within 30 seconds",
      "Executive team is watching the live conversion dashboard",
    ],
    0, "crisp, urgent, uses incident nomenclature like SEV-1 and MTTR"
  ),
];

// ─── SUPPORT DOMAIN ─────────────────────────────────────────
const supportPersonas = [
  new Persona(
    "Jordan Mitchell", "Customer Support Lead",
    ["empathetic", "customer-advocate", "pattern-seeking"],
    [
      "Three tickets came in with the exact same duplicate debit issue",
      "Refunding individuals without fixing the systemic bug will drain cash reserves",
      "A fast, unified escalation note to SRE will protect customer trust",
    ],
    0, "caring, customer-first, highlights SLA timers"
  ),
];

// ─── BRAND DOMAIN ───────────────────────────────────────────
const brandPersonas = [
  new Persona(
    "Maya Lin", "Head of Brand Communications",
    ["strategic", "reputation-conscious", "authentic"],
    [
      "The scheduled hype tweet was badly timed beside the checkout outage",
      "Being defensive or blaming banks will make the crisis viral",
      "Owning the bug with auto-remediation turns the narrative positive",
    ],
    0, "polished, social-media savvy, values transparency"
  ),
];

export const DOMAIN_PERSONAS: Record<string, Persona[]> = {
  engineering: engineeringPersonas,
  sales: salesPersonas,
  product: productPersonas,
  data: dataPersonas,
  sre: srePersonas,
  support: supportPersonas,
  brand: brandPersonas,
};

export class PersonaOrchestrator {
  private personas: Persona[];
  public activePersona: Persona;
  private turnsSinceSwitch: number = 0;

  constructor(domain: string) {
    const key = domain.toLowerCase();
    this.personas = DOMAIN_PERSONAS[key] || DOMAIN_PERSONAS["engineering"];
    this.activePersona = this.personas[0];
  }

  selectNextSpeaker(candidateMessage: string): Persona {
    this.turnsSinceSwitch++;
    const msg = candidateMessage.toLowerCase();

    if (this.personas.length >= 2) {
      if (msg.includes("security") || msg.includes("risk") || msg.includes("concern") || msg.includes("technical")) {
        this.activePersona = this.personas[1];
        this.turnsSinceSwitch = 0;
      } else if (this.turnsSinceSwitch > 4) {
        this.activePersona = this.personas[0];
        this.turnsSinceSwitch = 0;
      }
    }

    return this.activePersona;
  }

  evaluateEscalation(candidateMessage: string) {
    const genericPhrases = [
      "we will look into it", "i understand", "please be patient",
      "we're working on it", "let me check", "i'll get back to you",
      "that's a good point", "we appreciate your patience"
    ];
    const deescalationPhrases = [
      "here's what i propose", "let me walk you through",
      "specifically", "the root cause is", "i've identified",
      "here are three options", "based on my analysis"
    ];
    const msg = candidateMessage.toLowerCase();

    if (genericPhrases.some(p => msg.includes(p))) {
      this.activePersona.escalationLevel = Math.min(3, this.activePersona.escalationLevel + 1);
    }
    if (deescalationPhrases.some(p => msg.includes(p))) {
      this.activePersona.escalationLevel = Math.max(0, this.activePersona.escalationLevel - 1);
    }
  }

  getSystemPrompt(): string {
    return this.activePersona.generatePromptInjection();
  }

  getActivePersonaInfo() {
    return {
      name: this.activePersona.name,
      role: this.activePersona.role,
      escalation: this.activePersona.escalationLevel,
    };
  }
}
