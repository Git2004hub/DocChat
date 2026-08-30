import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "DocChat",
  description:
    "Assistant RAG pour interroger des documents PDF.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}