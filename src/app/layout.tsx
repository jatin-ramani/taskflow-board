import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "TaskFlow",
  description:
    "A personal task & goal manager with friends, shared projects, and chat.",
  icons: {
    icon: [
      { url: "/logo-light.svg", media: "(prefers-color-scheme: light)" },
      { url: "/logo-dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
