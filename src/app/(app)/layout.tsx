import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/layout/app-shell";
import { Realtime } from "@/components/layout/realtime";
import { NotificationsManager } from "@/components/layout/notifications-manager";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <Realtime />
        <NotificationsManager />
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </SessionProvider>
  );
}
