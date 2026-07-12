"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RadialProgress } from "@/components/ui/radial-progress";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, AlertCircle, CalendarClock, PenTool, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PredictiveHealthPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/predictive-health")
      .then((res) => res.json())
      .then((data) => {
        setAssets(data.assets || []);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const criticalCount = assets.filter(a => a.healthStatus === 'Critical').length;
  const warningCount = assets.filter(a => a.healthStatus === 'Warning').length;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          AI Predictive Engine
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Algorithmic health scoring identifies assets at risk of failure before they break, based on age, wear-and-tear, and repair history.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="text-sm font-medium text-red-600 mb-1 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Critical Risk</div>
          <div className="text-2xl font-bold">{criticalCount}</div>
        </div>
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
          <div className="text-sm font-medium text-orange-600 mb-1 flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> Warning</div>
          <div className="text-2xl font-bold">{warningCount}</div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="text-sm font-medium text-emerald-600 mb-1 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Healthy</div>
          <div className="text-2xl font-bold">{assets.length - criticalCount - warningCount}</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {assets.map((asset) => (
          <div key={asset.id} className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30">
            <div className="p-5">
              <div className="flex justify-between items-start mb-6">
                <div className="pr-2">
                  <h3 className="font-semibold text-base line-clamp-1" title={asset.name}>{asset.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{asset.assetTag}</p>
                </div>
                <Badge variant="outline" className={
                  asset.healthStatus === 'Critical' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                  asset.healthStatus === 'Warning' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                  'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                }>{asset.healthStatus}</Badge>
              </div>

              <div className="flex justify-center mb-6 relative">
                {/* Glow effect behind progress bar for critical */}
                {asset.healthStatus === 'Critical' && (
                  <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full opacity-50" />
                )}
                <RadialProgress value={asset.healthScore} size={120} strokeWidth={10} />
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Algorithmic Breakdown</div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><CalendarClock className="h-3 w-3" /> Age</span>
                  <span className={asset.penalties.age > 10 ? 'text-orange-500 font-medium' : ''}>-{asset.penalties.age} pts</span>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Activity className="h-3 w-3" /> Usage</span>
                  <span className={asset.penalties.allocations > 10 ? 'text-orange-500 font-medium' : ''}>-{asset.penalties.allocations} pts</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><PenTool className="h-3 w-3" /> Repairs</span>
                  <span className={asset.penalties.maintenance > 10 ? 'text-red-500 font-medium' : ''}>-{asset.penalties.maintenance} pts</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-border bg-muted/20 p-4">
              <Button 
                variant={asset.healthStatus === 'Critical' ? 'default' : 'secondary'} 
                className={asset.healthStatus === 'Critical' ? "w-full bg-red-600 hover:bg-red-700 text-white" : "w-full"}
                onClick={() => router.push(`/dashboard/maintenance?action=new&assetId=${asset.id}`)}
              >
                Raise Maintenance
              </Button>
            </div>
          </div>
        ))}
        {assets.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border">
            No assets available for predictive scoring.
          </div>
        )}
      </div>
    </div>
  );
}
