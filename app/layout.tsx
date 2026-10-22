import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Rollout Control Center",
  description:
    "Concept project: a registry of AI agents with owners, cost, risk tier, and a stage-gate approval flow from pilot to live.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sofia+Sans:wght@400;600&family=Sofia+Sans+Condensed:wght@600;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
