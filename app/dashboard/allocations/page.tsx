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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BulkUploader } from "@/components/bulk-uploader";

export default function AllocationsPage() {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocDialog, setAllocDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [returnDialog, setReturnDialog] = useState(false);
  const [selectedAlloc, setSelectedAlloc] = useState<any>(null);
  const [form, setForm] = useState({ assetId: "", targetType: "employee", employeeId: "", departmentId: "", expectedReturnDate: "" });
  const [transferForm, setTransferForm] = useState({ assetId: "", toEmployeeId: "", reason: "" });
  const [returnForm, setReturnForm] = useState({ returnCondition: "Good", returnNotes: "" });

  const canAllocate = ["Admin", "Asset Manager", "Department Head"].includes(user?.role || "");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [aRes, tRes, asRes, eRes, dRes] = await Promise.all([
      fetch("/api/allocations").then((r) => r.json()),
      fetch("/api/transfers").then((r) => r.json()),
      fetch("/api/assets").then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]);
    setAllocations(aRes.allocations || []);
    setTransfers(tRes.transfers || []);
    setAssets(asRes.assets || []);
    setEmployees(eRes.employees || []);
    setDepartments(dRes.departments || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
        assetId: parseInt(form.assetId),
        expectedReturnDate: form.expectedReturnDate || null
    };
    if (form.targetType === "employee" && form.employeeId) payload.employeeId = parseInt(form.employeeId);
    if (form.targetType === "department" && form.departmentId) payload.departmentId = parseInt(form.departmentId);

    const res = await fetch("/api/allocations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      if (data.suggestTransfer) toast.info("Use Transfer Request for already-allocated assets.");
      return;
    }
    toast.success("Asset allocated!");
    setAllocDialog(false);
    setForm({ assetId: "", targetType: "employee", employeeId: "", departmentId: "", expectedReturnDate: "" });
    fetchData();
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/transfers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: parseInt(transferForm.assetId), toEmployeeId: parseInt(transferForm.toEmployeeId), reason: transferForm.reason }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success("Transfer request created!");
    setTransferDialog(false);
    setTransferForm({ assetId: "", toEmployeeId: "", reason: "" });
    fetchData();
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlloc) return;
    const res = await fetch(`/api/allocations/${selectedAlloc.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "return", ...returnForm }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success("Asset returned!");
    setReturnDialog(false);
    fetchData();
  };

  const handleTransferAction = async (trId: number, action: string) => {
    const res = await fetch(`/api/transfers/${trId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success(data.message);
    fetchData();
  };

  if (loading) return <div className="mx-auto flex max-w-7xl justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  const activeAllocations = allocations.filter((a: any) => a.status === "Active");
  const pastAllocations = allocations.filter((a: any) => a.status !== "Active");
  const availableAssets = assets.filter((a: any) => a.status === "Available" && !a.isBookable);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Asset Allocations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage who holds what, with conflict handling.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAllocate && (
            <Dialog open={allocDialog} onOpenChange={setAllocDialog}>
              <DialogTrigger asChild><Button size="sm">+ Allocate</Button></DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Allocate Asset</DialogTitle></DialogHeader>
                <form onSubmit={handleAllocate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Asset *</Label>
                    <InlineAutocomplete
                      value={form.assetId}
                      onValueChange={(v) => setForm((p) => ({ ...p, assetId: v }))}
                      options={availableAssets.map((a: any) => ({
                        value: a.id.toString(),
                        label: a.name,
                        subLabel: a.assetTag
                      }))}
                      placeholder="Select available asset"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Type *</Label>
                    <InlineAutocomplete
                      value={form.targetType}
                      onValueChange={(v) => setForm((p) => ({ ...p, targetType: v, employeeId: "", departmentId: "" }))}
                      options={[
                        { value: "employee", label: "Employee" },
                        { value: "department", label: "Department" }
                      ]}
                      placeholder="Select target type"
                    />
                  </div>
                  {form.targetType === "employee" ? (
                    <div className="space-y-2">
                      <Label>Employee *</Label>
                      <InlineAutocomplete
                        value={form.employeeId}
                        onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v }))}
                        options={employees.filter((e: any) => e.status === "Active").map((e: any) => ({
                          value: e.id.toString(),
                          label: e.name
                        }))}
                        placeholder="Select employee"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Department *</Label>
                      <InlineAutocomplete
                        value={form.departmentId}
                        onValueChange={(v) => setForm((p) => ({ ...p, departmentId: v }))}
                        options={departments.filter((d: any) => d.status === "Active").map((d: any) => ({
                          value: d.id.toString(),
                          label: d.name
                        }))}
                        placeholder="Select department"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Expected Return Date</Label>
                    <Input type="date" value={form.expectedReturnDate} onChange={(e) => setForm((p) => ({ ...p, expectedReturnDate: e.target.value }))} />
                  </div>
                  <Button type="submit" className="w-full">Allocate</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
            <DialogTrigger asChild><Button variant="outline" size="sm">Transfer Request</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Request Transfer</DialogTitle></DialogHeader>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="space-y-2">
                  <Label>Asset *</Label>
                  <InlineAutocomplete
                    value={transferForm.assetId}
                    onValueChange={(v) => setTransferForm((p) => ({ ...p, assetId: v }))}
                    options={assets.filter((a: any) => a.status === "Allocated").map((a: any) => ({
                      value: a.id.toString(),
                      label: a.name,
                      subLabel: a.assetTag
                    }))}
                    placeholder="Select asset"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transfer To *</Label>
                  <InlineAutocomplete
                    value={transferForm.toEmployeeId}
                    onValueChange={(v) => setTransferForm((p) => ({ ...p, toEmployeeId: v }))}
                    options={employees.filter((e: any) => e.status === "Active").map((e: any) => ({
                      value: e.id.toString(),
                      label: e.name
                    }))}
                    placeholder="Select employee"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea value={transferForm.reason} onChange={(e) => setTransferForm((p) => ({ ...p, reason: e.target.value }))} rows={2} />
                </div>
                <Button type="submit" className="w-full">Submit Request</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeAllocations.length})</TabsTrigger>
          <TabsTrigger value="transfers">Transfers ({transfers.length})</TabsTrigger>
          <TabsTrigger value="history">History ({pastAllocations.length})</TabsTrigger>
          {canAllocate && <TabsTrigger value="bulk" className="bg-primary/10 text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Bulk Upload ✨</TabsTrigger>}
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeAllocations.map((a: any) => {
              const isOverdue = a.expectedReturnDate && new Date(a.expectedReturnDate) < new Date();
              return (
                <div key={a.id} className={`rounded-xl border p-4 ${isOverdue ? "border-destructive/50 bg-destructive/5" : "border-border bg-card"}`}>
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{a.assetName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{a.assetTag}</p>
                    </div>
                    {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                  </div>
                  <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                    <p>Assigned to: <span className="font-medium text-foreground">{a.employeeName || a.departmentName}</span></p>
                    <p>By: {a.allocatedByName} · {new Date(a.allocationDate).toLocaleDateString()}</p>
                    {a.expectedReturnDate && <p>Return by: {new Date(a.expectedReturnDate).toLocaleDateString()}</p>}
                  </div>
                  {canAllocate && (
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => {
                      setSelectedAlloc(a);
                      setReturnForm({ returnCondition: "Good", returnNotes: "" });
                      setReturnDialog(true);
                    }}>Mark Returned</Button>
                  )}
                </div>
              );
            })}
            {activeAllocations.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No active allocations</p>}
          </div>
        </TabsContent>

        {canAllocate && (
          <TabsContent value="bulk" className="mt-4">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-8 text-center">
                <h2 className="text-xl font-bold">Smart Bulk-Allocation</h2>
                <p className="text-muted-foreground text-sm mt-1">Upload a CSV file to instantly allocate multiple assets to employees.</p>
              </div>
              <BulkUploader onSuccess={fetchData} />
            </div>
          </TabsContent>
        )}

        <TabsContent value="transfers" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {transfers.map((t: any) => (
              <div key={t.id} className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-start justify-between">
                  <p className="font-semibold">{t.assetName}</p>
                  <Badge variant={t.status === "Completed" ? "default" : t.status === "Rejected" ? "destructive" : "secondary"} className="text-xs">{t.status}</Badge>
                </div>
                <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                  <p>{t.fromEmployeeName || "—"} → {t.toEmployeeName}</p>
                  <p>Requested by: {t.requestedByName}</p>
                  {t.reason && <p>Reason: {t.reason}</p>}
                </div>
                {t.status === "Requested" && canAllocate && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 text-xs" onClick={() => handleTransferAction(t.id, "approve")}>Approve</Button>
                    <Button variant="destructive" size="sm" className="flex-1 text-xs" onClick={() => handleTransferAction(t.id, "reject")}>Reject</Button>
                  </div>
                )}
              </div>
            ))}
            {transfers.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No transfer requests</p>}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pastAllocations.map((a: any) => (
              <div key={a.id} className="rounded-xl border bg-card p-4 opacity-75">
                <p className="font-semibold">{a.assetName} <span className="font-mono text-xs text-muted-foreground">{a.assetTag}</span></p>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <p>To: {a.employeeName || a.departmentName}</p>
                  <p>Status: {a.status}</p>
                  {a.actualReturnDate && <p>Returned: {new Date(a.actualReturnDate).toLocaleDateString()}</p>}
                  {a.fineAmount > 0 && (
                    <p className="text-red-500 font-semibold mt-1 bg-red-500/10 inline-block px-1.5 py-0.5 rounded">
                      Late Fine: ₹{a.fineAmount}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {pastAllocations.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No history</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Return Dialog */}
      <Dialog open={returnDialog} onOpenChange={setReturnDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Return Asset: {selectedAlloc?.assetName}</DialogTitle></DialogHeader>
          <form onSubmit={handleReturn} className="space-y-4">
            <div className="space-y-2">
              <Label>Condition at Return</Label>
              <InlineAutocomplete
                value={returnForm.returnCondition}
                onValueChange={(v) => setReturnForm((p) => ({ ...p, returnCondition: v }))}
                options={["New", "Good", "Fair", "Poor", "Damaged"].map((c) => ({ value: c, label: c }))}
                placeholder="Select condition"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={returnForm.returnNotes} onChange={(e) => setReturnForm((p) => ({ ...p, returnNotes: e.target.value }))} rows={2} placeholder="Check-in notes..." />
            </div>
            <Button type="submit" className="w-full">Confirm Return</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
