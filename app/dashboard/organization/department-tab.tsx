"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Department {
  id: number; name: string; description: string; parentDepartmentId: number | null;
  headEmployeeId: number | null; headName: string | null; parentDepartmentName: string | null;
  status: string; employeeCount: number; createdAt: string;
}

export function DepartmentTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", description: "", parentDepartmentId: "", headEmployeeId: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [dRes, eRes] = await Promise.all([
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()),
    ]);
    setDepartments(dRes.departments || []);
    setEmployees(eRes.employees || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditDept(null);
    setForm({ name: "", description: "", parentDepartmentId: "", headEmployeeId: "" });
    setDialogOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditDept(d);
    setForm({
      name: d.name, description: d.description || "",
      parentDepartmentId: d.parentDepartmentId?.toString() || "",
      headEmployeeId: d.headEmployeeId?.toString() || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name: form.name, description: form.description,
      parentDepartmentId: form.parentDepartmentId ? parseInt(form.parentDepartmentId) : null,
      headEmployeeId: form.headEmployeeId ? parseInt(form.headEmployeeId) : null,
    };

    const res = editDept
      ? await fetch(`/api/departments/${editDept.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/departments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success(editDept ? "Department updated" : "Department created");
    setDialogOpen(false);
    fetchData();
  };

  const toggleStatus = async (d: Department) => {
    const res = await fetch(`/api/departments/${d.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success(data.message);
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{departments.length} department(s)</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} size="sm">+ Add Department</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editDept ? "Edit Department" : "Create Department"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Parent Department</Label>
                <Select value={form.parentDepartmentId} onValueChange={(v) => setForm((p) => ({ ...p, parentDepartmentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    {departments.filter((d) => d.id !== editDept?.id).map((d) => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department Head</Label>
                <Select value={form.headEmployeeId} onValueChange={(v) => setForm((p) => ({ ...p, headEmployeeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter((e) => e.status === "Active").map((e) => (
                      <SelectItem key={e.id} value={e.id.toString()}>{e.name} ({e.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">{editDept ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Responsive grid of department cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => (
          <div key={d.id} className="group rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
            <div className="mb-3 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{d.name}</h3>
                {d.parentDepartmentName && (
                  <p className="text-xs text-muted-foreground">↳ {d.parentDepartmentName}</p>
                )}
              </div>
              <Badge variant={d.status === "Active" ? "default" : "secondary"} className="ml-2 shrink-0 text-xs">{d.status}</Badge>
            </div>
            {d.description && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>}
            <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Head: {d.headName || "—"}</span>
              <span>Employees: {d.employeeCount}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openEdit(d)}>Edit</Button>
              <Button variant={d.status === "Active" ? "destructive" : "default"} size="sm" className="text-xs" onClick={() => toggleStatus(d)}>
                {d.status === "Active" ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
