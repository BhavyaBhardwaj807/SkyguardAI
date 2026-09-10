import type { Metadata } from "next";
import { ThemeProvider } from "../theme/ThemeContext";
import "../theme/tokens.css";
import "../theme/styles.css";

export const metadata: Metadata = {
  title: "SkyGuard AI",
  description: "Intelligent Weather Anomaly Detection & Self-Healing Platform",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
