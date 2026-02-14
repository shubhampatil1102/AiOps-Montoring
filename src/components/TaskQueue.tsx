import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskStatus = "completed" | "running" | "queued" | "failed";

interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  time: string;
}

const tasks: Task[] = [
  { id: "1", name: "System health check", status: "completed", time: "2m ago" },
  { id: "2", name: "Log rotation", status: "running", time: "now" },
  { id: "3", name: "Backup database", status: "queued", time: "in 5m" },
  { id: "4", name: "Clear temp files", status: "queued", time: "in 12m" },
  { id: "5", name: "SSL cert renewal", status: "failed", time: "15m ago" },
  { id: "6", name: "Update registry keys", status: "completed", time: "22m ago" },
];

const statusConfig: Record<TaskStatus, { icon: typeof CheckCircle2; color: string }> = {
  completed: { icon: CheckCircle2, color: "text-success" },
  running: { icon: Loader2, color: "text-info" },
  queued: { icon: Clock, color: "text-muted-foreground" },
  failed: { icon: AlertCircle, color: "text-destructive" },
};

const TaskQueue = () => {
  return (
    <div className="glass-panel rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Task Queue</h3>
        <span className="text-xs text-muted-foreground">{tasks.length} tasks</span>
      </div>
      <div className="divide-y divide-border">
        {tasks.map((task, i) => {
          const config = statusConfig[task.status];
          const Icon = config.icon;
          return (
            <div
              key={task.id}
              className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("w-4 h-4", config.color, task.status === "running" && "animate-spin")} />
                <span className="text-sm text-foreground">{task.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{task.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskQueue;
