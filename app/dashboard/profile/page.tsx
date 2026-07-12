"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, Mail01Icon, TelephoneIcon, Building04Icon, Shield01Icon } from "@hugeicons/core-free-icons";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => setProfile(data.profile))
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

  if (!profile) {
    return <div className="text-center py-20 text-muted-foreground">Profile not found.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">View and manage your personal details.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-8 py-10">
          <div className="flex items-center gap-6">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-background bg-primary/10 text-4xl font-bold text-primary shadow-sm">
              {profile.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Badge variant="default" className="gap-1 px-2.5 py-0.5">
                  <HugeiconsIcon icon={Shield01Icon} size={14} />
                  {profile.role}
                </Badge>
                <Badge variant={profile.status === "Active" ? "outline" : "secondary"} className={profile.status === "Active" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : ""}>
                  {profile.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <HugeiconsIcon icon={UserIcon} size={14} /> Full Name
              </Label>
              <Input value={profile.name} readOnly className="bg-muted/50 font-medium" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <HugeiconsIcon icon={Mail01Icon} size={14} /> Email Address
              </Label>
              <Input value={profile.email} readOnly className="bg-muted/50 font-medium" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <HugeiconsIcon icon={TelephoneIcon} size={14} /> Phone Number
              </Label>
              <Input value={profile.phone || "Not provided"} readOnly className="bg-muted/50 font-medium" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <HugeiconsIcon icon={Building04Icon} size={14} /> Department
              </Label>
              <Input value={profile.departmentName || "No Department"} readOnly className="bg-muted/50 font-medium" />
            </div>

            <div className="space-y-2 sm:col-span-2 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 mt-2">
              <Label className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                Pending Salary Deductions (Assets)
              </Label>
              <div className="mt-1 text-3xl font-bold text-orange-600">
                ${(profile.salary_deductions || 0).toFixed(2)}
              </div>
              <p className="mt-1 text-xs text-orange-600/80">This amount will be deducted from your upcoming salary for personal assets allocated to you.</p>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="destructive" onClick={logout}>Sign Out</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
