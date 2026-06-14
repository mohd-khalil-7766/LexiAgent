import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexiAgent | Multilingual AI Vocabulary Learning Assistant",
  description:
    "A multilingual AI-native vocabulary platform powered by OpenClaw, authentic language sources and intelligent review workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}