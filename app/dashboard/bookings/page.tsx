"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, isBefore } from "date-fns";

const statusColors: Record<string, string> = {
  Upcoming: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Ongoing: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Completed: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  Cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [form, setForm] = useState({
    assetId: "",
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [bRes, aRes] = await Promise.all([
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/assets?bookable=true").then((r) => r.json()),
    ]);
    
    // Auto-update status for display
    const now = new Date();
    const updatedBookings = (bRes.bookings || []).map((b: any) => {
        const start = new Date(b.startTime);
        const end = new Date(b.endTime);
        if (b.status !== "Cancelled") {
            if (isBefore(end, now)) b.status = "Completed";
            else if (isBefore(start, now) && isBefore(now, end)) b.status = "Ongoing";
            else b.status = "Upcoming";
        }
        return b;
    });

    setBookings(updatedBookings);
    setAssets(aRes.assets || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDateTime = new Date(`${form.startDate}T${form.startTime}`).toISOString();
    const endDateTime = new Date(`${form.endDate}T${form.endTime}`).toISOString();

    const res = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: parseInt(form.assetId),
        title: form.title,
        description: form.description,
        startTime: startDateTime,
        endTime: endDateTime,
      }),
    });
    
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    
    toast.success("Booking confirmed!");
    setDialogOpen(false);
    setForm({ assetId: "", title: "", description: "", startDate: "", startTime: "", endDate: "", endTime: "" });
    fetchData();
  };

  const cancelBooking = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" })
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success("Booking cancelled.");
    fetchData();
  };

  if (loading) return <div className="mx-auto flex max-w-7xl justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Resource Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Book shared resources like meeting rooms and vehicles.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button>+ New Booking</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader><DialogTitle>Book Resource</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Resource *</Label>
                <Select value={form.assetId} onValueChange={(v) => setForm((p) => ({ ...p, assetId: v }))} required>
                  <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                  <SelectContent>{assets.filter((a: any) => a.status === "Available").map((a: any) => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>End Time *</Label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <Button type="submit" className="w-full">Confirm Booking</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bookings.map((b) => {
            const isOwner = b.bookedByEmployeeId === user?.id;
            const canCancel = (isOwner || ["Admin", "Asset Manager", "Department Head"].includes(user?.role || "")) && b.status === "Upcoming";

            return (
                <div key={b.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-3 flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold">{b.title}</h3>
                            <p className="text-xs text-muted-foreground">{b.assetName} · {b.location}</p>
                        </div>
                        <Badge variant="outline" className={`ml-2 shrink-0 ${statusColors[b.status]}`}>{b.status}</Badge>
                    </div>
                    
                    <div className="mb-4 space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="text-foreground">{format(new Date(b.startTime), "MMM d, yyyy h:mm a")}</span>
                            <span>→</span>
                            <span className="text-foreground">{format(new Date(b.endTime), "h:mm a")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Booked by: <span className="font-medium text-foreground">{b.bookedByName}</span></p>
                        {b.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{b.description}</p>}
                    </div>
                    
                    {canCancel && (
                        <Button variant="outline" size="sm" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => cancelBooking(b.id)}>
                            Cancel Booking
                        </Button>
                    )}
                </div>
            );
        })}
        {bookings.length === 0 && <div className="col-span-full py-10 text-center text-muted-foreground">No bookings found.</div>}
      </div>
    </div>
  );
}
