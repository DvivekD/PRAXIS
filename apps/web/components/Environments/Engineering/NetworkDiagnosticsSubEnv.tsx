"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface NetworkDiagnosticsSubEnvProps {
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any> | void;
  onRemediated?: () => void;
  onNavigateSubEnv?: (target: "ssh" | "network" | "debugger") => void;
}

interface TerminalLine {
  text: string;
  color?: string;
  isBold?: boolean;
}

export default function NetworkDiagnosticsSubEnv({
  onAction,
  onRemediated,
  onNavigateSubEnv,
}: NetworkDiagnosticsSubEnvProps) {
  const [output, setOutput] = useState<TerminalLine[]>([
    { text: "Aura Commerce VPC Network Diagnostics Lab [net-diag-workbench-v3]", color: "#64748b" },
    { text: "Subnet: 10.244.0.0/16 | CoreDNS Cluster IP: 10.244.0.10:53", color: "#38bdf8" },
    { text: "Target Service: auth.payment.internal (Port 8443 - TLS)", color: "#f59e0b" },
    { text: "DIAGNOSTIC MISSION: Identify whether failures originate from application or infrastructure.", color: "#fff", isBold: true },
    { text: "Type 'help' for tools: nslookup, dig, curl, nc, ping, traceroute, ss -s, flush-dns.", color: "#00ff41" },
    { text: "", color: "#888" },
  ]);

  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Remediation & diagnostic state
  const [isDnsFlushed, setIsDnsFlushed] = useState(false);
  const [selectedVerdict, setSelectedVerdict] = useState<string | null>(null);
  const [verdictSubmitted, setVerdictSubmitted] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  const addLine = (text: string, color: string = "#fff", isBold: boolean = false) => {
    setOutput((prev) => [...prev, { text, color, isBold }]);
  };

  const handleCommand = async (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    setHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);

    addLine(`diagnostics@aura-netlab:~$ ${cmd}`, "#00ff41", true);
    onAction(`[NET_CMD] $ ${cmd}`);

    const parts = cmd.split(" ");
    const command = parts[0].toLowerCase();
    const target = parts[1]?.toLowerCase() || "";

    switch (command) {
      case "help":
      case "man":
        addLine("═══════════════════════ NETWORK DIAGNOSTICS SUITE ═══════════════════════", "#38bdf8", true);
        addLine("  nslookup <host>           Query CoreDNS nameserver for host IP mappings", "#94a3b8");
        addLine("  dig <host>                Query DNS records with full TTL and flags", "#94a3b8");
        addLine("  curl -v <url>             Probe HTTP/HTTPS endpoints and measure handshakes", "#94a3b8");
        addLine("  nc -zv <host> <port>      Test raw TCP socket port connectivity", "#94a3b8");
        addLine("  ping -c 3 <host>          Send ICMP echo requests to measure packet drop", "#94a3b8");
        addLine("  traceroute <host>         Trace IP packet routing hops across VPC", "#94a3b8");
        addLine("  ss -s / netstat           Inspect socket pool states (SYN_SENT, ESTABLISHED)", "#94a3b8");
        addLine("  flush-dns / patch-route   Prune decommissioned pods from CoreDNS and drain socket pool", "#22c55e", true);
        addLine("  clear                     Clear terminal buffer", "#94a3b8");
        addLine("═══════════════════════════════════════════════════════════════════════════", "#38bdf8");
        break;

      case "nslookup":
      case "resolve-dnsname":
        if (!target || target.includes("payment")) {
          addLine("Server:         10.244.0.10", "#64748b");
          addLine("Address:        10.244.0.10#53", "#64748b");
          addLine("", "#fff");
          addLine("Non-authoritative answer:", "#94a3b8");
          addLine("Name:   auth.payment.internal", "#38bdf8", true);
          if (!isDnsFlushed) {
            addLine("Address: 10.244.3.99  <-- [WARNING: STALE POD DECOMMISSIONED 3 HRS AGO]", "#ef4444", true);
            addLine("Address: 10.244.4.150 <-- [HEALTHY ACTIVE GATEWAY POD]", "#22c55e", true);
            addLine("", "#fff");
            addLine("ℹ Notice: CoreDNS is round-robining traffic between dead IP 10.244.3.99 and healthy IP 10.244.4.150!", "#f59e0b");
          } else {
            addLine("Address: 10.244.4.150 <-- [HEALTHY ACTIVE GATEWAY POD - 100% ROUTED]", "#22c55e", true);
            addLine("✓ Stale IP 10.244.3.99 successfully pruned from DNS zone.", "#22c55e");
          }
        } else {
          addLine(`Server: 10.244.0.10\nAddress: 10.244.0.10#53\nNon-authoritative answer:\nName: ${target}\nAddress: 10.244.1.20`, "#cbd5e1");
        }
        break;

      case "dig":
        addLine("; <<>> DiG 9.18.28-0ubuntu0.24.04.1-Ubuntu <<>> auth.payment.internal", "#64748b");
        addLine(";; Got answer:", "#64748b");
        addLine(";; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 48219", "#64748b");
        addLine(";; flags: qr rd ra; QUERY: 1, ANSWER: " + (isDnsFlushed ? "1" : "2") + ", AUTHORITY: 0, ADDITIONAL: 1", "#64748b");
        addLine("", "#fff");
        addLine(";; ANSWER SECTION:", "#38bdf8");
        if (!isDnsFlushed) {
          addLine("auth.payment.internal.  300  IN  A  10.244.3.99", "#ef4444");
          addLine("auth.payment.internal.  300  IN  A  10.244.4.150", "#22c55e");
        } else {
          addLine("auth.payment.internal.  60   IN  A  10.244.4.150", "#22c55e");
        }
        addLine("", "#fff");
        addLine(";; Query time: 1 msec", "#94a3b8");
        addLine(";; SERVER: 10.244.0.10#53(10.244.0.10)", "#94a3b8");
        break;

      case "nc":
      case "telnet":
      case "test-netconnection":
      case "tnc":
        if (cmd.includes("10.244.3.99") || (!cmd.includes("10.244.4.150") && !isDnsFlushed)) {
          addLine("Testing TCP connection to 10.244.3.99:8443...", "#f59e0b");
          addLine("nc: connect to 10.244.3.99 port 8443 (tcp) timed out: Operation timed out", "#ef4444", true);
          addLine("✕ Connection failed. 100% packet drop on port 8443.", "#ef4444");
        } else {
          addLine("Testing TCP connection to 10.244.4.150:8443...", "#38bdf8");
          addLine("Connection to 10.244.4.150 8443 port [tcp/*] succeeded!", "#22c55e", true);
          addLine("✓ Port 8443 is open and actively accepting TLS handshakes.", "#22c55e");
        }
        break;

      case "curl":
        if (cmd.includes("10.244.3.99") || (!cmd.includes("10.244.4.150") && !isDnsFlushed)) {
          addLine("*   Trying 10.244.3.99:8443...", "#94a3b8");
          addLine("* TCP_NODELAY set", "#94a3b8");
          addLine("* connect to 10.244.3.99 port 8443 failed: Connection timed out", "#ef4444");
          addLine("* Failed to connect to 10.244.3.99 port 8443 after 30002 ms: Couldn't connect to server", "#ef4444", true);
          addLine("* Closing connection 0", "#94a3b8");
          addLine("curl: (28) Failed to connect to 10.244.3.99 port 8443: Connection timed out", "#ef4444", true);
        } else {
          addLine("*   Trying 10.244.4.150:8443...", "#94a3b8");
          addLine("* Connected to 10.244.4.150 (10.244.4.150) port 8443", "#22c55e");
          addLine("* ALPN: offers h2, http/1.1", "#94a3b8");
          addLine("* TLSv1.3 (OUT), TLS handshake, Client hello (1):", "#94a3b8");
          addLine("* TLSv1.3 (IN), TLS handshake, Server hello (2):", "#94a3b8");
          addLine("> GET /health HTTP/1.1", "#cbd5e1");
          addLine("> Host: 10.244.4.150:8443", "#cbd5e1");
          addLine("> User-Agent: curl/8.5.0", "#cbd5e1");
          addLine("< HTTP/1.1 200 OK", "#22c55e", true);
          addLine("< Content-Type: application/json", "#94a3b8");
          addLine('< {"status":"healthy","gateway":"prod-us-east-gw2","latency_ms":1.4}', "#22c55e");
          addLine("✓ HTTP 200 OK — Handshake succeeded in 1.4ms.", "#22c55e", true);
        }
        break;

      case "ping":
        if (cmd.includes("10.244.3.99") || (!cmd.includes("10.244.4.150") && !isDnsFlushed)) {
          addLine("PING 10.244.3.99 (10.244.3.99) 56(84) bytes of data.", "#94a3b8");
          addLine("--- 10.244.3.99 ping statistics ---", "#94a3b8");
          addLine("3 packets transmitted, 0 received, 100% packet loss, time 2048ms", "#ef4444", true);
          addLine("✕ Target IP is unreachable (blackholed in subnet route table).", "#ef4444");
        } else {
          addLine("PING 10.244.4.150 (10.244.4.150) 56(84) bytes of data.", "#94a3b8");
          addLine("64 bytes from 10.244.4.150: icmp_seq=1 ttl=64 time=0.38 ms", "#22c55e");
          addLine("64 bytes from 10.244.4.150: icmp_seq=2 ttl=64 time=0.42 ms", "#22c55e");
          addLine("64 bytes from 10.244.4.150: icmp_seq=3 ttl=64 time=0.35 ms", "#22c55e");
          addLine("--- 10.244.4.150 ping statistics ---", "#94a3b8");
          addLine("3 packets transmitted, 3 received, 0% packet loss, time 2003ms, rtt min/avg/max = 0.35/0.38/0.42 ms", "#22c55e", true);
        }
        break;

      case "traceroute":
      case "tracert":
        addLine("traceroute to 10.244.3.99 (10.244.3.99), 30 hops max, 60 byte packets", "#94a3b8");
        addLine(" 1  gateway.vpc (10.244.0.1)  0.284 ms  0.210 ms  0.198 ms", "#cbd5e1");
        addLine(" 2  router-internal.vpc (10.244.1.254)  0.512 ms  0.480 ms  0.450 ms", "#cbd5e1");
        addLine(" 3  * * * Request timed out.", "#ef4444", true);
        addLine(" 4  * * * Request timed out.", "#ef4444");
        addLine("Destination host 10.244.3.99 drops at hop 3.", "#ef4444");
        break;

      case "ss":
      case "netstat":
        if (!isDnsFlushed) {
          addLine("TCP Socket States for auth.payment.internal (8443):", "#f59e0b", true);
          addLine("  ESTABLISHED:  0", "#94a3b8");
          addLine("  SYN_SENT:     128 [SATURATING CLIENT HTTP AGENT POOL]", "#ef4444", true);
          addLine("  TIME_WAIT:    42", "#94a3b8");
          addLine("  CLOSE_WAIT:   18", "#94a3b8");
          addLine("⚠ Pool capacity 128/128 maxSockets completely held by dead attempts to 10.244.3.99.", "#ef4444");
        } else {
          addLine("TCP Socket States for auth.payment.internal (8443):", "#22c55e", true);
          addLine("  ESTABLISHED:  4 (active keep-alive to 10.244.4.150)", "#22c55e");
          addLine("  SYN_SENT:     0", "#22c55e");
          addLine("  TIME_WAIT:    0", "#94a3b8");
          addLine("✓ Connection pool healthy (4/128 active sockets).", "#22c55e");
        }
        break;

      case "flush-dns":
      case "patch-route":
      case "coredns-reload":
        setIsDnsFlushed(true);
        addLine("Executing CoreDNS zone patch: removing stale record 10.244.3.99...", "#f59e0b", true);
        addLine("✓ CoreDNS config updated. auth.payment.internal -> 10.244.4.150 (TTL=60s).", "#22c55e", true);
        addLine("✓ Sent SIGUSR2 to checkout-worker HTTP connection pool. Sockets drained.", "#22c55e");
        addLine("✓ Active socket count dropped from 128/128 to 4/128.", "#22c55e", true);
        addLine("🎉 NETWORK BOTTLENECK REMEDIATED! Requests now reach active payment gateway.", "#00ff41", true);
        onRemediated?.();
        onAction("[NETWORK_REMEDIATION_SUCCESS] Candidate pruned dead pod 10.244.3.99 from CoreDNS and drained connection pool.");
        break;

      case "clear":
        setOutput([]);
        break;

      default:
        addLine(`bash: ${command}: command not found. Type 'help' for available tools.`, "#ef4444");
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(inputVal);
      setInputVal("");
    } else if (e.key === "ArrowUp") {
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < history.length) {
          setHistoryIndex(nextIdx);
          setInputVal(history[nextIdx]);
        } else {
          setHistoryIndex(-1);
          setInputVal("");
        }
      }
    }
  };

  const handleVerdictSubmit = () => {
    if (!selectedVerdict) return;
    setVerdictSubmitted(true);

    const isCorrect = selectedVerdict === "both";
    onAction(`[VERDICT_SUBMITTED] Candidate identified failure origin: ${selectedVerdict}. Result: ${isCorrect ? "CORRECT" : "PARTIAL"}`);

    if (isCorrect) {
      addLine("══════════════════════ ARCHITECTURAL DIAGNOSTIC PASS ══════════════════════", "#00ff41", true);
      addLine("✓ CORRECT VERDICT: Dual-Origin Failure Confirmed!", "#00ff41", true);
      addLine("  1. INFRASTRUCTURE: CoreDNS round-robined traffic to decommissioned pod (10.244.3.99).", "#cbd5e1");
      addLine("  2. APPLICATION: HTTP Agent connection pool lacked connection timeout and socket pooling guards,", "#cbd5e1");
      addLine("     causing 128 worker threads to hang indefinitely in SYN_SENT state.", "#cbd5e1");
      addLine("  3. CONCURRENCY: Retries on slow checkout requests trigger double debits in application code!", "#f59e0b");
      addLine("═══════════════════════════════════════════════════════════════════════════", "#00ff41");
    } else {
      addLine(`[VERDICT RECORDED] Selected: ${selectedVerdict}. Note: This issue involves both infrastructure routing AND application connection pooling.`, "#f59e0b");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#03060c",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: "#f8fafc",
        overflow: "hidden",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 16px",
          background: "#080d16",
          borderBottom: "1px solid #1e293b",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
          </div>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>
            diagnostics@aura-netlab:~$ (CoreDNS 10.244.0.10)
          </span>
          <span
            style={{
              fontSize: 10,
              background: isDnsFlushed ? "rgba(0,255,65,0.12)" : "rgba(239,68,68,0.12)",
              color: isDnsFlushed ? "#00ff41" : "#ef4444",
              border: `1px solid ${isDnsFlushed ? "#00ff41" : "#ef4444"}`,
              padding: "1px 6px",
              borderRadius: 3,
            }}
          >
            {isDnsFlushed ? "ROUTE HEALTHY" : "DNS MISROUTING DETECTED"}
          </span>
        </div>

        {/* Quick Remediation Action Button */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => handleCommand("flush-dns")}
            style={{
              padding: "4px 12px",
              background: isDnsFlushed ? "rgba(0,255,65,0.12)" : "rgba(245,158,11,0.1)",
              border: `1px solid ${isDnsFlushed ? "#00ff41" : "#f59e0b"}`,
              color: isDnsFlushed ? "#00ff41" : "#f59e0b",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>⚡</span>
            <span>{isDnsFlushed ? "[ ✓ ROUTE_PATCHED ]" : "[ REMEDIATE_DNS // flush-dns ]"}</span>
          </button>
        </div>
      </div>

      {/* Main Area: Split Screen */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left Side: Terminal CLI */}
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "14px 18px",
            overflowY: "auto",
            background: "radial-gradient(circle at 50% 0%, #070c17 0%, #020408 100%)",
          }}
        >
          {output.map((line, idx) => (
            <div
              key={idx}
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: line.color || "#fff",
                fontWeight: line.isBold ? 700 : 400,
                whiteSpace: "pre-wrap",
              }}
            >
              {line.text}
            </div>
          ))}

          {/* Prompt line */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ color: "#00ff41", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
              diagnostics@aura-netlab:~$
            </span>
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="Run network tools (e.g. nslookup auth.payment.internal, nc -zv 10.244.3.99 8443, curl, ss -s)..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontFamily: "inherit",
                fontSize: 13,
              }}
            />
          </div>

          <div ref={endRef} />
        </div>

        {/* Right Side: Visual Topology & Failure Origin Verdict Panel */}
        <div
          style={{
            width: 320,
            background: "#050912",
            borderLeft: "1px solid #1e293b",
            display: "flex",
            flexDirection: "column",
            padding: 14,
            gap: 12,
            overflowY: "auto",
          }}
        >
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8", letterSpacing: "1px" }}>
              NETWORK TOPOLOGY & FLOW
            </span>
            <p style={{ fontSize: 10, color: "#64748b", margin: "4px 0 0 0" }}>
              Active routing path to payment gateway microservices.
            </p>
          </div>

          {/* Visual Topology Diagram */}
          <div
            style={{
              padding: 10,
              background: "#080d1a",
              border: "1px solid #1e293b",
              borderRadius: 6,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* Hop 1: Shopper Clients */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "#94a3b8" }}>1. Shopper Traffic</span>
              <span style={{ color: "#22c55e", fontWeight: 700 }}>45,000 req/s</span>
            </div>

            <div style={{ textAlign: "center", color: "#475569", fontSize: 10 }}>↓</div>

            {/* Hop 2: Checkout Workers & Connection Pool */}
            <div
              style={{
                padding: "6px 8px",
                background: "#0c1424",
                border: `1px solid ${isDnsFlushed ? "#22c55e" : "#ef4444"}`,
                borderRadius: 4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700 }}>
                <span style={{ color: "#38bdf8" }}>Checkout Worker Pods</span>
                <span style={{ color: isDnsFlushed ? "#22c55e" : "#ef4444" }}>
                  Pool: {isDnsFlushed ? "4/128" : "128/128 MAX"}
                </span>
              </div>
              <div style={{ fontSize: 9, color: isDnsFlushed ? "#86efac" : "#f87171", marginTop: 2 }}>
                {isDnsFlushed ? "Sockets draining normally" : "Connection pool saturated in SYN_SENT"}
              </div>
            </div>

            <div style={{ textAlign: "center", color: "#475569", fontSize: 10 }}>↓ DNS Resolution</div>

            {/* Upstream Gateways A & B */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {/* Pod A */}
              <div
                style={{
                  padding: "6px 8px",
                  background: isDnsFlushed ? "#080c14" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${isDnsFlushed ? "#334155" : "#ef4444"}`,
                  borderRadius: 4,
                  opacity: isDnsFlushed ? 0.4 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700 }}>
                  <span style={{ color: "#ef4444" }}>POD A: 10.244.3.99</span>
                  <span style={{ color: "#ef4444" }}>100% TIMEOUT</span>
                </div>
                <div style={{ fontSize: 9, color: "#94a3b8" }}>
                  {isDnsFlushed ? "[PRUNED FROM DNS]" : "Dead pod — Drops TCP SYN on :8443"}
                </div>
              </div>

              {/* Pod B */}
              <div
                style={{
                  padding: "6px 8px",
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid #22c55e",
                  borderRadius: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700 }}>
                  <span style={{ color: "#22c55e" }}>POD B: 10.244.4.150</span>
                  <span style={{ color: "#22c55e" }}>1.4ms LATENCY</span>
                </div>
                <div style={{ fontSize: 9, color: "#86efac" }}>
                  Active gateway — TLS 1.3 healthy
                </div>
              </div>
            </div>
          </div>

          {/* Quick Network Probe Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
              Quick Diagnostic Probes
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "nslookup", cmd: "nslookup auth.payment.internal" },
                { label: "dig", cmd: "dig auth.payment.internal" },
                { label: "curl dead IP", cmd: "curl -v http://10.244.3.99:8443/health" },
                { label: "curl live IP", cmd: "curl -v http://10.244.4.150:8443/health" },
                { label: "nc dead IP", cmd: "nc -zv 10.244.3.99 8443" },
                { label: "nc live IP", cmd: "nc -zv 10.244.4.150 8443" },
                { label: "ss -s", cmd: "ss -s" },
                { label: "flush-dns", cmd: "flush-dns" },
              ].map((b) => (
                <button
                  key={b.cmd}
                  onClick={() => handleCommand(b.cmd)}
                  style={{
                    padding: "5px 6px",
                    background: "#0c1322",
                    border: "1px solid #1e293b",
                    color: "#cbd5e1",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center",
                    fontFamily: "inherit",
                  }}
                >
                  $ {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Root Cause Assessment: Infrastructure vs Application */}
          <div
            style={{
              padding: 10,
              background: "#080e1c",
              border: "1px solid #1e293b",
              borderRadius: 6,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>
              FAILURE ORIGIN ASSESSMENT
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.4 }}>
              Select where the checkout failures originate to calibrate evaluation scoring:
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { id: "app", label: "Application Code Only (Logic bug in checkout)" },
                { id: "infra", label: "Infrastructure Only (DNS stale upstream route)" },
                { id: "both", label: "Both: Infra DNS Misrouting + App Sockets & Race Condition" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: 10,
                    color: selectedVerdict === opt.id ? "#fff" : "#94a3b8",
                    cursor: "pointer",
                    background: selectedVerdict === opt.id ? "rgba(56,189,248,0.1)" : "transparent",
                    padding: "4px 6px",
                    borderRadius: 4,
                  }}
                >
                  <input
                    type="radio"
                    name="verdict"
                    checked={selectedVerdict === opt.id}
                    onChange={() => setSelectedVerdict(opt.id)}
                    style={{ marginTop: 2 }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleVerdictSubmit}
              disabled={!selectedVerdict}
              style={{
                padding: "6px 10px",
                background: selectedVerdict ? "#38bdf8" : "#1e293b",
                color: selectedVerdict ? "#020408" : "#64748b",
                border: "none",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 800,
                cursor: selectedVerdict ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              SUBMIT DIAGNOSTIC VERDICT
            </button>
          </div>

          {/* Next Step Transition Card */}
          {isDnsFlushed && onNavigateSubEnv && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: "auto",
                padding: 10,
                background: "rgba(0, 255, 65, 0.08)",
                border: "1px solid #00ff41",
                borderRadius: 4,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#00ff41", marginBottom: 4 }}>
                Next Step: Fix Code Concurrency
              </div>
              <div style={{ fontSize: 10, color: "#cbd5e1", lineHeight: 1.4, marginBottom: 8 }}>
                Upstream network route is restored, but customers are still double-charged when clicking twice. Step through the code in 03 — Code Debugger.
              </div>
              <button
                onClick={() => onNavigateSubEnv("debugger")}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  background: "#00ff41",
                  color: "#020408",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                OPEN CODE DEBUGGER ▶
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
