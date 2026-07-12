"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Category {
  id: number; name: string; description: string;
  customFields: { name: string; label: string; type: string }[];
  status: string; assetCount: number; createdAt: string;
}

export function CategoryTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [fields, setFields] = useState<{ name: string; label: string; type: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/categories").then((r) => r.json());
    setCategories(res.categories || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditCat(null);
    setForm({ name: "", description: "" });
    setFields([]);
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditCat(c);
    setForm({ name: c.name, description: c.description || "" });
    setFields(c.customFields || []);
    setDialogOpen(true);
  };

  const addField = () => setFields((f) => [...f, { name: "", label: "", type: "text" }]);

  const removeField = (i: number) => setFields((f) => f.filter((_, idx) => idx !== i));

  const updateField = (i: number, key: string, value: string) =>
    setFields((f) => f.map((field, idx) => idx === i ? { ...field, [key]: value } : field));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validFields = fields.filter((f) => f.name && f.label);
    const body = { name: form.name, description: form.description, customFields: validFields.length > 0 ? validFields : null };

    const res = editCat
      ? await fetch(`/api/categories/${editCat.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success(editCat ? "Category updated" : "Category created");
    setDialogOpen(false);
    fetchData();
  };

  const toggleStatus = async (c: Category) => {
    const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success(data.message);
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{categories.length} categorie(s)</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} size="sm">+ Add Category</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editCat ? "Edit Category" : "Create Category"}</DialogTitle>
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Custom Fields</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addField}>+ Field</Button>
                </div>
                {fields.map((f, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Field Name</Label>
                      <Input value={f.name} placeholder="e.g. warranty_period" onChange={(e) => updateField(i, "name", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input value={f.label} placeholder="e.g. Warranty Period" onChange={(e) => updateField(i, "label", e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="w-full space-y-1 sm:w-24">
                      <Label className="text-xs">Type</Label>
                      <select value={f.type} onChange={(e) => updateField(i, "type", e.target.value)}
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                      </select>
                    </div>
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeField(i)} className="h-9 shrink-0">×</Button>
                  </div>
                ))}
              </div>
              <Button type="submit" className="w-full">{editCat ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div key={c.id} className="group rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="truncate font-semibold">{c.name}</h3>
              <Badge variant={c.status === "Active" ? "default" : "secondary"} className="ml-2 shrink-0 text-xs">{c.status}</Badge>
            </div>
            {c.description && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Assets: {c.assetCount}</span>
              {c.customFields?.length > 0 && <span>Fields: {c.customFields.length}</span>}
            </div>
            {c.customFields?.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1">
                {c.customFields.map((f) => (
                  <span key={f.name} className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{f.label}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openEdit(c)}>Edit</Button>
              <Button variant={c.status === "Active" ? "destructive" : "default"} size="sm" className="text-xs" onClick={() => toggleStatus(c)}>
                {c.status === "Active" ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
