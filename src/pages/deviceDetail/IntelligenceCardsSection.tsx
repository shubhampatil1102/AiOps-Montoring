import { BatteryMedium, Boxes, Cpu, Download, HardDrive, ShieldCheck, Wifi } from "lucide-react";
import IntelligenceCard from "@/components/dashboard/widgets/IntelligenceCard";
import type { IntelligenceResult } from "@/lib/intelligence/types";

interface IntelligenceCardsSectionProps {
  performance: IntelligenceResult;
  battery: IntelligenceResult;
  storage: IntelligenceResult;
  security: IntelligenceResult;
  updates: IntelligenceResult;
}

export default function IntelligenceCardsSection({
  performance,
  battery,
  storage,
  security,
  updates,
}: IntelligenceCardsSectionProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      <IntelligenceCard
        title="Performance"
        icon={Cpu}
        color="#2563eb"
        score={performance.healthScore.score}
        trend={performance.trend.movingAverage}
        summary="CPU and memory load for this device."
      />

      <IntelligenceCard
        title="Battery"
        icon={BatteryMedium}
        color="#16a34a"
        score={battery.healthScore.score}
        trend={battery.trend.movingAverage}
        summary="Battery capacity health."
      />

      <IntelligenceCard
        title="Storage"
        icon={HardDrive}
        color="#f59e0b"
        score={storage.healthScore.score}
        trend={storage.trend.movingAverage}
        summary="Disk usage for this device."
      />

      <IntelligenceCard
        title="Security"
        icon={ShieldCheck}
        color="#7c3aed"
        score={security.healthScore.score}
        summary="Compliance control status."
      />

      <IntelligenceCard
        title="Updates"
        icon={Download}
        color="#0891b2"
        score={updates.healthScore.score}
        summary="Pending and failed update status."
      />

      <IntelligenceCard title="Network" icon={Wifi} color="#0ea5e9" comingSoon />
      <IntelligenceCard title="Asset" icon={Boxes} color="#64748b" comingSoon />
    </div>
  );
}
