import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { DOMAIN_PERSONAS, Persona } from "../../../../lib/agents/personas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GEMINI_LIVE_MODEL = "gemini-2.5-flash-native-audio-latest";

export interface SessionRequestBody {
  mode?: "persona" | "guide";
  domain?: string;
  problemTitle?: string;
  scenario?: string;
  personaName?: string;
}

export interface VoiceToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface SessionResponseBody {
  token: string;
  config: {
    model: string;
    systemInstruction: string;
    voice: string;
    tools?: VoiceToolDeclaration[];
  };
}

export interface SessionErrorResponse {
  error: string;
}

/**
 * Builds the system instruction prompt and voice configuration based on mode.
 */
function buildSessionConfig(
  mode: "persona" | "guide",
  domain: string,
  problemTitle: string,
  scenario: string,
  personaName?: string
): {
  systemInstruction: string;
  voice: string;
  tools?: VoiceToolDeclaration[];
} {
  if (mode === "guide") {
    const guideInstruction = [
      "You are the PRAXIS Guide, a mentor and technical co-pilot assisting a candidate during a hiring assessment simulation.",
      "Context:",
      `Problem: ${problemTitle}`,
      `Scenario: ${scenario}`,
      "",
      "BEHAVIORAL RULES:",
      "1. Engage in natural 2-way spoken dialogue with the candidate.",
      "2. When the candidate executes terminal commands or code actions, proactively speak up with a crisp 1-sentence observation or encouraging technical tip.",
      "3. When the candidate asks you questions or pauses, guide them with Socratic questions without spoiling the full solution.",
      "4. Keep all spoken responses strictly 1 to 2 sentences, conversational, warm, and natural.",
      "5. Never break character as an encouraging, rigorous mentor.",
    ].join("\n");

    const tools: VoiceToolDeclaration[] = [
      {
        name: "log_event",
        description:
          "Log coaching events, observations, or guidance interventions during the candidate assessment",
        parameters: {
          type: "OBJECT",
          properties: {
            event: {
              type: "STRING",
              description:
                "Short category or title of the coaching event (e.g., 'hint_given', 'mistake_prevented', 'idle_nudge')",
            },
            detail: {
              type: "STRING",
              description:
                "Detailed description of the observation or coaching intervention",
            },
          },
          required: ["event", "detail"],
        },
      },
    ];

    return {
      systemInstruction: guideInstruction,
      voice: "Puck",
      tools,
    };
  }

  // Persona Mode: roleplay domain stakeholder
  const normalizedDomain = domain.toLowerCase();
  const domainPersonas: Persona[] =
    DOMAIN_PERSONAS[normalizedDomain] || DOMAIN_PERSONAS["engineering"];

  let selectedPersona: Persona = domainPersonas[0];
  if (personaName) {
    const matched = domainPersonas.find(
      (p) => p.name.toLowerCase() === personaName.trim().toLowerCase()
    );
    if (matched) {
      selectedPersona = matched;
    }
  }

  const promptInjection = selectedPersona.generatePromptInjection();
  const sessionContext = [
    "",
    "SESSION CONTEXT:",
    `Problem: ${problemTitle}`,
    `Scenario: ${scenario}`,
    "You are in an active live 2-way spoken conversation with the candidate. Speak naturally, concisely (1-2 sentences), and react promptly when they speak or take actions in the workspace.",
  ].join("\n");

  return {
    systemInstruction: `${promptInjection}\n${sessionContext}`,
    voice: "Aoede",
  };
}

