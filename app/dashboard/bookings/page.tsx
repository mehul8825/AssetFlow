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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [editingBooking, setEditingBooking] = useState<any>(null);
  
  // Custom Autocomplete State
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

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
    if (!form.assetId) {
        toast.error("Please select a resource from the search dropdown.");
        return;
    }
    
    const startDateTime = new Date(`${form.startDate}T${form.startTime}`).toISOString();
    const endDateTime = new Date(`${form.endDate}T${form.endTime}`).toISOString();

    const url = editingBooking ? `/api/bookings/${editingBooking.id}` : "/api/bookings";
    const method = editingBooking ? "PUT" : "POST";
    const payload = editingBooking ? {
        action: "edit",
        title: form.title,
        description: form.description,
        startTime: startDateTime,
        endTime: endDateTime,
    } : {
        assetId: parseInt(form.assetId),
        title: form.title,
        description: form.description,
        startTime: startDateTime,
        endTime: endDateTime,
    };

    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    
    toast.success(editingBooking ? "Booking updated!" : "Booking confirmed!");
    setDialogOpen(false);
    setEditingBooking(null);
    setForm({ assetId: "", title: "", description: "", startDate: "", startTime: "", endDate: "", endTime: "" });
    setSearchTerm("");
    fetchData();
  };

  const handleEditOpen = (b: any) => {
      setEditingBooking(b);
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      setForm({
          assetId: b.assetId.toString(),
          title: b.title,
          description: b.description || "",
          startDate: format(start, "yyyy-MM-dd"),
          startTime: format(start, "HH:mm"),
          endDate: format(end, "yyyy-MM-dd"),
          endTime: format(end, "HH:mm"),
      });
      setSearchTerm(b.assetName);
      setDialogOpen(true);
  };

  const handleNewOpen = () => {
      setEditingBooking(null);
      setForm({ assetId: "", title: "", description: "", startDate: "", startTime: "", endDate: "", endTime: "" });
      setSearchTerm("");
      setDialogOpen(true);
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
        <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditingBooking(null); setSearchTerm(""); }
        }}>
          <Button onClick={handleNewOpen}>+ New Booking</Button>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingBooking ? "Edit Booking" : "Book Resource"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2 relative">
                <Label>Resource *</Label>
                <Input
                  type="text"
                  placeholder={editingBooking ? "Resource cannot be changed during edit" : "Type to search resource..."}
                  value={searchTerm}
                  disabled={!!editingBooking}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                    setFocusedIndex(-1);
                    setForm((p) => ({ ...p, assetId: "" }));
                  }}
                  onFocus={() => {
                    if (!editingBooking) setShowDropdown(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowDropdown(false), 250);
                  }}
                  onKeyDown={(e) => {
                    if (editingBooking) return;
                    const filtered = assets.filter((a: any) => 
                        !['Under Maintenance', 'Lost', 'Retired', 'Disposed'].includes(a.status) &&
                        (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.assetTag.toLowerCase().includes(searchTerm.toLowerCase()))
                    );
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setFocusedIndex((prev) => (prev + 1) % filtered.length);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setFocusedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (focusedIndex >= 0 && focusedIndex < filtered.length) {
                        const selected = filtered[focusedIndex];
                        setForm((p) => ({ ...p, assetId: selected.id.toString() }));
                        setSearchTerm(selected.name);
                        setShowDropdown(false);
                      }
                    }
                  }}
                  required
                />
                {showDropdown && !editingBooking && (
                  <ul className="absolute z-50 w-full bg-popover text-popover-foreground border border-border rounded-md shadow-md max-h-60 overflow-y-auto mt-1 py-1">
                    {assets.filter((a: any) => 
                        !['Under Maintenance', 'Lost', 'Retired', 'Disposed'].includes(a.status) &&
                        (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.assetTag.toLowerCase().includes(searchTerm.toLowerCase()))
                    ).map((a: any, idx: number) => {
                        const isFocused = idx === focusedIndex;
                        return (
                          <li
                            key={a.id}
                            className={cn(
                              "px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                              isFocused && "bg-accent text-accent-foreground"
                            )}
                            onMouseDown={() => {
                              setForm((p) => ({ ...p, assetId: a.id.toString() }));
                              setSearchTerm(a.name);
                              setShowDropdown(false);
                            }}
                          >
                            {a.name} ({a.assetTag})
                          </li>
                        );
                    })}
                    {assets.filter((a: any) => 
                        !['Under Maintenance', 'Lost', 'Retired', 'Disposed'].includes(a.status) &&
                        (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.assetTag.toLowerCase().includes(searchTerm.toLowerCase()))
                    ).length === 0 && (
                      <li className="px-3 py-2 text-sm text-muted-foreground text-center">No resources found</li>
                    )}
                  </ul>
                )}
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
            const canCancel = (isOwner || ["Admin", "Asset Manager", "Department Head"].includes(user?.role || "")) && (b.status === "Upcoming" || b.status === "Ongoing");

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
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditOpen(b)}>
                            Edit Booking
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => cancelBooking(b.id)}>
                            Cancel
                        </Button>
                      </div>
                    )}
                </div>
            );
        })}
        {bookings.length === 0 && <div className="col-span-full py-10 text-center text-muted-foreground">No bookings found.</div>}
      </div>
    </div>
  );
}
