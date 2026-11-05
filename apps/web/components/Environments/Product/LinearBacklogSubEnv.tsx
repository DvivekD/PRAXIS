"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BacklogIssue, IssuePriority, IssueStatus } from "./types";
import { submitProductTriageAction } from "../../../actions/eval";

interface LinearBacklogSubEnvProps {
  sessionId: string;
  issues: BacklogIssue[];
  onUpdateIssue: (issueId: string, updates: Partial<BacklogIssue>) => void;
  onCreateIssue: (newIssue: Omit<BacklogIssue, "id">) => void;
  onAction: (actionText: string) => void;
}

const COLUMNS: { id: IssueStatus; label: string; icon: string; color: string }[] = [
  { id: "triage", label: "Triage", icon: "📥", color: "#94a3b8" },
  { id: "backlog", label: "Sprint Backlog", icon: "📋", color: "#60a5fa" },
  { id: "in_progress", label: "In Progress", icon: "⚡", color: "#f59e0b" },
  { id: "ready_for_launch", label: "Ready for Launch", icon: "🚀", color: "#a855f7" },
  { id: "done", label: "Done / Deferred", icon: "✅", color: "#22c55e" },
];

const PRIORITY_META: Record<IssuePriority, { label: string; color: string; bg: string; icon: string }> = {
  P0: { label: "P0 Urgent", color: "#ef4444", bg: "rgba(239,68,68,0.15)", icon: "🔴" },
  P1: { label: "P1 High", color: "#f97316", bg: "rgba(249,115,22,0.15)", icon: "🟠" },
  P2: { label: "P2 Medium", color: "#eab308", bg: "rgba(234,179,8,0.15)", icon: "🟡" },
  P3: { label: "P3 Low", color: "#94a3b8", bg: "rgba(148,163,184,0.15)", icon: "⚪" },
};

