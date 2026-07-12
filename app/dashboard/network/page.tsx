"use client";

import { useEffect, useState } from "react";
import { Building2, User, Laptop, Network, Search, ChevronRight, ChevronDown, PackageOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function NetworkPage() {
  const [data, setData] = useState<{network: any[], unassigned: any[]}>({ network: [], unassigned: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedDepts, setExpandedDepts] = useState<Record<number, boolean>>({});
  const [expandedEmps, setExpandedEmps] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch("/api/network")
      .then(res => res.json())
      .then(d => {
        setData(d);
        // Auto-expand first department by default
        if (d.network && d.network.length > 0) {
          setExpandedDepts({ [d.network[0].id]: true });
        }
        setLoading(false);
      });
  }, []);

  const toggleDept = (id: number) => {
    setExpandedDepts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleEmp = (id: number) => {
    setExpandedEmps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return <div className="mx-auto flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  // Filter based on search
  const query = search.toLowerCase();
  
  const filteredNetwork = data.network.map(dept => {
    const deptMatch = dept.name.toLowerCase().includes(query);
    
    const filteredEmps = dept.employees.map((emp: any) => {
      const empMatch = emp.name.toLowerCase().includes(query) || emp.role.toLowerCase().includes(query);
      
      const filteredAssets = emp.assets.filter((asset: any) => 
        asset.name.toLowerCase().includes(query) || 
        asset.tag.toLowerCase().includes(query) ||
        asset.category.toLowerCase().includes(query)
      );
      
      return {
        ...emp,
        assets: filteredAssets,
        isMatch: empMatch || filteredAssets.length > 0
      };
    }).filter((emp: any) => deptMatch || emp.isMatch);

    return {
      ...dept,
      employees: filteredEmps,
      isMatch: deptMatch || filteredEmps.length > 0
    };
  }).filter(dept => dept.isMatch);

  const filteredUnassigned = data.unassigned.filter(asset => 
    asset.name.toLowerCase().includes(query) || 
    asset.tag.toLowerCase().includes(query) ||
    asset.category.toLowerCase().includes(query)
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Network className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Asset Node Graph</h1>
          </div>
          <p className="text-muted-foreground">Interactive visualization of organizational asset distribution.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search departments, people, or assets..." 
            className="pl-9 bg-background/50 backdrop-blur-sm border-2 focus-visible:border-primary"
            value={search}
            onChange={e => {
                setSearch(e.target.value);
                // Auto-expand all when searching
                if (e.target.value.length > 2) {
                    const allDepts: Record<number, boolean> = {};
                    const allEmps: Record<number, boolean> = {};
                    data.network.forEach(d => {
                        allDepts[d.id] = true;
                        d.employees.forEach((e: any) => allEmps[e.id] = true);
                    });
                    setExpandedDepts(allDepts);
                    setExpandedEmps(allEmps);
                }
            }}
          />
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-6 shadow-sm min-h-[500px] overflow-x-auto">
        <div className="min-w-[800px] space-y-4">
          
          {/* Legend */}
          <div className="flex gap-6 mb-8 text-sm font-medium text-muted-foreground pb-4 border-b border-border/50">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Department</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Employee</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Asset</div>
          </div>

          {filteredNetwork.map(dept => (
            <div key={dept.id} className="relative animate-in fade-in slide-in-from-left-4 duration-500">
              {/* Department Node */}
              <div 
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${expandedDepts[dept.id] || search ? 'bg-blue-500/10 border-blue-500/30' : 'bg-background border-border hover:border-blue-500/50'} border-2 w-80 relative z-10 shadow-sm`}
                onClick={() => toggleDept(dept.id)}
              >
                <div className="bg-blue-500 text-white p-2 rounded-lg shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-blue-900 dark:text-blue-100 truncate">{dept.name}</h3>
                  <p className="text-xs text-blue-700/70 dark:text-blue-300/70">{dept.employees.length} Employees</p>
                </div>
                <div className="text-blue-500">
                  {expandedDepts[dept.id] || search ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </div>
              </div>

              {/* Employees under Department */}
              {(expandedDepts[dept.id] || search) && dept.employees.length > 0 && (
                <div className="ml-12 mt-4 space-y-4 relative before:absolute before:left-[-24px] before:top-[-16px] before:bottom-[24px] before:w-[2px] before:bg-blue-500/20">
                  {dept.employees.map((emp: any, empIdx: number) => (
                    <div key={emp.id} className="relative animate-in fade-in slide-in-from-left-4 duration-300 fill-mode-both" style={{ animationDelay: `${empIdx * 50}ms` }}>
                      {/* Connector Line to Dept */}
                      <div className="absolute left-[-24px] top-1/2 w-[24px] h-[2px] bg-blue-500/20" />
                      
                      {/* Employee Node */}
                      <div 
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${expandedEmps[emp.id] || search ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-background border-border hover:border-emerald-500/50'} border-2 w-80 relative z-10 shadow-sm`}
                        onClick={() => toggleEmp(emp.id)}
                      >
                        <div className="bg-emerald-500 text-white p-2 rounded-lg shadow-sm">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-emerald-900 dark:text-emerald-100 truncate">{emp.name}</h3>
                          <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70">{emp.role}</p>
                        </div>
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30">
                          {emp.assets.length} assets
                        </Badge>
                      </div>

                      {/* Assets under Employee */}
                      {(expandedEmps[emp.id] || search) && emp.assets.length > 0 && (
                        <div className="ml-12 mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative before:absolute before:left-[-24px] before:top-[-16px] before:bottom-[24px] before:w-[2px] before:bg-emerald-500/20">
                          {emp.assets.map((asset: any, astIdx: number) => (
                            <div key={asset.id} className="relative flex items-center animate-in fade-in zoom-in duration-300 fill-mode-both" style={{ animationDelay: `${astIdx * 50}ms` }}>
                              {/* Connector Line to Emp */}
                              <div className="absolute left-[-24px] top-1/2 w-[24px] h-[2px] bg-emerald-500/20" />
                              
                              {/* Asset Node */}
                              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 w-full relative z-10 hover:bg-amber-500/20 transition-colors">
                                <div className="bg-amber-500/20 text-amber-700 p-1.5 rounded-md">
                                  <Laptop className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100 truncate">{asset.name}</h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-mono text-amber-700/70 dark:text-amber-300/70">{asset.tag}</span>
                                    <span className="text-[10px] bg-amber-500/20 px-1 rounded text-amber-800/80">{asset.category}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filteredNetwork.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Network className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No organizational matches found for "{search}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Unassigned Assets Pool */}
      {filteredUnassigned.length > 0 && (
        <div className="bg-card border rounded-2xl p-6 shadow-sm mt-6">
          <div className="flex items-center gap-2 mb-6 text-muted-foreground">
            <PackageOpen className="h-5 w-5" />
            <h3 className="font-bold">Unassigned Assets Pool ({filteredUnassigned.length})</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {filteredUnassigned.map((asset, i) => (
              <div key={asset.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border text-sm hover:bg-secondary transition-colors animate-in fade-in" style={{ animationDelay: `${(i % 10) * 30}ms` }}>
                <Laptop className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium truncate max-w-[150px]">{asset.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-background px-1 rounded">{asset.tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
