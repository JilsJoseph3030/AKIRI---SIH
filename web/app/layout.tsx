import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Akiri — Recycler Dashboard",
  description: "Confirm handovers, track lots, export EPR records.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
