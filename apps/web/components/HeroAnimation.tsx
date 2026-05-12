"use client";

import { useEffect, useRef } from "react";

export function HeroAnimation({ onComplete }: { onComplete?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initTextData();
    };
    window.addEventListener("resize", handleResize);

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+{}|:<>?~";
    const gridSize = 14; 
    let textPixels: { x: number; y: number; active: boolean }[] = [];
    
    const initTextData = () => {
      const tCanvas = document.createElement("canvas");
      const tCtx = tCanvas.getContext("2d");
      if (!tCtx) return;
      tCanvas.width = width;
      tCanvas.height = height;
      
      const fontSize = Math.min(width / 5, 250); // Make font bigger for the intro
      tCtx.font = `900 ${fontSize}px "JetBrains Mono", monospace`;
      tCtx.fillStyle = "white";
      tCtx.textAlign = "center";
      tCtx.textBaseline = "middle";
      tCtx.fillText("PRAXIS", width / 2, height / 2);

      const imgData = tCtx.getImageData(0, 0, width, height).data;
      textPixels = [];

      for (let y = 0; y < height; y += gridSize) {
        for (let x = 0; x < width; x += gridSize) {
          const index = (y * width + x) * 4;
          const alpha = imgData[index + 3];
          textPixels.push({
            x,
            y,
            active: alpha > 128,
          });
        }
      }
    };

    initTextData();

    let animationFrameId: number;
    let time = 0;
    let hasTriggeredComplete = false;

    const draw = () => {
      time += 0.02; // time controls the overall sequence
      
      // 1. Black Background
      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, width, height);

      // 2. Faint Technical Green Grid
      ctx.strokeStyle = "rgba(0, 255, 65, 0.05)";
      ctx.lineWidth = 1;
      
      const gridSpacing = 40;
      const offset = (time * 10) % gridSpacing;
      
      ctx.beginPath();
      for (let x = offset; x < width; x += gridSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offset; y < height; y += gridSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 3. Delicate Radiating Starburst
      const cx = width / 2;
      const cy = height / 2;
      const numRays = 40;
      
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.beginPath();
      for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI * 2 + (time * 0.1);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * width, cy + Math.sin(angle) * width);
      }
      ctx.stroke();

      // 4. ASCII Art Coalescence
      const pulseRadius = (Math.sin(time * 2) * 0.5 + 0.5) * width;
      const pulseWidth = width * 0.3;

      ctx.font = `bold ${gridSize - 2}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Sequence timing
      // 0 - 2 seconds: Pure chaos, rapid random characters everywhere.
      // 2 - 4.5 seconds: Solidification of the letters PRAXIS.
      // 5.5 seconds: trigger page reveal.
      
      const isChaosPhase = time < 2.0;
      const solidity = Math.max(0, Math.min(1, (time - 2.0) / 2.5)); // 0 to 1 over 2.5 seconds

      for (let i = 0; i < textPixels.length; i++) {
        const p = textPixels[i];
        const distanceToCenter = Math.hypot(p.x - cx, p.y - cy);
        const isPulsing = Math.abs(distanceToCenter - pulseRadius) < pulseWidth;
        
        if (p.active) {
          // Inside PRAXIS text
          if (isChaosPhase) {
            if (Math.random() > 0.5) {
              ctx.fillStyle = "rgba(0, 255, 65, 0.8)";
              ctx.fillText(chars[Math.floor(Math.random() * chars.length)], p.x, p.y);
            }
          } else {
            if (Math.random() > solidity) {
              // Still chaotic
              ctx.fillStyle = isPulsing ? "rgba(0, 255, 65, 0.8)" : "rgba(255, 255, 255, 0.3)";
              ctx.fillText(chars[Math.floor(Math.random() * chars.length)], p.x, p.y);
            } else {
              // Solidified
              ctx.fillStyle = `rgba(255, 255, 255, ${isPulsing ? 1 : 0.85})`;
              // Fill with perfect squares to form solid pixelated text
              ctx.fillRect(p.x - gridSize / 2, p.y - gridSize / 2, gridSize, gridSize);
            }
          }
        } else {
          // Background noise
          if (time < 3.0) {
            // High noise at start, fading out
            if (Math.random() > (0.6 + time * 0.1)) {
              ctx.fillStyle = "rgba(0, 255, 65, 0.2)";
              ctx.fillText(chars[Math.floor(Math.random() * chars.length)], p.x, p.y);
            }
          } else {
            // Subtle ambient noise later
            if (isPulsing && Math.random() > 0.95) {
              ctx.fillStyle = "rgba(0, 255, 65, 0.15)";
              ctx.fillText(chars[Math.floor(Math.random() * chars.length)], p.x, p.y);
            }
          }
        }
      }

      if (time > 5.0 && !hasTriggeredComplete) {
        hasTriggeredComplete = true;
        if (onComplete) onComplete();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
