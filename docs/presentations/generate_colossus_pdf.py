import fitz

def build_colossus_deck():
    template_path = r"C:\Users\V\Downloads\Documents\COLOSSUS_3.0_Idea_Submission_Template.pptx.pptx.pdf"
    output_path = r"C:\Users\V\Downloads\Documents\VIPER_PRAXIS_COLOSSUS_Presentation.pdf"
    
    doc = fitz.open(template_path)
    
    # Fonts
    F_NORM = "Helvetica"
    F_BOLD = "Helvetica-Bold"
    
    # Color palette matching retro-synthwave theme
    CYAN = (0.20, 0.88, 1.0)          # #33E0FF
    NEON_PINK = (1.0, 0.25, 0.65)     # #FF40A6
    GOLD = (1.0, 0.82, 0.28)          # #FFD147
    WHITE = (1.0, 1.0, 1.0)
    OFF_WHITE = (0.92, 0.94, 0.96)
    CARD_BG = (0.05, 0.03, 0.12)      # Deep purple-black
    CARD_BORDER = (0.35, 0.18, 0.55)  # Glowing purple border
    CARD_BORDER_CYAN = (0.15, 0.60, 0.75)
    
    # Helper to draw a glassmorphic card on Colossus
    def draw_glass_card(page, rect, border_color=CARD_BORDER, fill_color=CARD_BG, width=1.2):
        page.draw_rect(rect, color=border_color, fill=fill_color, width=width)
        
    # -------------------------------------------------------------
    # SLIDE 1: TITLE & TEAM
    # -------------------------------------------------------------
    p1 = doc[0]
    p1.insert_text(fitz.Point(320, 355), "VIPER", fontname=F_BOLD, fontsize=26, color=CYAN)
    p1.insert_text(fitz.Point(420, 420), "PRAXIS  -  Multi-Agent Behavioral Assessment Protocol", fontname=F_BOLD, fontsize=22, color=WHITE)
    p1.insert_text(fitz.Point(230, 485), "AI / Open Innovation / Future of Work", fontname=F_BOLD, fontsize=20, color=GOLD)
    p1.insert_text(fitz.Point(560, 550), "Sai Vivek K N  (Lead Architect)  |  Ph: 7892585383", fontname=F_BOLD, fontsize=20, color=WHITE)
    p1.insert_text(fitz.Point(470, 615), "Reehan Pasha  (AI & Cloud Systems)  |  Ph: 8971183678", fontname=F_BOLD, fontsize=20, color=WHITE)
    p1.insert_text(fitz.Point(470, 678), "Kalpataru Institute of Technology (KIT), Tiptur", fontname=F_BOLD, fontsize=18, color=CYAN)
    p1.insert_text(fitz.Point(470, 742), "VIPER Core Development Team (2-Person Sprint)", fontname=F_BOLD, fontsize=18, color=GOLD)
    print("Colossus Slide 1 processed.")
    
    # -------------------------------------------------------------
    # SLIDE 2: THE PROBLEM - WHY DOES IT MATTER?
    # -------------------------------------------------------------
    p2 = doc[1]
    
    # Card 1: Problem Statement
    c1 = fitz.Rect(470, 345, 1370, 435)
    draw_glass_card(p2, c1, border_color=NEON_PINK)
    p2.insert_text(fitz.Point(485, 370), "THE BREAKDOWN: GENERATIVE AI HAS DESTROYED STATIC INTERVIEWS", fontname=F_BOLD, fontsize=14, color=NEON_PINK)
    p2.insert_textbox(fitz.Rect(485, 376, 1355, 428),
        "> 93% of LeetCode Medium/Hard questions & take-homes are solved instantly by Claude 3.5 & GPT-4o.\n"
        "> Remote coding interviews suffer from widespread un-proctorable cheating (dual screens, background LLMs).\n"
        "> Whiteboard trivia measures rote memorization and anxiety rather than real production engineering maturity.",
        fontname=F_NORM, fontsize=12.2, color=OFF_WHITE)

    # Card 2: Who is Affected
    c2 = fitz.Rect(470, 445, 1370, 535)
    draw_glass_card(p2, c2, border_color=CARD_BORDER_CYAN)
    p2.insert_text(fitz.Point(485, 470), "WHO IS IMPACTED: ENGINEERING MANAGERS & CAPABLE BUILDERS", fontname=F_BOLD, fontsize=14, color=CYAN)
    p2.insert_textbox(fitz.Rect(485, 476, 1355, 528),
        "1. Tech Companies & Startups: Waste 42+ Senior Engineer hours per hire ($5,200 direct burn) screening false positives.\n"
        "2. Non-Pedigree Candidates & Tier-2/3 Colleges: Brilliant self-taught builders are discarded by automated resume ATS filters purely due to lack of prestige branding.",
        fontname=F_NORM, fontsize=12.2, color=OFF_WHITE)

    # Card 3: Current Pain Points
    c3 = fitz.Rect(470, 545, 1370, 705)
    draw_glass_card(p2, c3, border_color=GOLD)
    p2.insert_text(fitz.Point(485, 570), "CRITICAL PAIN POINTS & ECONOMIC METRICS", fontname=F_BOLD, fontsize=14, color=GOLD)
    p2.insert_textbox(fitz.Rect(485, 576, 1355, 698),
        "> $42,000 Average Cost of an engineering mis-hire in recruitment and onboarding loss.\n"
        "> 46% of newly hired developers fail to navigate complex production codebases in their first 90 days.\n"
        "> 60%+ surge in AI-hallucinated resumes and fraudulent remote candidate applications.\n"
        "> The fundamental hiring signal is broken: The industry urgently requires Process Observation over rote trivia.",
        fontname=F_NORM, fontsize=12.2, color=OFF_WHITE)
    print("Colossus Slide 2 processed.")

    # -------------------------------------------------------------
    # SLIDE 3: IDEA / SOLUTION
    # -------------------------------------------------------------
    p3 = doc[2]
    
    # Card 1: What We're Building
    c1 = fitz.Rect(470, 325, 1370, 420)
    draw_glass_card(p3, c1, border_color=CYAN)
    p3.insert_text(fitz.Point(485, 350), "WHAT WE'RE BUILDING: THE FLIGHT SIMULATOR FOR TALENT EVALUATION", fontname=F_BOLD, fontsize=14, color=CYAN)
    p3.insert_textbox(fitz.Rect(485, 356, 1355, 412),
        "Pilots don't take multiple-choice quizzes before flying; they fly high-fidelity simulators with engine failures. PRAXIS drops candidates into cloud sandboxes (Monaco IDE + E2B microVMs) to resolve authentic production incidents alongside autonomous AI co-workers.",
        fontname=F_NORM, fontsize=12, color=OFF_WHITE)

    # Card 2: How It Solves It
    c2 = fitz.Rect(470, 430, 1370, 530)
    draw_glass_card(p3, c2, border_color=NEON_PINK)
    p3.insert_text(fitz.Point(485, 455), "HOW IT SOLVES IT: TRACKING 'PROCESS OVER ANSWERS' VIA REAL-TIME TELEMETRY", fontname=F_BOLD, fontsize=14, color=NEON_PINK)
    p3.insert_textbox(fitz.Rect(485, 461, 1355, 522),
        "We evaluate HOW candidates think, not just what they write. The AI Observer captures keystroke flight-time variance, context switching, test-before-ship discipline, and ambiguity resolution under stakeholder pushback in real time.",
        fontname=F_NORM, fontsize=12, color=OFF_WHITE)

    # Card 3: Core Value Proposition
    c3 = fitz.Rect(470, 540, 1370, 705)
    draw_glass_card(p3, c3, border_color=GOLD)
    p3.insert_text(fitz.Point(485, 565), "CORE VALUE PROPOSITION: UNCHEATABLE EVALUATION & SOVEREIGN CREDENTIALS", fontname=F_BOLD, fontsize=14, color=GOLD)
    p3.insert_textbox(fitz.Rect(485, 571, 1355, 698),
        "> For Companies: 94% predictive hiring accuracy; 70% reduction in technical assessment time (sub-45 mins).\n"
        "> For Candidates: Decentralized ZK-SNARK credentials proving skill across all employers without revealing proprietary code.\n"
        "> Cheating Immunity: Behavioral micro-telemetry and procedural problem mutation make LLM copy-pasting mathematically ineffective.",
        fontname=F_NORM, fontsize=12.2, color=OFF_WHITE)
    print("Colossus Slide 3 processed.")

    # -------------------------------------------------------------
    # SLIDE 4: HOW IT WORKS
    # -------------------------------------------------------------
    p4 = doc[3]
    
    # Card 1: End-to-End Workflow
    c1 = fitz.Rect(470, 310, 1370, 415)
    draw_glass_card(p4, c1, border_color=CYAN)
    p4.insert_text(fitz.Point(485, 335), "END-TO-END WORKFLOW: 6-STEP CLOSED-LOOP TALENT PIPELINE", fontname=F_BOLD, fontsize=14, color=CYAN)
    p4.insert_textbox(fitz.Rect(485, 342, 1355, 408),
        "1. Litmus Baseline Screen -> 2. Procedural ProblemBank Mutation -> 3. Interactive Sandbox Cockpit ->\n"
        "4. AI Observer Telemetry Engine -> 5. Meta-Cognitive Evaluator (8 Dimensions) -> 6. SnarkJS ZK-SNARK Attestation.",
        fontname=F_NORM, fontsize=12, color=OFF_WHITE)

    # Card 2: User Journey
    c2 = fitz.Rect(470, 425, 1370, 535)
    draw_glass_card(p4, c2, border_color=NEON_PINK)
    p4.insert_text(fitz.Point(485, 450), "DUAL USER JOURNEY: CANDIDATE & COMPANY PERSPECTIVES", fontname=F_BOLD, fontsize=14, color=NEON_PINK)
    p4.insert_textbox(fitz.Rect(485, 456, 1355, 528),
        "> Candidate: Enters browser cockpit -> Diagnoses live rate-limiting race condition in Monaco IDE -> Interacts with AI PM (Alex) & Architect (Sam) -> Receives instant portable ZK competency passport.\n"
        "> Company: Inspects candidate ranking by cognitive load score & approach quality -> Reviews telemetry playback -> Directly drafts proven top 1% talent via the Apprentice Market.",
        fontname=F_NORM, fontsize=11.8, color=OFF_WHITE)

    # Card 3: Technology Stack
    c3 = fitz.Rect(470, 545, 1370, 715)
    draw_glass_card(p4, c3, border_color=GOLD)
    p4.insert_text(fitz.Point(485, 570), "FULL-STACK PRODUCTION TECHNOLOGY STACK", fontname=F_BOLD, fontsize=14, color=GOLD)
    p4.insert_textbox(fitz.Rect(485, 576, 1355, 708),
        "> Cockpit Frontend: Next.js 16 (App Router), React 19, Monaco Editor, XTerm.js, Framer Motion.\n"
        "> AI Agent Layer: Groq Llama-3.3-70B Versatile (<300ms ultra-low latency inference), Vercel AI SDK.\n"
        "> Cloud Execution: E2B Cloud Sandboxes (Isolated Linux MicroVMs), Supabase PostgreSQL, Prisma ORM.\n"
        "> Cryptographic Verification: SnarkJS (circom ZK-SNARKs), W3C Verifiable Credentials.",
        fontname=F_NORM, fontsize=12, color=OFF_WHITE)
    print("Colossus Slide 4 processed.")

    # -------------------------------------------------------------
    # SLIDE 5: WHAT MAKES US DIFFERENT?
    # -------------------------------------------------------------
    p5 = doc[4]
    
    # Card 1: Core Features
    c1 = fitz.Rect(470, 310, 1370, 420)
    draw_glass_card(p5, c1, border_color=CYAN)
    p5.insert_text(fitz.Point(485, 335), "01 CORE FEATURES: 4 PILLARS OF PRAXIS PLATFORM", fontname=F_BOLD, fontsize=14, color=CYAN)
    p5.insert_textbox(fitz.Rect(485, 342, 1355, 412),
        "> Procedural Mutation Engine: Mutates bug injection, edge cases, and parameters so no two tests leak.\n"
        "> Low-Latency Multi-Agent Personas: Sub-300ms Groq agents roleplay PMs, Architects, and Clients with hidden constraints.\n"
        "> Real-time Behavioral Telemetry: Millisecond tracking of flight-time variance, pause counts, and cognitive load score.\n"
        "> ZK-SNARK Talent Credential: Cryptographically proven competency scores portable across employers.",
        fontname=F_NORM, fontsize=11.8, color=OFF_WHITE)

    # Card 2: Existing Approach
    c2 = fitz.Rect(470, 430, 1370, 530)
    draw_glass_card(p5, c2, border_color=NEON_PINK)
    p5.insert_text(fitz.Point(485, 455), "02 EXISTING APPROACH: BROKEN BY DESIGN IN 2026", fontname=F_BOLD, fontsize=14, color=NEON_PINK)
    p5.insert_textbox(fitz.Rect(485, 461, 1355, 522),
        "> HackerRank / LeetCode: Obsolete algorithm trivia; completely bypassed by LLMs; 0% real-world team correlation.\n"
        "> Take-Home Projects: 8-12 hour candidate burn; rampant ChatGPT delegation and unobserved ghostwriting.\n"
        "> One-Way Video Bots: Creepy facial recognition with zero technical evaluation depth and severe bias risks.",
        fontname=F_NORM, fontsize=11.8, color=OFF_WHITE)

    # Card 3: Innovation / USP
    c3 = fitz.Rect(470, 540, 1370, 715)
    draw_glass_card(p5, c3, border_color=GOLD)
    p5.insert_text(fitz.Point(485, 565), "03 OUR INNOVATION & USP: THE 'PROCESS OVER ANSWERS' MOAT", fontname=F_BOLD, fontsize=14, color=GOLD)
    p5.insert_textbox(fitz.Rect(485, 571, 1355, 708),
        "> Live Cognitive Trajectory: We analyze HOW a candidate scopes, tests, and refactors under pressure.\n"
        "> AI Co-Pilot Evaluation: Instead of banning AI, we evaluate how well the candidate guides and audits code.\n"
        "> Cross-Domain Versatility: Single engine supports Engineering, Product Management, Enterprise Sales, and Data Science.",
        fontname=F_NORM, fontsize=12, color=OFF_WHITE)
    print("Colossus Slide 5 processed.")

    # -------------------------------------------------------------
    # SLIDE 6: IMPACT & EXECUTION
    # -------------------------------------------------------------
    p6 = doc[5]
    
    # Card 1: Expected Impact & Beneficiaries
    c1 = fitz.Rect(470, 310, 1370, 425)
    draw_glass_card(p6, c1, border_color=CYAN)
    p6.insert_text(fitz.Point(485, 335), "01 EXPECTED IMPACT & 02 BENEFICIARIES", fontname=F_BOLD, fontsize=14, color=CYAN)
    p6.insert_textbox(fitz.Rect(485, 342, 1355, 418),
        "> 70% Interview Time Savings: Compresses 3-4 screening rounds into a single sub-45-minute simulation.\n"
        "> $3,200+ Saved Per Candidate Loop in Senior Engineering salary burn.\n"
        "> Meritocratic Access: Empowers tier-2/3 college and self-taught developers with undeniable proof of execution ability.",
        fontname=F_NORM, fontsize=12, color=OFF_WHITE)

    # Card 2: Scalability
    c2 = fitz.Rect(470, 435, 1370, 540)
    draw_glass_card(p6, c2, border_color=NEON_PINK)
    p6.insert_text(fitz.Point(485, 460), "03 SCALABILITY & BUSINESS VIABILITY", fontname=F_BOLD, fontsize=14, color=NEON_PINK)
    p6.insert_textbox(fitz.Rect(485, 466, 1355, 532),
        "> Enterprise B2B SaaS: $499/month per engineering team for automated simulation pipelines.\n"
        "> Apprentice Talent Market: 10% placement take-rate on direct verified talent drafts.\n"
        "> Cloud MicroVM Infrastructure: Ephemeral Linux containers spin up on demand in <2 seconds with near-zero idle compute.",
        fontname=F_NORM, fontsize=12, color=OFF_WHITE)

    # Card 3: Roadmap
    c3 = fitz.Rect(470, 550, 1370, 715)
    draw_glass_card(p6, c3, border_color=GOLD)
    p6.insert_text(fitz.Point(485, 575), "04 IMPLEMENTATION ROADMAP", fontname=F_BOLD, fontsize=14, color=GOLD)
    p6.insert_textbox(fitz.Rect(485, 581, 1355, 708),
        "> Phase 1 (Current / Hackathon MVP): Operational Next.js monorepo, Groq Llama-3.3-70B simulation engine, Monaco IDE, live telemetry observer, and company dashboard.\n"
        "> Phase 2 (Months 1-3): Sub-200ms real-time voice agents, automated GitHub PR incident ingestion, and ATS integrations (Greenhouse, Lever, Ashby).\n"
        "> Phase 3 (Months 4-6): Multi-agent collaborative team assessments & on-chain ZK talent registry.",
        fontname=F_NORM, fontsize=12, color=OFF_WHITE)
    print("Colossus Slide 6 processed.")

    # -------------------------------------------------------------
    # SLIDE 7: THANK YOU SLIDE
    # -------------------------------------------------------------
    p7 = doc[6]
    
    # Bottom info banner
    b_card = fitz.Rect(200, 560, 1240, 720)
    draw_glass_card(p7, b_card, border_color=CYAN, fill_color=(0.04, 0.02, 0.10, 0.9))
    p7.insert_text(fitz.Point(230, 595), "PRAXIS  -  PROVE YOUR PROCESS. BECOME VERIFIED.", fontname=F_BOLD, fontsize=18, color=CYAN)
    
    p7.insert_text(fitz.Point(230, 630), "TEAM VIPER  |  Kalpataru Institute of Technology (KIT), Tiptur", fontname=F_BOLD, fontsize=14, color=GOLD)
    p7.insert_text(fitz.Point(230, 660), "Sai Vivek K N (Lead Architect & Full-Stack)  -  Ph: 7892585383  |  saivivek0707@gmail.com", fontname=F_NORM, fontsize=13, color=WHITE)
    p7.insert_text(fitz.Point(230, 688), "Reehan Pasha (AI Systems & Infrastructure)  -  Ph: 8971183678  |  reehanpasha1607@gmail.com", fontname=F_NORM, fontsize=13, color=WHITE)
    
    print("Colossus Slide 7 processed.")
    
    doc.save(output_path)
    doc.close()
    print(f"COLOSSUS Deck saved successfully to: {output_path}")

if __name__ == "__main__":
    build_colossus_deck()
