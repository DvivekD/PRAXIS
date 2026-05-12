"use client";

import { useState } from "react";
import { FileExplorer } from "./FileExplorer";
import { CodeEditor } from "./CodeEditor";
import { Terminal } from "./Terminal";
import { ChatInterface } from "./ChatInterface";

export function IDELayout({ sessionId }: { sessionId?: string }) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr 380px",
        gridTemplateRows: "2fr 1fr",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#0d1117", // GitHub Dark theme inspired
        color: "#c9d1d9",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Sidebar: File Explorer */}
      <div
        style={{
          gridRow: "1 / span 2",
          borderRight: "1px solid #30363d",
          backgroundColor: "#161b22",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid #30363d", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8b949e" }}>
          Project Explorer
        </div>
        <FileExplorer onFileSelect={setSelectedFile} />
      </div>

      {/* Main Area: Editor */}
      <div
        style={{
          position: "relative",
          backgroundColor: "#0d1117",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Editor Tabs (Visual Only) */}
        <div style={{ display: "flex", borderBottom: "1px solid #30363d", backgroundColor: "#010409", overflowX: "auto" }}>
          {selectedFile && (
            <div style={{ padding: "10px 20px", borderRight: "1px solid #30363d", borderTop: "2px solid #58a6ff", backgroundColor: "#0d1117", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b949e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
              {selectedFile.split('/').pop()}
            </div>
          )}
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <CodeEditor filePath={selectedFile} />
        </div>
      </div>

      {/* Right Sidebar: Chat / AI Panel */}
      <div
        style={{
          gridRow: "1 / span 2",
          borderLeft: "1px solid #30363d",
          backgroundColor: "#0d1117",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-5px 0 20px rgba(0,0,0,0.2)",
          zIndex: 10,
        }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid #30363d", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#c9d1d9", display: "flex", alignItems: "center", gap: "8px" }}>
             <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#3fb950", boxShadow: "0 0 8px #3fb950" }}></div>
             Alex (Senior Engineer)
          </div>
          <div style={{ fontSize: "12px", color: "#8b949e", backgroundColor: "#21262d", padding: "2px 8px", borderRadius: "10px" }}>Voice Active</div>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
           <ChatInterface activeSessionId={sessionId} />
        </div>
      </div>

      {/* Bottom Area: Terminal */}
      <div
        style={{
          gridColumn: "2 / span 1",
          borderTop: "1px solid #30363d",
          backgroundColor: "#010409",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", borderBottom: "1px solid #30363d", backgroundColor: "#161b22" }}>
           <div style={{ padding: "8px 16px", borderBottom: "2px solid #58a6ff", fontSize: "12px", textTransform: "uppercase", color: "#c9d1d9", fontWeight: 500 }}>Terminal</div>
        </div>
        <div style={{ flex: 1, padding: "8px", overflow: "hidden" }}>
          <Terminal />
        </div>
      </div>
    </div>
  );
}
