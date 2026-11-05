# PRAXIS - System Memory Log

## Persistent Facts & User Preferences
- **Team**: VIPER
  - Sai Vivek K N: `saivivek0707@gmail.com` | `7892585383` (Team Lead & Full-Stack Architect)
  - Reehan Pasha: `reehanpasha1607@gmail.com` | `8971183678` (AI Systems & Infrastructure)
  - Institution: Kalpataru Institute of Technology (KIT), Tiptur
- **Primary AI Provider**: Groq API (`llama-3.3-70b-versatile`) via `@ai-sdk/groq` for ultra-low latency (<300ms) roleplay agents.
- **Database**: Supabase PostgreSQL configured via Prisma.
- **Demo Strategy**: Client-side bypass & fallback mock data to prevent hangs when serverless DB connection experiences cold-starts or network drops.
- **Core Mission**: Redevelop PRAXIS into a complete, finished, enhanced production-ready platform.

## Chronological Decisions
- **2026-05**: Swapped broken local Vertex AI proxy to Groq Cloud SDK.
- **2026-10**: Prepared hackathon decks for CELESTIA & COLOSSUS 3.0.
- **2026-11**: Initiating complete health check & comprehensive redevelopment cycle.
- **2026-11-05 (Hackathon Production Hotfix)**:
  - Fixed simulation page crash ("This page couldn't load") on problem selection by guarding `useParams`/`useSearchParams`, dynamically importing Monaco Editor with `ssr: false`, and adding resilient localStorage try/catch fallback.
  - Added custom cyberpunk error boundaries (`simulation/[sessionId]/error.tsx` and `app/error.tsx`).
  - Fixed Gemini Live voice connection: resolved WebSocket error 1008 by upgrading model from deprecated `gemini-2.0-flash-exp` to `gemini-2.5-flash-native-audio-latest`.
  - Mounted `<VoiceSession>` into `SimulationPage` with real-time `analyserNode` lip-sync wiring to `<AvatarScene>` and interactive AI Guide Coach Log drawer.
  - Resolved background noise and self-interruption loop by adding RMS energy Voice Activity Detection (VAD) noise gate, acoustic feedback suppression during model speech, and 350ms speech hangover.
  - Implemented 1-way proactive spoken responses using `sendClientContent` for terminal commands and idle nudges, alongside conversational 2-way dialogue.
  - Successfully deployed and verified live on `https://praxis-iota-puce.vercel.app/`.
- **2026-11-05 (Hackathon Immersion & Domain Environments Rework)**:
  - Resolved Minified React Error #310: restructured `simulation/[sessionId]/page.tsx` hook order so all `useCallback`, `useEffect`, `useState`, and `useRef` calls execute unconditionally before any early returns.
  - Resolved Voice Agent silence by ensuring persistent `<VoiceSession>` mounting and audio stream resumption on user interaction.
  - Aligned `/select-domain` and `/seeker/dashboard` with 7 dedicated workplace domains set in the unified universe of **Aura Commerce** facing a Black Friday checkout concurrency crisis.
  - Authored 7 distinct, highly polished workplace environments under `apps/web/components/Environments/`:
    1. `TerminalEnvironment.tsx` (Engineering): live SSH Linux terminal with `ls`, `cat`, `git log`, `npm test` (red -> green), and idempotency concurrency fix.
    2. `SalesCallEnvironment.tsx` (Sales - Demo Star): softphone console with prospect brief, live waveform/timer, Gemini Live real-time audio + transcript, notes scratchpad, checkable milestones, calendar meeting booking win, and text-chat fallback.
    3. `InboxEnvironment.tsx` (Product): executive email client with 4 incoming stakeholder emails, Sev-1 checkout bug triage, and incident protocol publisher.
    4. `DataWorkspaceEnvironment.tsx` (Data): schema browser, SQL editor, and live animated SVG line chart that corrects an anomalous +40% DAU spike when `DISTINCT` is added.
    5. `WarRoomEnvironment.tsx` (SRE): dark war room with Sev-1 pulsing banner, dual live charts (error rate vs conversion), team chat with Alex Chen, and 1-click rollback to v2.4.0 that recovers metrics over 30s.
    6. `HelpdeskEnvironment.tsx` (Customer Support): ticket queue with ticking SLA counters, customer profiles, communication tone selector, and 1-click batch escalation to SRE.
    7. `SocialCommandEnvironment.tsx` (Brand / Crisis): live mentions feed, brand voice guidelines, crisis response publisher, and real-time sentiment dial that swings to 86% Positive.
  - Added floating `DemoPitchGuide.tsx` cheat-sheet with 3-minute pitch instructions and 1-click walkthrough quick-solves for judges.
  - Verified 100% clean Next.js 16.2.6 Turbopack production build and 27/27 passing unit & adversarial stress tests.
