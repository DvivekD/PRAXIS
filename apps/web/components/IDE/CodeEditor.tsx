"use client";

import { useEffect, useState, KeyboardEvent } from "react";

export function CodeEditor({ filePath }: { filePath: string | null }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!filePath) return;

    // Fetch file content when path changes
    fetch(`http://localhost:3001/sandbox/default/file?path=${encodeURIComponent(filePath)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch file content");
        return res.text();
      })
      .then((text) => setContent(text))
      .catch((err) => console.error(err));
  }, [filePath]);

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Save on Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (!filePath) return;

      setSaving(true);
      try {
        await fetch("http://localhost:3001/sandbox/default/file", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: filePath, content }),
        });
      } catch (err) {
        console.error("Save failed", err);
      } finally {
        setSaving(false);
      }
    }
  };

  if (!filePath) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#666" }}>
        Select a file to edit
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "8px", backgroundColor: "#2d2d2d", borderBottom: "1px solid #1e1e1e", display: "flex", justifyContent: "space-between" }}>
        <span>{filePath}</span>
        {saving && <span style={{ color: "#aaa" }}>Saving...</span>}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          flex: 1,
          width: "100%",
          padding: "16px",
          fontFamily: "monospace",
          backgroundColor: "#1e1e1e",
          color: "#d4d4d4",
          border: "none",
          resize: "none",
          outline: "none",
        }}
        spellCheck={false}
      />
    </div>
  );
}
