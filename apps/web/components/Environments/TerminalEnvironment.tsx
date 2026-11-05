"use client";

import React from "react";
import EngineeringEnvironment from "./Engineering/EngineeringEnvironment";

interface TerminalEnvironmentProps {
  sessionId: string;
  onAction: (actionText: string, metadata?: Record<string, any>) => Promise<any>;
  onComplete: () => void;
  demoMode: boolean;
  onQuickSolve?: () => void;
  analyserNode?: AnalyserNode | null;
  initialSubEnv?: number;
  onSubEnvChange?: (sub: number) => void;
}

export default function TerminalEnvironment({
  sessionId,
  onAction,
  onComplete,
  demoMode,
  onQuickSolve,
  analyserNode,
  initialSubEnv,
  onSubEnvChange,
}: TerminalEnvironmentProps) {
  return (
    <EngineeringEnvironment
      sessionId={sessionId}
      onAction={onAction}
      onComplete={onComplete}
      demoMode={demoMode}
      onQuickSolve={onQuickSolve}
      analyserNode={analyserNode}
      initialSubEnv={initialSubEnv}
      onSubEnvChange={onSubEnvChange}
    />
  );
}
