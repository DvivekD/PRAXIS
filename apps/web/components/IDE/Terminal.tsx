"use client";

import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new XTerm({
      cursorBlink: true,
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
      },
      fontFamily: "monospace",
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;

    // Handle window resize
    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    // Initialize WebSocket connection to backend
    // Assuming backend runs on 3001
    // A more robust implementation would fetch the sandbox ID and then connect
    const wsUrl = `ws://localhost:3001/ws/terminal/default`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      term.writeln("Connected to sandbox terminal.");
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      ws.close();
      term.dispose();
    };
  }, []);

  return <div ref={terminalRef} style={{ width: "100%", height: "100%" }} />;
}
