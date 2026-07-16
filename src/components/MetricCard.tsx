import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricCardColor = "primary" | "success" | "warning" | "info" | "danger";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  percentage?: number;
  color?: MetricCardColor;
}

const colorClass: Record<MetricCardColor, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  danger: "text-destructive",
};

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  percentage,
  color = "primary",
}: MetricCardProps) {
  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        {Icon && <Icon className={cn("h-4 w-4", colorClass[color])} />}
      </div>

      <div className="mt-3 text-2xl font-semibold text-foreground">
        {value}
      </div>

      {subtitle && (
        <div className="mt-1 text-xs text-muted-foreground">
          {subtitle}
        </div>
      )}

      {percentage !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-current"
            style={{
              width: `${Math.min(Math.max(percentage, 0), 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