- **2026-11-05 (Scope 2: Sales — Save the $250K Renewal Sub-Environments)**:
  - Built the complete 3-sub-environment architecture under `apps/web/components/Environments/Sales/`:
    1. `LiveSalesCallSubEnv.tsx`: Real-time voice simulation with Sam Jenkins (VP Retail, Nordic Goods), dynamic audio waveform visualizer, Web Speech synthesis with Web Audio oscillator fallback, objection handling battlecards (concurrency SLA, CommerceCloud take-rate FUD), mid-call scratchpad syncing to CRM, discovery milestones, booking calendar, and embedded 3D Observer Avatar.
    2. `PitchNegotiationSubEnv.tsx`: Tailored 5-slide sales pitch builder ($14.2M Black Friday GMV protection, atomic pre-charge resolution proof, Aura vs CommerceCloud vs Shopify Plus competitive matrix, interactive proposal calculator with term/prepay discounts, mutual action plan), real-time simulated stakeholder buy-in radar, and 3D Observer Avatar HUD.
    3. `SalesforceCrmSubEnv.tsx`: Authentic Salesforce Lightning UI, 5-stage progression chevron bar, customer activity timeline audit trail, executive follow-up quote email composer, Deal Desk approval matrix & discount policy engine, Closed-Won celebration workflow, and 3D Observer Avatar HUD.
  - Exported all components and types through `apps/web/components/Environments/Sales/index.ts`.
  - Refactored `SalesCallEnvironment.tsx` to serve as master Scope 2 coordinator with seamless sub-environment tabs and shared `SalesDealState`.
  - Created rigorous verification suite `apps/web/tests/test_scope2_sales.mjs` (AST zero-any checks, SSR component rendering, pricing & Deal Desk policy validation) — 100% passing.
  - Verified 100% clean Next.js 16.2.6 Turbopack production build and strict TypeScript compilation (`tsc -p tsconfig.json --noEmit`).
