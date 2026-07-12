"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow, isPast } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, Alert01Icon } from "@hugeicons/core-free-icons";

export function ReturnTimeline({ items }: { items: any[] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground p-4 text-center">No upcoming returns.</div>;
  }

  const sortedItems = [...items].sort((a, b) => new Date(a.expectedReturnDate).getTime() - new Date(b.expectedReturnDate).getTime());

  return (
    <div className="space-y-6 p-4">
      {sortedItems.map((item, index) => {
        const returnDate = new Date(item.expectedReturnDate);
        const overdue = isPast(returnDate);
        const distance = formatDistanceToNow(returnDate, { addSuffix: true });
        
        const diffMs = returnDate.getTime() - now.getTime();
        const diffHrs = Math.abs(diffMs) / (1000 * 60 * 60);
        let timeString = distance;
        
        if (diffHrs < 48) {
          const absMs = Math.abs(diffMs);
          const h = Math.floor(absMs / (1000 * 60 * 60));
          const m = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((absMs % (1000 * 60)) / 1000);
          timeString = `${h}h ${m}m ${s}s`;
          if (overdue) timeString = `${timeString} overdue`;
          else timeString = `in ${timeString}`;
        }

        return (
          <div key={item.id} className="relative pl-6 sm:pl-8">
            {index !== sortedItems.length - 1 && (
              <div className={`absolute left-[11px] top-6 bottom-[-24px] w-0.5 ${overdue ? "bg-red-200 dark:bg-red-900" : "bg-border"}`} />
            )}
            
            <div className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background ${overdue ? "border-red-500 text-red-500" : "border-primary text-primary"}`}>
              <HugeiconsIcon icon={overdue ? Alert01Icon : Clock01Icon} size={14} />
            </div>

            <div className={`rounded-xl border p-4 ${overdue ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20" : "bg-card"}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-sm">{item.assetName}</h4>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.assetTag}</p>
                </div>
                <div className={`text-xs font-mono font-medium px-2 py-1 rounded-md ${overdue ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-primary/10 text-primary"}`}>
                  {timeString}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Allocated to: <span className="font-medium text-foreground">{item.employeeName}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
