import * as React from "react";
import { cn } from "@/lib/utils";

interface RadialProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  size?: number; // width and height in px
  strokeWidth?: number;
  color?: string; // Optional custom color class (e.g. text-emerald-500). If not provided, it auto-colors based on value.
  showLabel?: boolean;
}

export function RadialProgress({
  value,
  size = 120,
  strokeWidth = 10,
  color,
  showLabel = true,
  className,
  ...props
}: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Make sure it doesn't animate from 0 if value is high, or rather let's handle initial state by css, but since it's client rendered it will animate if value changes from 0.
  // Actually, setting the strokeDashoffset directly will trigger transition when rendered if we use a small effect, but for simplicity we rely on React rendering.
  const [offset, setOffset] = React.useState(circumference);

  React.useEffect(() => {
    // Small delay to trigger CSS transition on mount
    const timeout = setTimeout(() => {
        setOffset(circumference - (value / 100) * circumference);
    }, 50);
    return () => clearTimeout(timeout);
  }, [value, circumference]);

  // Determine automatic color based on score
  let progressColor = "text-emerald-500";
  if (value < 50) progressColor = "text-red-500";
  else if (value < 80) progressColor = "text-orange-500";

  if (color) progressColor = color;

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        className="rotate-[-90deg] transform"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          className="text-muted/20"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={cn("transition-all duration-1000 ease-out", progressColor)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums tracking-tight">
            {value}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
            Health
          </span>
        </div>
      )}
    </div>
  );
}
