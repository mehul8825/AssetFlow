"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";

import { NotificationWatcher } from "@/components/notification-watcher";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <NotificationWatcher />
      <AppSidebar />
      <main className="flex flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 !h-4" />
          <div className="flex flex-1 items-center justify-between">
            <div />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">Welcome,</span>
              <span className="font-medium text-foreground">{user.name}</span>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {user.role}
              </span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
