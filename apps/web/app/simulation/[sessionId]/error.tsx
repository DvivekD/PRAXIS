"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SimulationErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[PRAXIS Simulation Error]", error);
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
          maxWidth: 580,
          background: "#080c14",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          borderRadius: 8,
          padding: 32,
          boxShadow: "0 0 40px rgba(239, 68, 68, 0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#ef4444",
              boxShadow: "0 0 10px #ef4444",
            }}
          />
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#ef4444",
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            [ PRAXIS // SIMULATION_FAULT_DETECTED ]
          </div>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px", color: "#fff" }}>
          Simulation Environment Paused
        </h1>
        <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6, margin: "0 0 20px" }}>
          The simulation kernel encountered an unexpected state. Your telemetry session has been
          preserved and can be resumed immediately.
        </p>

        {error?.message && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 4,
              fontSize: 11,
              color: "#fca5a5",
              marginBottom: 24,
              overflowX: "auto",
            }}
          >
            FAULT: {error.message}
          </div>
        )}

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
            ▶ RESUME SIMULATION
          </button>
          <button
            onClick={() => router.push("/seeker/dashboard")}
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
            RETURN TO DASHBOARD
          </button>
        </div>
      </div>
    </div>
  );
}
