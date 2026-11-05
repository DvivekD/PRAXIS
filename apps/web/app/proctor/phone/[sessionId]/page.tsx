"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";

export default function PhoneProctorPage() {
  const params = useParams();
  const sessionId = (params?.sessionId as string) || "demo-session";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [fpsCount, setFpsCount] = useState<number>(15);

  // 1. Initialize rear-facing environment camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let wakeLockSentinel: any = null;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreamActive(true);
        }

        // Screen Wake Lock
        if ("wakeLock" in navigator) {
          try {
            wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
            setWakeLockActive(true);
          } catch {}
        }
      } catch (err: any) {
        console.warn("[PhoneProctor] Camera access error:", err);
        setPermissionError(err.message || "Failed to access rear camera.");
      }
    }

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, []);

  // 2. Transmit frame snapshots & heartbeat to desktop session
  useEffect(() => {
    if (!streamActive) return;

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(`praxis_proctor_${sessionId}`);
    } catch {}

    const interval = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2 || !ctx) return;

      try {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.5);

        const payload = {
          type: "PHONE_PROCTOR_HEARTBEAT",
          sessionId,
          timestamp: Date.now(),
          previewUrl: dataUrl,
          connected: true,
        };

        // 1. BroadcastChannel (for shared origins/tabs)
        channel?.postMessage(payload);

        // 2. LocalStorage bridge
        if (typeof window !== "undefined") {
          localStorage.setItem(`praxis_proctor_phone_${sessionId}`, JSON.stringify(payload));
        }
      } catch (e) {}
    }, 400);

    return () => {
      clearInterval(interval);
      channel?.close();
      if (typeof window !== "undefined") {
        localStorage.removeItem(`praxis_proctor_phone_${sessionId}`);
      }
    };
  }, [streamActive, sessionId]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#020307",
        color: "#fff",
        fontFamily: "'JetBrains Mono', monospace",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "16px",
        overflow: "hidden",
      }}
    >
      {/* Top Telemetry Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          background: "rgba(0, 255, 65, 0.05)",
          border: "1px solid #00ff41",
          borderRadius: 6,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ff41" }}
          />
          <span style={{ fontSize: 12, fontWeight: 800, color: "#00ff41", letterSpacing: "1px" }}>
            PRAXIS 360° REAR CAM
          </span>
        </div>
        <span style={{ fontSize: 10, color: "#a1a1aa" }}>
          {wakeLockActive ? "WAKE_LOCK: ON" : "WAKE_LOCK: OFF"}
        </span>
      </div>

      {/* Camera Viewfinder View */}
      <div
        style={{
          flex: 1,
          position: "relative",
          margin: "16px 0",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(0, 255, 65, 0.3)",
          background: "#05070e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Alignment Overlay Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "2px dashed rgba(0, 255, 65, 0.4)",
            margin: "24px",
            borderRadius: 8,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "rgba(0, 0, 0, 0.65)",
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid #00ff41",
              fontSize: 11,
              color: "#00ff41",
              lineHeight: 1.4,
            }}
          >
            [ POSITION PHONE BEHIND YOU AT 45° ANGLE ]
            <div style={{ color: "#a1a1aa", fontSize: 10, marginTop: 4 }}>
              Ensure your keyboard, hands, and screen perimeter are visible.
            </div>
          </div>
        </div>

        {permissionError && (
          <div
            style={{
              position: "absolute",
              padding: 20,
              background: "rgba(239, 68, 68, 0.95)",
              color: "#fff",
              borderRadius: 8,
              textAlign: "center",
              fontSize: 12,
            }}
          >
            ⚠️ {permissionError}
            <div style={{ marginTop: 8, fontSize: 10 }}>
              Please allow camera permissions in your mobile browser settings.
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Footer */}
      <div
        style={{
          padding: "12px 16px",
          background: "#090d1a",
          border: "1px solid rgba(0, 255, 65, 0.2)",
          borderRadius: 6,
          textAlign: "center",
          fontSize: 11,
          color: "#94a3b8",
        }}
      >
        SESSION: <span style={{ color: "#00ff41" }}>{sessionId.slice(0, 12)}...</span>
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
          Live encrypted feed streaming to desktop anti-cheat engine. Keep this tab open.
        </div>
      </div>
    </div>
  );
}
