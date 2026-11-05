"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InBrowserProctorTracker, type ProctoringFrameMetrics } from "../../lib/proctoring/faceMeshTracker";

interface ProctoringHUDProps {
  sessionId?: string;
  integrityScore: number;
  onAnomalyDetected?: (anomalyType: string, description: string) => void;
  onBypassDemo?: () => void;
}

export default function ProctoringHUD({
  sessionId = "demo-session",
  integrityScore,
  onAnomalyDetected,
  onBypassDemo,
}: ProctoringHUDProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [frontCamActive, setFrontCamActive] = useState<boolean>(false);
  const [phoneCamActive, setPhoneCamActive] = useState<boolean>(false);
  const [phonePreviewUrl, setPhonePreviewUrl] = useState<string | null>(null);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState<number>(Date.now());
  const [simulatedAnomalyActive, setSimulatedAnomalyActive] = useState<boolean>(false);

  // Gaze Metrics
  const [metrics, setMetrics] = useState<ProctoringFrameMetrics>({
    faceDetected: true,
    faceCount: 1,
    multipleFaces: false,
    gazeDirection: "center",
    gazePitch: 0,
    gazeYaw: 0,
    irisCentroidX: 0.5,
    irisCentroidY: 0.5,
    dwellTimeSeconds: 0,
    isAnomaly: false,
    confidence: 0.95,
  });

  const frontVideoRef = useRef<HTMLVideoElement | null>(null);
  const trackerRef = useRef<InBrowserProctorTracker | null>(null);

  // 1. Initialize Frontal Webcam & In-Browser Tracker
  useEffect(() => {
    let stream: MediaStream | null = null;
    const tracker = new InBrowserProctorTracker();
    trackerRef.current = tracker;

    async function initFrontalWebcam() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });

        if (frontVideoRef.current) {
          frontVideoRef.current.srcObject = stream;
          await frontVideoRef.current.play();
          setFrontCamActive(true);

          tracker.start(frontVideoRef.current, (newMetrics) => {
            setMetrics(newMetrics);
            if (newMetrics.isAnomaly && newMetrics.anomalyType) {
              const desc =
                newMetrics.anomalyType === "GAZE_DIVERSION_LAP"
                  ? "Sustained downward gaze detected (>2.5s) — potential smartphone or notes in lap."
                  : newMetrics.anomalyType === "GAZE_DIVERSION_OFFSCREEN"
                  ? "Sustained off-screen gaze detected (>3.0s) — potential secondary monitor."
                  : newMetrics.anomalyType === "MULTIPLE_FACES_DETECTED"
                  ? "Multiple faces detected in camera frame — unauthorized person present."
                  : "Candidate absent from desk.";

              onAnomalyDetected?.(newMetrics.anomalyType, desc);
            }
          });
        }
      } catch (err) {
        console.warn("[ProctoringHUD] Frontal webcam optional fallback:", err);
      }
    }

    initFrontalWebcam();

    return () => {
      tracker.stop();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onAnomalyDetected]);

  // 2. Listen for Smartphone 360° Stream (BroadcastChannel + LocalStorage Bridge)
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(`praxis_proctor_${sessionId}`);
      channel.onmessage = (event) => {
        if (event.data?.type === "PHONE_PROCTOR_HEARTBEAT") {
          setPhoneCamActive(true);
          setLastHeartbeatTime(Date.now());
          if (event.data.previewUrl) setPhonePreviewUrl(event.data.previewUrl);
        }
      };
    } catch {}

    const interval = setInterval(() => {
      // LocalStorage fallback for separate browser processes
      if (typeof window !== "undefined") {
        try {
          const item = localStorage.getItem(`praxis_proctor_phone_${sessionId}`);
          if (item) {
            const data = JSON.parse(item);
            if (Date.now() - data.timestamp < 3500) {
              setPhoneCamActive(true);
              setLastHeartbeatTime(Date.now());
              if (data.previewUrl) setPhonePreviewUrl(data.previewUrl);
            }
          }
        } catch {}
      }

      // Heartbeat timeout check (45s grace period)
      if (Date.now() - lastHeartbeatTime > 45000 && phoneCamActive) {
        setPhoneCamActive(false);
      }
    }, 1000);

    return () => {
      channel?.close();
      clearInterval(interval);
    };
  }, [sessionId, lastHeartbeatTime, phoneCamActive]);

  // 3. Demo Shortcuts: Ctrl+Shift+T (Simulate Cheat) & Ctrl+Shift+X (Bypass)
  const triggerSimulatedCheat = useCallback(() => {
    setSimulatedAnomalyActive(true);
    setMetrics((prev) => ({
      ...prev,
      gazeDirection: "lap_down",
      gazePitch: -0.65,
      irisCentroidY: 0.82,
      dwellTimeSeconds: 3.4,
      isAnomaly: true,
      anomalyType: "GAZE_DIVERSION_LAP",
    }));

    onAnomalyDetected?.(
      "GAZE_DIVERSION_LAP",
      "DEMO SIMULATION: Sustained downward gaze detected (3.4s) — secondary phone in lap."
    );

    setTimeout(() => {
      setSimulatedAnomalyActive(false);
      setMetrics((prev) => ({
        ...prev,
        gazeDirection: "center",
        gazePitch: 0,
        irisCentroidY: 0.5,
        dwellTimeSeconds: 0,
        isAnomaly: false,
        anomalyType: undefined,
      }));
    }, 4500);
  }, [onAnomalyDetected]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        triggerSimulatedCheat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerSimulatedCheat]);

  const phonePairUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/proctor/phone/${sessionId}`
      : `https://praxis-iota-puce.vercel.app/proctor/phone/${sessionId}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    phonePairUrl
  )}&color=00ff41&bgcolor=060913`;

  return (
    <>
      {/* Floating 360° Proctoring PiP HUD */}
      <motion.div
        drag
        dragMomentum={false}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 85,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <div
          style={{
            background: "rgba(5, 7, 14, 0.92)",
            backdropFilter: "blur(12px)",
            border: `1.5px solid ${integrityScore < 80 ? "#ef4444" : "#00ff41"}`,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: `0 8px 32px rgba(0,0,0,0.8), 0 0 20px ${
              integrityScore < 80 ? "rgba(239,68,68,0.25)" : "rgba(0,255,65,0.2)"
            }`,
            width: isExpanded ? 310 : 170,
            transition: "width 0.25s ease",
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(0,255,65,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "move",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: integrityScore < 80 ? "#ef4444" : "#00ff41", fontWeight: 800 }}>
                🛡️ 360° PROCTOR
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: integrityScore < 80 ? "rgba(239,68,68,0.2)" : "rgba(0,255,65,0.15)",
                  color: integrityScore < 80 ? "#ef4444" : "#00ff41",
                  fontWeight: 900,
                }}
              >
                {integrityScore}%
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                {isExpanded ? "−" : "+"}
              </button>
            </div>
          </div>

          {/* Expanded Dual-Camera Streams */}
          {isExpanded && (
            <div style={{ padding: 12 }}>
              {/* Dual Video Stream Split View */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {/* 1. Frontal Webcam Gaze Stream */}
                <div
                  style={{
                    position: "relative",
                    height: 90,
                    background: "#020307",
                    borderRadius: 6,
                    border: "1px solid rgba(0,255,65,0.3)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <video
                    ref={frontVideoRef}
                    playsInline
                    muted
                    autoPlay
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: "scaleX(-1)", // Mirror
                      opacity: frontCamActive ? 0.9 : 0.2,
                    }}
                  />

                  {/* Real-time Iris Gaze Crosshairs Reticle */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${metrics.irisCentroidX * 100}%`,
                      top: `${metrics.irisCentroidY * 100}%`,
                      width: 14,
                      height: 14,
                      marginLeft: -7,
                      marginTop: -7,
                      border: `1.5px solid ${metrics.isAnomaly ? "#ef4444" : "#00ff41"}`,
                      borderRadius: "50%",
                      pointerEvents: "none",
                      transition: "all 0.08s ease-out",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        width: 3,
                        height: 3,
                        marginLeft: -1.5,
                        marginTop: -1.5,
                        background: metrics.isAnomaly ? "#ef4444" : "#00ff41",
                        borderRadius: "50%",
                      }}
                    />
                  </div>

                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      fontSize: 8,
                      background: "rgba(0,0,0,0.75)",
                      padding: "1px 4px",
                      borderRadius: 2,
                      color: "#00ff41",
                    }}
                  >
                    FRONT CAM
                  </span>
                </div>

                {/* 2. Rear 360° Phone Camera Stream */}
                <div
                  style={{
                    position: "relative",
                    height: 90,
                    background: "#020307",
                    borderRadius: 6,
                    border: `1px solid ${phoneCamActive ? "rgba(0,255,65,0.4)" : "rgba(255,255,255,0.1)"}`,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {phonePreviewUrl ? (
                    <img
                      src={phonePreviewUrl}
                      alt="Rear 360° Feed"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ textAlign: "center", padding: 6 }}>
                      <span style={{ fontSize: 16 }}>📱</span>
                      <div style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>NOT PAIRED</div>
                    </div>
                  )}

                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      fontSize: 8,
                      background: "rgba(0,0,0,0.75)",
                      padding: "1px 4px",
                      borderRadius: 2,
                      color: phoneCamActive ? "#00ff41" : "#94a3b8",
                    }}
                  >
                    REAR 360°
                  </span>
                </div>
              </div>

              {/* Gaze Status Pill */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 8px",
                  background: metrics.isAnomaly ? "rgba(239,68,68,0.15)" : "rgba(0,255,65,0.05)",
                  border: `1px solid ${metrics.isAnomaly ? "#ef4444" : "rgba(0,255,65,0.2)"}`,
                  borderRadius: 4,
                  fontSize: 10,
                  marginBottom: 10,
                }}
              >
                <span style={{ color: "#94a3b8" }}>GAZE VECTOR:</span>
                <span
                  style={{
                    fontWeight: 800,
                    color: metrics.isAnomaly ? "#ef4444" : "#00ff41",
                  }}
                >
                  {metrics.gazeDirection.toUpperCase()}
                  {metrics.dwellTimeSeconds > 0 && ` (${metrics.dwellTimeSeconds}s)`}
                </span>
              </div>

              {/* Action Buttons: Pair Phone & Judge Demo Trigger */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setShowQrModal(true)}
                  style={{
                    flex: 1,
                    padding: "6px 4px",
                    background: phoneCamActive ? "rgba(0,255,65,0.1)" : "#00ff41",
                    color: phoneCamActive ? "#00ff41" : "#000",
                    border: "1px solid #00ff41",
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {phoneCamActive ? "✓ PHONE PAIRED" : "📱 PAIR REAR CAM"}
                </button>

                <button
                  onClick={triggerSimulatedCheat}
                  title="Hotkey: Ctrl + Shift + T"
                  style={{
                    padding: "6px 8px",
                    background: "rgba(239,68,68,0.15)",
                    color: "#ef4444",
                    border: "1px solid #ef4444",
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  ⚡ DEMO CHEAT
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Dynamic 360° Phone Pairing QR Modal */}
      <AnimatePresence>
        {showQrModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(10px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                width: 380,
                background: "#070b16",
                border: "1.5px solid #00ff41",
                borderRadius: 12,
                padding: 24,
                boxShadow: "0 0 50px rgba(0,255,65,0.25)",
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: "#00ff41", fontWeight: 800, letterSpacing: "1px" }}>
                  ◈ PAIR REAR 360° SMARTPHONE CAMERA
                </span>
                <button
                  onClick={() => setShowQrModal(false)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  padding: 16,
                  background: "#04060d",
                  borderRadius: 8,
                  border: "1px dashed rgba(0,255,65,0.4)",
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <img
                  src={qrImageUrl}
                  alt="Pair Smartphone QR Code"
                  style={{ width: 180, height: 180, borderRadius: 6, display: "block" }}
                />
              </div>

              <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.5 }}>
                1. Open camera on your smartphone & scan the QR code.
                <br />
                2. Position your phone at a 45° angle behind you to cover your screen, keyboard, and hands.
                <br />
                <span style={{ color: "#00ff41" }}>Zero app download required. Runs directly in mobile Safari / Chrome.</span>
              </p>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.open(phonePairUrl, "_blank");
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "rgba(0,255,65,0.1)",
                    border: "1px solid #00ff41",
                    color: "#00ff41",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    borderRadius: 4,
                  }}
                >
                  OPEN LINK IN TAB ↗
                </button>
                <button
                  onClick={() => setShowQrModal(false)}
                  style={{
                    padding: "10px 18px",
                    background: "#00ff41",
                    border: "none",
                    color: "#000",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    borderRadius: 4,
                  }}
                >
                  DONE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
