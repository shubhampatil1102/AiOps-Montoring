import {
  LayoutDashboard,
  LaptopIcon,
  Wrench,
  CpuIcon,
  LockIcon,
  SuperscriptIcon,
  BotIcon,
  ShieldCheck,
} from "lucide-react";

export const sidebarNavigation = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/" },
  { name: "Devices", icon: LaptopIcon, path: "/devices" },
  { name: "Auto Heal", icon: Wrench, path: "/auto-heal" },
  { name: "Incidents", icon: CpuIcon, path: "/incidents" },
  { name: "Policies", icon: LockIcon, path: "/policies" },
  { name: "Scripts", icon: SuperscriptIcon, path: "/scripts" },
  { name: "Remediations", icon: BotIcon, path: "/remediations" },
  { name: "Security", icon: ShieldCheck, path: "/security" },
];