export default function LinearBacklogSubEnv({
  sessionId,
  issues,
  onUpdateIssue,
  onCreateIssue,
  onAction,
}: LinearBacklogSubEnvProps) {
  const [viewMode, setViewMode] = useState<"board" | "list" | "roadmap">("board");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sprintCommitted, setSprintCommitted] = useState(false);

  // New Issue form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<IssuePriority>("P1");
  const [newPoints, setNewPoints] = useState(3);
  const [newAssigneeName, setNewAssigneeName] = useState("Alex Chen");
  const [newLabels, setNewLabels] = useState("Checkout, Stability");

  const filteredIssues = issues.filter((issue) => {
    if (selectedPriorityFilter !== "ALL" && issue.priority !== selectedPriorityFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (
        issue.key.toLowerCase().includes(q) ||
        issue.title.toLowerCase().includes(q) ||
        issue.description.toLowerCase().includes(q) ||
        issue.labels.some((l) => l.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const selectedIssue = issues.find((i) => i.id === selectedIssueId);

  // Sprint metrics calculation
  const totalPoints = issues.reduce((sum, i) => sum + i.storyPoints, 0);
  const inSprintIssues = issues.filter((i) => i.status === "in_progress" || i.status === "ready_for_launch");
  const committedPoints = inSprintIssues.reduce((sum, i) => sum + i.storyPoints, 0);
  const sprintCapacity = 20;
  const isOverCapacity = committedPoints > sprintCapacity;

  // Launch gate check
  const hasP0Sev1Committed = issues.some(
    (i) => i.key === "AURA-101" && (i.status === "in_progress" || i.status === "ready_for_launch")
  );
  const isRiskyBannerBlocked = issues.some(
    (i) => i.key === "AURA-104" && (i.status === "triage" || i.status === "done")
  );

  const handleStatusChange = async (issue: BacklogIssue, newStatus: IssueStatus) => {
    onUpdateIssue(issue.id, { status: newStatus });
    onAction(`[LINEAR_BOARD] Moved ${issue.key} ("${issue.title}") -> ${newStatus.toUpperCase()}`);
    await submitProductTriageAction(sessionId, "update_issue", {
      issueKey: issue.key,
      priority: issue.priority,
      status: newStatus,
    });
  };

  const handlePriorityChange = async (issue: BacklogIssue, newPriority: IssuePriority) => {
    onUpdateIssue(issue.id, { priority: newPriority });
    onAction(`[LINEAR_PRIORITY] Reprioritized ${issue.key} -> ${newPriority}`);
    await submitProductTriageAction(sessionId, "update_issue", {
      issueKey: issue.key,
      priority: newPriority,
      status: issue.status,
    });
  };

  const handlePointsChange = (issue: BacklogIssue, points: number) => {
    onUpdateIssue(issue.id, { storyPoints: points });
    onAction(`[LINEAR_ESTIMATE] Story points for ${issue.key} adjusted to ${points} pts`);
  };

  const handleCommitSprint = async () => {
    setSprintCommitted(true);
    onAction(
      `[LINEAR_SPRINT_COMMITTED] Sprint 48 committed with ${committedPoints}/${sprintCapacity} pts. P0 Sev-1 Idempotency Fix in progress=${hasP0Sev1Committed}, Risky Banner Deferral=${isRiskyBannerBlocked}.`
    );
    await submitProductTriageAction(sessionId, "commit_sprint", { committedPoints });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const nextNumber = 100 + issues.length + 1;
    onCreateIssue({
      key: `AURA-${nextNumber}`,
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      status: "triage",
      storyPoints: newPoints,
      assignee: {
        name: newAssigneeName,
        avatar: newAssigneeName.split(" ").map((n) => n[0]).join(""),
        role: "Team Member",
      },
      labels: newLabels.split(",").map((l) => l.trim()).filter(Boolean),
    });

    onAction(`[LINEAR_ISSUE_CREATED] Created AURA-${nextNumber}: "${newTitle}" [${newPriority}, ${newPoints} pts]`);
    setIsCreateModalOpen(false);
    setNewTitle("");
    setNewDesc("");
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#0e1017",
        color: "#e2e8f0",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ─── LINEAR TOP NAVIGATION & SPRINT BAR ────────────────── */}
      <div
        style={{
          height: 54,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "#141722",
        }}
      >
        {/* Left: Project & Workspace */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            L
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              <span>AURA // Black Friday Launch Sprint 48</span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: isOverCapacity ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.15)",
                  color: isOverCapacity ? "#f87171" : "#4ade80",
                  fontWeight: 600,
                }}
              >
                {isOverCapacity ? "OVERLOADED" : "ON TRACK"}
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div
          style={{
            display: "flex",
            background: "rgba(0,0,0,0.3)",
            padding: 3,
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            onClick={() => setViewMode("board")}
            style={{
              background: viewMode === "board" ? "#282c3c" : "transparent",
              color: viewMode === "board" ? "#fff" : "#94a3b8",
              border: "none",
              padding: "5px 14px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>▦</span>
            <span>Board</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            style={{
              background: viewMode === "list" ? "#282c3c" : "transparent",
              color: viewMode === "list" ? "#fff" : "#94a3b8",
              border: "none",
              padding: "5px 14px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>≡</span>
            <span>Backlog List</span>
          </button>
          <button
            onClick={() => setViewMode("roadmap")}
            style={{
              background: viewMode === "roadmap" ? "#282c3c" : "transparent",
              color: viewMode === "roadmap" ? "#fff" : "#94a3b8",
              border: "none",
              padding: "5px 14px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📅</span>
            <span>Roadmap</span>
          </button>
        </div>

        {/* Right: New Issue & Commit Sprint */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              background: "#282c3c",
              color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>+</span>
            <span>New Issue</span>
          </button>

          <button
            onClick={handleCommitSprint}
            style={{
              background: sprintCommitted ? "#16a34a" : "linear-gradient(135deg, #4f46e5, #4338ca)",
              color: "#fff",
              border: "none",
              padding: "6px 16px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(79,70,229,0.3)",
            }}
          >
            <span>{sprintCommitted ? "✓ Committed" : "Commit Sprint"}</span>
          </button>
        </div>
      </div>

      {/* ─── SPRINT METRICS & CAPACITY SUB-BAR ─────────────────── */}
      <div
        style={{
          padding: "8px 20px",
          background: "#12141d",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
        }}
      >
        {/* Capacity Meter */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#94a3b8" }}>Sprint Capacity:</span>
            <strong style={{ color: isOverCapacity ? "#f87171" : "#fff" }}>
              {committedPoints} / {sprintCapacity} pts
            </strong>
          </div>
          <div style={{ width: 140, height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, (committedPoints / sprintCapacity) * 100)}%`,
                height: "100%",
                background: isOverCapacity ? "#ef4444" : "#6366f1",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Priority Filter chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#64748b", fontSize: 11, marginRight: 4 }}>Filter:</span>
          {["ALL", "P0", "P1", "P2", "P3"].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPriorityFilter(p)}
              style={{
                background: selectedPriorityFilter === p ? "#282c3c" : "transparent",
                color: selectedPriorityFilter === p ? "#fff" : "#94a3b8",
                border: "1px solid",
                borderColor: selectedPriorityFilter === p ? "rgba(255,255,255,0.2)" : "transparent",
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
          <input
            type="text"
            placeholder="Search issues..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              marginLeft: 10,
              background: "#1b1e2a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 4,
              padding: "3px 8px",
              fontSize: 11,
              color: "#fff",
              outline: "none",
              width: 140,
            }}
          />
        </div>
      </div>

      {/* ─── VIEW MODE: KANBAN BOARD ───────────────────────────── */}
      {viewMode === "board" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            gap: 12,
            padding: 16,
            overflowX: "auto",
            overflowY: "hidden",
          }}
        >
          {COLUMNS.map((col) => {
            const colIssues = filteredIssues.filter((i) => i.status === col.id);
            const colPoints = colIssues.reduce((sum, i) => sum + i.storyPoints, 0);

            return (
              <div
                key={col.id}
                style={{
                  flex: "0 0 280px",
                  background: "#131620",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{col.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{col.label}</span>
                    <span
                      style={{
                        fontSize: 11,
                        background: "rgba(255,255,255,0.08)",
                        color: "#94a3b8",
                        padding: "1px 6px",
                        borderRadius: 10,
                      }}
                    >
                      {colIssues.length}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{colPoints} pts</span>
                </div>

                {/* Cards Container */}
                <div
                  style={{
                    flex: 1,
                    padding: 10,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {colIssues.map((issue) => {
                    const pMeta = PRIORITY_META[issue.priority];

                    return (
                      <motion.div
                        key={issue.id}
                        layout
                        onClick={() => setSelectedIssueId(issue.id)}
                        whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
                        style={{
                          background: "#1c1f2b",
                          borderRadius: 6,
                          border: "1px solid rgba(255,255,255,0.06)",
                          padding: 12,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          position: "relative",
                        }}
                      >
                        {/* Top: Key & Priority */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>{issue.key}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                fontSize: 10,
                                background: pMeta.bg,
                                color: pMeta.color,
                                padding: "1px 6px",
                                borderRadius: 3,
                                fontWeight: 700,
                              }}
                            >
                              {issue.priority}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                background: "rgba(255,255,255,0.08)",
                                color: "#cbd5e1",
                                padding: "1px 6px",
                                borderRadius: 3,
                                fontWeight: 600,
                              }}
                            >
                              {issue.storyPoints} pts
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>
                          {issue.title}
                        </div>

                        {/* Description snippet */}
                        <div
                          style={{
                            fontSize: 11,
                            color: "#94a3b8",
                            lineHeight: 1.4,
                            maxHeight: 32,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {issue.description}
                        </div>

                        {/* Labels */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {issue.labels.map((l) => (
                            <span
                              key={l}
                              style={{
                                fontSize: 9,
                                background: "rgba(255,255,255,0.05)",
                                color: "#94a3b8",
                                padding: "1px 5px",
                                borderRadius: 3,
                              }}
                            >
                              #{l}
                            </span>
                          ))}
                          {issue.originEmailId && (
                            <span
                              style={{
                                fontSize: 9,
                                background: "rgba(59,130,246,0.15)",
                                color: "#93c5fd",
                                padding: "1px 5px",
                                borderRadius: 3,
                              }}
                            >
                              ✉️ Linked Email
                            </span>
                          )}
                        </div>

                        {/* Card Footer: Assignee & Column Move Shortcuts */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderTop: "1px solid rgba(255,255,255,0.04)",
                            paddingTop: 6,
                            marginTop: 2,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: "#3b82f6",
                                color: "#fff",
                                fontSize: 9,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {issue.assignee.avatar}
                            </div>
                            <span style={{ fontSize: 11, color: "#cbd5e1" }}>{issue.assignee.name}</span>
                          </div>

                          {/* Quick Column Advance */}
                          <div style={{ display: "flex", gap: 4 }}>
                            {col.id !== "triage" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idx = COLUMNS.findIndex((c) => c.id === col.id);
                                  if (idx > 0) handleStatusChange(issue, COLUMNS[idx - 1].id);
                                }}
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  border: "none",
                                  color: "#94a3b8",
                                  borderRadius: 3,
                                  padding: "2px 6px",
                                  fontSize: 10,
                                  cursor: "pointer",
                                }}
                                title="Move left"
                              >
                                ◀
                              </button>
                            )}
                            {col.id !== "done" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idx = COLUMNS.findIndex((c) => c.id === col.id);
                                  if (idx < COLUMNS.length - 1) handleStatusChange(issue, COLUMNS[idx + 1].id);
                                }}
                                style={{
                                  background: "rgba(99,102,241,0.2)",
                                  border: "1px solid rgba(99,102,241,0.3)",
                                  color: "#a5b4fc",
                                  borderRadius: 3,
                                  padding: "2px 6px",
                                  fontSize: 10,
                                  cursor: "pointer",
                                  fontWeight: 700,
                                }}
                                title="Move right"
                              >
                                ▶
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {colIssues.length === 0 && (
                    <div
                      style={{
                        padding: "20px 10px",
                        textAlign: "center",
                        fontSize: 12,
                        color: "#64748b",
                        border: "1px dashed rgba(255,255,255,0.06)",
                        borderRadius: 6,
                      }}
                    >
                      No issues in {col.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── VIEW MODE: BACKLOG LIST ───────────────────────────── */}
      {viewMode === "list" && (
        <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
          <div
            style={{
              background: "#131620",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 100px 120px 140px 120px",
                padding: "10px 16px",
                background: "#181b27",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: 11,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
              }}
            >
              <span>Key</span>
              <span>Title & Summary</span>
              <span>Priority</span>
              <span>Status</span>
              <span>Assignee</span>
              <span style={{ textAlign: "right" }}>Estimate</span>
            </div>

            {/* List rows */}
            {filteredIssues.map((issue) => {
              const pMeta = PRIORITY_META[issue.priority];
              const colMeta = COLUMNS.find((c) => c.id === issue.status);

              return (
                <div
                  key={issue.id}
                  onClick={() => setSelectedIssueId(issue.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 100px 120px 140px 120px",
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    alignItems: "center",
                    cursor: "pointer",
                    fontSize: 13,
                    transition: "background 0.1s ease",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#6366f1", fontSize: 12 }}>{issue.key}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: "#fff", marginBottom: 2 }}>{issue.title}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{issue.description.slice(0, 90)}...</div>
                  </div>
                  <div>
                    <select
                      value={issue.priority}
                      onChange={(e) => handlePriorityChange(issue, e.target.value as IssuePriority)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: pMeta.bg,
                        color: pMeta.color,
                        border: "none",
                        borderRadius: 4,
                        padding: "2px 6px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <option value="P0">P0 Urgent</option>
                      <option value="P1">P1 High</option>
                      <option value="P2">P2 Medium</option>
                      <option value="P3">P3 Low</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={issue.status}
                      onChange={(e) => handleStatusChange(issue, e.target.value as IssueStatus)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: colMeta?.color || "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "2px 6px",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "#3b82f6",
                        color: "#fff",
                        fontSize: 9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                      }}
                    >
                      {issue.assignee.avatar}
                    </div>
                    <span style={{ fontSize: 12, color: "#cbd5e1" }}>{issue.assignee.name}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <select
                      value={issue.storyPoints}
                      onChange={(e) => handlePointsChange(issue, parseInt(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        padding: "2px 6px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {[1, 2, 3, 5, 8, 13].map((pt) => (
                        <option key={pt} value={pt}>
                          {pt} pts
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── VIEW MODE: ROADMAP / MILESTONES ──────────────────── */}
      {viewMode === "roadmap" && (
        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#141722", padding: 20, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 16, color: "#fff" }}>
                Black Friday T-Minus 6 Hours Readiness Gate
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
                Strategic rule of engagement: Code freeze must remain active for all speculative revenue features (e.g. Gift Card Upsells). Only Sev-1 payment integrity hotfixes and defensive mitigations are permitted to deploy before midnight.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  background: "#181b26",
                  padding: 16,
                  borderRadius: 8,
                  borderLeft: hasP0Sev1Committed ? "4px solid #22c55e" : "4px solid #ef4444",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                    Gate 1: Checkout Idempotency Verification (AURA-101)
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                    Move idempotency validation before payment charge to stop duplicate deductions.
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: hasP0Sev1Committed ? "#4ade80" : "#f87171",
                    background: hasP0Sev1Committed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                    padding: "4px 12px",
                    borderRadius: 4,
                  }}
                >
                  {hasP0Sev1Committed ? "✓ IN PROGRESS" : "❌ NOT COMMITTED"}
                </span>
              </div>

              <div
                style={{
                  background: "#181b26",
                  padding: 16,
                  borderRadius: 8,
                  borderLeft: isRiskyBannerBlocked ? "4px solid #22c55e" : "4px solid #f59e0b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                    Gate 2: Gift Card Promo Deployment Freeze (AURA-104)
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                    Push back on CEO's last-minute feature request to prevent introducing instability.
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isRiskyBannerBlocked ? "#4ade80" : "#fbbf24",
                    background: isRiskyBannerBlocked ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                    padding: "4px 12px",
                    borderRadius: 4,
                  }}
                >
                  {isRiskyBannerBlocked ? "✓ HELD / DEFERRED" : "⚠️ AT RISK"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE ISSUE MODAL ────────────────────────────────── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleCreateSubmit}
              style={{
                width: 540,
                background: "#181b26",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  background: "#1f2230",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Create Linear User Story / Issue</span>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16 }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                    Issue Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Add Redis Distributed Lock to Checkout"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#10121a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                    User Story & Acceptance Criteria
                  </label>
                  <textarea
                    rows={3}
                    placeholder="As a shopper, my card should only be charged once even if I double-click submit..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#10121a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      color: "#fff",
                      fontSize: 13,
                      fontFamily: "inherit",
                      outline: "none",
                      resize: "none",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Priority
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as IssuePriority)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#10121a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 13,
                        outline: "none",
                      }}
                    >
                      <option value="P0">P0 Urgent (Sev-1)</option>
                      <option value="P1">P1 High</option>
                      <option value="P2">P2 Medium</option>
                      <option value="P3">P3 Low</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Story Points
                    </label>
                    <select
                      value={newPoints}
                      onChange={(e) => setNewPoints(parseInt(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#10121a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 13,
                        outline: "none",
                      }}
                    >
                      {[1, 2, 3, 5, 8, 13].map((pt) => (
                        <option key={pt} value={pt}>
                          {pt} points
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Assignee
                    </label>
                    <select
                      value={newAssigneeName}
                      onChange={(e) => setNewAssigneeName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#10121a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 13,
                        outline: "none",
                      }}
                    >
                      <option value="Alex Chen">Alex Chen (Engineering / SRE)</option>
                      <option value="Jordan Mitchell">Jordan Mitchell (Support Lead)</option>
                      <option value="Chloe Zhao">Chloe Zhao (Marketing)</option>
                      <option value="Product Manager">Product Manager (Self)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Labels (comma separated)
                    </label>
                    <input
                      type="text"
                      value={newLabels}
                      onChange={(e) => setNewLabels(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#10121a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "12px 20px",
                  background: "#1f2230",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8",
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#4f46e5",
                    color: "#fff",
                    border: "none",
                    padding: "6px 18px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Create Story
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ISSUE DETAIL SLIDE-OVER / MODAL ───────────────────── */}
      <AnimatePresence>
        {selectedIssue && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                width: 620,
                maxHeight: "88vh",
                background: "#181b26",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "14px 20px",
                  background: "#1f2230",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#6366f1" }}>
                    {selectedIssue.key}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: PRIORITY_META[selectedIssue.priority].bg,
                      color: PRIORITY_META[selectedIssue.priority].color,
                      fontWeight: 700,
                    }}
                  >
                    {selectedIssue.priority}
                  </span>
                  {selectedIssue.isLaunchBlocker && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "rgba(239,68,68,0.2)",
                        color: "#f87171",
                        fontWeight: 700,
                      }}
                    >
                      🚨 LAUNCH BLOCKER
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIssueId(null)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16 }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                    User Story Title
                  </label>
                  <input
                    type="text"
                    value={selectedIssue.title}
                    onChange={(e) => onUpdateIssue(selectedIssue.id, { title: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#10121a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Priority
                    </label>
                    <select
                      value={selectedIssue.priority}
                      onChange={(e) => handlePriorityChange(selectedIssue, e.target.value as IssuePriority)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#10121a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        outline: "none",
                      }}
                    >
                      <option value="P0">P0 Urgent (Sev-1)</option>
                      <option value="P1">P1 High</option>
                      <option value="P2">P2 Medium</option>
                      <option value="P3">P3 Low</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Kanban Status
                    </label>
                    <select
                      value={selectedIssue.status}
                      onChange={(e) => handleStatusChange(selectedIssue, e.target.value as IssueStatus)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#10121a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        outline: "none",
                      }}
                    >
                      {COLUMNS.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.icon} {col.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                      Story Points (Fibonacci)
                    </label>
                    <select
                      value={selectedIssue.storyPoints}
                      onChange={(e) => handlePointsChange(selectedIssue, parseInt(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#10121a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        outline: "none",
                      }}
                    >
                      {[1, 2, 3, 5, 8, 13].map((pt) => (
                        <option key={pt} value={pt}>
                          {pt} points
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 6 }}>
                    Acceptance Criteria & Engineering Context
                  </label>
                  <textarea
                    rows={4}
                    value={selectedIssue.description}
                    onChange={(e) => onUpdateIssue(selectedIssue.id, { description: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "#10121a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      color: "#cbd5e1",
                      fontSize: 12,
                      lineHeight: 1.6,
                      fontFamily: "inherit",
                      outline: "none",
                      resize: "none",
                    }}
                  />
                </div>

                {/* Assignee & Origin Info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#131620", padding: 12, borderRadius: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Assignee:</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#3b82f6", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {selectedIssue.assignee.avatar}
                      </div>
                      <span style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{selectedIssue.assignee.name}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>Origin & Traceability:</div>
                    <div style={{ fontSize: 12, color: selectedIssue.originEmailId ? "#93c5fd" : "#64748b", marginTop: 4 }}>
                      {selectedIssue.originEmailId ? `✉️ Stakeholder Email (${selectedIssue.originEmailId})` : "Direct Product Roadmap"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "12px 20px",
                  background: "#1f2230",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedIssueId(null)}
                  style={{
                    background: "#4f46e5",
                    color: "#fff",
                    border: "none",
                    padding: "6px 18px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Done / Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
