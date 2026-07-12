"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InlineAutocomplete } from "@/components/ui/inline-autocomplete";
import { toast } from "sonner";

interface Employee {
  id: number; name: string; email: string; role: string;
  departmentId: number | null; departmentName: string | null;
  status: string; phone: string | null; createdAt: string;
}

const ROLES = ["Employee", "Department Head", "Asset Manager", "Admin"];
const roleColors: Record<string, string> = {
  Admin: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "Asset Manager": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Department Head": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Employee: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
};

export function EmployeeTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [form, setForm] = useState({ role: "", departmentId: "", status: "", phone: "" });
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [eRes, dRes] = await Promise.all([
      fetch("/api/employees").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]);
    setEmployees(eRes.employees || []);
    setDepartments(dRes.departments || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (emp: Employee) => {
    setEditEmp(emp);
    setForm({ role: emp.role, departmentId: emp.departmentId?.toString() || "", status: emp.status, phone: emp.phone || "" });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmp) return;
    const body = {
      role: form.role, status: form.status, phone: form.phone || null,
      departmentId: form.departmentId ? parseInt(form.departmentId) : null,
    };
    const res = await fetch(`/api/employees/${editEmp.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success("Employee updated");
    setDialogOpen(false);
    fetchData();
  };

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full sm:max-w-xs" />
        <p className="text-sm text-muted-foreground">{filtered.length} employee(s)</p>
      </div>

      {/* Responsive: cards on mobile, table on desktop */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-left">Role</th>
            <th className="px-4 py-3 text-left">Department</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr></thead>
          <tbody className="divide-y">
            {filtered.map((emp) => (
              <tr key={emp.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{emp.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{emp.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${roleColors[emp.role] || ""}`}>{emp.role}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{emp.departmentName || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={emp.status === "Active" ? "default" : "secondary"} className="text-xs">{emp.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => openEdit(emp)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {filtered.map((emp) => (
          <div key={emp.id} className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="font-semibold">{emp.name}</p>
                <p className="text-xs text-muted-foreground">{emp.email}</p>
              </div>
              <Badge variant={emp.status === "Active" ? "default" : "secondary"} className="text-xs">{emp.status}</Badge>
            </div>
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <span className={`rounded-md border px-2 py-0.5 font-medium ${roleColors[emp.role] || ""}`}>{emp.role}</span>
              {emp.departmentName && <span className="text-muted-foreground">{emp.departmentName}</span>}
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => openEdit(emp)}>Edit Role / Department</Button>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee: {editEmp?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <InlineAutocomplete
                value={form.role}
                onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}
                options={ROLES.map((r) => ({ value: r, label: r }))}
                placeholder="Select role"
              />
              <p className="text-xs text-muted-foreground mt-1">This is the only place roles are assigned.</p>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <InlineAutocomplete
                value={form.departmentId}
                onValueChange={(v) => setForm((p) => ({ ...p, departmentId: v }))}
                options={departments.filter((d) => d.status === "Active").map((d) => ({
                  value: d.id.toString(),
                  label: d.name
                }))}
                placeholder="No department"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <InlineAutocomplete
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" }
                ]}
                placeholder="Select status"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Optional" />
            </div>
            <Button type="submit" className="w-full">Update Employee</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
