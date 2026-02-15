import { useState } from "react";
import { Cpu, HardDrive, MemoryStick, Wifi } from "lucide-react";
import AgentSidebar from "@/components/Sidebar";
import AgentStatus from "@/components/AgentStatus";
import MetricCard from "@/components/MetricCard";
import TaskQueue from "@/components/TaskQueue";
import LogViewer from "@/components/LogViewer";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="flex h-screen overflow-hidden">
      <AgentSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <header className="sticky top-0 z-10 px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md">
          <h1 className="text-xl font-semibold text-foreground capitalize">{activeTab}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeTab === "dashboard" && "Monitor your Windows agent in real-time"}
            {activeTab === "tasks" && "View and manage scheduled tasks"}
            {activeTab === "logs" && "Live system and application logs"}
            {activeTab === "settings" && "Configure agent preferences"}
          </p>
        </header>

        <div className="p-6 space-y-6">
          {activeTab === "dashboard" && (
            <>
              <AgentStatus />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="CPU Usage"
                  value="42%"
                  subtitle="4 cores / 8 threads"
                  icon={Cpu}
                  percentage={42}
                  color="info"
                />
                <MetricCard
                  title="Memory"
                  value="6.2 GB"
                  subtitle="of 16 GB used"
                  icon={MemoryStick}
                  percentage={39}
                  color="success"
                />
                <MetricCard
                  title="Disk"
                  value="234 GB"
                  subtitle="of 512 GB used"
                  icon={HardDrive}
                  percentage={78}
                  color="warning"
                />
                <MetricCard
                  title="Network"
                  value="45.2 MB/s"
                  subtitle="↑ 12.1 MB/s  ↓ 33.1 MB/s"
                  icon={Wifi}
                  percentage={32}
                  color="primary"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TaskQueue />
                <LogViewer />
              </div>
            </>
          )}

          {activeTab === "tasks" && <TaskQueue />}
          {activeTab === "logs" && <LogViewer />}
          {activeTab === "settings" && (
            <div className="glass-panel rounded-lg p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Agent Configuration</h3>
              <div className="space-y-4">
                {[
                  { label: "Agent Name", value: "WIN-DESKTOP-01" },
                  { label: "Host", value: "localhost:8080" },
                  { label: "Log Level", value: "DEBUG" },
                  { label: "Heartbeat Interval", value: "30s" },
                  { label: "Max Retries", value: "3" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-mono text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
