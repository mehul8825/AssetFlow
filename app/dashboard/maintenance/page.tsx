"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InlineAutocomplete } from "@/components/ui/inline-autocomplete";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusColors: Record<string, string> = {
  Pending: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Approved: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  Assigned: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "In Progress": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export default function MaintenancePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [actionDialog, setActionDialog] = useState<{ open: boolean; req: any; action: string }>({ open: false, req: null, action: "" });
  const [actionInput, setActionInput] = useState("");

  const [form, setForm] = useState({
    assetId: "",
    title: "",
    description: "",
    priority: "Medium",
  });

  const isManager = ["Admin", "Asset Manager"].includes(user?.role || "");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [mRes, aRes] = await Promise.all([
      fetch("/api/maintenance").then((r) => r.json()),
      fetch("/api/assets").then((r) => r.json()),
    ]);
    
    setRequests(mRes.maintenance || []);
    setAssets(aRes.assets || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const res = await fetch("/api/maintenance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: parseInt(form.assetId),
        title: form.title,
        description: form.description,
        priority: form.priority,
      }),
    });
    
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    
    toast.success("Maintenance request submitted!");
    setDialogOpen(false);
    setForm({ assetId: "", title: "", description: "", priority: "Medium" });
    fetchData();
  };

  const executeAction = async (reqId: number, action: string, assignedTechnician?: string, resolutionNotes?: string) => {
    const body: any = { action };
    if (assignedTechnician) body.assignedTechnician = assignedTechnician;
    if (resolutionNotes) body.resolutionNotes = resolutionNotes;

    const res = await fetch(`/api/maintenance/${reqId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    
    toast.success(data.message);
    fetchData();
  };

  const handleDialogAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionDialog.req) return;

    if (actionDialog.action === "assign") {
        await executeAction(actionDialog.req.id, "assign", actionInput, undefined);
    } else if (actionDialog.action === "resolve") {
        await executeAction(actionDialog.req.id, "resolve", undefined, actionInput);
    }
    
    setActionDialog({ open: false, req: null, action: "" });
    setActionInput("");
  };

  if (loading) return <div className="mx-auto flex max-w-7xl justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  const activeRequests = requests.filter(r => !["Resolved", "Rejected"].includes(r.status));
  const pastRequests = requests.filter(r => ["Resolved", "Rejected"].includes(r.status));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Maintenance</h1>
          <p className="mt-1 text-sm text-muted-foreground">Raise and track repair requests for assets.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>+ Raise Request</DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader><DialogTitle>Raise Maintenance Request</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Asset *</Label>
                <InlineAutocomplete
                  value={form.assetId}
                  onValueChange={(v) => setForm((p) => ({ ...p, assetId: v }))}
                  options={assets.filter((a:any) => a.status !== 'Retired' && a.status !== 'Disposed').map((a: any) => ({
                    value: a.id.toString(),
                    label: a.name,
                    subLabel: a.assetTag
                  }))}
                  placeholder="Select asset"
                />
              </div>
              <div className="space-y-2">
                <Label>Issue Title *</Label>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <InlineAutocomplete
                  value={form.priority}
                  onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
                  options={["Low", "Medium", "High", "Critical"].map(p => ({ value: p, label: p }))}
                  placeholder="Select priority"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe the issue in detail..." />
              </div>
              <Button type="submit" className="w-full">Submit Request</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
            <TabsTrigger value="active">Active ({activeRequests.length})</TabsTrigger>
            <TabsTrigger value="history">History ({pastRequests.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeRequests.map((r) => (
                    <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                        <div className="mb-3 flex items-start justify-between">
                            <div>
                                <h3 className="font-semibold">{r.title}</h3>
                                <p className="text-xs text-muted-foreground">{r.assetName} ({r.assetTag})</p>
                            </div>
                            <Badge variant="outline" className={`ml-2 shrink-0 ${statusColors[r.status]}`}>{r.status}</Badge>
                        </div>
                        <div className="mb-4 space-y-1 text-xs text-muted-foreground">
                            <p>Priority: <span className="font-medium text-foreground">{r.priority}</span></p>
                            <p>Requested by: {r.requestedByName}</p>
                            {r.assignedTechnician && <p>Assigned to: {r.assignedTechnician}</p>}
                            {r.description && <p className="mt-2 line-clamp-2">{r.description}</p>}
                        </div>
                        
                        {isManager && (
                            <div className="flex flex-wrap gap-2">
                                {r.status === "Pending" && (
                                    <>
                                        <Button size="sm" className="flex-1 text-xs" onClick={() => executeAction(r.id, "approve")}>Approve</Button>
                                        <Button variant="destructive" size="sm" className="flex-1 text-xs" onClick={() => executeAction(r.id, "reject")}>Reject</Button>
                                    </>
                                )}
                                {r.status === "Approved" && (
                                    <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => { setActionInput(""); setActionDialog({ open: true, req: r, action: "assign" }); }}>Assign Tech</Button>
                                )}
                                {r.status === "Assigned" && (
                                    <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => executeAction(r.id, "start")}>Start Work</Button>
                                )}
                                {r.status === "In Progress" && (
                                    <Button size="sm" className="w-full text-xs" onClick={() => { setActionInput(""); setActionDialog({ open: true, req: r, action: "resolve" }); }}>Resolve</Button>
                                )}
                            </div>
                        )}
                        {!isManager && r.status === "Pending" && <p className="text-xs text-muted-foreground italic">Waiting for approval</p>}
                    </div>
                ))}
                {activeRequests.length === 0 && <div className="col-span-full py-10 text-center text-muted-foreground">No active maintenance requests.</div>}
            </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pastRequests.map((r) => (
                    <div key={r.id} className="rounded-xl border border-border bg-card p-5 opacity-75">
                        <div className="mb-3 flex items-start justify-between">
                            <h3 className="font-semibold">{r.title}</h3>
                            <Badge variant="outline" className={`ml-2 shrink-0 ${statusColors[r.status]}`}>{r.status}</Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                            <p>{r.assetName} ({r.assetTag})</p>
                            <p>Requested by: {r.requestedByName}</p>
                            {r.resolutionNotes && <p className="mt-2 text-foreground">Resolution: {r.resolutionNotes}</p>}
                        </div>
                    </div>
                ))}
                {pastRequests.length === 0 && <div className="col-span-full py-10 text-center text-muted-foreground">No maintenance history.</div>}
            </div>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, req: null, action: "" })}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{actionDialog.action === "assign" ? "Assign Technician" : actionDialog.action === "resolve" ? "Resolve Maintenance" : "Action"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleDialogAction} className="space-y-4">
                {actionDialog.action === "assign" && (
                    <div className="space-y-2">
                        <Label>Technician Name</Label>
                        <Input value={actionInput} onChange={(e) => setActionInput(e.target.value)} required />
                    </div>
                )}
                {actionDialog.action === "resolve" && (
                    <div className="space-y-2">
                        <Label>Resolution Notes</Label>
                        <Textarea value={actionInput} onChange={(e) => setActionInput(e.target.value)} rows={3} required />
                    </div>
                )}
                <Button type="submit" className="w-full">Confirm</Button>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
