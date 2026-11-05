"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SshTerminalSubEnvProps {
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any> | void;
  onFindingDiscovered?: (findingId: string) => void;
  onNavigateSubEnv?: (target: "ssh" | "network" | "debugger") => void;
}

interface TerminalLine {
  text: string;
  color?: string;
  isBold?: boolean;
}

interface FindingItem {
  id: string;
  title: string;
  detail: string;
  commandTrigger: string[];
  discovered: boolean;
}

export default function SshTerminalSubEnv({
  onAction,
  onFindingDiscovered,
  onNavigateSubEnv,
}: SshTerminalSubEnvProps) {
  const [shellMode, setShellMode] = useState<"linux" | "windows">("linux");
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isTopRunning, setIsTopRunning] = useState(false);
  const [topTicks, setTopTicks] = useState(0);
  const [isRunbookOpen, setIsRunbookOpen] = useState(false);

  const [findings, setFindings] = useState<FindingItem[]>([
    {
      id: "cpu_mem",
      title: "CPU & Memory Verified Normal",
      detail: "Load average 1.12, Mem 3.2GB / 16GB used. No OOM or swap thrashing.",
      commandTrigger: ["top", "htop", "free", "free -m", "uptime", "cat /proc/meminfo", "get-counter", "systeminfo"],
      discovered: false,
    },
    {
      id: "worker_state",
      title: "Worker Process State Inspected",
      detail: "4 Node checkout workers are in 'D' uninterruptible sleep state waiting on socket I/O.",
      commandTrigger: ["ps", "ps aux", "ps -ef", "ps aux | grep checkout", "ps aux | grep node", "tasklist", "get-process"],
      discovered: false,
    },
    {
      id: "timeout_logs",
      title: "Upstream 30s Timeout Uncovered",
      detail: "Logs show POST to auth.payment.internal:8443 timing out after 30000ms.",
      commandTrigger: ["tail", "tail timeout.log", "cat timeout.log", "cat /var/log/checkout/timeout.log", "tail -n 50 /var/log/checkout/error.log", "journalctl", "type timeout.log", "get-content"],
      discovered: false,
    },
    {
      id: "pool_starvation",
      title: "Connection Pool Starvation Identified",
      detail: "HTTP Agent pool maxSockets (128/128) saturated with pending SYN_SENT connections.",
      commandTrigger: ["systemctl status", "systemctl status checkout-worker", "ss -s", "netstat", "netstat -tulnp", "get-service", "test-netconnection", "tnc"],
      discovered: false,
    },
  ]);

  const [output, setOutput] = useState<TerminalLine[]>([
    { text: "SSH-2.0-OpenSSH_9.6p1 Ubuntu-3ubuntu13.4 | Connected to aura-prod-app-04 (10.244.2.14)", color: "#22c55e", isBold: true },
    { text: "ALERT: Customer checkout requests are timing out with HTTP 504 Gateway Timeout.", color: "#ef4444" },
    { text: "Run diagnostic commands (ps aux, top, free -m, tail timeout.log, help)...", color: "#64748b" },
    { text: "", color: "#888" },
  ]);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output, isTopRunning, topTicks]);

  // Simulate top live ticking
  useEffect(() => {
    if (!isTopRunning) return;
    const interval = setInterval(() => {
      setTopTicks((prev) => prev + 1);
    }, 1500);
    return () => clearInterval(interval);
  }, [isTopRunning]);

  const addLine = (text: string, color: string = "#fff", isBold: boolean = false) => {
    setOutput((prev) => [...prev, { text, color, isBold }]);
  };

  const checkFindings = (cmd: string) => {
    const clean = cmd.trim().toLowerCase();
    setFindings((prevFindings) =>
      prevFindings.map((f) => {
        if (!f.discovered && f.commandTrigger.some((trig) => clean.includes(trig))) {
          onFindingDiscovered?.(f.id);
          onAction(`[SSH_FINDING_DISCOVERED] ${f.title}: ${f.detail}`, { findingId: f.id });
          return { ...f, discovered: true };
        }
        return f;
      })
    );
  };

  const handleCommand = async (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    if (isTopRunning) {
      if (cmd.toLowerCase() === "q" || cmd.toLowerCase() === "quit") {
        setIsTopRunning(false);
        addLine("Exited top.", "#94a3b8");
        return;
      }
    }

    setHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);

    const promptSymbol =
      shellMode === "linux"
        ? "root@aura-prod-app-04:~/src#"
        : "PS C:\\aura-commerce>";
    addLine(`${promptSymbol} ${cmd}`, shellMode === "linux" ? "#00ff41" : "#38bdf8", true);

    onAction(`[SSH_CMD] $ ${cmd}`, { shell: shellMode });
    checkFindings(cmd);

    const parts = cmd.split(" ");
    const command = parts[0].toLowerCase();
    const arg1 = parts[1]?.toLowerCase();
    const arg2 = parts[2]?.toLowerCase();
    const fullArg = parts.slice(1).join(" ").toLowerCase();

    switch (command) {
      case "help":
      case "man":
      case "/?":
        addLine("══════════════════════ INFRASTRUCTURE DIAGNOSTIC COMMANDS ══════════════════════", "#38bdf8", true);
        addLine("  ps aux / ps -ef           Inspect all processes, worker threads, and process states (D/S/R)", "#94a3b8");
        addLine("  top / htop                Launch real-time system monitor (CPU load, tasks, memory) [q to quit]", "#94a3b8");
        addLine("  free -m                   Display RAM & swap memory usage breakdown", "#94a3b8");
        addLine("  uptime                    Check system uptime and 1/5/15 minute load averages", "#94a3b8");
        addLine("  systemctl status <svc>    Inspect service health: checkout-worker, nginx, redis", "#94a3b8");
        addLine("  systemctl restart <svc>   Attempt systemd restart of a service", "#94a3b8");
        addLine("  cat /var/log/checkout/timeout.log  Read raw upstream connection timeout error logs", "#ef4444");
        addLine("  tail -n 50 /var/log/checkout/error.log  Tail recent checkout error traces", "#ef4444");
        addLine("  netstat -tulnp / ss -s    Inspect open sockets, listening ports, and TCP connection states", "#94a3b8");
        addLine("  kill -9 <PID>             Send SIGKILL to a stuck worker process", "#94a3b8");
        addLine("  ls / dir                  List directory contents", "#94a3b8");
        addLine("  clear / cls               Clear terminal output buffer", "#94a3b8");
        addLine("════════════════════════════════════════════════════════════════════════════════", "#38bdf8");
        break;

      case "ps":
        addLine("USER       PID  %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND", "#64748b");
        addLine("root         1   0.0  0.1  22588  4120 ?        Ss   Oct20   0:12 /sbin/init", "#cbd5e1");
        addLine("root      3110   0.0  0.2  89100  9200 ?        Ss   Oct20   1:42 /usr/sbin/sshd -D", "#cbd5e1");
        addLine("www-data  3900   0.1  0.4 142100 18400 ?        S    Nov01   4:10 nginx: master process /usr/sbin/nginx", "#cbd5e1");
        addLine("www-data  3901   0.2  0.6 148200 24100 ?        S    Nov01  14:22 nginx: worker process", "#cbd5e1");
        addLine("redis     4001   0.1  0.8 210000 32000 ?        Ssl  Nov01   8:19 /usr/bin/redis-server 127.0.0.1:6379", "#cbd5e1");
        addLine("aura      4102   0.2  1.8 820400 74000 ?        Ssl  14:12   0:45 node dist/server.js [checkout-master]", "#38bdf8", true);
        addLine("aura      4103   0.1  2.1 940100 86200 ?        D    14:12   1:12 node dist/worker.js --id=01 [UNINTERRUPTIBLE I/O WAIT]", "#ef4444", true);
        addLine("aura      4104   0.1  2.2 944800 88100 ?        D    14:12   1:08 node dist/worker.js --id=02 [UNINTERRUPTIBLE I/O WAIT]", "#ef4444", true);
        addLine("aura      4105   0.1  2.0 938200 84900 ?        D    14:12   1:15 node dist/worker.js --id=03 [UNINTERRUPTIBLE I/O WAIT]", "#ef4444", true);
        addLine("aura      4106   0.2  2.1 941900 87300 ?        D    14:12   1:10 node dist/worker.js --id=04 [UNINTERRUPTIBLE I/O WAIT]", "#ef4444", true);
        addLine("", "#fff");
        addLine("ℹ [DIAGNOSTIC NOTICE] All 4 worker processes are in STAT='D' (uninterruptible sleep).", "#f59e0b");
        addLine("They are blocked awaiting response from an external network socket. CPU usage is low.", "#f59e0b");
        break;

      case "top":
      case "htop":
        setIsTopRunning(true);
        addLine("[TOP] Interactive top monitor active. (Type 'q' or click toggle to return to prompt)", "#38bdf8");
        break;

      case "free":
        addLine("               total        used        free      shared  buff/cache   available", "#64748b");
        addLine("Mem:           15980        3210         840         124       11930       12769", "#cbd5e1");
        addLine("Swap:           4096           0        4096", "#cbd5e1");
        addLine("", "#fff");
        addLine("✓ Memory utilization: 20.1% used. 12.7GB available. Swap is 0% utilized (no thrashing).", "#22c55e");
        break;

      case "uptime":
        addLine(" 16:58:22 up 14 days,  3:22,  1 user,  load average: 1.12, 1.05, 0.98", "#22c55e");
        addLine("✓ CPU load average is normal across all 8 cores (1.12 / 8.0 capacity).", "#22c55e");
        break;

      case "lscpu":
      case "cat":
        if (cmd.includes("/proc/meminfo")) {
          addLine("MemTotal:       16363984 kB", "#cbd5e1");
          addLine("MemFree:          860244 kB", "#cbd5e1");
          addLine("MemAvailable:   13076120 kB", "#cbd5e1");
          addLine("Buffers:          412080 kB", "#cbd5e1");
          addLine("Cached:         11517420 kB", "#cbd5e1");
          addLine("SwapTotal:       4194304 kB", "#cbd5e1");
          addLine("SwapFree:        4194304 kB", "#cbd5e1");
        } else if (cmd.includes("/proc/loadavg")) {
          addLine("1.12 1.05 0.98 1/142 5812", "#cbd5e1");
        } else if (cmd.includes("timeout.log") || cmd.includes("error.log")) {
          addLine("═ /var/log/checkout/timeout.log (last 6 entries) ═", "#ef4444", true);
          addLine("[2026-11-05T16:54:10.102Z] [checkout-worker-01] Outbound POST https://auth.payment.internal:8443/v1/charges queued", "#94a3b8");
          addLine("[2026-11-05T16:54:10.104Z] [checkout-worker-01] [HTTP_POOL_WARN] Active pool sockets: 128/128 (maxSockets capacity reached)", "#f59e0b", true);
          addLine("[2026-11-05T16:54:40.105Z] [checkout-worker-01] [ERROR] Socket timeout after 30000ms waiting for auth.payment.internal:8443", "#ef4444", true);
          addLine("[2026-11-05T16:54:40.106Z] [checkout-worker-01] Error: ETIMEDOUT connect to auth.payment.internal:8443", "#ef4444");
          addLine("[2026-11-05T16:54:40.110Z] [checkout-worker-01] 504 Gateway Timeout returned to client for order ord_9901", "#ef4444");
          addLine("[2026-11-05T16:54:42.330Z] [checkout-worker-02] Duplicate order click received while ord_9901 in retry loop!", "#ef4444", true);
          addLine("", "#fff");
          addLine("🚨 [ROOT CAUSE CLUE] Outbound requests to 'auth.payment.internal:8443' are timing out after 30 seconds!", "#f59e0b", true);
          addLine("The internal connection pool (128 sockets) is exhausted because upstream calls never return.", "#f59e0b");
        } else if (cmd.includes("hosts")) {
          addLine("127.0.0.1 localhost aura-prod-app-04", "#cbd5e1");
          addLine("::1       localhost ip6-localhost ip6-loopback", "#cbd5e1");
          addLine("# Internal DNS managed by CoreDNS at 10.244.0.10", "#64748b");
        } else if (cmd.includes("resolv.conf")) {
          addLine("nameserver 10.244.0.10", "#38bdf8");
          addLine("search internal.aura svc.cluster.local", "#cbd5e1");
          addLine("options ndots:5", "#cbd5e1");
        } else if (cmd.includes("checkout.ts")) {
          addLine("// /var/www/aura-commerce/src/checkout.ts", "#38bdf8");
          addLine("export async function processPayment(orderId: string, amount: number) {", "#cbd5e1");
          addLine("  // Notice: calls paymentGateway.charge() before checking status!", "#f59e0b");
          addLine("  const chargeSuccess = await paymentGateway.charge(order.customerId, amount);", "#cbd5e1");
          addLine("  if (order.status === 'PAID') return false;", "#ef4444");
          addLine("  await orderStore.update(orderId, { status: 'PAID' });", "#cbd5e1");
          addLine("}", "#cbd5e1");
        } else {
          addLine(`cat: ${arg1 || "file"}: No such file or directory. Try 'cat /var/log/checkout/timeout.log'`, "#ef4444");
        }
        break;

      case "tail":
      case "journalctl":
        addLine("═ /var/log/checkout/error.log (tail -n 50) ═", "#ef4444");
        addLine("[16:54:30] [ERROR] [worker-01] ETIMEDOUT: Connection to auth.payment.internal:8443 timed out after 30000ms", "#ef4444");
        addLine("[16:54:30] [ERROR] [worker-02] ETIMEDOUT: Connection to auth.payment.internal:8443 timed out after 30000ms", "#ef4444");
        addLine("[16:54:31] [WARN]  [pool] 128 of 128 sockets in SYN_SENT state. 412 checkout requests queued in backlog.", "#f59e0b", true);
        break;

      case "systemctl":
        if (arg1 === "status") {
          const svc = arg2 || "checkout-worker";
          if (svc.includes("checkout")) {
            addLine("● checkout-worker.service - Aura Commerce Checkout Microservice Cluster", "#fff", true);
            addLine("     Loaded: loaded (/etc/systemd/system/checkout-worker.service; enabled)", "#64748b");
            addLine("     Active: active (running) since Thu 2026-11-05 14:12:00 UTC; 2h 46min ago", "#22c55e");
            addLine("   Main PID: 4102 (node)", "#cbd5e1");
            addLine("      Tasks: 44 (limit: 4915)", "#cbd5e1");
            addLine("     Memory: 346.5M", "#cbd5e1");
            addLine("     CGroup: /system.slice/checkout-worker.service", "#cbd5e1");
            addLine("             ├─4102 node dist/server.js [master]", "#38bdf8");
            addLine("             ├─4103 node dist/worker.js --id=01 [128 open conns to auth.payment.internal:8443]", "#ef4444");
            addLine("             ├─4104 node dist/worker.js --id=02 [128 open conns to auth.payment.internal:8443]", "#ef4444");
            addLine("             ├─4105 node dist/worker.js --id=03 [128 open conns to auth.payment.internal:8443]", "#ef4444");
            addLine("             └─4106 node dist/worker.js --id=04 [128 open conns to auth.payment.internal:8443]", "#ef4444");
            addLine("Nov 05 16:54:30 aura-prod-app-04 node[4102]: [ALERT] Worker socket pool exhausted. Outbound latency: 30002ms", "#ef4444", true);
          } else if (svc.includes("nginx")) {
            addLine("● nginx.service - A high performance web server and a reverse proxy server", "#fff");
            addLine("     Active: active (running) since Nov 01; 4d ago", "#22c55e");
            addLine("   Main PID: 3900 (nginx)", "#cbd5e1");
          } else if (svc.includes("redis")) {
            addLine("● redis-server.service - Advanced key-value store", "#fff");
            addLine("     Active: active (running) since Nov 01; 4d ago", "#22c55e");
          } else {
            addLine(`Unit ${svc}.service not found. Try 'systemctl status checkout-worker'`, "#ef4444");
          }
        } else if (arg1 === "restart") {
          addLine(`[systemd] Restarting ${arg2 || "checkout-worker"}...`, "#f59e0b");
          addLine("✓ Stopped checkout-worker.service.", "#64748b");
          addLine("✓ Started checkout-worker.service with fresh PIDs (5901..5905).", "#22c55e");
          addLine("⚠ NOTICE: Within 5 seconds, fresh workers re-accumulated 128 pending sockets to auth.payment.internal:8443!", "#ef4444", true);
          addLine("Restarting the local service does not resolve the upstream network/DNS failure.", "#f59e0b");
        } else {
          addLine("Usage: systemctl status <service> | systemctl restart <service>", "#ef4444");
        }
        break;

      case "netstat":
      case "ss":
        addLine("Active Internet connections (only servers and established sockets)", "#64748b");
        addLine("Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name", "#64748b");
        addLine("tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      3900/nginx: master", "#cbd5e1");
        addLine("tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN      4102/node", "#cbd5e1");
        addLine("tcp        0      0 127.0.0.1:6379          0.0.0.0:*               LISTEN      4001/redis-server", "#cbd5e1");
        addLine("tcp        0    128 10.244.2.14:52810       10.244.3.99:8443        SYN_SENT    4103/node (worker 01)", "#ef4444");
        addLine("tcp        0    128 10.244.2.14:52812       10.244.3.99:8443        SYN_SENT    4103/node (worker 01)", "#ef4444");
        addLine("tcp        0    128 10.244.2.14:52814       10.244.3.99:8443        SYN_SENT    4104/node (worker 02)", "#ef4444");
        addLine("... [125 additional sockets in SYN_SENT to 10.244.3.99:8443]", "#ef4444", true);
        addLine("", "#fff");
        addLine("Total TCP sockets in SYN_SENT state: 128 (matches HTTP Agent maxSockets limit).", "#ef4444", true);
        break;

      case "kill":
        if (arg1 === "-9" || arg1) {
          const targetPid = arg1 === "-9" ? arg2 : arg1;
          addLine(`[SIGKILL] Sent signal 9 to PID ${targetPid || "4103"}. Process terminated.`, "#f59e0b");
          addLine("Systemd supervisor automatically respawned worker. Upstream timeouts persist.", "#94a3b8");
        } else {
          addLine("Usage: kill -9 <PID>", "#ef4444");
        }
        break;

      case "ls":
      case "dir":
        addLine("total 36K", "#64748b");
        addLine("drwxr-xr-x 4 aura aura 4096 Nov  5 14:10 dist/", "#38bdf8");
        addLine("drwxr-xr-x 2 aura aura 4096 Nov  5 14:10 src/", "#38bdf8");
        addLine("-rw-r--r-- 1 aura aura  840 Nov  5 14:12 src/checkout.ts", "#38bdf8");
        addLine("-rw-r--r-- 1 aura aura 1420 Nov  5 14:10 tests/checkout.test.ts", "#38bdf8");
        addLine("-rw-r--r-- 1 aura aura 6420 Nov  5 16:54 /var/log/checkout/timeout.log", "#ef4444");
        addLine("-rw-r--r-- 1 aura aura  620 Nov  4 09:30 package.json", "#cbd5e1");
        break;

      case "tasklist":
      case "get-process":
        addLine("Image Name                     PID Session Name        Session#    Mem Usage Status", "#64748b");
        addLine("========================= ======== ================ =========== ============ ======", "#64748b");
        addLine("System Idle Process              0 Services                   0          8 K Running", "#cbd5e1");
        addLine("System                           4 Services                   0        296 K Running", "#cbd5e1");
        addLine("node.exe                      4102 Services                   0     74,000 K Running [checkout-master]", "#38bdf8", true);
        addLine("node.exe                      4103 Services                   0     86,200 K Wait:Socket (D-State) [worker-01]", "#ef4444", true);
        addLine("node.exe                      4104 Services                   0     88,100 K Wait:Socket (D-State) [worker-02]", "#ef4444", true);
        addLine("node.exe                      4105 Services                   0     84,900 K Wait:Socket (D-State) [worker-03]", "#ef4444", true);
        addLine("node.exe                      4106 Services                   0     87,300 K Wait:Socket (D-State) [worker-04]", "#ef4444", true);
        addLine("", "#fff");
        addLine("ℹ [POWERSHELL / WINRM NOTICE] 4 checkout worker threads are suspended awaiting socket I/O completion.", "#f59e0b");
        break;

      case "get-service":
      case "sc":
        addLine("Status   Name               DisplayName", "#64748b");
        addLine("------   ----               -----------", "#64748b");
        addLine("Running  checkout-worker    Aura Commerce Checkout Microservice (128 open conns to auth.payment.internal:8443)", "#ef4444", true);
        addLine("Running  nginx              Aura Reverse Proxy Gateway", "#22c55e");
        addLine("Running  redis              Redis Cache Server", "#22c55e");
        break;

      case "restart-service":
        addLine("Restarting service 'checkout-worker'...", "#f59e0b");
        addLine("✓ Service 'checkout-worker' restarted.", "#22c55e");
        addLine("⚠ Fresh workers rapidly re-exhausted connection pool (128/128) against auth.payment.internal:8443.", "#ef4444", true);
        break;

      case "type":
      case "get-content":
        if (cmd.includes("timeout.log") || cmd.includes("error.log")) {
          addLine("═ C:\\aura-commerce\\logs\\timeout.log ═", "#ef4444", true);
          addLine("[2026-11-05T16:54:10.104Z] [worker-01] [HTTP_POOL_WARN] Active pool sockets: 128/128 (maxSockets reached)", "#f59e0b", true);
          addLine("[2026-11-05T16:54:40.105Z] [worker-01] [ERROR] Socket timeout after 30000ms waiting for auth.payment.internal:8443", "#ef4444", true);
          addLine("[2026-11-05T16:54:40.106Z] [worker-01] Error: ETIMEDOUT connect to auth.payment.internal:8443", "#ef4444");
        } else if (cmd.includes("checkout.ts")) {
          addLine("export async function processPayment(orderId: string, amount: number) {", "#cbd5e1");
          addLine("  const chargeSuccess = await paymentGateway.charge(order.customerId, amount);", "#cbd5e1");
          addLine("  if (order.status === 'PAID') return false;", "#ef4444");
          addLine("}", "#cbd5e1");
        } else {
          addLine(`Get-Content : Cannot find path '${arg1 || "file"}' because it does not exist.`, "#ef4444");
        }
        break;

      case "test-netconnection":
      case "tnc":
        addLine("ComputerName           : auth.payment.internal", "#38bdf8");
        addLine("RemoteAddress          : 10.244.3.99", "#ef4444", true);
        addLine("RemotePort             : 8443", "#38bdf8");
        addLine("InterfaceAlias         : vEthernet (Cluster-VPC)", "#cbd5e1");
        addLine("SourceAddress          : 10.244.2.14", "#cbd5e1");
        addLine("PingSucceeded          : False", "#ef4444", true);
        addLine("TcpTestSucceeded       : False", "#ef4444", true);
        addLine("WARNING: TCP connect to (10.244.3.99 : 8443) timed out after 30000ms!", "#ef4444", true);
        break;

      case "ipconfig":
        addLine("Windows IP Configuration", "#38bdf8", true);
        addLine("Ethernet adapter vEthernet (Cluster-VPC):", "#cbd5e1");
        addLine("   Connection-specific DNS Suffix  . : internal.aura", "#cbd5e1");
        addLine("   IPv4 Address. . . . . . . . . . . : 10.244.2.14", "#22c55e", true);
        addLine("   Subnet Mask . . . . . . . . . . . : 255.255.0.0", "#cbd5e1");
        addLine("   Default Gateway . . . . . . . . . : 10.244.0.1", "#cbd5e1");
        addLine("   DNS Servers . . . . . . . . . . . : 10.244.0.10", "#38bdf8");
        break;

      case "clear":
      case "cls":
        setOutput([]);
        break;

      default:
        if (shellMode === "windows") {
          addLine(`'${command}' is not recognized as an internal or external command, operable program or batch file. Type 'help' for diagnostics.`, "#ef4444");
        } else {
          addLine(`bash: ${command}: command not found. Type 'help' for diagnostic command reference.`, "#ef4444");
        }
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

  const discoveredCount = findings.filter((f) => f.discovered).length;

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
      {/* Top Remote Host Status Bar */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#38bdf8", fontWeight: 700 }}>
              {shellMode === "linux" ? "ssh: root@aura-prod-app-04:~/src" : "winrm: Administrator@aura-prod-app-04"}
            </span>
            <span
              style={{
                fontSize: 10,
                background: "rgba(0,255,65,0.12)",
                color: "#00ff41",
                padding: "1px 6px",
                borderRadius: 3,
                border: "1px solid rgba(0,255,65,0.3)",
              }}
            >
              SSH-2.0 CONNECTED
            </span>
            <span style={{ fontSize: 10, color: "#64748b" }}>IP: 10.244.2.14</span>
          </div>
        </div>

        {/* Shell Switcher & Quick Command Shortcuts */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", background: "#0f172a", borderRadius: 4, padding: 2, border: "1px solid #334155" }}>
            <button
              onClick={() => setShellMode("linux")}
              style={{
                background: shellMode === "linux" ? "#1e293b" : "transparent",
                color: shellMode === "linux" ? "#00ff41" : "#64748b",
                border: "none",
                padding: "3px 8px",
                borderRadius: 3,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
                fontFamily: "inherit",
              }}
            >
              Linux Bash
            </button>
            <button
              onClick={() => setShellMode("windows")}
              style={{
                background: shellMode === "windows" ? "#1e293b" : "transparent",
                color: shellMode === "windows" ? "#38bdf8" : "#64748b",
                border: "none",
                padding: "3px 8px",
                borderRadius: 3,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 700,
                fontFamily: "inherit",
              }}
            >
              PowerShell / CMD
            </button>
          </div>

          <button
            onClick={() => handleCommand("top")}
            style={{
              padding: "4px 10px",
              background: isTopRunning ? "rgba(239,68,68,0.2)" : "rgba(56,189,248,0.1)",
              border: isTopRunning ? "1px solid #ef4444" : "1px solid rgba(56,189,248,0.4)",
              color: isTopRunning ? "#ef4444" : "#38bdf8",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {isTopRunning ? "QUIT TOP [q]" : "RUN [top]"}
          </button>

          <button
            onClick={() => setIsRunbookOpen(!isRunbookOpen)}
            style={{
              padding: "4px 10px",
              background: isRunbookOpen ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.05)",
              border: isRunbookOpen ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.15)",
              color: isRunbookOpen ? "#38bdf8" : "#94a3b8",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📋</span>
            <span>RUNBOOK ({discoveredCount}/4)</span>
          </button>
        </div>
      </div>

      {/* Main Split Body: Terminal Output on Left, Diagnostic Findings on Right */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Terminal Area */}
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
          {/* Output log */}
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

          {/* Interactive TOP Live Overlay if active */}
          {isTopRunning && (
            <div
              style={{
                margin: "10px 0",
                padding: "10px 14px",
                background: "#080e1a",
                border: "1px solid #38bdf8",
                borderRadius: 6,
                fontSize: 12,
                color: "#e2e8f0",
              }}
            >
              <div style={{ color: "#38bdf8", fontWeight: 700, marginBottom: 4 }}>
                top - 16:58:2{topTicks % 10} up 14 days, 3:22, 1 user, load average: 1.12, 1.05, 0.98
              </div>
              <div style={{ color: "#94a3b8" }}>
                Tasks: 142 total, 1 running, 141 sleeping (4 uninterruptible D state)
              </div>
              <div style={{ color: "#94a3b8" }}>
                %Cpu(s): 12.4 us, 2.1 sy, 0.0 ni, 84.1 id, 1.4 wa, 0.0 hi, 0.0 si, 0.0 st
              </div>
              <div style={{ color: "#94a3b8" }}>
                MiB Mem : 15980.4 total, 3210.8 used, 840.1 free, 11929.5 buff/cache
              </div>
              <div style={{ color: "#94a3b8", marginBottom: 6 }}>
                MiB Swap: 4096.0 total, 0.0 used, 4096.0 free. 12769.6 avail Mem
              </div>
              <div style={{ background: "#0f172a", padding: "4px 8px", color: "#38bdf8", fontWeight: 700 }}>
                PID  USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
              </div>
              <div style={{ color: "#ef4444", fontWeight: 700, padding: "2px 8px" }}>
                4103 aura      20   0  940100  86200  14100 D   0.1   2.1   1:12.40 node (worker-01) [BLOCKED]
              </div>
              <div style={{ color: "#ef4444", fontWeight: 700, padding: "2px 8px" }}>
                4104 aura      20   0  944800  88100  14100 D   0.1   2.2   1:08.12 node (worker-02) [BLOCKED]
              </div>
              <div style={{ color: "#ef4444", fontWeight: 700, padding: "2px 8px" }}>
                4105 aura      20   0  938200  84900  14100 D   0.1   2.0   1:15.89 node (worker-03) [BLOCKED]
              </div>
              <div style={{ color: "#ef4444", fontWeight: 700, padding: "2px 8px" }}>
                4106 aura      20   0  941900  87300  14100 D   0.2   2.1   1:10.51 node (worker-04) [BLOCKED]
              </div>
              <div style={{ color: "#94a3b8", padding: "2px 8px" }}>
                3901 www-data  20   0  148200  24100  12000 S   0.2   0.6  14:22.01 nginx: worker
              </div>
              <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Press 'q' in terminal or click button to return to prompt:</span>
                <button
                  onClick={() => {
                    setIsTopRunning(false);
                    addLine("Exited top.", "#94a3b8");
                  }}
                  style={{
                    padding: "3px 8px",
                    background: "rgba(239,68,68,0.2)",
                    border: "1px solid #ef4444",
                    color: "#ef4444",
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  QUIT TOP (q)
                </button>
              </div>
            </div>
          )}

          {/* Prompt line */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span
              style={{
                color: shellMode === "linux" ? "#00ff41" : "#38bdf8",
                fontWeight: 700,
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              {shellMode === "linux" ? "root@aura-prod-app-04:~/src#" : "PS C:\\aura-commerce>"}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder={isTopRunning ? "Type 'q' to quit top..." : "Enter command (e.g. ps aux, top, tail timeout.log, free -m)..."}
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

        {/* Right Side: Host Diagnostics Runbook & Clues Panel (Collapsible) */}
        {isRunbookOpen && (
          <div
            style={{
              width: 300,
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8", letterSpacing: "1px" }}>
                  HOST INVESTIGATION
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: discoveredCount === 4 ? "#00ff41" : "#f59e0b",
                    background: discoveredCount === 4 ? "rgba(0,255,65,0.12)" : "rgba(245,158,11,0.12)",
                    padding: "2px 6px",
                    borderRadius: 3,
                  }}
                >
                  {discoveredCount} / 4 DISCOVERED
                </span>
              </div>
            </div>

            {/* Quick command buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                Quick Inspection Probes
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { label: "ps aux", cmd: "ps aux" },
                  { label: "top", cmd: "top" },
                  { label: "free -m", cmd: "free -m" },
                  { label: "uptime", cmd: "uptime" },
                  { label: "tail logs", cmd: "cat /var/log/checkout/timeout.log" },
                  { label: "systemctl", cmd: "systemctl status checkout-worker" },
                  { label: "ss -s", cmd: "ss -s" },
                  { label: "netstat", cmd: "netstat -tulnp" },
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

            {/* Investigation Findings Checklist */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                Diagnostic Findings Log
              </span>

              {findings.map((f) => (
                <div
                  key={f.id}
                  style={{
                    padding: "8px 10px",
                    background: f.discovered ? "rgba(0, 255, 65, 0.05)" : "#090d16",
                    border: `1px solid ${f.discovered ? "#00ff41" : "#1e293b"}`,
                    borderRadius: 4,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ color: f.discovered ? "#00ff41" : "#64748b", fontSize: 11 }}>
                      {f.discovered ? "✓" : "○"}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: f.discovered ? "#f8fafc" : "#94a3b8",
                      }}
                    >
                      {f.title}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: f.discovered ? "#86efac" : "#475569", lineHeight: 1.4 }}>
                    {f.discovered ? f.detail : `Run diagnostic commands (${f.commandTrigger[0]}...) to uncover.`}
                  </div>
                </div>
              ))}
            </div>

            {/* Step progression card if all findings unlocked */}
            {discoveredCount >= 3 && onNavigateSubEnv && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: "auto",
                  padding: 10,
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid #38bdf8",
                  borderRadius: 4,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", marginBottom: 4 }}>
                  Next Step: Isolate Network Layer
                </div>
                <div style={{ fontSize: 10, color: "#cbd5e1", lineHeight: 1.4, marginBottom: 8 }}>
                  Host CPU/RAM is fine, but workers are waiting on upstream socket responses.
                </div>
                <button
                  onClick={() => onNavigateSubEnv("network")}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    background: "#38bdf8",
                    color: "#020408",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  OPEN NETWORK LAB ▶
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
