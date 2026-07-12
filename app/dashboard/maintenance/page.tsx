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
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignData, setAssignData] = useState({ id: 0, tech: "", employeeId: "" });
  const [resolveData, setResolveData] = useState({ id: 0, notes: "", cost: "" });

  const [form, setForm] = useState({
    assetId: "",
    title: "",
    description: "",
    priority: "Medium",
    assignedTechnician: "",
    assignedToEmployeeId: "",
    quotations: [
      { vendorName: "", amount: "", notes: "" },
      { vendorName: "", amount: "", notes: "" },
      { vendorName: "", amount: "", notes: "" },
    ]
  });

  const isManager = ["Admin", "Asset Manager"].includes(user?.role || "");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [mRes, aRes, eRes] = await Promise.all([
      fetch("/api/maintenance").then((r) => r.json()),
      fetch("/api/assets").then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()),
    ]);
    
    setRequests(mRes.maintenance || []);
    setAssets(aRes.assets || []);
    setEmployees(eRes.employees || []);
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
        assignedTechnician: form.assignedTechnician,
        assignedToEmployeeId: form.assignedToEmployeeId,
        quotations: form.quotations
      }),
    });
    
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    
    toast.success("Maintenance request submitted!");
    setDialogOpen(false);
    setForm({ 
      assetId: "", title: "", description: "", priority: "Medium",
      assignedTechnician: "", assignedToEmployeeId: "",
      quotations: [
        { vendorName: "", amount: "", notes: "" },
        { vendorName: "", amount: "", notes: "" },
        { vendorName: "", amount: "", notes: "" },
      ]
    });
    setAssignData({ id: 0, tech: "", employeeId: "" });
    setResolveData({ id: 0, notes: "", cost: "" });
    fetchData();
  };

  const handleAction = async (id: number, action: string) => {
    try {
      const payload: any = { action };
      if (action === "assign") {
          payload.assignedTechnician = assignData.tech;
          if (assignData.employeeId) payload.assignedToEmployeeId = parseInt(assignData.employeeId);
      }
      if (action === "resolve") {
          payload.resolutionNotes = resolveData.notes;
          payload.cost = parseFloat(resolveData.cost) || 0;
      }

      const res = await fetch(`/api/maintenance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
    
      toast.success(data.message);
      setAssignData({ id: 0, tech: "", employeeId: "" });
      setResolveData({ id: 0, notes: "", cost: "" });
      fetchData();
    } catch (err) {
        toast.error("Failed to perform action");
    }
  };

  if (loading) return <div className="mx-auto flex max-w-7xl justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  const activeRequests = requests.filter(r => !["Resolved", "Rejected"].includes(r.status));
  const pastRequests = requests.filter(r => ["Resolved", "Rejected"].includes(r.status));

  const totalCost = pastRequests.reduce((sum, r) => sum + (r.cost || 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Maintenance</h1>
          <p className="mt-1 text-sm text-muted-foreground">Raise and track repair requests for assets.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button>+ Raise Request</Button></DialogTrigger>
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
              {!isManager ? (
                  <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                      <Label className="text-base font-semibold">Tentative Quotations (Required)</Label>
                      {form.quotations.map((q, i) => (
                        <div key={i} className="flex gap-2">
                          <Input placeholder="Vendor Name" value={q.vendorName} onChange={(e) => { const nq = [...form.quotations]; nq[i].vendorName = e.target.value; setForm((p) => ({ ...p, quotations: nq })) }} required />
                          <Input placeholder="Estimated Amount ($)" type="number" step="0.01" value={q.amount} onChange={(e) => { const nq = [...form.quotations]; nq[i].amount = e.target.value; setForm((p) => ({ ...p, quotations: nq })) }} required />
                        </div>
                      ))}
                  </div>
              ) : (
                  <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                      <Label className="text-base font-semibold">Assign Immediately (Optional)</Label>
                      <div className="space-y-2">
                          <Label>Internal Employee</Label>
                          <InlineAutocomplete 
                              value={form.assignedToEmployeeId} 
                              onValueChange={(v) => setForm((p) => ({ ...p, assignedToEmployeeId: v, assignedTechnician: "" }))}
                              options={employees.filter((e: any) => e.status === "Active").map((e: any) => ({ value: e.id.toString(), label: e.name }))}
                              placeholder="Select an employee..."
                          />
                      </div>
                      <div className="space-y-2">
                          <Label>Or External Technician Name</Label>
                          <Input 
                              value={form.assignedTechnician} 
                              onChange={(e) => setForm((p) => ({ ...p, assignedTechnician: e.target.value, assignedToEmployeeId: "" }))} 
                              placeholder="Vendor name"
                          />
                      </div>
                  </div>
              )}
              <Button type="submit" className="w-full">Submit Request</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isManager && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 flex flex-col items-start justify-center shadow-sm">
             <p className="text-sm font-semibold text-primary uppercase tracking-widest">Total Maintenance Spend</p>
             <p className="text-4xl font-bold text-primary mt-2">${totalCost.toFixed(2)}</p>
          </div>
      )}

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
                            {(r.assignedTechnician || r.assignedToName) && <p>Assigned to: {r.assignedToName || r.assignedTechnician}</p>}
                            {r.description && <p className="mt-2 line-clamp-2">{r.description}</p>}
                        </div>
                        
                        {r.quotations && r.quotations.length > 0 && (
                          <div className="mb-4 rounded-lg border border-border bg-muted/20 p-3 text-xs">
                            <p className="mb-2 font-medium">Tentative Quotations</p>
                            <div className="grid gap-2">
                              {r.quotations.map((q: any, i: number) => (
                                <div key={i} className="flex justify-between border-b border-border/50 pb-1 last:border-0 last:pb-0">
                                  <span className="text-muted-foreground">{q.vendorName}</span>
                                  <span className="font-medium font-mono">${q.amount}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                            {isManager && r.status === "Pending" && (
                                <>
                                    <Button size="sm" variant="outline" onClick={() => handleAction(r.id, "approve")}>Approve</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleAction(r.id, "reject")}>Reject</Button>
                                </>
                            )}
                            {(user?.id === r.requestedByEmployeeId || isManager) && r.status === "Approved" && (
                                <Button size="sm" onClick={() => setAssignData({ id: r.id, tech: "", employeeId: "" })}>Assign Tech</Button>
                            )}
                            {(user?.id === r.requestedByEmployeeId || user?.id === r.assignedToEmployeeId) && r.status === "Assigned" && (
                                <Button size="sm" onClick={() => handleAction(r.id, "start")}>Start Work</Button>
                            )}
                            {(user?.id === r.requestedByEmployeeId || user?.id === r.assignedToEmployeeId) && r.status === "In Progress" && (
                                <Button size="sm" onClick={() => setResolveData({ id: r.id, notes: "", cost: "" })}>Resolve</Button>
                            )}
                        </div>
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
                            {(r.assignedTechnician || r.assignedToName) && <p>Assigned to: {r.assignedToName || r.assignedTechnician}</p>}
                            {r.resolutionNotes && <p className="mt-2 text-foreground">Resolution: {r.resolutionNotes}</p>}
                            {r.cost !== undefined && r.cost !== null && r.cost > 0 && <p className="mt-1 text-emerald-600 font-medium">Cost: ${r.cost.toFixed(2)}</p>}
                        </div>
                        {r.quotations && r.quotations.length > 0 && (
                          <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3 text-xs">
                            <p className="mb-2 font-medium">Quotations</p>
                            <div className="grid gap-2">
                              {r.quotations.map((q: any, i: number) => (
                                <div key={i} className="flex justify-between border-b border-border/50 pb-1 last:border-0 last:pb-0">
                                  <span className="text-muted-foreground">{q.vendorName}</span>
                                  <span className="font-medium font-mono">${q.amount}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                ))}
                {pastRequests.length === 0 && <div className="col-span-full py-10 text-center text-muted-foreground">No maintenance history.</div>}
            </div>
        </TabsContent>
      </Tabs>

      {/* Assign Dialog */}
      <Dialog open={assignData.id !== 0} onOpenChange={(open) => !open && setAssignData({ id: 0, tech: "", employeeId: "" })}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Assign Technician</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Label>Internal Employee (Optional)</Label>
                    <InlineAutocomplete 
                        value={assignData.employeeId} 
                        onValueChange={(v) => setAssignData({ ...assignData, employeeId: v, tech: "" })}
                        options={employees.filter((e: any) => e.status === "Active").map((e: any) => ({ value: e.id.toString(), label: e.name }))}
                        placeholder="Select an employee..."
                    />
                </div>
                <div className="space-y-2">
                    <Label>Or External Technician Name</Label>
                    <Input 
                        value={assignData.tech} 
                        onChange={(e) => setAssignData({ ...assignData, tech: e.target.value, employeeId: "" })} 
                        placeholder="Vendor name"
                    />
                </div>
                <Button className="w-full" onClick={() => handleAction(assignData.id, "assign")}>Assign</Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveData.id !== 0} onOpenChange={(open) => !open && setResolveData({ id: 0, notes: "", cost: "" })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea 
                value={resolveData.notes} 
                onChange={(e) => setResolveData({ ...resolveData, notes: e.target.value })} 
                placeholder="What was done to fix it?" 
              />
            </div>
            <div className="space-y-2">
              <Label>Final Cost ($)</Label>
              <Input 
                type="number"
                min="0"
                step="0.01"
                value={resolveData.cost} 
                onChange={(e) => setResolveData({ ...resolveData, cost: e.target.value })} 
                placeholder="0.00" 
              />
            </div>
            <Button className="w-full" onClick={() => handleAction(resolveData.id, "resolve")}>Mark Resolved</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
