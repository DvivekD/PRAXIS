"use client";

import { useEffect, useState } from "react";

interface FileNode {
  name: string;
  isDir: boolean;
  path: string;
  children?: FileNode[];
}

export function FileExplorer({ onFileSelect }: { onFileSelect: (path: string) => void }) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch file tree from backend
    // Hardcoded default sandbox ID for now
    fetch("http://localhost:3001/sandbox/default/files")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch files");
        return res.json();
      })
      .then((data) => {
        setFiles(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: "8px" }}>Loading files...</div>;
  if (error) return <div style={{ padding: "8px", color: "red" }}>Error: {error}</div>;

  const renderTree = (nodes: FileNode[]) => {
    return (
      <ul style={{ listStyle: "none", paddingLeft: "16px", margin: 0 }}>
        {nodes.map((node) => (
          <li key={node.path} style={{ margin: "4px 0" }}>
            {node.isDir ? (
              <span style={{ fontWeight: "bold" }}>📁 {node.name}</span>
            ) : (
              <span
                style={{ cursor: "pointer" }}
                onClick={() => onFileSelect(node.path)}
              >
                📄 {node.name}
              </span>
            )}
            {node.children && renderTree(node.children)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div style={{ overflowY: "auto", height: "100%", borderRight: "1px solid #333", padding: "8px" }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Explorer</h3>
      {files.length === 0 ? <div>No files</div> : renderTree(files)}
    </div>
  );
}
