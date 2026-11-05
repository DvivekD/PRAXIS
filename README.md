# PRAXIS
> **Agentic AI Hiring-Assessment Platform**  
> Mutated problem simulations, behavioral observer tracking, and real-time AI voice agents for candidate evaluations.

---

## 🎙️ Real-Time Gemini Live Voice Agent

PRAXIS features a two-way, low-latency AI voice agent powered by the **Google Gemini Live API** (free tier via `@google/genai`).

### Key Capabilities
- **Direct Ephemeral Authentication**: Server-side token minting via `/api/voice/session` using `liveConnectConstraints` with zero browser API key exposure.
- **Sample-Accurate Web Audio Graph**: 16 kHz mono 16-bit linear PCM microphone streaming, 24 kHz model speech decoding, and `GainNode → AnalyserNode → Destination` routing powering the real-time 3D avatar lip-sync in `AvatarScene`.
- **Instant Barge-In**: User interruptions cancel scheduled audio buffers immediately.

### Modes
1. **Persona Mode (Roleplay Stakeholder)**:
   - Voice: `Aoede`
   - Roleplays as the active domain stakeholder (e.g., Alex Chen in Engineering, Jordan Mitchell in Sales).
   - Candidate speech turns bridge directly into `sendMessageAction` to drive cognitive load tracking, behavioral dimensions, and transcript evaluation.
2. **Guide Mode (Proactive Mentor / Co-Pilot)**:
   - Voice: `Puck`
   - A silent technical mentor observing candidate problem-solving.
   - Proactively offers Socratic hints and nudges when the candidate is stuck (>60s inactivity) or about to execute destructive operations.
   - Pushes debounced editor telemetry (`[CONTEXT] ...`) and logs coach interventions via the `log_event` tool.

---

## 🚀 Getting Started

### 1. Environment Setup
Copy the example environment file:
```bash
cp apps/web/.env.example apps/web/.env
```

Add your free **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com):
```env
GEMINI_API_KEY="your-gemini-api-key"
```
*(Free tier includes Gemini Live WebSockets and token creation with no billing required).*

### 2. Install & Run
```bash
pnpm install
pnpm dev
```
Navigate to `http://localhost:3000/simulation/{sessionId}` to test live assessments with the 3D Avatar and Voice Agent.