- **2026-11-05 (Scope 7: Brand — The Viral Brand Crisis Sub-Environments)**:
  - Built the complete 3-sub-environment architecture under `apps/web/components/Environments/Brand/`:
    1. `SocialListeningSubEnv.tsx` (01 — Social Listening & Sentiment Monitor): Tweet / Instagram / Threads / Reddit live mention stream, viral quote-tweet cascade tracking (2,410 RTs, 8,920 QTs, reach metrics, velocity), trending keyword volume spikes (#AuraOutage +1,420%, charged twice +890%), and animated sentiment gauge.
- **2026-11-05 (Production Release: 21 Sub-Environments, 3D Observer Models, and Dual-Engine Voice)**:
  - Built all 7 domain scopes with exactly 3 authentic sub-environments each (21 total interactive problem arenas):
    1. Scope 1: Engineering (SSH Linux Terminal, Network Diagnostics Lab, Code Debugger).
    2. Scope 2: Sales (Live Voice Call with Sam Jenkins, Pitch Negotiation Builder, Salesforce CRM & Deal Desk).
    3. Scope 3: Product (Google Gmail Web Inbox, Linear/Jira Kanban Backlog, Mixpanel/Amplitude Analytics).
    4. Scope 4: Data (SQL Studio with Monaco & schema explorer, Airflow/dbt Pipeline Lab, Tableau/PowerBI Studio).
    5. Scope 5: SRE (Grafana & PromQL Observability, Incident Command War Room, Kubernetes 16-Pod Rollback Console).
    6. Scope 6: Support (Zendesk Helpdesk with live SLA timers, Customer Account Investigation, Unified SEV-1 Escalation).
    7. Scope 7: Brand (Social Listening & Sentiment Monitor, Brand Content Studio, Crisis Command Center).
  - Preserved the 4 original 3D observer models in `AvatarScene.tsx` (Engineering wireframe cube, Data particle stream, Sales audio-reactive sphere, Product interlocking tori) and developed the other 3 accordingly (SRE alert octahedron & ring, Support harmonic dodecahedron & satellites, Brand resonant wave spheres).
  - Integrated fail-proof Web Speech API (`webkitSpeechRecognition`) STT + Browser `window.speechSynthesis` TTS dual-engine fallback in `VoiceSession.tsx` to ensure real-time audio interaction never drops even if the Gemini Live WebSocket fails.
  - Eliminated UI anomalies (repositioned floating Demo Pitch Guide, unified button styling to dark cyber aesthetic, eliminated undefined `.includes` runtime crash in `simulation/[sessionId]/page.tsx`).
  - Updated Quick Navigation menu (`JudgeMenu.tsx`) with all 7 scopes and 21 sub-environments.
  - Successfully deployed to Vercel production: `https://praxis-iota-puce.vercel.app`.
    2. `BrandContentStudioSubEnv.tsx` (02 — Brand Content & Response Studio): Multi-part crisis public statement composer with live character counting & auto-thread splitting, 4 archetype presets, real-time Brand Voice Tone Analyzer testing (accountability vs defensiveness vs boilerplate), and high-fidelity social thread live preview.
    3. `CrisisCommandSubEnv.tsx` (03 — Crisis Command Center): Animated public sentiment recovery dial that surges from 28% Hostile to 86% Positive upon publishing an authentic, accountable statement, press inquiry queue with Tier-1 journalists (TechCrunch, Bloomberg, The Verge) and deadline countdowns, and executive PR Incident Report Generator.
  - Exported all shared types through `apps/web/components/Environments/Brand/types.ts`.
  - Refactored `SocialCommandEnvironment.tsx` into the master Scope 7 crisis desk hub with synchronized state, tab navigation across all 3 sub-environments, and a docked 3D Observer HUD panel embedding `AvatarScene` (with native `domain="brand"` radiant resonant media core and `#ec4899` cyber-magenta styling).
  - Wired real-time telemetry action `submitBrandCrisisAction` into `apps/web/actions/eval.ts` and calibrated domain-specific weights in `apps/web/lib/agents/evaluator.ts`.
  - Created functional test suite `apps/web/tests/test_scope7_brand.mjs` verifying all components, telemetry, and evaluators — 100% passing.
- **2026-11-05 (Scope 5: SRE — Site Reliability Engineering Sev-1 Outage Sub-Environments)**:
  - Built the complete 3-sub-environment architecture under `apps/web/components/Environments/SRE/`:
    1. `GrafanaMonitoringSubEnv.tsx` (01 — Observability & Monitoring): Dark Grafana/Prometheus dashboard with live SVG line waveforms for 5xx error rate (spikes to 42.8%, normalizes to 0.08%), p99 request latency (2850ms -> 42ms), CPU saturation (94% -> 22%), and pod saturation KPI cards; interactive PromQL Query Inspector with instant table/raw JSON outputs, execution latency metrics, and preset query templates; and interactive Service Health Matrix with 6 microservices (`checkout-api`, `payment-gateway-proxy`, `cart-service`, `order-db-primary`, `auth-service`, `inventory-cache`) and dependency inspector.
    2. `IncidentWarRoomSubEnv.tsx` (02 — Incident War Room / Command Center): Active incident timeline with chronological event log from deployment to resolution, live alert stack with P1/P2 severities (`CRITICAL`, `PAGE`, `WARNING`) and ACK handlers, interactive team chat channel `#war-room-sev1` with Alex Chen (Lead SRE), Datadog Bot, Statuspage Bot, and suggested quick action chips; public status page updater modal syncing to `status.auracommerce.com`; and Postmortem / RCA report generator with 5-whys and preventative canary gates.
    3. `KubernetesRollbackSubEnv.tsx` (03 — Deployment & Rollback Console): 16 Kubernetes pods dashboard with real-time status badges (12 `CrashLoopBackOff` pods transitioning to `Running (1/1 Ready)`), pod stdout/stderr terminal log inspector displaying real unhandled TypeError trace in checkout token validator, deployment revision history (`v2.4.1-hotfix` vs `v2.4.0`), 1-click zero-downtime rollback button triggering 7-phase MaxSurge rollout animation, and interactive kubectl CLI terminal.
  - Exported all shared types through `apps/web/components/Environments/SRE/types.ts` and barrel `index.ts`.
  - Refactored `WarRoomEnvironment.tsx` into the master Scope 5 coordinator orchestrating the 3 sub-environments with persistent navigation tabs, synchronized cluster state, and a docked/collapsible 3D Observer Avatar HUD panel embedding `AvatarScene` (with native `domain="sre"` octahedron reactor core, orbital ring lattice, and `#ef4444` -> `#22c55e` alert pulse).
  - Wired real server actions and telemetry in `apps/web/actions/eval.ts`: `submitSreTelemetryAction`, `executeSreRollbackAction`, and `fetchSreClusterTelemetryAction`.
  - Added dedicated SRE domain evaluation weights in `apps/web/lib/agents/evaluator.ts` prioritizing `errorRecovery` (25%) and `efficiency` (20%).
  - Created automated test suites `apps/web/tests/test_scope5_sre.mjs` and `apps/web/tests/test_scope5_sre_functional.mjs` — both 100% passing.
  - Verified 100% clean Next.js 16.2.6 Turbopack production build and workspace TypeScript compilation (`tsc -p tsconfig.json --noEmit`).
- **2026-11-05 (Scope 7: Brand — Deep Review, Defect Fixes & Production Hardening)**:
  - Fixed empty mentions list bug on keyword filtering in `SocialListeningSubEnv.tsx`: updated tweet copies to naturally include `#AuraOutage`, `charged twice`, `#boycottAura`, `checkout crash`, and `idempotency`, and implemented multi-word/hashtag flexible matching.
  - Added interactive search bar in `SocialListeningSubEnv.tsx` with instant mention & author filtering and clear button, resolving unused `searchQuery` state.
  - Fixed ghost state `customPressReply` in `CrisisCommandSubEnv.tsx`: implemented dedicated Journalist Briefing Composer for selected press inquiries with auto-fill recommendations and tailored dispatch.
  - Fixed stale tone report bypass in `BrandContentStudioSubEnv.tsx`: extracted `evaluateBrandTone()`, eliminated false blame penalty on partner bank reassurance phrases, and ensured `handlePublish` dynamically re-evaluates edited copy.
  - Created standard barrel file `apps/web/components/Environments/Brand/index.ts` exporting all sub-environments and types.
  - Eliminated dual WebGL canvas rendering overhead by configuring `ObserverWidget` to default to minimized when dedicated embedded observer HUDs exist (`brand`, `sales`, `support`).
  - Swapped static `AvatarScene` import to `dynamic(..., { ssr: false })` in `SocialCommandEnvironment.tsx` to prevent canvas SSR/hydration mismatches.
  - Synchronized `isComplete` logic with DB `completed` state in `submitBrandCrisisAction`.
  - Built comprehensive deep test harness `apps/web/tests/test_scope7_brand_deep.mjs` covering AST zero-any typing, SSR component rendering, tone analyzer heuristics, evaluator weights, and telemetry actions — 100% passing.
  - Confirmed 100% clean Next.js 16.2.6 Turbopack production build and strict TypeScript compilation (`tsc -p tsconfig.json --noEmit`).


