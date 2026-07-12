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
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Maximize } from "lucide-react";

const statusColors: Record<string, string> = {
  Available: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Allocated: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Reserved: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Under Maintenance": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Lost: "bg-red-500/10 text-red-600 border-red-500/20",
  Retired: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  Disposed: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

export default function AssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrAsset, setQrAsset] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [form, setForm] = useState({
    name: "", categoryId: "", serialNumber: "", description: "",
    acquisitionDate: "", acquisitionCost: "", condition: "Good",
    location: "", isBookable: false, departmentId: "",
  });

  const canRegister = user?.role === "Admin" || user?.role === "Asset Manager";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterStatus) params.set("status", filterStatus);
    if (filterCategory) params.set("categoryId", filterCategory);

    const [aRes, cRes, dRes] = await Promise.all([
      fetch(`/api/assets?${params}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]);
    setAssets(aRes.assets || []);
    setCategories(cRes.categories || []);
    setDepartments(dRes.departments || []);
    setLoading(false);
  }, [search, filterStatus, filterCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      ...form,
      categoryId: parseInt(form.categoryId),
      acquisitionCost: form.acquisitionCost ? parseFloat(form.acquisitionCost) : null,
      departmentId: form.departmentId ? parseInt(form.departmentId) : null,
    };
    const res = await fetch("/api/assets", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success(`Asset registered: ${data.assetTag}`);
    setDialogOpen(false);
    setForm({ name: "", categoryId: "", serialNumber: "", description: "", acquisitionDate: "", acquisitionCost: "", condition: "Good", location: "", isBookable: false, departmentId: "" });
    fetchData();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Register and track assets centrally.</p>
        </div>
        {canRegister && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>+ Register Asset</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader><DialogTitle>Register New Asset</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={form.categoryId} onValueChange={(v) => setForm((p) => ({ ...p, categoryId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{categories.filter((c: any) => c.status === "Active").map((c: any) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Serial Number</Label>
                    <Input value={form.serialNumber} onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Acquisition Date</Label>
                    <Input type="date" value={form.acquisitionDate} onChange={(e) => setForm((p) => ({ ...p, acquisitionDate: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Acquisition Cost</Label>
                    <Input type="number" step="0.01" value={form.acquisitionCost} onChange={(e) => setForm((p) => ({ ...p, acquisitionCost: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select value={form.condition} onValueChange={(v) => setForm((p) => ({ ...p, condition: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["New", "Good", "Fair", "Poor", "Damaged"].map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={form.departmentId} onValueChange={(v) => setForm((p) => ({ ...p, departmentId: v }))}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>{departments.filter((d: any) => d.status === "Active").map((d: any) => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isBookable} onChange={(e) => setForm((p) => ({ ...p, isBookable: e.target.checked }))} className="h-4 w-4 rounded" />
                  Shared / Bookable resource
                </label>
                <Button type="submit" className="w-full">Register Asset</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <Dialog open={!!qrAsset} onOpenChange={(open) => !open && setQrAsset(null)}>
        <DialogContent className="sm:max-w-sm text-center flex flex-col items-center">
          <DialogHeader>
            <DialogTitle>Smart QR Code</DialogTitle>
          </DialogHeader>
          {qrAsset && (
            <>
              <p className="text-sm text-muted-foreground mb-4">Scan this code with the AssetFlow mobile app to immediately log an audit or check-in.</p>
              <div className="p-4 bg-white border border-border shadow-sm rounded-2xl mb-2 flex items-center justify-center">
                <QRCodeSVG 
                  value={JSON.stringify({ tag: qrAsset.assetTag, id: qrAsset.id })} 
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="w-full bg-muted/50 rounded-xl p-4 border border-border text-left mt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Asset Info</p>
                <p className="font-medium">{qrAsset.name}</p>
                <p className="font-mono text-sm text-primary mt-1">{qrAsset.assetTag}</p>
              </div>
              <Button variant="secondary" className="w-full mt-4 gap-2">
                <Maximize className="h-4 w-4" /> Print Label
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search by name, tag, serial..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 sm:max-w-xs" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["Available", "Allocated", "Reserved", "Under Maintenance", "Lost", "Retired", "Disposed"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-9 w-full sm:w-40"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c: any) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left">Asset Tag</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Condition</th>
                <th className="px-4 py-3 text-right">Cost</th>
              </tr></thead>
              <tbody className="divide-y">
                {assets.map((a: any) => (
                  <tr key={a.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setQrAsset(a)} className="text-muted-foreground hover:text-primary transition-colors" title="View QR">
                          <QrCode className="h-4 w-4" />
                        </button>
                        {a.assetTag}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{a.name}{a.isBookable && <span className="ml-1 text-xs text-muted-foreground">📅</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.categoryName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.location || "—"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${statusColors[a.status] || ""}`}>{a.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{a.condition}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{a.acquisitionCost ? `$${a.acquisitionCost.toLocaleString()}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {assets.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No assets found</div>}
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {assets.map((a: any) => (
              <div key={a.id} className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <button onClick={() => setQrAsset(a)} className="mt-0.5 text-muted-foreground hover:text-primary">
                      <QrCode className="h-4 w-4" />
                    </button>
                    <div>
                      <p className="font-semibold">{a.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{a.assetTag}</p>
                    </div>
                  </div>
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${statusColors[a.status] || ""}`}>{a.status}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{a.categoryName}</span>
                  <span>{a.location || "No location"}</span>
                  <span>{a.condition}</span>
                  {a.isBookable && <span>📅 Bookable</span>}
                </div>
              </div>
            ))}
            {assets.length === 0 && <div className="col-span-full py-10 text-center text-sm text-muted-foreground">No assets found</div>}
          </div>
        </>
      )}
    </div>
  );
}
