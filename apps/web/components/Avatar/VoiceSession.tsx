"use client";

import { useState, useRef } from "react";
import AvatarScene from "./AvatarScene";

export function VoiceSession() {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const connectVoice = async () => {
    setStatus("connecting");

    try {
      // 1. Get ephemeral token from our backend
      const tokenRes = await fetch("http://localhost:3001/voice/session", {
        method: "POST"
      });
      if (!tokenRes.ok) throw new Error("Failed to get ephemeral token");
      const { client_secret } = await tokenRes.json();
      const ephemeralKey = client_secret.value;

      // 2. Setup WebRTC Peer Connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Setup audio playback and analysis
      audioContextRef.current = new AudioContext();
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 2048;
      setAnalyserNode(analyser);

      // Create an audio element to play remote track
      const audioEl = new Audio();
      audioEl.autoplay = true;

      pc.ontrack = (e) => {
        // Connect WebRTC track to HTMLAudioElement
        audioEl.srcObject = e.streams[0];

        // Also connect the track to our analyser for LipSync
        if (audioContextRef.current) {
          const source = audioContextRef.current.createMediaStreamSource(e.streams[0]);
          source.connect(analyser);
          // We don't connect analyser to destination because audioEl is already playing it
        }
      };

      // 4. Get local microphone stream and add to peer connection
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTrack(ms.getTracks()[0], ms);

      // 5. Setup data channel for Realtime API events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.addEventListener("message", (e) => {
        console.log("Realtime event:", JSON.parse(e.data));
      });

      // 6. Create SDP Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 7. Send offer to OpenAI Realtime API using ephemeral key
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI SDP Answer failed: ${sdpResponse.statusText}`);
      }

      const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      setStatus("connected");
    } catch (err) {
      console.error("Voice connection error:", err);
      setStatus("disconnected");
    }
  };

  const disconnectVoice = () => {
    pcRef.current?.close();
    pcRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setStatus("disconnected");
    setAnalyserNode(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", position: "relative" }}>
      {/* 3D Scene */}
      <div style={{ flex: 1 }}>
        <AvatarScene analyserNode={analyserNode} />
      </div>

      {/* Controls Overlay */}
      <div style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: "12px 24px",
        borderRadius: "24px",
        display: "flex",
        alignItems: "center",
        gap: "16px"
      }}>
        <div style={{
          width: 12, height: 12, borderRadius: "50%",
          backgroundColor: status === "connected" ? "#4caf50" : status === "connecting" ? "#ffeb3b" : "#f44336"
        }} />
        <span style={{ color: "white", fontFamily: "sans-serif" }}>
          {status === "connected" ? "Connected (Listening)" : status === "connecting" ? "Connecting..." : "Disconnected"}
        </span>

        {status === "disconnected" ? (
          <button
            onClick={connectVoice}
            style={{ padding: "6px 12px", borderRadius: "4px", border: "none", backgroundColor: "#007acc", color: "white", cursor: "pointer" }}
          >
            Connect Voice
          </button>
        ) : (
          <button
            onClick={disconnectVoice}
            style={{ padding: "6px 12px", borderRadius: "4px", border: "none", backgroundColor: "#f44336", color: "white", cursor: "pointer" }}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
