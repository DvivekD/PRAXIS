"use client";

import { useEffect, useRef, useCallback } from "react";

export interface TelemetryEvent {
  type: "keydown" | "keyup" | "mousemove";
  timestamp: number;
  data: any;
}

export function useTelemetry(sessionId: string | null) {
  const batchRef = useRef<TelemetryEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Track keydown times for dwell calculations
  const keydownTimes = useRef<Record<string, number>>({});
  const lastKeyupTime = useRef<number | null>(null);

  const lastMouseTime = useRef<number>(0);

  // Setup WebSocket connection
  useEffect(() => {
    if (!sessionId) return;
    const ws = new WebSocket(`ws://localhost:3001/ws/telemetry/${sessionId}`);
    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId]);

  // Flush buffer every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && batchRef.current.length > 0) {
        wsRef.current.send(JSON.stringify(batchRef.current));
        batchRef.current = [];
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const attachToEditor = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      if (!keydownTimes.current[e.key]) {
        keydownTimes.current[e.key] = now;

        let flightTime = 0;
        if (lastKeyupTime.current) {
          flightTime = now - lastKeyupTime.current;
        }

        batchRef.current.push({
          type: "keydown",
          timestamp: now,
          data: { key: e.key, flightTime }
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const now = Date.now();
      const downTime = keydownTimes.current[e.key];
      let dwellTime = 0;

      if (downTime) {
        dwellTime = now - downTime;
        delete keydownTimes.current[e.key];
      }

      lastKeyupTime.current = now;

      batchRef.current.push({
        type: "keyup",
        timestamp: now,
        data: { key: e.key, dwellTime }
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      // Throttle mouse movements to 50ms
      if (now - lastMouseTime.current > 50) {
        lastMouseTime.current = now;
        batchRef.current.push({
          type: "mousemove",
          timestamp: now,
          data: { x: e.clientX, y: e.clientY }
        });
      }
    };

    element.addEventListener("keydown", handleKeyDown as EventListener);
    element.addEventListener("keyup", handleKeyUp as EventListener);
    element.addEventListener("mousemove", handleMouseMove as EventListener);

    return () => {
      element.removeEventListener("keydown", handleKeyDown as EventListener);
      element.removeEventListener("keyup", handleKeyUp as EventListener);
      element.removeEventListener("mousemove", handleMouseMove as EventListener);
    };
  }, []);

  return { attachToEditor };
}
