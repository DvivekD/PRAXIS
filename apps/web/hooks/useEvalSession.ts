import { useState, useCallback, useEffect } from "react";
import { TelemetryData } from "../lib/agents/observer";
import { startSimulationAction, sendMessageAction } from "../actions/eval";

export interface Message {
  role: "user" | "ai";
  content: string;
}

export interface EvalState {
  messages: Message[];
  cognitive_load_score: number;
  resolution_turns: number;
}

export function useEvalSession(initialSessionId?: string) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [sessionState, setSessionState] = useState<EvalState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = useCallback(async () => {
    if (initialSessionId) return; // Already have a session
    setLoading(true);
    setError(null);
    try {
      const data = await startSimulationAction("engineering", 80, "test-user-id");
      setSessionId(data.sessionId);
      setSessionState({
        messages: [],
        cognitive_load_score: 50,
        resolution_turns: 0,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [initialSessionId]);

  const sendMessage = useCallback(
    async (text: string, telemetry: TelemetryData = {
      flightTimeVariance: Math.random() * 50,
      pauseCount: Math.floor(Math.random() * 3),
      wordsPerMinute: 60 + Math.random() * 40,
      commands: ["run_tests"],
      activeTabs: ["docs"]
    }) => {
      if (!sessionId) return;
      setLoading(true);
      setError(null);

      // Optimistically add user message
      setSessionState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, { role: "user", content: text }],
        };
      });

      try {
        const data = await sendMessageAction(sessionId, text, telemetry);
        setSessionState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: [...prev.messages, { role: "ai", content: data.response }],
              cognitive_load_score: data.state.cognitiveLoadScore || 50,
              resolution_turns: prev.resolution_turns + 1
            };
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  const getState = useCallback(async () => {
    // Note: State polling logic would be implemented here or via specific server action
  }, [sessionId]);

  // Initial fetch if we provided an initial ID
  useEffect(() => {
    if (initialSessionId) {
      getState();
    }
  }, [initialSessionId, getState]);

  // Optional: Poll state every 5s if you want background updates
  // from async telemetry processing
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(getState, 5000);
    return () => clearInterval(interval);
  }, [sessionId, getState]);

  return {
    sessionId,
    sessionState,
    loading,
    error,
    startSession,
    sendMessage,
    getState,
  };
}
