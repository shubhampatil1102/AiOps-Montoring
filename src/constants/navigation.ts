import {
  Activity,
  LayoutDashboard,
  LaptopIcon,
  Wrench,
  CpuIcon,
  LockIcon,
  SuperscriptIcon,
  BotIcon,
} from "lucide-react";

export const sidebarNavigation = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/", group: "Overview" },
  { name: "Live Monitoring", icon: Activity, path: "/live-monitoring", group: "Overview" },
  { name: "Devices", icon: LaptopIcon, path: "/devices", group: "Operations" },
  { name: "Incidents", icon: CpuIcon, path: "/incidents", group: "Operations" },
  { name: "Policies", icon: LockIcon, path: "/policies", group: "Operations" },
  { name: "Scripts", icon: SuperscriptIcon, path: "/scripts", group: "Operations" },
  { name: "Auto Heal", icon: Wrench, path: "/auto-heal", group: "Automate" },
  { name: "Remediations", icon: BotIcon, path: "/remediations", group: "Automate" },
];
