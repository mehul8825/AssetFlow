"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ReturnTimeline } from "@/components/return-timeline";

interface DashboardData {
  kpis: {
    totalAssets: number;
    assetsAvailable: number;
    assetsAllocated: number;
    maintenanceToday: number;
    activeBookings: number;
    pendingTransfers: number;
    maintenancePending: number;
  };
  overdueReturns: any[];
  upcomingReturns: any[];
  recentActivity: any[];
}

const kpiConfig = [
  {
    key: "totalAssets",
    label: "Total Assets",
    color: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-500",
    borderColor: "border-violet-500/20",
  },
  {
    key: "assetsAvailable",
    label: "Available",
    color: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-500",
    borderColor: "border-emerald-500/20",
  },
  {
    key: "assetsAllocated",
    label: "Allocated",
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-500",
    borderColor: "border-blue-500/20",
  },
  {
    key: "activeBookings",
    label: "Active Bookings",
    color: "from-amber-500/20 to-amber-600/10",
    iconColor: "text-amber-500",
    borderColor: "border-amber-500/20",
  },
  {
    key: "pendingTransfers",
    label: "Pending Transfers",
    color: "from-orange-500/20 to-orange-600/10",
    iconColor: "text-orange-500",
    borderColor: "border-orange-500/20",
  },
  {
    key: "maintenancePending",
    label: "Maintenance Pending",
    color: "from-rose-500/20 to-rose-600/10",
    iconColor: "text-rose-500",
    borderColor: "border-rose-500/20",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time operational overview of your organization&apos;s assets and
          resources.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiConfig.map((kpi) => (
          <div
            key={kpi.key}
            className={`group relative overflow-hidden rounded-xl border ${kpi.borderColor} bg-gradient-to-br ${kpi.color} p-4 transition-all hover:shadow-lg`}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                {kpi.label}
              </span>
              <span className="text-2xl font-bold tabular-nums">
                {data?.kpis?.[kpi.key as keyof typeof data.kpis] ?? 0}
              </span>
            </div>
            <div
              className={`absolute -right-2 -top-2 h-16 w-16 rounded-full ${kpi.color} opacity-50 blur-2xl transition-all group-hover:opacity-80`}
            />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {(user?.role === "Admin" || user?.role === "Asset Manager") && (
            <Link
              href="/dashboard/assets?action=register"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Register Asset
            </Link>
          )}
          <Link
            href="/dashboard/bookings?action=new"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Book Resource
          </Link>
          <Link
            href="/dashboard/maintenance?action=new"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1a3 3 0 114.24-4.24l5.1 5.1m-6.36 6.36l5.1 5.1a3 3 0 004.24-4.24l-5.1-5.1m-6.36 6.36l6.36-6.36" />
            </svg>
            Raise Maintenance
          </Link>
        </div>
      </div>


      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Return Timeline */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold">Live Return Timeline</h3>
          </div>
          <div className="max-h-[400px] overflow-auto">
            <ReturnTimeline items={[...(data?.overdueReturns || []), ...(data?.upcomingReturns || [])]} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
          </div>
          <div className="max-h-[400px] overflow-auto">
            {data?.recentActivity?.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data?.recentActivity?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <span className="text-xs font-medium">
                        {item.employeeName?.[0] ?? "?"}
                      </span>
                    </div>
                    <div className="flex-1 truncate">
                      <p className="truncate text-sm">
                        <span className="font-medium">{item.employeeName}</span>
                        {" · "}
                        <span className="text-muted-foreground">{item.details}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
