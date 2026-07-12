"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export function NotificationWatcher() {
  const { user } = useAuth();
  const seenIds = useRef<Set<number>>(new Set());
  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        const notifications = data.notifications || [];

        const unread = notifications.filter((n: any) => !n.is_read);

        if (!initialFetchDone.current) {
          unread.forEach((n: any) => seenIds.current.add(n.id));
          initialFetchDone.current = true;
          return;
        }

        unread.forEach((n: any) => {
          if (!seenIds.current.has(n.id)) {
            seenIds.current.add(n.id);
            toast(n.title, {
              description: n.message,
              action: n.link ? {
                label: "View",
                onClick: () => window.location.href = n.link
              } : undefined,
            });
          }
        });
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 15000);

    return () => clearInterval(intervalId);
  }, [user]);

  return null;
}
