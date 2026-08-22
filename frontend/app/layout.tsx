import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unwritten Workmate",
  description: "Leave, WFH, and OD tracker for Team Unwritten",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
