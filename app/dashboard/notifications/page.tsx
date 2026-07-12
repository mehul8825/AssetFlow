"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Bell, Check, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setNotifications(data.notifications || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const markAllAsRead = async () => {
      const res = await fetch("/api/notifications", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
      });
      if (res.ok) {
          toast.success("All notifications marked as read");
          fetchData();
      }
  };

  const markAsRead = async (id: number) => {
      const res = await fetch("/api/notifications", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
      });
      if (res.ok) {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      }
  };

  if (loading) return <div className="mx-auto flex max-w-3xl justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">You have {unreadCount} unread messages.</p>
        </div>
        {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
                <Check className="h-4 w-4" /> Mark all as read
            </Button>
        )}
      </div>

      <div className="space-y-4">
          {notifications.map((n) => (
              <div key={n.id} className={`flex gap-4 rounded-xl border p-4 transition-colors ${!n.is_read ? 'bg-muted/30 border-primary/20' : 'bg-card border-border'}`}>
                  <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${!n.is_read ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm ${!n.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>{n.title}</h4>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                      </div>
                      <p className={`mt-1 text-sm ${!n.is_read ? 'text-foreground/90' : 'text-muted-foreground'}`}>{n.message}</p>
                      
                      <div className="mt-3 flex items-center gap-3">
                          {!n.is_read && (
                              <button onClick={() => markAsRead(n.id)} className="text-xs font-medium text-primary hover:underline">Mark as read</button>
                          )}
                          {n.link && (
                              <Link href={n.link} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                                  View details <ArrowRight className="h-3 w-3" />
                              </Link>
                          )}
                      </div>
                  </div>
              </div>
          ))}

          {notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center text-muted-foreground">
                  <Bell className="mb-2 h-8 w-8 opacity-20" />
                  <p>You're all caught up!</p>
              </div>
          )}
      </div>
    </div>
  );
}
