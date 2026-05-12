import type { Metadata } from "next";
import JudgeMenu from "../components/JudgeMenu";

export const metadata: Metadata = {
  title: "PRAXIS — AI-Powered Assessment Platform",
  description:
    "PRAXIS is the next-generation immersive technical assessment environment. Experience AI-driven stakeholder roleplay, real-time behavioral telemetry, and cryptographically-verified performance credentials.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          body {
            margin: 0;
            padding: 0;
            background: #080c14;
            font-family: 'Inter', sans-serif;
            overflow-x: hidden;
          }
        `}</style>
      </head>
      <body suppressHydrationWarning>
        <JudgeMenu />
        {children}
      </body>
    </html>
  );
}