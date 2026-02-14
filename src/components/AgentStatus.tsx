import { useState } from "react";
import { Power, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const AgentStatus = () => {
  const [isRunning, setIsRunning] = useState(true);

  return (
    <div className="glass-panel rounded-lg p-5 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500",
            isRunning ? "bg-success/15 glow-accent" : "bg-muted"
          )}>
            <Power className={cn("w-5 h-5 transition-colors", isRunning ? "text-success" : "text-muted-foreground")} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Windows Agent</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isRunning ? "bg-success animate-pulse-slow" : "bg-muted-foreground"
              )} />
              <span className={cn("text-sm", isRunning ? "text-success" : "text-muted-foreground")}>
                {isRunning ? "Running" : "Stopped"}
              </span>
              <span className="text-xs text-muted-foreground">• PID 4821 • Uptime 2d 14h</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsRunning(!isRunning)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            isRunning
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "bg-success/10 text-success hover:bg-success/20"
          )}
        >
          {isRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isRunning ? "Stop" : "Start"}
        </button>
      </div>
    </div>
  );
};

export default AgentStatus;
