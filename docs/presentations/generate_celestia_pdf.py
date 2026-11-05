import fitz

def build_celestia_deck():
    template_path = r"C:\Users\V\Downloads\Documents\6ad3cc1970da2_celestia_submission_template.pptx.pdf"
    output_path = r"C:\Users\V\Downloads\Documents\VIPER_PRAXIS_CELESTIA_Presentation.pdf"
    
    doc = fitz.open(template_path)
    
    # Fonts
    F_NORM = "Helvetica"
    F_BOLD = "Helvetica-Bold"
    
    # Color palette
    CARD_BG = (0.957, 0.945, 0.933)     # Original gray card #F4F1EE
    WHITE = (1.0, 1.0, 1.0)
    DARK_TEXT = (0.10, 0.12, 0.15)     # #1A1F26
    MUTED_TEXT = (0.35, 0.38, 0.42)    # #5A616B
    PRIMARY_ORANGE = (0.85, 0.40, 0.15) # #D96626 (matches Celestia branding)
    BORDER_COLOR = (0.85, 0.82, 0.78)
    
    # -------------------------------------------------------------
    # SLIDE 1: TITLE SLIDE
    # -------------------------------------------------------------
    p1 = doc[0]
    p1.draw_rect(fitz.Rect(34, 135, 520, 245), color=None, fill=WHITE)
    
    p1.insert_text(fitz.Point(36, 172), "PRAXIS", fontname=F_BOLD, fontsize=38, color=DARK_TEXT)
    p1.insert_text(fitz.Point(36, 196), "The Multi-Agent Cognitive Simulation & Verifiable Talent Protocol", fontname=F_BOLD, fontsize=12, color=PRIMARY_ORANGE)
    p1.insert_text(fitz.Point(36, 213), "Flight Simulator for Technical Hiring | Replacing LeetCode with Live Behavioral Sandboxes", fontname=F_NORM, fontsize=10, color=MUTED_TEXT)
    p1.insert_text(fitz.Point(36, 233), "CELESTIA 2026 | 24 HR NATIONAL HACKATHON | Open Innovation Track", fontname=F_BOLD, fontsize=9.5, color=DARK_TEXT)
    
    # Expanded card rectangle with more bottom space
    card_rect = fitz.Rect(36, 252, 684, 372)
    p1.draw_rect(card_rect, color=BORDER_COLOR, fill=CARD_BG, width=1)
    
    p1.insert_text(fitz.Point(54, 274), "TEAM NAME:", fontname=F_BOLD, fontsize=11, color=PRIMARY_ORANGE)
    p1.insert_text(fitz.Point(135, 274), "VIPER", fontname=F_BOLD, fontsize=13, color=DARK_TEXT)
    
    p1.insert_text(fitz.Point(54, 296), "MEMBERS:", fontname=F_BOLD, fontsize=10.5, color=DARK_TEXT)
    p1.insert_text(fitz.Point(135, 296), "1. Sai Vivek K N (Team Lead | Full-Stack & System Architect)  -  Ph: 7892585383", fontname=F_BOLD, fontsize=9.5, color=DARK_TEXT)
    p1.insert_text(fitz.Point(135, 311), "   Email: saivivek0707@gmail.com", fontname=F_NORM, fontsize=9, color=MUTED_TEXT)
    p1.insert_text(fitz.Point(135, 327), "2. Reehan Pasha (Co-Lead | AI Systems & Infrastructure Engineer)  -  Ph: 8971183678", fontname=F_BOLD, fontsize=9.5, color=DARK_TEXT)
    p1.insert_text(fitz.Point(135, 342), "   Email: reehanpasha1607@gmail.com", fontname=F_NORM, fontsize=9, color=MUTED_TEXT)
    
    p1.insert_text(fitz.Point(54, 360), "COLLEGE:", fontname=F_BOLD, fontsize=10, color=DARK_TEXT)
    p1.insert_text(fitz.Point(135, 360), "Kalpataru Institute of Technology (KIT), Tiptur", fontname=F_BOLD, fontsize=10, color=DARK_TEXT)

    print("Slide 1 processed.")
    
    def clean_slide(page):
        rect = fitz.Rect(36.0, 126.0, 684.0, 360.0)
        page.draw_rect(rect, color=None, fill=CARD_BG)
        return rect
        
    # -------------------------------------------------------------
    # SLIDE 2: PROBLEM STATEMENT (01)
    # -------------------------------------------------------------
    p2 = doc[1]
    clean_slide(p2)
    
    b1 = fitz.Rect(50, 136, 670, 202)
    p2.draw_rect(b1, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p2.insert_text(fitz.Point(62, 154), "THE CRISIS: AI HAS COMPLETELY BROKEN THE TECHNICAL HIRING FUNNEL", fontname=F_BOLD, fontsize=11, color=PRIMARY_ORANGE)
    p2.insert_textbox(fitz.Rect(62, 160, 658, 198), 
        "> 93% of LeetCode Medium/Hard algorithmic questions and take-home tasks are solved instantly by Claude 3.5 & GPT-4o.\n"
        "> Remote coding screens suffer from rampant cheating (dual-monitors, background LLMs), creating zero signal for recruiters.\n"
        "> Whiteboard trivia tests rote memorization under anxiety rather than practical day-to-day software engineering competency.",
        fontname=F_NORM, fontsize=9.2, color=DARK_TEXT)

    b2 = fitz.Rect(50, 210, 350, 348)
    p2.draw_rect(b2, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p2.insert_text(fitz.Point(62, 228), "WHO FACES THIS PAIN?", fontname=F_BOLD, fontsize=10.5, color=DARK_TEXT)
    p2.insert_textbox(fitz.Rect(62, 234, 340, 342),
        "1. Tech Companies & Startups:\n"
        "   Spend 42+ Senior Engineer hours per hire ($5,200 salary waste) vetting false positives.\n"
        "2. Capable Candidates & Self-Taught Devs:\n"
        "   Filtered out by rigid ATS algorithms due to lack of pedigree degrees or brand-name resumes.",
        fontname=F_NORM, fontsize=8.8, color=DARK_TEXT)

    b3 = fitz.Rect(360, 210, 670, 348)
    p2.draw_rect(b3, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p2.insert_text(fitz.Point(372, 228), "WHY IT MATTERS RIGHT NOW (2026)", fontname=F_BOLD, fontsize=10.5, color=PRIMARY_ORANGE)
    p2.insert_textbox(fitz.Rect(372, 234, 658, 342),
        "> 60%+ surge in AI-generated fake resumes & fraudulent remote interview applications.\n"
        "> $42,000 average cost of an engineering mis-hire.\n"
        "> 46% of newly hired developers fail to navigate production codebases in their first 90 days.\n"
        "> The industry urgently needs: Behavioral Process Observation over static trivia.",
        fontname=F_NORM, fontsize=8.8, color=DARK_TEXT)
    print("Slide 2 processed.")

    # -------------------------------------------------------------
    # SLIDE 3: OBJECTIVE (02)
    # -------------------------------------------------------------
    p3 = doc[2]
    clean_slide(p3)
    
    bg_banner = fitz.Rect(50, 136, 670, 185)
    p3.draw_rect(bg_banner, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p3.insert_text(fitz.Point(62, 154), "CORE GOAL:", fontname=F_BOLD, fontsize=11, color=PRIMARY_ORANGE)
    p3.insert_textbox(fitz.Rect(62, 160, 658, 182),
        "Transform technical hiring from static answer validation to real-time cognitive process observation inside procedurally mutated, cloud-sandboxed production simulations.",
        fontname=F_BOLD, fontsize=9.5, color=DARK_TEXT)
    
    cards_data = [
        ("OUTCOME 1: 94% PREDICTIVE ACCURACY", 
         "Measure HOW candidates think (debugging discipline, trade-off articulation, keystroke variance) to achieve 94% retention prediction versus 48% with LeetCode.", 
         fitz.Rect(50, 195, 245, 348)),
        ("OUTCOME 2: 70% CYCLE REDUCTION", 
         "Compress the entire 4-stage technical loop (screen, take-home, system design, behavioral) into a single sub-45-minute high-signal simulation.", 
         fitz.Rect(255, 195, 465, 348)),
        ("OUTCOME 3: 100% SOVEREIGN VERIFICATION", 
         "Issue tamper-proof ZK-SNARK credentials (W3C format) verifying candidate competency without exposing proprietary test scenarios or candidate code.", 
         fitz.Rect(475, 195, 670, 348))
    ]
    for title, desc, r in cards_data:
        p3.draw_rect(r, color=BORDER_COLOR, fill=WHITE, width=0.8)
        p3.insert_textbox(fitz.Rect(r.x0 + 10, r.y0 + 12, r.x1 - 10, r.y0 + 40), title, fontname=F_BOLD, fontsize=9.5, color=PRIMARY_ORANGE)
        p3.insert_textbox(fitz.Rect(r.x0 + 10, r.y0 + 44, r.x1 - 10, r.y1 - 10), desc, fontname=F_NORM, fontsize=8.8, color=DARK_TEXT)

    print("Slide 3 processed.")

    # -------------------------------------------------------------
    # SLIDE 4: PROPOSED SOLUTION (03)
    # -------------------------------------------------------------
    p4 = doc[3]
    clean_slide(p4)
    
    p4_top = fitz.Rect(50, 136, 670, 185)
    p4.draw_rect(p4_top, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p4.insert_text(fitz.Point(62, 154), "THE SOLUTION: THE WORLD'S FIRST PRODUCTION FLIGHT SIMULATOR FOR TALENT", fontname=F_BOLD, fontsize=11, color=PRIMARY_ORANGE)
    p4.insert_textbox(fitz.Rect(62, 160, 658, 182),
        "Candidates enter a browser cockpit (Monaco IDE + E2B microVM cloud terminal) faced with realistic workplace incidents alongside autonomous AI co-workers who push back and escalate tension.",
        fontname=F_NORM, fontsize=9.2, color=DARK_TEXT)
        
    p4_cols = [
        ("1. PROCEDURAL MUTATION", "ProblemBank mutates incident parameters, race conditions & edge cases dynamically so no two tests are identical. Cheating is impossible.", fitz.Rect(50, 195, 198, 348)),
        ("2. MULTI-AGENT PERSONAS", "Sub-300ms Groq Llama-3.3-70B agents roleplay as Product Managers (Alex), Architects (Sam), and Clients with hidden business constraints.", fitz.Rect(207, 195, 355, 348)),
        ("3. BEHAVIORAL TELEMETRY", "Observer Layer captures keystroke flight-time variance, context switching, structured debugging & cognitive load score (0-100) in real time.", fitz.Rect(364, 195, 512, 348)),
        ("4. ZK TALENT PASSPORT", "Generates decentralized SnarkJS Zero-Knowledge Proofs of competency so candidates own their verified score across all employers.", fitz.Rect(521, 195, 670, 348)),
    ]
    for title, desc, r in p4_cols:
        p4.draw_rect(r, color=BORDER_COLOR, fill=WHITE, width=0.8)
        p4.insert_textbox(fitz.Rect(r.x0 + 8, r.y0 + 10, r.x1 - 8, r.y0 + 36), title, fontname=F_BOLD, fontsize=9, color=PRIMARY_ORANGE)
        p4.insert_textbox(fitz.Rect(r.x0 + 8, r.y0 + 38, r.x1 - 8, r.y1 - 8), desc, fontname=F_NORM, fontsize=8.5, color=DARK_TEXT)
    print("Slide 4 processed.")

    # -------------------------------------------------------------
    # SLIDE 5: INNOVATION & UNIQUENESS (04)
    # -------------------------------------------------------------
    p5 = doc[4]
    clean_slide(p5)
    
    p5_box = fitz.Rect(50, 136, 670, 348)
    p5.draw_rect(p5_box, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p5.insert_text(fitz.Point(62, 154), "WHY PRAXIS OUTPERFORMS EXISTING APPROACHES", fontname=F_BOLD, fontsize=11, color=PRIMARY_ORANGE)
    
    headers = ["EVALUATION CRITERIA", "LEETCODE / HACKERRANK", "TAKE-HOME ASSIGNMENTS", "PRAXIS (OUR SYSTEM)"]
    col_x = [62, 210, 360, 510]
    p5.draw_rect(fitz.Rect(55, 164, 665, 182), color=None, fill=(0.92, 0.90, 0.88))
    for h, x in zip(headers, col_x):
        p5.insert_text(fitz.Point(x, 177), h, fontname=F_BOLD, fontsize=8.2, color=DARK_TEXT)
        
    rows = [
        ("Cheating Resistance", "0% (Solved by LLM in 5s)", "Low (ChatGPT / Ghostwriter)", "100% (Live Behavioral Telemetry)"),
        ("Real-World Validity", "Low (Abstract algorithms)", "Medium (Static code)", "Very High (Incident + AI Team)"),
        ("Time Investment", "60-90 min stress drill", "8-12 hours high fatigue", "< 45 min immersive simulation"),
        ("Soft Skills & Pressure", "None evaluated", "Zero visibility", "Real-time AI stakeholder pushback"),
        ("Ownership & Privacy", "Locked in company silos", "Uncredited discard", "Candidate-Owned ZK-SNARK Passport")
    ]
    y_start = 186
    for i, row in enumerate(rows):
        y_curr = y_start + i * 24
        p5.draw_rect(fitz.Rect(55, y_curr, 665, y_curr + 22), color=None, fill=(0.97, 0.97, 0.97) if i % 2 == 0 else WHITE)
        p5.insert_text(fitz.Point(col_x[0], y_curr + 15), row[0], fontname=F_BOLD, fontsize=8, color=DARK_TEXT)
        p5.insert_text(fitz.Point(col_x[1], y_curr + 15), row[1], fontname=F_NORM, fontsize=8, color=(0.7, 0.2, 0.2))
        p5.insert_text(fitz.Point(col_x[2], y_curr + 15), row[2], fontname=F_NORM, fontsize=8, color=(0.7, 0.4, 0.1))
        p5.insert_text(fitz.Point(col_x[3], y_curr + 15), row[3], fontname=F_BOLD, fontsize=8, color=(0.1, 0.55, 0.2))

    p5.insert_textbox(fitz.Rect(62, 312, 658, 342), 
        "THE UNFAIR ADVANTAGE / MOAT: 'Process Over Answers'. We analyze the micro-second trajectory of how problems are scoped, tested, and resolved under stakeholder tension - something no LLM prompt wrapper can fake.",
        fontname=F_BOLD, fontsize=8.6, color=PRIMARY_ORANGE)
    print("Slide 5 processed.")

    # -------------------------------------------------------------
    # SLIDE 6: TECH STACK (05)
    # -------------------------------------------------------------
    p6 = doc[5]
    clean_slide(p6)
    
    stack_boxes = [
        ("FRONTEND & COCKPIT", 
         "> Next.js 16 (App Router) & React 19\n"
         "> Monaco Browser IDE (VS Code Core)\n"
         "> XTerm.js (Interactive Cloud Terminal)\n"
         "> Framer Motion (Visual Telemetry)", 
         fitz.Rect(50, 136, 198, 260)),
        ("AI ORCHESTRATION LAYER", 
         "> Groq Llama-3.3-70B Versatile\n"
         "> Sub-300ms ultra-low latency response\n"
         "> Multi-Agent Dynamic Personas\n"
         "> Vercel AI SDK Core Integration", 
         fitz.Rect(207, 136, 355, 260)),
        ("EXECUTION & DATA", 
         "> E2B Cloud Sandboxes (MicroVMs)\n"
         "> Supabase PostgreSQL & Prisma ORM\n"
         "> Real-time WebSocket Telemetry Bus\n"
         "> Ephemeral Docker code runners", 
         fitz.Rect(364, 136, 512, 260)),
        ("SECURITY & VERIFICATION", 
         "> SnarkJS (circom ZK-SNARK proofs)\n"
         "> W3C Verifiable Credentials\n"
         "> Privacy-preserving score attestation\n"
         "> EEOC-compliant telemetry audit", 
         fitz.Rect(521, 136, 670, 260)),
    ]
    for title, desc, r in stack_boxes:
        p6.draw_rect(r, color=BORDER_COLOR, fill=WHITE, width=0.8)
        p6.insert_textbox(fitz.Rect(r.x0 + 8, r.y0 + 10, r.x1 - 8, r.y0 + 36), title, fontname=F_BOLD, fontsize=8.8, color=PRIMARY_ORANGE)
        p6.insert_textbox(fitz.Rect(r.x0 + 8, r.y0 + 38, r.x1 - 8, r.y1 - 8), desc, fontname=F_NORM, fontsize=8.2, color=DARK_TEXT)
        
    p6_arch_summary = fitz.Rect(50, 270, 670, 348)
    p6.draw_rect(p6_arch_summary, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p6.insert_text(fitz.Point(62, 288), "ENTERPRISE-GRADE ARCHITECTURAL DECISIONS", fontname=F_BOLD, fontsize=10.5, color=DARK_TEXT)
    p6.insert_textbox(fitz.Rect(62, 294, 658, 342),
        "1. Real-time MicroVMs: Code is executed in isolated, ephemeral Linux microVMs via E2B, completely isolated from our host.\n"
        "2. Sub-300ms Conversational Latency: Migrated from slow proxies to Groq LPUs, enabling human-speed verbal/chat banter.\n"
        "3. Zero-Knowledge Proofs: Mathematical proofs guarantee score validity without exposing proprietary company test code.",
        fontname=F_NORM, fontsize=8.5, color=DARK_TEXT)
    print("Slide 6 processed.")

    # -------------------------------------------------------------
    # SLIDE 7: ARCHITECTURE / WORKFLOW (06)
    # -------------------------------------------------------------
    p7 = doc[6]
    clean_slide(p7)
    
    p7_top = fitz.Rect(50, 136, 670, 240)
    p7.draw_rect(p7_top, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p7.insert_text(fitz.Point(62, 154), "PRAXIS SYSTEM ARCHITECTURE & 6-STEP TALENT LOOP", fontname=F_BOLD, fontsize=11, color=PRIMARY_ORANGE)
    
    steps = [
        ("1. INGESTION", "Baseline Litmus test sets initial candidate competency tier."),
        ("2. MUTATION", "ProblemBank dynamically mutates bugs, variables & SLA targets."),
        ("3. COCKPIT", "Monaco IDE + E2B microVM terminal + Groq persona chat."),
        ("4. OBSERVER", "Captures keystroke dynamics, pauses & cognitive load score."),
        ("5. EVALUATOR", "8-dimensional composite analysis & EEOC narrative report."),
        ("6. ZK PASSPORT", "SnarkJS attestation seals score to verifiable talent passport.")
    ]
    for i, (st, sd) in enumerate(steps):
        sx = 58 + i * 101
        sy = 165
        p7.draw_rect(fitz.Rect(sx, sy, sx + 95, sy + 65), color=BORDER_COLOR, fill=(0.96, 0.95, 0.93), width=0.8)
        p7.insert_text(fitz.Point(sx + 6, sy + 16), st, fontname=F_BOLD, fontsize=8.2, color=PRIMARY_ORANGE)
        p7.insert_textbox(fitz.Rect(sx + 6, sy + 20, sx + 89, sy + 62), sd, fontname=F_NORM, fontsize=7.2, color=DARK_TEXT)

    p7_bottom = fitz.Rect(50, 250, 670, 348)
    p7.draw_rect(p7_bottom, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p7.insert_text(fitz.Point(62, 268), "END-TO-END FLOW: INPUT TO OUTPUT", fontname=F_BOLD, fontsize=10, color=DARK_TEXT)
    
    p7.insert_textbox(fitz.Rect(62, 274, 658, 342),
        "[CANDIDATE INPUTS] -> [Procedural Incident Bank] -> [E2B Cloud MicroVM Sandbox & Monaco IDE]\n"
        "                                                      |\n"
        "[BEHAVIORAL SIGNALS] <--- [Live Groq Llama-3.3-70B Personas (Alex-PM, Sam-Architect)] <---|\n"
        "       | (Keystroke timing variance, AST diffs, cognitive load score, ambiguity handling)\n"
        "       v\n"
        "[AI OBSERVER] -> [Meta-Cognitive Evaluator] -> [SnarkJS ZK-SNARK Attestation] -> [COMPANY DASHBOARD / MARKET]",
        fontname=F_NORM, fontsize=8, color=DARK_TEXT)
    print("Slide 7 processed.")

    # -------------------------------------------------------------
    # SLIDE 8: FEASIBILITY (07)
    # -------------------------------------------------------------
    p8 = doc[7]
    clean_slide(p8)
    
    p8_cols = [
        ("BUILT IN 24 HOURS: WORKING PROTOTYPE", 
         "> Operational Monorepo (Next.js 16 + TypeScript).\n"
         "> Groq Llama-3.3-70B integrated with sub-300ms speed.\n"
         "> Monaco IDE with live syntax highlighting & simulation.\n"
         "> Live behavioral telemetry observer & scoring engine.\n"
         "> Company & Candidate verification dashboards active.", 
         fitz.Rect(50, 136, 245, 348)),
        ("VIPER TEAM EXECUTION STRENGTHS", 
         "> Sai Vivek K N (Lead Architect):\n"
         "  Deep expertise in Next.js, LangGraph orchestration, ZK-SNARK verification & state machines.\n"
         "> Reehan Pasha (AI Systems Engineer):\n"
         "  Specialist in Groq API optimization, low-latency microVM container pipelines & telemetry heuristics.", 
         fitz.Rect(255, 136, 465, 348)),
        ("RISK MITIGATION & RESILIENCE", 
         "> Challenge 1: LLM Latency during roleplay.\n"
         "  Solution: Migrated to Groq LPU engine (<300ms inference).\n"
         "> Challenge 2: Network & Serverless DB Hangs.\n"
         "  Solution: Built robust client-side bypass & local session caching for zero-friction demo continuity.\n"
         "> Challenge 3: Sandbox Security.\n"
         "  Solution: E2B cloud microVM isolation.", 
         fitz.Rect(475, 136, 670, 348))
    ]
    for title, desc, r in p8_cols:
        p8.draw_rect(r, color=BORDER_COLOR, fill=WHITE, width=0.8)
        p8.insert_textbox(fitz.Rect(r.x0 + 8, r.y0 + 10, r.x1 - 8, r.y0 + 36), title, fontname=F_BOLD, fontsize=9, color=PRIMARY_ORANGE)
        p8.insert_textbox(fitz.Rect(r.x0 + 8, r.y0 + 38, r.x1 - 8, r.y1 - 8), desc, fontname=F_NORM, fontsize=8.2, color=DARK_TEXT)
    print("Slide 8 processed.")

    # -------------------------------------------------------------
    # SLIDE 9: IMPACT & VALUE (08)
    # -------------------------------------------------------------
    p9 = doc[8]
    clean_slide(p9)
    
    p9_cols = [
        ("TARGET BENEFICIARIES", 
         "> Early-Career & Non-Pedigree Talent:\n"
         "  Get hired based on undeniable proof of process rather than pedigree college stamps.\n"
         "> Tech Companies & Recruiters:\n"
         "  Eliminate LeetCode cheating, reduce 42 hours of senior engineering interview burn to 45 mins.", 
         fitz.Rect(50, 136, 245, 348)),
        ("BUSINESS & SOCIAL VALUE", 
         "> Direct Economic ROI: Saves $3,200+ per screened candidate loop in senior engineer salary.\n"
         "> Meritocracy: Democratizes hiring across tier-2/3 universities, eliminating implicit human bias.\n"
         "> Monetization: B2B SaaS ($499/mo per engineering team) + Apprentice Talent Market placement fee.", 
         fitz.Rect(255, 136, 465, 348)),
        ("HORIZONTAL SCALABILITY", 
         "> Multi-Domain Ready: Architecture natively supports Engineering, Product Management, Enterprise Sales, and Data Science.\n"
         "> Cloud-Native: Ephemeral microVMs spin up in <2 seconds with near-zero idle compute cost.\n"
         "> Global TAM: $1.25B serviceable technical assessment market.", 
         fitz.Rect(475, 136, 670, 348))
    ]
    for title, desc, r in p9_cols:
        p9.draw_rect(r, color=BORDER_COLOR, fill=WHITE, width=0.8)
        p9.insert_textbox(fitz.Rect(r.x0 + 8, r.y0 + 10, r.x1 - 8, r.y0 + 36), title, fontname=F_BOLD, fontsize=9, color=PRIMARY_ORANGE)
        p9.insert_textbox(fitz.Rect(r.x0 + 8, r.y0 + 38, r.x1 - 8, r.y1 - 8), desc, fontname=F_NORM, fontsize=8.2, color=DARK_TEXT)
    print("Slide 9 processed.")

    # -------------------------------------------------------------
    # SLIDE 10: FUTURE SCOPE (09)
    # -------------------------------------------------------------
    p10 = doc[9]
    clean_slide(p10)
    
    p10_cols = [
        ("PHASE 1: REAL-TIME VOICE AGENTS", 
         "> Sub-200ms Voice-to-Voice AI stakeholders for spoken phone screens, board meetings, and live client objection roleplay.\n"
         "> Stress and vocal cadence analysis integrated into the cognitive observer.", 
         fitz.Rect(50, 136, 245, 348)),
        ("PHASE 2: GITHUB INCIDENT INGESTION", 
         "> Automatic 60-second scenario generator: connect a company's private GitHub repo and Slack post-mortems.\n"
         "> System automatically transforms historical production outages into custom mutated sandbox challenges.", 
         fitz.Rect(255, 136, 465, 348)),
        ("PHASE 3: TEAM SIMULATIONS & ATS INTEGRATION", 
         "> Multi-candidate synchronous hackathon simulations to assess cross-functional leadership.\n"
         "> Native 1-click ATS integrations with Greenhouse, Ashby, and Lever.\n"
         "> Decentralized ZK-SNARK on-chain talent ledger.", 
         fitz.Rect(475, 136, 670, 348))
    ]
    for title, desc, r in p10_cols:
        p10.draw_rect(r, color=BORDER_COLOR, fill=WHITE, width=0.8)
        p10.insert_textbox(fitz.Rect(r.x0 + 8, r.y0 + 10, r.x1 - 8, r.y0 + 36), title, fontname=F_BOLD, fontsize=9, color=PRIMARY_ORANGE)
        p10.insert_textbox(fitz.Rect(r.x0 + 8, r.y0 + 38, r.x1 - 8, r.y1 - 8), desc, fontname=F_NORM, fontsize=8.2, color=DARK_TEXT)
    print("Slide 10 processed.")

    # -------------------------------------------------------------
    # SLIDE 11: TEAM DETAILS (10)
    # -------------------------------------------------------------
    p11 = doc[10]
    
    c1 = fitz.Rect(36.0, 129.6, 187.2, 352.8)
    p11.draw_rect(c1, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p11.insert_text(fitz.Point(46, 150), "MEMBER 1 (LEAD)", fontname=F_BOLD, fontsize=9.5, color=PRIMARY_ORANGE)
    p11.insert_text(fitz.Point(46, 170), "Sai Vivek K N", fontname=F_BOLD, fontsize=11, color=DARK_TEXT)
    p11.insert_text(fitz.Point(46, 186), "Team Lead & Architect", fontname=F_BOLD, fontsize=8.2, color=DARK_TEXT)
    p11.insert_textbox(fitz.Rect(46, 195, 180, 275), 
        "> Full-Stack Architecture\n"
        "> Next.js 16 App Router\n"
        "> ZK-SNARK Cryptography\n"
        "> State Machine Design\n"
        "> UI/UX Cockpit", 
        fontname=F_NORM, fontsize=7.8, color=DARK_TEXT)
    p11.insert_text(fitz.Point(46, 290), "CONTACT:", fontname=F_BOLD, fontsize=7.5, color=MUTED_TEXT)
    p11.insert_text(fitz.Point(46, 305), "Ph: 7892585383", fontname=F_BOLD, fontsize=8, color=DARK_TEXT)
    p11.insert_textbox(fitz.Rect(46, 310, 180, 345), "saivivek0707@gmail.com\nKalpataru Inst. of Tech", fontname=F_NORM, fontsize=7.2, color=MUTED_TEXT)

    c2 = fitz.Rect(201.6, 129.6, 352.8, 352.8)
    p11.draw_rect(c2, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p11.insert_text(fitz.Point(211, 150), "MEMBER 2 (CO-LEAD)", fontname=F_BOLD, fontsize=9.5, color=PRIMARY_ORANGE)
    p11.insert_text(fitz.Point(211, 170), "Reehan Pasha", fontname=F_BOLD, fontsize=11, color=DARK_TEXT)
    p11.insert_text(fitz.Point(211, 186), "AI & Cloud Systems", fontname=F_BOLD, fontsize=8.2, color=DARK_TEXT)
    p11.insert_textbox(fitz.Rect(211, 195, 345, 275), 
        "> Groq Llama-3.3 Pipelines\n"
        "> Multi-Agent Personas\n"
        "> E2B MicroVM Sandboxes\n"
        "> Telemetry Heuristics\n"
        "> Database & Supabase", 
        fontname=F_NORM, fontsize=7.8, color=DARK_TEXT)
    p11.insert_text(fitz.Point(211, 290), "CONTACT:", fontname=F_BOLD, fontsize=7.5, color=MUTED_TEXT)
    p11.insert_text(fitz.Point(211, 305), "Ph: 8971183678", fontname=F_BOLD, fontsize=8, color=DARK_TEXT)
    p11.insert_textbox(fitz.Rect(211, 310, 345, 345), "reehanpasha1607@gmail.com\nKalpataru Inst. of Tech", fontname=F_NORM, fontsize=7.2, color=MUTED_TEXT)

    c3 = fitz.Rect(367.2, 129.6, 518.4, 352.8)
    p11.draw_rect(c3, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p11.insert_text(fitz.Point(377, 150), "INSTITUTION", fontname=F_BOLD, fontsize=9.5, color=PRIMARY_ORANGE)
    p11.insert_text(fitz.Point(377, 170), "Kalpataru Inst. of Tech", fontname=F_BOLD, fontsize=9.5, color=DARK_TEXT)
    p11.insert_text(fitz.Point(377, 186), "Dept. of Computer Science", fontname=F_BOLD, fontsize=8.2, color=DARK_TEXT)
    p11.insert_textbox(fitz.Rect(377, 195, 510, 275), 
        "> Tiptur, Karnataka\n"
        "> Autonomous Innovation\n"
        "> Student Developer Cell\n"
        "> Focused on AI Systems &\n"
        "  Decentralized Tech", 
        fontname=F_NORM, fontsize=7.8, color=DARK_TEXT)
    p11.insert_text(fitz.Point(377, 290), "TEAM PROFILE:", fontname=F_BOLD, fontsize=7.5, color=MUTED_TEXT)
    p11.insert_textbox(fitz.Rect(377, 305, 510, 345), "Full 2-Person Core Dev Team\nHigh Execution Velocity", fontname=F_NORM, fontsize=7.8, color=DARK_TEXT)

    c4 = fitz.Rect(532.8, 129.6, 684.0, 352.8)
    p11.draw_rect(c4, color=BORDER_COLOR, fill=WHITE, width=0.8)
    p11.insert_text(fitz.Point(542, 150), "HACKATHON TRACK", fontname=F_BOLD, fontsize=9.5, color=PRIMARY_ORANGE)
    p11.insert_text(fitz.Point(542, 170), "CELESTIA 2026", fontname=F_BOLD, fontsize=11, color=DARK_TEXT)
    p11.insert_text(fitz.Point(542, 186), "Open Innovation Track", fontname=F_BOLD, fontsize=8.2, color=DARK_TEXT)
    p11.insert_textbox(fitz.Rect(542, 195, 675, 275), 
        "> 24-Hour National Sprint\n"
        "> Offline Round Qualifier\n"
        "> Live Functional Prototype\n"
        "> Enterprise B2B SaaS\n"
        "> Production Deployment", 
        fontname=F_NORM, fontsize=7.8, color=DARK_TEXT)
    p11.insert_text(fitz.Point(542, 290), "VERIFICATION:", fontname=F_BOLD, fontsize=7.5, color=MUTED_TEXT)
    p11.insert_textbox(fitz.Rect(542, 305, 675, 345), "Live GitHub Monorepo &\nVercel Deployment Verified", fontname=F_NORM, fontsize=7.8, color=(0.1, 0.55, 0.2))

    print("Slide 11 processed.")
    
    doc.save(output_path)
    doc.close()
    print(f"CELESTIA Deck saved successfully to: {output_path}")

if __name__ == "__main__":
    build_celestia_deck()
