import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskFlow — Smart Project Management",
  description:
    "Track your tasks, manage projects, and boost team productivity with an Asana-style project management tool.",
  keywords: ["task management", "project management", "kanban", "time tracking", "team collaboration"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
