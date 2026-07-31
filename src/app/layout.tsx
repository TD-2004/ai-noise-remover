import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Noise Remover - Professional Background Noise Removal",
  description: "Remove background noise from your audio files using advanced AI algorithms. Fast, professional, and easy to use.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
