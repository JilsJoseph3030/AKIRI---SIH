import type { Metadata } from "next";

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
      <body
        style={{
          margin: 0,
          background: "#0E120F",
          color: "#F2F5F0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
