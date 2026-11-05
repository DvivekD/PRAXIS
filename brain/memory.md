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
