import { Monitor, Activity, ListTodo, ScrollText, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Monitor },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "settings", label: "Settings", icon: Settings },
];

const AgentSidebar = ({ activeTab, onTabChange }: AgentSidebarProps) => {
  return (
    <aside className="w-16 lg:w-56 h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center glow-accent">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <span className="hidden lg:block font-semibold text-foreground text-sm tracking-tight">
          Agent Control
        </span>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-slow" />
          <span className="hidden lg:block text-xs text-muted-foreground">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};

export default AgentSidebar;
