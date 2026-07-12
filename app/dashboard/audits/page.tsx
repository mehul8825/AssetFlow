"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InlineAutocomplete } from "@/components/ui/inline-autocomplete";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function AuditsPage() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null);
  const [cycleDetails, setCycleDetails] = useState<any>(null);
  
  const [form, setForm] = useState({
    name: "", scopeType: "Department", scopeValue: "", startDate: "", endDate: "", auditorIds: [] as string[]
  });

  const isManager = ["Admin", "Asset Manager"].includes(user?.role || "");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [auRes, dRes, eRes] = await Promise.all([
      fetch("/api/audits").then(r => r.json()),
      fetch("/api/departments").then(r => r.json()),
      fetch("/api/employees").then(r => r.json()),
    ]);
    
    setAudits(auRes.audits || []);
    setDepartments(dRes.departments || []);
    setEmployees(eRes.employees || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadCycleDetails = async (id: number) => {
      if (expandedCycle === id) {
          setExpandedCycle(null);
          return;
      }
      const res = await fetch(`/api/audits/${id}`);
      const data = await res.json();
      if (res.ok) {
          setCycleDetails(data);
          setExpandedCycle(id);
      }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/audits", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, auditorIds: form.auditorIds.map(id => parseInt(id)) }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success("Audit cycle created!");
    setDialogOpen(false);
    setForm({ name: "", scopeType: "Department", scopeValue: "", startDate: "", endDate: "", auditorIds: [] });
    fetchData();
  };

  const handleClose = async (id: number) => {
      if (!confirm("Are you sure you want to close this audit cycle? No more items can be updated.")) return;
      const res = await fetch(`/api/audits/${id}`, { method: "PUT" });
      if (res.ok) {
          toast.success("Audit closed");
          fetchData();
          if (expandedCycle === id) loadCycleDetails(id);
      }
  };

  const updateItemStatus = async (itemId: number, status: string, notes?: string) => {
      const res = await fetch(`/api/audits/items/${itemId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, notes })
      });
      if (res.ok) {
          toast.success(`Marked as ${status}`);
          loadCycleDetails(expandedCycle!);
          fetchData(); // update progress bar
      }
  };

  if (loading) return <div className="mx-auto flex max-w-7xl justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Audits</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage physical verification of assets.</p>
        </div>
        {isManager && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button>+ New Audit Cycle</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
              <DialogHeader><DialogTitle>Create Audit Cycle</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Cycle Name *</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Q3 IT Assets Audit" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Scope Type</Label>
                        <InlineAutocomplete
                          value={form.scopeType}
                          onValueChange={v => setForm(p => ({ ...p, scopeType: v, scopeValue: "" }))}
                          options={[
                            { value: "Department", label: "Department" },
                            { value: "Location", label: "Location" }
                          ]}
                          placeholder="Select scope type"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Scope Value *</Label>
                        {form.scopeType === "Department" ? (
                            <InlineAutocomplete
                              value={form.scopeValue}
                              onValueChange={v => setForm(p => ({ ...p, scopeValue: v }))}
                              options={departments.filter(d=>d.status==='Active').map(d => ({
                                value: d.id.toString(),
                                label: d.name
                              }))}
                              placeholder="Select department"
                            />
                        ) : (
                            <Input value={form.scopeValue} onChange={e => setForm(p => ({ ...p, scopeValue: e.target.value }))} placeholder="e.g. NY Office" required />
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} required /></div>
                    <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} required /></div>
                </div>
                <div className="space-y-2">
                    <Label>Assign Auditors (Hold Ctrl/Cmd to select multiple)</Label>
                    <select multiple className="w-full rounded-md border bg-background p-2 text-sm h-32"
                            value={form.auditorIds} onChange={e => setForm(p => ({ ...p, auditorIds: Array.from(e.target.selectedOptions, option => option.value) }))} required>
                        {employees.filter(e => e.status === 'Active').map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                        ))}
                    </select>
                </div>
                <Button type="submit" className="w-full">Create Cycle</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
          {audits.map((audit) => {
              const progress = audit.totalItems > 0 ? Math.round((audit.completedItems / audit.totalItems) * 100) : 0;
              const isExpanded = expandedCycle === audit.id;

              return (
                  <div key={audit.id} className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="flex cursor-pointer items-center justify-between p-5 hover:bg-muted/30" onClick={() => loadCycleDetails(audit.id)}>
                          <div className="flex-1">
                              <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{audit.name}</h3>
                                  <Badge variant={audit.status === 'Open' ? 'default' : 'secondary'}>{audit.status}</Badge>
                                  {audit.discrepancyCount > 0 && <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {audit.discrepancyCount} Discrepancies</Badge>}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                                  <span>Scope: {audit.scope_type} - {audit.scope_value}</span>
                                  <span>{new Date(audit.start_date).toLocaleDateString()} - {new Date(audit.end_date).toLocaleDateString()}</span>
                                  <span>By: {audit.createdByName}</span>
                              </div>
                          </div>
                          <div className="flex items-center gap-4">
                              <div className="hidden text-right sm:block">
                                  <div className="text-sm font-medium">{progress}% Complete</div>
                                  <div className="text-xs text-muted-foreground">{audit.completedItems} / {audit.totalItems} Items</div>
                              </div>
                              {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                          </div>
                      </div>

                      {/* Expanded View */}
                      {isExpanded && cycleDetails && (
                          <div className="border-t border-border bg-muted/10 p-5">
                              <div className="mb-4 flex items-center justify-between">
                                  <h4 className="font-semibold">Audit Items</h4>
                                  {isManager && audit.status === 'Open' && (
                                      <Button variant="outline" size="sm" onClick={() => handleClose(audit.id)}>Close Audit Cycle</Button>
                                  )}
                              </div>
                              
                              <div className="overflow-x-auto rounded-lg border bg-background">
                                  <table className="w-full text-sm">
                                      <thead>
                                          <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                                              <th className="p-3 text-left">Asset</th>
                                              <th className="p-3 text-left">Location</th>
                                              <th className="p-3 text-left">System Status</th>
                                              <th className="p-3 text-left">Audit Status</th>
                                              <th className="p-3 text-left">Auditor Notes</th>
                                              <th className="p-3 text-right">Actions</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y">
                                          {cycleDetails.items.map((item: any) => (
                                              <tr key={item.id} className="hover:bg-muted/30">
                                                  <td className="p-3"><p className="font-medium">{item.assetName}</p><p className="font-mono text-xs text-muted-foreground">{item.assetTag}</p></td>
                                                  <td className="p-3 text-muted-foreground">{item.location || '—'}</td>
                                                  <td className="p-3 text-muted-foreground">{item.assetStatus}</td>
                                                  <td className="p-3">
                                                      {item.status === 'Pending' ? <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50"><HelpCircle className="mr-1 h-3 w-3" /> Pending</Badge> :
                                                       item.status === 'Present' ? <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50"><CheckCircle2 className="mr-1 h-3 w-3" /> Present</Badge> :
                                                       <Badge variant="destructive">{item.status}</Badge>}
                                                  </td>
                                                  <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{item.notes || '—'}</td>
                                                  <td className="p-3 text-right">
                                                      {audit.status === 'Open' ? (
                                                          <div className="flex justify-end gap-2">
                                                              {item.status !== 'Present' && <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700" onClick={() => updateItemStatus(item.id, 'Present')}>Present</Button>}
                                                              {item.status !== 'Missing' && <Button size="sm" variant="outline" className="h-7 text-xs bg-red-50 hover:bg-red-100 hover:text-red-700" onClick={() => updateItemStatus(item.id, 'Missing')}>Missing</Button>}
                                                              {item.status !== 'Damaged' && <Button size="sm" variant="outline" className="h-7 text-xs bg-orange-50 hover:bg-orange-100 hover:text-orange-700" onClick={() => updateItemStatus(item.id, 'Damaged')}>Damaged</Button>}
                                                          </div>
                                                      ) : (
                                                          <span className="text-xs text-muted-foreground">{item.auditedByName ? `Audited by ${item.auditedByName}` : 'Not audited'}</span>
                                                      )}
                                                  </td>
                                              </tr>
                                          ))}
                                          {cycleDetails.items.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No items found for this scope.</td></tr>}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}
                  </div>
              );
          })}
          {audits.length === 0 && <div className="py-10 text-center text-muted-foreground">No audits scheduled.</div>}
      </div>
    </div>
  );
}
