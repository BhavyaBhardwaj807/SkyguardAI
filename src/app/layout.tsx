import type { Metadata } from "next";
import "./frontend/styles.css";
export const metadata: Metadata = {
  title: "SkyGuard AI | Local demo",
  description: "Weather data quality backend integration demo",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
