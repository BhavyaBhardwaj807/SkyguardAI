import { ThemeProvider } from "../theme/ThemeContext";
import "../theme/tokens.css";

export const metadata = {
  title: "SkyGuard AI",
  description: "Intelligent Weather Anomaly Detection",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
