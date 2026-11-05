"use client";

import { useState, KeyboardEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEvalSession } from "../../hooks/useEvalSession";

export function ChatInterface({ activeSessionId }: { activeSessionId?: string }) {
  const router = useRouter();
  const { sessionId, sessionState, loading, error, startSession, sendMessage } = useEvalSession(activeSessionId);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Start session on mount if not started
  useEffect(() => {
    startSession();
  }, [startSession]);

  // Monitor resolution turns to route to results
  useEffect(() => {
    if (sessionState && sessionState.resolution_turns >= 10 && sessionId) {
      router.push(`/results/${sessionId}`);
    }
  }, [sessionState, sessionId, router]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionState?.messages]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (error) {
    return (
      <div style={{ padding: "16px", color: "#f85149", backgroundColor: "rgba(248, 81, 73, 0.1)", margin: "16px", borderRadius: "6px", border: "1px solid rgba(248, 81, 73, 0.4)" }}>
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>Connection Error</div>
        <div style={{ fontSize: "13px" }}>{error}</div>
      </div>
    );
  }

  const score = sessionState?.cognitive_load_score ?? 50;
  const isHighLoad = score > 70;
  const isLowLoad = score < 30;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", backgroundColor: "transparent" }}>
      {/* Header / Progress Bar */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #30363d", backgroundColor: "#161b22" }}>
        <div style={{ fontSize: "12px", marginBottom: "8px", display: "flex", justifyContent: "space-between", color: "#8b949e", fontWeight: 500 }}>
          <span>Cognitive Load Estimate</span>
          <span style={{ color: isHighLoad ? "#f85149" : isLowLoad ? "#3fb950" : "#d2a8ff" }}>{score}/100</span>
        </div>
        <div style={{ width: "100%", height: "4px", backgroundColor: "#21262d", borderRadius: "2px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${score}%`,
              backgroundColor: isHighLoad ? "#f85149" : isLowLoad ? "#3fb950" : "#d2a8ff",
              transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease"
            }}
          />
        </div>
      </div>

      {/* Message List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {sessionState?.messages.length === 0 && (
           <div style={{ margin: "auto", textAlign: "center", color: "#8b949e", fontSize: "13px", padding: "20px" }}>
             <svg style={{ margin: "0 auto 12px" }} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
             <p>Voice session initialized.</p>
             <p>Speak or type to communicate with the interviewer.</p>
           </div>
        )}
        {sessionState?.messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={idx}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                display: "flex",
                flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}
            >
              <div style={{ fontSize: "11px", color: "#8b949e", marginBottom: "4px", marginLeft: "4px", marginRight: "4px" }}>
                {isUser ? "You" : "Alex (Interviewer)"}
              </div>
              <div
                style={{
                  backgroundColor: isUser ? "#1f6feb" : "#21262d",
                  color: isUser ? "#ffffff" : "#c9d1d9",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  borderBottomRightRadius: isUser ? "4px" : "12px",
                  borderBottomLeftRadius: !isUser ? "4px" : "12px",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  border: isUser ? "1px solid #388bfd" : "1px solid #30363d",
                }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        {loading && (
          <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", backgroundColor: "#21262d", borderRadius: "12px", borderBottomLeftRadius: "4px", border: "1px solid #30363d" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#8b949e", animation: "pulse 1.5s infinite" }} />
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#8b949e", animation: "pulse 1.5s infinite 0.2s" }} />
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#8b949e", animation: "pulse 1.5s infinite 0.4s" }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "16px", backgroundColor: "#161b22", borderTop: "1px solid #30363d" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: "10px 40px 10px 16px",
              backgroundColor: "#0d1117",
              color: "#c9d1d9",
              border: "1px solid #30363d",
              borderRadius: "20px",
              fontSize: "13px",
              outline: "none",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#58a6ff")}
            onBlur={(e) => (e.target.style.borderColor = "#30363d")}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              position: "absolute",
              right: "4px",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: loading || !input.trim() ? "transparent" : "#1f6feb",
              color: loading || !input.trim() ? "#484f58" : "#ffffff",
              border: "none",
              borderRadius: "50%",
              cursor: loading || !input.trim() ? "default" : "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
        <div style={{ fontSize: "11px", color: "#8b949e", textAlign: "center", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
           Voice transcription is active
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
