import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

const initialLogs: LogEntry[] = [
  { timestamp: "14:32:01", level: "info", message: "Agent started successfully on port 8080" },
  { timestamp: "14:32:02", level: "debug", message: "Loading configuration from C:\\Agent\\config.yaml" },
  { timestamp: "14:32:03", level: "info", message: "Connected to monitoring server" },
  { timestamp: "14:32:05", level: "info", message: "Health check passed — all services nominal" },
  { timestamp: "14:32:08", level: "warn", message: "Disk usage at 78% on drive C:\\" },
  { timestamp: "14:32:10", level: "info", message: "Scheduled task 'log-rotation' initiated" },
  { timestamp: "14:32:12", level: "error", message: "SSL certificate renewal failed — retrying in 60s" },
  { timestamp: "14:32:15", level: "debug", message: "Memory pool cleanup: freed 128MB" },
  { timestamp: "14:32:18", level: "info", message: "Backup job queued for execution" },
  { timestamp: "14:32:20", level: "info", message: "Registry scan completed — no anomalies detected" },
];

const streamLogs: LogEntry[] = [
  { timestamp: "", level: "info", message: "Heartbeat sent to control plane" },
  { timestamp: "", level: "debug", message: "GC pause: 2.3ms" },
  { timestamp: "", level: "info", message: "Network throughput: 45.2 MB/s" },
  { timestamp: "", level: "warn", message: "High CPU usage detected: 89%" },
  { timestamp: "", level: "info", message: "Cache invalidation complete" },
  { timestamp: "", level: "debug", message: "Thread pool: 8/16 active" },
];

const levelColors: Record<string, string> = {
  info: "text-info",
  warn: "text-warning",
  error: "text-destructive",
  debug: "text-muted-foreground",
};

const LogViewer = () => {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomLog = streamLogs[Math.floor(Math.random() * streamLogs.length)];
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      setLogs((prev) => [...prev.slice(-50), { ...randomLog, timestamp }]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="glass-panel rounded-lg overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Live Logs</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-muted-foreground">Streaming</span>
        </div>
      </div>
      <div ref={scrollRef} className="p-3 font-mono text-xs space-y-0.5 overflow-y-auto max-h-72 scrollbar-thin">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 py-0.5">
            <span className="text-muted-foreground shrink-0">{log.timestamp}</span>
            <span className={cn("shrink-0 w-12 uppercase font-medium", levelColors[log.level])}>
              {log.level}
            </span>
            <span className="text-secondary-foreground">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogViewer;
