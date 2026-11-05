"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[PRAXIS Global Fault]", error);
  }, [error]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        backgroundColor: "#020202",
        color: "#ffffff",
        fontFamily: "'JetBrains Mono', monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          background: "#080c14",
          border: "1px solid rgba(0, 255, 65, 0.4)",
          borderRadius: 8,
          padding: 32,
          boxShadow: "0 0 40px rgba(0, 255, 65, 0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#00ff41",
              boxShadow: "0 0 10px #00ff41",
            }}
          />
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#00ff41",
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            [ PRAXIS // SYSTEM_RECOVERY ]
          </div>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px", color: "#fff" }}>
          Runtime Recovery Active
        </h1>
        <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6, margin: "0 0 24px" }}>
          A transient client-side state error occurred. Click reload to re-synchronize state.
        </p>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              background: "#00ff41",
              color: "#000000",
              border: "none",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            ▶ RELOAD VIEW
          </button>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "10px 20px",
              background: "transparent",
              color: "#9ca3af",
              border: "1px solid #374151",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            HOME
          </button>
        </div>
      </div>
    </div>
  );
}
