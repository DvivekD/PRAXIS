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