export async function POST(
  req: Request
): Promise<NextResponse<SessionResponseBody | SessionErrorResponse>> {
  try {
    // 1. Guard against missing or empty GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // 2. Defensive request body parsing
    let body: SessionRequestBody = {};
    try {
      const rawText = await req.text();
      if (rawText && rawText.trim().length > 0) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          return NextResponse.json(
            { error: "Malformed JSON in request body." },
            {
              status: 400,
              headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
              },
            }
          );
        }

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return NextResponse.json(
            { error: "Invalid JSON body. Expected an object." },
            {
              status: 400,
              headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
              },
            }
          );
        }
        body = parsed as SessionRequestBody;
      }
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON in request body." },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // 3. Validate mode parameter
    const rawMode = typeof body.mode === "string" ? body.mode.trim() : body.mode;
    const mode = rawMode === undefined || rawMode === "" ? "persona" : rawMode;
    if (mode !== "persona" && mode !== "guide") {
      return NextResponse.json(
        { error: "Invalid mode. Expected 'persona' or 'guide'." },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    const domain = typeof body.domain === "string" ? body.domain.trim() || "engineering" : "engineering";
    const problemTitle = typeof body.problemTitle === "string" ? body.problemTitle.trim() || "Assessment Simulation" : "Assessment Simulation";
    const scenario = typeof body.scenario === "string" ? body.scenario.trim() || "Technical hiring assessment" : "Technical hiring assessment";
    const personaName = typeof body.personaName === "string" ? body.personaName.trim() || undefined : undefined;

  // 4. Construct system instruction, voice, and tools
  const { systemInstruction, voice, tools } = buildSessionConfig(
    mode,
    domain,
    problemTitle,
    scenario,
    personaName
  );

  // 5. Ephemeral Token Minting via GoogleGenAI
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "v1alpha" },
  });

  const now = Date.now();
  const expireTime = new Date(now + 10 * 60 * 1000).toISOString(); // 10 minutes session TTL
  const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString(); // 2 minutes WS connection deadline

  let tokenName: string | undefined;

  // Primary strategy: mint with liveConnectConstraints
  try {
    const tokenResponse = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: `models/${GEMINI_LIVE_MODEL}`,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice,
                },
              },
            },
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
          },
        },
      },
    });

    tokenName = tokenResponse.name;
  } catch (primaryErr) {
    const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    // Sanitize any API key occurrences
    const sanitizedPrimary = primaryMsg.replaceAll(apiKey, "[REDACTED]");
    console.warn(
      "[Voice Session API] Primary constrained token creation failed, trying fallback:",
      sanitizedPrimary
    );

    // Fallback strategy 1: mint with minimal audio modality constraint
    try {
      const fallbackResponse = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime,
          newSessionExpireTime,
          liveConnectConstraints: {
            model: `models/${GEMINI_LIVE_MODEL}`,
            config: {
              responseModalities: [Modality.AUDIO],
            },
          },
        },
      });

      tokenName = fallbackResponse.name;
    } catch (fallbackErr) {
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      const sanitizedFallback = fallbackMsg.replaceAll(apiKey, "[REDACTED]");
      console.warn(
        "[Voice Session API] Modal-constrained token creation failed, trying base token:",
        sanitizedFallback
      );

      // Fallback strategy 2: mint unconstrained ephemeral token (client passes full config on connect)
      try {
        const baseResponse = await ai.authTokens.create({
          config: {
            uses: 1,
            expireTime,
            newSessionExpireTime,
          },
        });

        tokenName = baseResponse.name;
      } catch (finalErr) {
        const rawFinalMsg = finalErr instanceof Error ? finalErr.message : String(finalErr);
        const sanitizedFinal = rawFinalMsg.replaceAll(apiKey, "[REDACTED]");
        console.error("[Voice Session API] Token minting failed:", sanitizedFinal);

        if (sanitizedFinal.includes("429") || sanitizedFinal.includes("RESOURCE_EXHAUSTED")) {
          return NextResponse.json(
            { error: "Gemini Live rate limit exceeded. Please try again shortly." },
            {
              status: 429,
              headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
              },
            }
          );
        }

        if (
          sanitizedFinal.includes("401") ||
          sanitizedFinal.includes("403") ||
          sanitizedFinal.includes("API_KEY_INVALID")
        ) {
          return NextResponse.json(
            { error: "Authentication failed with Gemini Live API. Please check your GEMINI_API_KEY." },
            {
              status: 500,
              headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate",
              },
            }
          );
        }

        return NextResponse.json(
          { error: "Failed to mint ephemeral voice session token." },
          {
            status: 500,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          }
        );
      }
    }
  }

  if (!tokenName) {
    return NextResponse.json(
      { error: "Google GenAI authentication service returned an empty token." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  // 6. Return ephemeral token with session configuration
  return NextResponse.json(
    {
      token: tokenName,
      config: {
        model: GEMINI_LIVE_MODEL,
        systemInstruction,
        voice,
        tools,
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
  } catch (unhandledErr) {
    const errorMsg = unhandledErr instanceof Error ? unhandledErr.message : String(unhandledErr);
    console.error("[Voice Session API] Unexpected handler error:", errorMsg);
    return NextResponse.json(
      { error: "Internal server error." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
